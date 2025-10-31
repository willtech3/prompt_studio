import contextlib
import datetime as dt
import json
import os
import re

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import create_all, get_session
from app.core.config import is_tool_loop_v2_enabled
from models.model_config import ModelConfig
from services.openrouter import OpenRouterService
from services.tool_executor import ToolExecutor

# Chat router
router = APIRouter(prefix="/api/chat", tags=["chat"])


def _provider_id_from_model(model_id: str | None) -> str:
    try:
        return (model_id or "").split("/")[0].split(":")[0].replace("-", "")
    except Exception:
        return ""


def parse_time_constraints(text: str) -> dict | None:
    """Extract time constraints from prompt text and map to freshness period.

    Returns a dict possibly containing:
      - time_hint: 'day'|'week'|'month'|'year' (based on actual time range)
      - after: 'YYYY-MM-DD'
      - before: 'YYYY-MM-DD'
      - days_ago: int (actual number of days)
    """
    try:
        text_l = (text or "").lower()
        now = dt.datetime.utcnow()

        def get_time_hint_from_days(days: int) -> str:
            if days <= 1:
                return "day"
            elif days <= 7:
                return "week"
            elif days <= 30:
                return "month"
            else:
                return "year"

        if re.search(r"\btoday\b", text_l):
            return {
                "time_hint": "day",
                "after": now.strftime("%Y-%m-%d"),
                "days_ago": 1,
            }
        if re.search(r"\byesterday\b", text_l):
            d = (now - dt.timedelta(days=1)).strftime("%Y-%m-%d")
            return {"time_hint": "day", "after": d, "days_ago": 1}
        if re.search(r"\bthis\s+week\b", text_l):
            start = (now - dt.timedelta(days=now.weekday())).strftime("%Y-%m-%d")
            return {"time_hint": "week", "after": start, "days_ago": 7}
        if re.search(r"\blast\s+week\b", text_l):
            start = (now - dt.timedelta(days=now.weekday() + 7)).strftime("%Y-%m-%d")
            return {"time_hint": "week", "after": start, "days_ago": 7}
        if re.search(r"\bthis\s+month\b", text_l):
            start = now.replace(day=1).strftime("%Y-%m-%d")
            return {"time_hint": "month", "after": start, "days_ago": 30}
        if re.search(r"\blast\s+month\b", text_l):
            first_this = now.replace(day=1)
            last_month_end = first_this - dt.timedelta(days=1)
            start = last_month_end.replace(day=1).strftime("%Y-%m-%d")
            return {"time_hint": "month", "after": start, "days_ago": 30}

        m = re.search(
            r"\b(last|past|in\s+the\s+last)\s+(\d{1,3})\s+(day|days|week|weeks|month|months|year|years)\b",
            text_l,
        )
        if m:
            n = int(m.group(2))
            unit = m.group(3)
            if "day" in unit:
                days = n
                delta = dt.timedelta(days=days)
            elif "week" in unit:
                days = n * 7
                delta = dt.timedelta(days=days)
            elif "month" in unit:
                days = n * 30
                delta = dt.timedelta(days=days)
            else:  # year
                days = n * 365
                delta = dt.timedelta(days=days)

            time_hint = get_time_hint_from_days(days)
            return {
                "time_hint": time_hint,
                "after": (now - delta).strftime("%Y-%m-%d"),
                "days_ago": days,
            }
    except Exception:
        return None
    return None


def _tool_metadata(name: str) -> dict:
    """Return metadata for tool visibility and categorization.

    - search_web: category=search, visibility=primary
    - get_current_time, calculate: category=utility, visibility=hidden
    - default: category=other, visibility=secondary
    """
    try:
        n = (name or "").lower()
        if n == "search_web":
            return {"category": "search", "visibility": "primary"}
        if n in {"get_current_time", "calculate"}:
            return {"category": "utility", "visibility": "hidden"}
    except Exception:
        pass
    return {"category": "other", "visibility": "secondary"}


@router.get("/stream")
async def stream_chat(
    model: str = Query(..., description="Model ID to use"),
    prompt: str = Query("", description="User prompt content"),
    system: str | None = Query(None, description="Optional system prompt"),
    temperature: float | None = Query(
        0.7, ge=0, le=2, description="Sampling temperature"
    ),
    max_tokens: int | None = Query(None, ge=1, description="Max tokens for completion"),
    top_p: float | None = Query(1.0, ge=0, le=1, description="Nucleus sampling"),
    reasoning_effort: str | None = Query(
        None, description="Reasoning effort: low|medium|high"
    ),
    # Tools: accept both tool_schemas and tools (legacy)
    tool_schemas: str | None = Query(
        None, description="JSON-encoded array of tool schemas (OpenAI format)"
    ),
    tools: str | None = Query(
        None, description="JSON-encoded array of tool schemas (OpenAI format)"
    ),
    tool_choice: str | None = Query(
        "auto", description="Tool choice: 'auto', 'required', 'none', or tool name"
    ),
    max_tool_calls: int = Query(
        5,
        ge=1,
        le=20,
        description="Maximum tool call iterations to prevent infinite loops",
    ),
    # Additional tunable parameters (pass-through when provided)
    top_k: int | None = Query(None, description="Top-K sampling"),
    frequency_penalty: float | None = Query(None, description="Frequency penalty"),
    presence_penalty: float | None = Query(None, description="Presence penalty"),
    repetition_penalty: float | None = Query(None, description="Repetition penalty"),
    min_p: float | None = Query(None, description="Minimum probability threshold"),
    top_a: float | None = Query(None, description="Top-A sampling"),
    seed: int | None = Query(None, description="Deterministic seed"),
    response_format: str | None = Query(
        None, description="Response format, e.g. json or json_object"
    ),
    stop: str | None = Query(
        None, description="Comma or newline-separated stop sequences"
    ),
    logprobs: bool | None = Query(
        None, description="Return log probabilities of tokens"
    ),
    top_logprobs: int | None = Query(
        None, description="How many top tokens to include in logprobs"
    ),
    logit_bias: str | None = Query(
        None, description="JSON object mapping token IDs to bias values"
    ),
    session: AsyncSession = Depends(get_session),
):
    async def generate():
        sent_any_content = False
        tool_loop_v2 = is_tool_loop_v2_enabled()

        if not os.getenv("OPENROUTER_API_KEY"):
            yield f"data: {json.dumps({'type': 'warning', 'message': 'Set OPENROUTER_API_KEY to enable streaming.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
            return

        effective_max_tokens = max_tokens
        if effective_max_tokens is None:
            try:
                await create_all()
                model_config = (
                    await session.execute(
                        select(ModelConfig).where(ModelConfig.model_id == model)
                    )
                ).scalar_one_or_none()
                if model_config and model_config.max_completion_tokens:
                    effective_max_tokens = model_config.max_completion_tokens
            except Exception:
                pass

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        if prompt:
            messages.append({"role": "user", "content": prompt})
        else:
            messages.append({"role": "user", "content": "Hello"})

        # Parse tool schemas if provided (support both names)
        tool_schemas_raw = tool_schemas or tools
        parsed_tool_schemas = None
        tool_names: set[str] = set()
        if tool_schemas_raw:
            try:
                parsed_tool_schemas = json.loads(tool_schemas_raw)
                if not isinstance(parsed_tool_schemas, list):
                    yield f"data: {json.dumps({'error': 'Tools must be a JSON array'})}\n\n"
                    return
                for t in parsed_tool_schemas:
                    try:
                        n = t.get("function", {}).get("name")
                        if n:
                            tool_names.add(n)
                    except Exception:
                        pass
            except json.JSONDecodeError as e:
                yield f"data: {json.dumps({'error': f'Invalid tools JSON: {str(e)}'})}\n\n"
                return

        svc = OpenRouterService()
        tool_executor = ToolExecutor() if parsed_tool_schemas else None

        def _content_to_text(content) -> str:
            try:
                if isinstance(content, str):
                    return content
                if isinstance(content, list):
                    parts = []
                    for block in content:
                        if (
                            isinstance(block, dict)
                            and block.get("type") == "text"
                            and isinstance(block.get("text"), str)
                        ):
                            parts.append(block.get("text", ""))
                    return "\n".join([p for p in parts if p])
            except Exception:
                pass
            return ""

        params = {"temperature": temperature, "top_p": top_p}
        if effective_max_tokens is not None:
            params["max_tokens"] = effective_max_tokens
        if reasoning_effort and reasoning_effort.lower() != "auto":
            params["reasoning"] = {"effort": reasoning_effort.lower()}

        if top_k is not None:
            params["top_k"] = top_k
        if frequency_penalty is not None:
            params["frequency_penalty"] = frequency_penalty
        if presence_penalty is not None:
            params["presence_penalty"] = presence_penalty
        if repetition_penalty is not None:
            params["repetition_penalty"] = repetition_penalty
        if min_p is not None:
            params["min_p"] = min_p
        if top_a is not None:
            params["top_a"] = top_a
        if seed is not None:
            params["seed"] = seed
        if response_format:
            rf_text = str(response_format).strip()
            provider_prefix = _provider_id_from_model(model)
            allow_response_format = provider_prefix not in {"xai"}
            if allow_response_format:
                try:
                    rf_obj = json.loads(rf_text)
                    if isinstance(rf_obj, dict):
                        params["response_format"] = rf_obj
                except Exception:
                    rf_lower = rf_text.lower()
                    if rf_lower in ("json", "json_object", "jsonobject"):
                        params["response_format"] = {"type": "json_object"}
        if stop:
            seps = [",", "\n"]
            parts = [stop]
            for sep in seps:
                parts = sum([p.split(sep) for p in parts], [])
            stop_list = [s.strip() for s in parts if s.strip()]
            if stop_list:
                params["stop"] = stop_list
        if logprobs is not None:
            params["logprobs"] = logprobs
        if top_logprobs is not None:
            try:
                clamped_top = max(1, min(5, int(top_logprobs)))
            except Exception:
                clamped_top = 1
            params["top_logprobs"] = clamped_top
            params["logprobs"] = True
        if logit_bias:
            with contextlib.suppress(Exception):
                params["logit_bias"] = json.loads(logit_bias)

        try:
            # Per-turn search dedupe/clamp (V2 only)
            search_cache: dict[str, dict] = {}
            unique_search_count = 0
            search_clamp_limit = 6
            clamp_warning_sent = False

            if parsed_tool_schemas and tool_executor:
                iteration = 0
                limit = max_tool_calls or 20
                should_force_tools_first_turn = False
                while iteration < limit:
                    iteration += 1

                    call_params = params.copy()
                    call_params["tools"] = parsed_tool_schemas
                    wants_search = "search_web" in tool_names
                    prompt_lower = (prompt or "").lower()
                    implies_needs_tools = wants_search and (
                        any(
                            k in prompt_lower
                            for k in [
                                "news",
                                "latest",
                                "recent",
                                "current",
                                "last ",
                                "past ",
                                "find",
                                "look up",
                                "search",
                            ]
                        )
                        or bool(parse_time_constraints(f"{system or ''} {prompt}"))
                    )

                    if tool_choice and tool_choice not in ("auto", "none"):
                        if tool_choice in tool_names:
                            call_params["tool_choice"] = {
                                "type": "function",
                                "function": {"name": tool_choice},
                            }
                            should_force_tools_first_turn = True
                        else:
                            call_params["tool_choice"] = "auto"
                    else:
                        call_params["tool_choice"] = (
                            "auto" if tool_choice != "none" else "none"
                        )

                    provider_prefix = _provider_id_from_model(model)
                    skip_forced_tool_choice = provider_prefix in {"xai"}

                    if (
                        iteration == 1
                        and implies_needs_tools
                        and "search_web" in tool_names
                        and call_params.get("tool_choice") == "auto"
                        and not skip_forced_tool_choice
                    ):
                        call_params["tool_choice"] = {
                            "type": "function",
                            "function": {"name": "search_web"},
                        }
                        should_force_tools_first_turn = True

                    # Provider guardrails
                    provider_prefix = _provider_id_from_model(model)
                    if provider_prefix in {"anthropic", "xai"}:
                        call_params["parallel_tool_calls"] = False

                    if tool_loop_v2:
                        # Streaming path: surface reasoning and tool_call deltas in real time
                        tool_builders: dict[int, dict] = {}
                        assistant_tool_msg = {"role": "assistant", "tool_calls": []}
                        completed_call: dict | None = None
                        # Stream events until we either see a completed tool call or the content finishes
                        async for ev in svc.stream_events(model=model, messages=messages, **call_params):
                            et = ev.get("type")
                            if et == "reasoning":
                                yield f"data: {json.dumps({'type': 'reasoning', 'content': ev.get('content', '')})}\n\n"
                                continue
                            if et == "tool_call_delta":
                                idx = int(ev.get("index") or 0)
                                b = tool_builders.get(idx) or {"id": ev.get("id"), "name": None, "arguments": ""}
                                if ev.get("id") and not b.get("id"):
                                    b["id"] = ev.get("id")
                                if ev.get("name"):
                                    b["name"] = ev.get("name")
                                if isinstance(ev.get("arguments"), str):
                                    b["arguments"] = (b.get("arguments") or "") + ev.get("arguments")
                                tool_builders[idx] = b
                                # Check if arguments parse as JSON and name exists → consider call complete
                                try:
                                    if b.get("name") and b.get("arguments"):
                                        json.loads(b["arguments"])  # will raise until complete
                                        call_id = b.get("id") or f"call_{idx}_{iteration}"
                                        completed_call = {
                                            "id": call_id,
                                            "name": b["name"],
                                            "arguments": b["arguments"],
                                        }
                                        break
                                except Exception:
                                    pass
                                continue
                            if et == "content_delta":
                                # Stream normal content when no tools are triggered
                                yield f"data: {json.dumps({'type': 'content', 'content': ev.get('content', '')})}\n\n"
                                sent_any_content = True
                                continue
                            if et == "done":
                                break

                        if completed_call is not None:
                            # Emit tool_calls for the first completed call and start execution
                            yield f"data: {json.dumps({'type': 'tool_calls', 'calls': [completed_call]})}\n\n"
                            assistant_tool_msg["tool_calls"].append(
                                {
                                    "id": completed_call["id"],
                                    "type": "function",
                                    "function": {
                                        "name": completed_call["name"],
                                        "arguments": completed_call["arguments"],
                                    },
                                }
                            )
                            messages.append(assistant_tool_msg)

                            func_name = completed_call["name"]
                            func_args_str = completed_call["arguments"]
                            try:
                                func_args = json.loads(func_args_str)
                            except json.JSONDecodeError:
                                func_args = {}

                            if func_name == "search_web":
                                try:
                                    hint = parse_time_constraints(f"{system or ''} \n {prompt}")
                                    if hint:
                                        for k in ("time_hint", "after", "before"):
                                            if k not in func_args:
                                                v = hint.get(k)
                                                if v:
                                                    func_args[k] = v
                                except Exception:
                                    pass

                            meta = _tool_metadata(func_name)
                            yield f"data: {json.dumps({'type': 'tool_executing', 'id': completed_call['id'], 'name': func_name, 'category': meta.get('category'), 'visibility': meta.get('visibility')})}\n\n"

                            # V2: dedupe/clamp for search_web
                            if func_name == "search_web":
                                try:
                                    q = (func_args.get("query") or "").strip().lower()
                                    k_after = str(func_args.get("after") or "").strip()
                                    k_before = str(func_args.get("before") or "").strip()
                                    k_hint = str(func_args.get("time_hint") or "").strip().lower()
                                    key = json.dumps({"q": q, "after": k_after, "before": k_before, "hint": k_hint}, sort_keys=True)

                                    if key in search_cache:
                                        result = search_cache[key]
                                    else:
                                        if unique_search_count >= search_clamp_limit:
                                            if not clamp_warning_sent:
                                                clamp_warning_sent = True
                                                yield f"data: {json.dumps({'type': 'warning', 'message': f'Trimmed tool calls to {search_clamp_limit}', 'code': 'TOOL_CLAMP'})}\n\n"
                                            result = {"success": False, "error": f"Search trimmed by clamp ({search_clamp_limit})"}
                                        else:
                                            result = await tool_executor.execute(func_name, func_args)
                                            if result and result.get("success"):
                                                search_cache[key] = result
                                                unique_search_count += 1
                                except Exception:
                                    result = await tool_executor.execute(func_name, func_args)
                            else:
                                result = await tool_executor.execute(func_name, func_args)

                            yield f"data: {json.dumps({'type': 'tool_result', 'id': completed_call['id'], 'name': func_name, 'result': result, 'category': meta.get('category'), 'visibility': meta.get('visibility')})}\n\n"

                            if result.get("success"):
                                tool_content = json.dumps(result.get("result", {}))
                            else:
                                tool_content = json.dumps({"error": result.get("error", "Tool execution failed")})

                            messages.append({"role": "tool", "tool_call_id": completed_call["id"], "content": tool_content})

                            # Ask model to finalize without tools
                            messages.append({"role": "user", "content": "Please use the tool results above to answer my original question."})

                            finalize_success = False
                            try:
                                finalize_params = params.copy()
                                finalize_params["tools"] = parsed_tool_schemas
                                finalize_params["tool_choice"] = "none"
                                finalize_response = await svc.completion(model=model, messages=messages, **finalize_params)
                                finalize_message = finalize_response.get("choices", [{}])[0].get("message", {})
                                finalize_content = _content_to_text(finalize_message.get("content", ""))
                                if finalize_content:
                                    yield f"data: {json.dumps({'type': 'content', 'content': finalize_content})}\n\n"
                                    finalize_success = True
                                    sent_any_content = True
                                    break
                            except Exception as e:
                                yield f"data: {json.dumps({'type': 'debug', 'message': f'Non-streaming finalization failed: {str(e)}'})}\n\n"

                            if not finalize_success:
                                try:
                                    stream_params = params.copy()
                                    async for chunk in svc.stream_completion(model=model, messages=messages, **stream_params):
                                        yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                                        sent_any_content = True
                                    break
                                except Exception as e:
                                    yield f"data: {json.dumps({'type': 'error', 'error': f'Streaming finalization failed: {str(e)}'})}\n\n"
                                    break
                        else:
                            # No tool calls found; if we streamed any content already, stop the loop
                            if sent_any_content:
                                break
                            else:
                                # Fallback: no content streamed (unlikely); ensure something is sent
                                yield f"data: {json.dumps({'type': 'content', 'content': 'No additional content generated.'})}\n\n"
                                sent_any_content = True
                                break
                    else:
                        response = await svc.completion(
                            model=model, messages=messages, **call_params
                        )
                        message = response.get("choices", [{}])[0].get("message", {})

                        # Attempt to surface model reasoning content when provided
                        reasoning_parts: list[str] = []
                        # Some providers expose top-level reasoning fields
                        for key in ("reasoning", "thinking"):
                            try:
                                v = message.get(key)
                                if isinstance(v, str) and v.strip():
                                    reasoning_parts.append(v)
                            except Exception:
                                pass
                        # And/or content blocks with various shapes
                        content_blocks = message.get("content")
                        if isinstance(content_blocks, list):
                            for block in content_blocks:
                                if not isinstance(block, dict):
                                    continue
                                btype = (block.get("type") or "").lower()
                                if btype in {"thinking", "reasoning"}:
                                    text = (
                                        block.get("thinking")
                                        or block.get("reasoning")
                                        or block.get("content")
                                        or block.get("text")
                                        or ""
                                    )
                                    if isinstance(text, str) and text.strip():
                                        reasoning_parts.append(text)
                        if reasoning_parts:
                            try:
                                import asyncio as _asyncio
                                text = "\n".join(reasoning_parts)
                                import re as _re
                                segments = [s for s in _re.split(r"(\n\n+|(?<=[\.!?])\s+)", text) if s and not s.isspace()]
                                if not segments:
                                    segments = [text]
                                for seg in segments:
                                    yield f"data: {json.dumps({'type': 'reasoning', 'content': seg})}\n\n"
                                    await _asyncio.sleep(0)
                            except Exception:
                                yield f"data: {json.dumps({'type': 'reasoning', 'content': '\n'.join(reasoning_parts)})}\n\n"

                        if tool_calls := message.get("tool_calls"):
                            tool_call_info = []
                            for tc in tool_calls:
                                tool_call_info.append(
                                    {
                                        "id": tc.get("id", "unknown"),
                                        "name": tc["function"]["name"],
                                        "arguments": tc["function"]["arguments"],
                                    }
                                )

                            yield f"data: {json.dumps({'type': 'tool_calls', 'calls': tool_call_info})}\n\n"

                            messages.append(message)

                            for tool_call in tool_calls:
                                tool_call_id = tool_call.get("id", "unknown")
                                func_name = tool_call["function"]["name"]
                                func_args_str = tool_call["function"]["arguments"]

                                meta = _tool_metadata(func_name)
                                yield f"data: {json.dumps({'type': 'tool_executing', 'id': tool_call_id, 'name': func_name, 'category': meta.get('category'), 'visibility': meta.get('visibility')})}\n\n"

                                try:
                                    func_args = json.loads(func_args_str)
                                except json.JSONDecodeError:
                                    func_args = {}

                                if func_name == "search_web":
                                    try:
                                        hint = parse_time_constraints(
                                            f"{system or ''} \n {prompt}"
                                        )
                                        if hint:
                                            for k in ("time_hint", "after", "before"):
                                                if k not in func_args:
                                                    v = hint.get(k)
                                                    if v:
                                                        func_args[k] = v
                                    except Exception:
                                        pass

                                # V2: dedupe/clamp for search_web
                                if tool_loop_v2 and func_name == "search_web":
                                    try:
                                        q = (func_args.get("query") or "").strip().lower()
                                        k_after = str(func_args.get("after") or "").strip()
                                        k_before = str(func_args.get("before") or "").strip()
                                        k_hint = str(func_args.get("time_hint") or "").strip().lower()
                                        key = json.dumps({"q": q, "after": k_after, "before": k_before, "hint": k_hint}, sort_keys=True)

                                        if key in search_cache:
                                            result = search_cache[key]
                                        else:
                                            if unique_search_count >= search_clamp_limit:
                                                if not clamp_warning_sent:
                                                    clamp_warning_sent = True
                                                    yield f"data: {json.dumps({'type': 'warning', 'message': f'Trimmed tool calls to {search_clamp_limit}', 'code': 'TOOL_CLAMP'})}\n\n"
                                                result = {"success": False, "error": f"Search trimmed by clamp ({search_clamp_limit})"}
                                            else:
                                                result = await tool_executor.execute(func_name, func_args)
                                                if result and result.get("success"):
                                                    search_cache[key] = result
                                                    unique_search_count += 1
                                    except Exception:
                                        result = await tool_executor.execute(func_name, func_args)
                                else:
                                    result = await tool_executor.execute(func_name, func_args)

                                yield f"data: {json.dumps({'type': 'tool_result', 'id': tool_call_id, 'name': func_name, 'result': result, 'category': meta.get('category'), 'visibility': meta.get('visibility')})}\n\n"

                                if result.get("success"):
                                    tool_content = json.dumps(result.get("result", {}))
                                else:
                                    tool_content = json.dumps(
                                        {
                                            "error": result.get(
                                                "error", "Tool execution failed"
                                            )
                                        }
                                    )

                                messages.append(
                                    {
                                        "role": "tool",
                                        "tool_call_id": tool_call.get("id", "unknown"),
                                        "content": tool_content,
                                    }
                                )

                            messages.append(
                                {
                                    "role": "user",
                                    "content": "Please use the tool results above to answer my original question.",
                                }
                            )

                            finalize_success = False
                            try:
                                finalize_params = params.copy()
                                finalize_params["tools"] = parsed_tool_schemas
                                finalize_params["tool_choice"] = "none"

                                finalize_response = await svc.completion(
                                    model=model, messages=messages, **finalize_params
                                )

                                finalize_message = finalize_response.get("choices", [{}])[
                                    0
                                ].get("message", {})
                                finalize_content = _content_to_text(
                                    finalize_message.get("content", "")
                                )

                                if finalize_content:
                                    yield f"data: {json.dumps({'type': 'content', 'content': finalize_content})}\n\n"
                                    finalize_success = True
                                    sent_any_content = True
                                    break
                            except Exception as e:
                                yield f"data: {json.dumps({'type': 'debug', 'message': f'Non-streaming finalization failed: {str(e)}'})}\n\n"

                            if not finalize_success:
                                try:
                                    stream_params = params.copy()
                                    async for ev in svc.stream_events(model=model, messages=messages, **stream_params):
                                        et = ev.get("type")
                                        if et == "reasoning":
                                            yield f"data: {json.dumps({'type': 'reasoning', 'content': ev.get('content', '')})}\n\n"
                                            continue
                                        if et == "content_delta":
                                            yield f"data: {json.dumps({'type': 'content', 'content': ev.get('content', '')})}\n\n"
                                            sent_any_content = True
                                            continue
                                        if et == "done":
                                            break
                                except Exception as e:
                                    yield f"data: {json.dumps({'type': 'error', 'error': f'Streaming finalization failed: {str(e)}'})}\n\n"
                                    break

                            if not sent_any_content:
                                yield f"data: {json.dumps({'type': 'content', 'content': 'No additional content generated.'})}\n\n"
                                sent_any_content = True
                            break
                        else:
                            content = _content_to_text(message.get("content", ""))
                            any_tools_executed = any(
                                True for msg in messages if msg.get("role") == "tool"
                            )
                            if content:
                                if (
                                    iteration == 2
                                    and not any_tools_executed
                                    and should_force_tools_first_turn
                                ):
                                    messages.append(message)
                                    continue
                                else:
                                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                                    sent_any_content = True
                                    break
                            else:
                                if iteration <= 2 and not any_tools_executed:
                                    messages.append(message)
                                    continue
                                else:
                                    yield f"data: {json.dumps({'type': 'content', 'content': 'No additional content generated.'})}\n\n"
                                    sent_any_content = True
                                    break

                if iteration >= limit:
                    yield f"data: {json.dumps({'type': 'warning', 'message': f'Reached maximum tool call iterations ({limit})'})}\n\n"
                    if not sent_any_content:
                        yield f"data: {json.dumps({'type': 'content', 'content': 'Stopped after maximum tool calls. No further content generated by the model.'})}\n\n"
                        sent_any_content = True
            else:
                async for chunk in svc.stream_completion(
                    model=model, messages=messages, **params
                ):
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    sent_any_content = True

            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            await svc.close()

    return StreamingResponse(generate(), media_type="text/event-stream")
