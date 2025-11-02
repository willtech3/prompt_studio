"""Refactored chat router with modular components."""

import os
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import create_all, get_session
from models.model_config import ModelConfig
from services.openrouter import OpenRouterService
from services.tool_executor import ToolExecutor

from .messages import (
    append_finalization_prompt,
    append_tool_result,
    build_assistant_tool_message,
    build_initial_messages,
    content_to_text,
)
from .parameters import (
    build_chat_params,
    parse_response_format,
    parse_stop_sequences,
)
from .providers import (
    apply_provider_constraints,
    get_provider_id,
    get_tool_choice_override,
)
from .streaming import (
    stream_content_event,
    stream_done_event,
    stream_error_event,
    stream_reasoning_event,
    stream_tool_calls_event,
    stream_tool_executing_event,
    stream_tool_result_event,
    stream_warning_event,
)
from .tools import (
    build_tool_call_from_delta,
    create_search_tool_schema,
    get_tool_metadata,
    parse_tool_arguments,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_TOOL_CALLS = 20


async def get_max_tokens(model: str, session: AsyncSession) -> int | None:
    """Get max tokens from database if available."""
    try:
        await create_all()
        result = await session.execute(
            select(ModelConfig).where(ModelConfig.model_id == model)
        )
        model_config = result.scalar_one_or_none()
        if model_config and model_config.max_completion_tokens:
            return model_config.max_completion_tokens
    except Exception:
        pass
    return None


async def stream_until_tool_call(
    svc: OpenRouterService,
    model: str,
    messages: list[dict[str, Any]],
    params: dict[str, Any]
) -> tuple[dict | None, bool, list[str]]:
    """Stream events until a tool call is complete or content finishes.

    Returns:
        Tuple of (completed_call, content_sent, yielded_events)
    """
    tool_builders: dict[int, dict] = {}
    completed_call: dict | None = None
    content_sent = False
    yielded_events = []

    async for event in svc.stream_events(model=model, messages=messages, **params):
        event_type = event.get("type")

        if event_type == "reasoning":
            event_str = stream_reasoning_event(event.get("content", ""))
            yielded_events.append(event_str)

        elif event_type == "tool_call_delta":
            idx = int(event.get("index") or 0)
            builder = tool_builders.get(idx, {
                "id": event.get("id"),
                "name": None,
                "arguments": "",
            })

            if event.get("id") and not builder.get("id"):
                builder["id"] = event.get("id")
            if event.get("name"):
                builder["name"] = event.get("name")
            if isinstance(event.get("arguments"), str):
                builder["arguments"] = builder.get("arguments", "") + event.get("arguments")

            tool_builders[idx] = builder

            # Check if tool call is complete
            completed_call = build_tool_call_from_delta(builder)
            if completed_call:
                completed_call["id"] = builder.get("id") or f"call_{idx}"
                break

        elif event_type == "content_delta":
            event_str = stream_content_event(event.get("content", ""))
            yielded_events.append(event_str)
            content_sent = True

        elif event_type == "done":
            break

    return completed_call, content_sent, yielded_events


async def finalize_response(
    svc: OpenRouterService,
    model: str,
    messages: list[dict[str, Any]],
    params: dict[str, Any],
    tools: list[dict[str, Any]]
) -> AsyncGenerator[str]:
    """Finalize response after tool execution."""
    messages = append_finalization_prompt(messages)

    # Try non-streaming with tool_choice=none first
    try:
        finalize_params = params.copy()
        finalize_params["tools"] = tools
        finalize_params["tool_choice"] = "none"

        response = await svc.completion(model=model, messages=messages, **finalize_params)
        message = response.get("choices", [{}])[0].get("message", {})
        content = content_to_text(message.get("content", ""))

        if content:
            yield stream_content_event(content)
            return
    except Exception:
        pass

    # Fallback to streaming
    try:
        async for chunk in svc.stream_completion(model=model, messages=messages, **params):
            yield stream_content_event(chunk)
    except Exception as e:
        yield stream_error_event(f"Streaming finalization failed: {str(e)}")


async def execute_with_tools(
    svc: OpenRouterService,
    model: str,
    messages: list[dict[str, Any]],
    params: dict[str, Any],
    tools: list[dict[str, Any]],
    tool_names: set[str],
    tool_choice: str | None,
    max_calls: int
) -> AsyncGenerator[str]:
    """Execute chat with tool calling support."""
    executor = ToolExecutor()
    provider = get_provider_id(model)
    iteration = 0

    while iteration < max_calls:
        iteration += 1

        # Prepare parameters for this iteration
        call_params = params.copy()
        call_params["tools"] = tools

        # Set tool choice - trust the model to decide when to use tools
        call_params["tool_choice"] = get_tool_choice_override(
            tool_choice, provider, tool_names
        )

        # Apply provider constraints
        call_params = apply_provider_constraints(call_params, model, has_tools=True)

        # Stream until tool call or completion
        completed_call, content_sent, events = await stream_until_tool_call(
            svc, model, messages, call_params
        )

        # Yield all the events that were collected
        for event in events:
            yield event

        if not completed_call:
            if content_sent:
                break  # Content was streamed, we're done
            else:
                yield stream_content_event("No additional content generated.")
                break

        # Execute tool call
        yield stream_tool_calls_event([completed_call])

        # Add assistant message with tool call
        assistant_msg = build_assistant_tool_message([completed_call])
        messages.append(assistant_msg)

        # Execute tool
        func_name = completed_call["name"]
        func_args = parse_tool_arguments(completed_call["arguments"])
        meta = get_tool_metadata(func_name)

        yield stream_tool_executing_event(
            completed_call["id"], func_name,
            meta["category"], meta["visibility"]
        )

        # Execute tool directly - trust model to not spam identical queries
        result = await executor.execute(func_name, func_args)

        yield stream_tool_result_event(
            completed_call["id"], func_name, result,
            meta["category"], meta["visibility"]
        )

        # Add tool result to messages
        messages = append_tool_result(messages, completed_call["id"], result)

        # Ask model to finalize
        async for event in finalize_response(svc, model, messages, params, tools):
            yield event
        break

    if iteration >= max_calls:
        yield stream_warning_event(f"Reached maximum tool call iterations ({max_calls})")


@router.get("/stream")
async def stream_chat(
    model: str = Query(..., description="Model ID to use"),
    prompt: str = Query("", description="User prompt content"),
    system: str | None = Query(None, description="Optional system prompt"),
    temperature: float | None = Query(0.7, ge=0, le=2),
    max_tokens: int | None = Query(None, ge=1),
    top_p: float | None = Query(1.0, ge=0, le=1),
    reasoning_effort: str | None = Query(None),
    tool_choice: str | None = Query("auto"),
    max_tool_calls: int = Query(5, ge=1, le=20),
    top_k: int | None = Query(None),
    frequency_penalty: float | None = Query(None),
    presence_penalty: float | None = Query(None),
    response_format: str | None = Query(None),
    stop: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Stream chat completion with optional tool calling."""
    async def generate():
        # Check API key
        if not os.getenv("OPENROUTER_API_KEY"):
            yield stream_warning_event("Set OPENROUTER_API_KEY to enable streaming.")
            yield stream_done_event()
            return

        # Get max tokens from database if not provided
        effective_max_tokens = max_tokens
        if effective_max_tokens is None:
            effective_max_tokens = await get_max_tokens(model, session)

        # Build messages
        messages = build_initial_messages(system, prompt)

        # Always provide search_web tool - trust model to decide when to use it
        parsed_tools = [create_search_tool_schema()]
        tool_names = {"search_web"}

        # Build parameters
        params = build_chat_params(
            temperature, top_p, effective_max_tokens,
            top_k, frequency_penalty, presence_penalty,
            reasoning_effort
        )

        # Add response format
        response_fmt = parse_response_format(response_format, model)
        if response_fmt:
            params["response_format"] = response_fmt

        # Add stop sequences
        stop_sequences = parse_stop_sequences(stop)
        if stop_sequences:
            params["stop"] = stop_sequences

        # Initialize service
        svc = OpenRouterService()

        try:
            if parsed_tools:
                # Execute with tools
                async for event in execute_with_tools(
                    svc, model, messages, params, parsed_tools, tool_names,
                    tool_choice, max_tool_calls or MAX_TOOL_CALLS
                ):
                    yield event
            else:
                # Simple streaming without tools
                async for chunk in svc.stream_completion(model, messages, **params):
                    yield stream_content_event(chunk)

            yield stream_done_event()

        except Exception as e:
            yield stream_error_event(str(e))
        finally:
            await svc.close()

    return StreamingResponse(generate(), media_type="text/event-stream")
