from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from typing import Optional

from services.openrouter import OpenRouterService
from services.tool_executor import ToolExecutor
from dotenv import load_dotenv
from pathlib import Path
import json
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import create_all, get_session, init_engine, try_get_session
from services.model_catalog import refresh_model_catalog
from models.snapshot import Snapshot
from models.model_config import ModelConfig
from models.provider_content import ProviderContent
import uuid
from sqlalchemy import select
import datetime as dt


def get_cors_origins() -> list[str]:
    # Minimal: allow local dev frontends
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def load_env_from_project_root() -> None:
    """Load .env from backend cwd and project root.

    - First try default CWD (backend) for local overrides
    - Then try project root (../../.env from this file)
    """
    # Load from backend current working directory first
    load_dotenv(override=False)

    # Load from project root if present
    try:
        root_env = Path(__file__).resolve().parents[2] / ".env"
        if root_env.exists():
            load_dotenv(dotenv_path=str(root_env), override=False)
    except Exception:
        # Keep minimal: ignore if path resolution fails
        pass


load_env_from_project_root()

app = FastAPI(title="Prompt Engineering Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    # also report DB availability
    db_ready = init_engine() is not None
    return {"status": "healthy", "db": db_ready}


@app.get("/api/chat/stream")
async def stream_chat(
    model: str = Query(..., description="Model ID to use"),
    prompt: str = Query("", description="User prompt content"),
    system: Optional[str] = Query(None, description="Optional system prompt"),
    temperature: Optional[float] = Query(0.7, ge=0, le=2, description="Sampling temperature"),
    max_tokens: Optional[int] = Query(None, ge=1, description="Max tokens for completion"),
    top_p: Optional[float] = Query(1.0, ge=0, le=1, description="Nucleus sampling"),
    reasoning_effort: Optional[str] = Query(None, description="Reasoning effort: low|medium|high"),
    # Tool calling parameters
    tools: Optional[str] = Query(None, description="JSON-encoded array of tool schemas (OpenAI format)"),
    tool_choice: Optional[str] = Query("auto", description="Tool choice: 'auto', 'required', 'none', or tool name"),
    max_tool_calls: int = Query(5, ge=1, le=20, description="Maximum tool call iterations to prevent infinite loops"),
    # Additional tunable parameters (pass-through when provided)
    top_k: Optional[int] = Query(None, description="Top-K sampling"),
    frequency_penalty: Optional[float] = Query(None, description="Frequency penalty"),
    presence_penalty: Optional[float] = Query(None, description="Presence penalty"),
    repetition_penalty: Optional[float] = Query(None, description="Repetition penalty"),
    min_p: Optional[float] = Query(None, description="Minimum probability threshold"),
    top_a: Optional[float] = Query(None, description="Top-A sampling"),
    seed: Optional[int] = Query(None, description="Deterministic seed"),
    response_format: Optional[str] = Query(None, description="Response format, e.g. json or json_object"),
    stop: Optional[str] = Query(None, description="Comma or newline-separated stop sequences"),
    logprobs: Optional[bool] = Query(None, description="Return log probabilities of tokens"),
    top_logprobs: Optional[int] = Query(None, description="How many top tokens to include in logprobs"),
    logit_bias: Optional[str] = Query(None, description="JSON object mapping token IDs to bias values"),
    session: AsyncSession = Depends(get_session),
):
    async def generate():
        # If no API key is set, return a helpful message.
        if not os.getenv("OPENROUTER_API_KEY"):
            yield "data: Set OPENROUTER_API_KEY to enable streaming.\n\n"
            return

        # Fetch model configuration to get max_completion_tokens
        effective_max_tokens = max_tokens
        if effective_max_tokens is None:
            try:
                await create_all()
                model_config = (await session.execute(
                    select(ModelConfig).where(ModelConfig.model_id == model)
                )).scalar_one_or_none()
                
                if model_config and model_config.max_completion_tokens:
                    effective_max_tokens = model_config.max_completion_tokens
            except Exception:
                # Minimal: if we can't fetch model config, proceed without max_tokens
                pass

        # Build initial messages
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        if prompt:
            messages.append({"role": "user", "content": prompt})
        else:
            messages.append({"role": "user", "content": "Hello"})

        # Parse tool schemas if provided
        tool_schemas = None
        if tools:
            try:
                tool_schemas = json.loads(tools)
                if not isinstance(tool_schemas, list):
                    yield f"data: {json.dumps({'error': 'Tools must be a JSON array'})}\n\n"
                    return
            except json.JSONDecodeError as e:
                yield f"data: {json.dumps({'error': f'Invalid tools JSON: {str(e)}'})}\n\n"
                return

        # Initialize services
        svc = OpenRouterService()
        tool_executor = ToolExecutor() if tool_schemas else None
        
        # Build base parameters
        params = {"temperature": temperature, "top_p": top_p}
        if effective_max_tokens is not None:
            params["max_tokens"] = effective_max_tokens
        if reasoning_effort and reasoning_effort.lower() != "auto":
            params["reasoning"] = {"effort": reasoning_effort.lower()}

        # Optional pass-through parameters
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
            params["response_format"] = response_format
        if stop:
            # Accept either comma or newline separated values
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
            params["top_logprobs"] = top_logprobs
        if logit_bias:
            try:
                params["logit_bias"] = json.loads(logit_bias)
            except Exception:
                # Minimal: ignore malformed logit_bias
                pass

        try:
            # Tool calling loop
            if tool_schemas and tool_executor:
                iteration = 0
                while iteration < max_tool_calls:
                    iteration += 1
                    
                    # Add tools to params for this iteration
                    call_params = params.copy()
                    call_params["tools"] = tool_schemas
                    call_params["tool_choice"] = tool_choice if iteration == 1 else "auto"
                    
                    # Call model (non-streaming for tool use)
                    response = await svc.completion(
                        model=model,
                        messages=messages,
                        **call_params
                    )
                    
                    message = response.get("choices", [{}])[0].get("message", {})
                    
                    # Check if model wants to call tools
                    if tool_calls := message.get("tool_calls"):
                        # Notify frontend about tool calls
                        tool_call_info = []
                        for tc in tool_calls:
                            tool_call_info.append({
                                "id": tc.get("id", "unknown"),
                                "name": tc["function"]["name"],
                                "arguments": tc["function"]["arguments"]
                            })
                        
                        yield f"data: {json.dumps({'type': 'tool_calls', 'calls': tool_call_info})}\n\n"
                        
                        # Add assistant message with tool calls to conversation history
                        messages.append(message)
                        
                        # Execute each tool
                        for tool_call in tool_calls:
                            func_name = tool_call["function"]["name"]
                            func_args_str = tool_call["function"]["arguments"]
                            
                            # Notify that we're executing
                            yield f"data: {json.dumps({'type': 'tool_executing', 'name': func_name})}\n\n"
                            
                            # Parse arguments
                            try:
                                func_args = json.loads(func_args_str)
                            except json.JSONDecodeError:
                                func_args = {}
                            
                            # Execute tool
                            result = await tool_executor.execute(func_name, func_args)
                            
                            # Send tool result to frontend
                            yield f"data: {json.dumps({'type': 'tool_result', 'name': func_name, 'result': result})}\n\n"
                            
                            # Add tool result to conversation
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.get("id", "unknown"),
                                "content": json.dumps(result)
                            })
                        
                        # Continue loop - model will process tool results
                        continue
                    else:
                        # Model provided final answer without tools
                        content = message.get("content", "")
                        if content:
                            # Stream the final content
                            yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                        break
                
                # If we hit max iterations
                if iteration >= max_tool_calls:
                    yield f"data: {json.dumps({'type': 'warning', 'message': f'Reached maximum tool call iterations ({max_tool_calls})'})}\n\n"
            
            else:
                # Regular streaming without tools
                async for chunk in svc.stream_completion(model=model, messages=messages, **params):
                    # Wrap chunk in JSON format expected by frontend
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            
            # Send done signal
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
            
        except Exception as e:
            # Minimal error surfacing
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            await svc.close()

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/models")
async def list_models(session: AsyncSession = Depends(get_session)):
    """Return available models from database."""
    await create_all()
    rows = (await session.execute(select(ModelConfig).order_by(ModelConfig.provider, ModelConfig.model_id))).scalars().all()
    return {"data": [r.raw or {"id": r.model_id, "name": r.model_name} for r in rows]}


@app.get("/api/models/{model_path:path}/info")
async def get_model_info(model_path: str, session: AsyncSession = Depends(get_session)):
    """Return detailed model metadata for a given model ID."""
    await create_all()
    row = (await session.execute(select(ModelConfig).where(ModelConfig.model_id == model_path))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Model not found")
    return row.raw or {"id": row.model_id, "name": row.model_name}


@app.post("/api/models/refresh")
async def models_refresh(session: AsyncSession = Depends(get_session)):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")
    try:
        await create_all()
        stats = await refresh_model_catalog(session)
        return {"ok": True, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Provider Content ----

@app.get("/api/providers")
async def list_providers(session: AsyncSession = Depends(get_session)):
    """Return list of supported providers with their model counts."""
    await create_all()

    # Get all models and extract unique providers
    models = (await session.execute(select(ModelConfig))).scalars().all()
    provider_counts: dict[str, int] = {}

    for m in models:
        if "/" in m.model_id:
            provider = m.model_id.split("/")[0]
            # Normalize provider name (x-ai -> xai)
            provider = provider.replace("-", "")
            provider_counts[provider] = provider_counts.get(provider, 0) + 1

    # Filter to only supported providers (those with content)
    supported = (await session.execute(
        select(ProviderContent.provider_id).distinct()
    )).scalars().all()

    providers = []
    for provider_id in supported:
        providers.append({
            "id": provider_id,
            "name": provider_id.title(),
            "model_count": provider_counts.get(provider_id, 0)
        })

    return {"data": sorted(providers, key=lambda p: p["id"])}


@app.get("/api/providers/{provider_id}/guide")
async def get_provider_guide(provider_id: str, session: AsyncSession = Depends(get_session)):
    """Return optimization guide for a provider."""
    await create_all()
    row = (await session.execute(
        select(ProviderContent)
        .where(ProviderContent.provider_id == provider_id)
        .where(ProviderContent.content_type == "optimization_guide")
    )).scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Provider guide not found")

    return row.content


@app.get("/api/providers/{provider_id}/prompting-guides")
async def get_provider_prompting_guides(
    provider_id: str,
    model_id: Optional[str] = Query(None, description="Optional model ID for model-specific guidance"),
    session: AsyncSession = Depends(get_session)
):
    """Return prompting guides for a provider, optionally filtered by model."""
    await create_all()

    # Build query for general provider guidance (model_id IS NULL)
    query = (
        select(ProviderContent)
        .where(ProviderContent.provider_id == provider_id)
        .where(ProviderContent.model_id.is_(None))
    )

    general_row = (await session.execute(query)).scalar_one_or_none()

    if not general_row:
        raise HTTPException(status_code=404, detail="Provider prompting guides not found")

    result = {
        "title": general_row.title,
        "content": general_row.content,
        "doc_url": general_row.doc_url
    }

    # If model_id provided, fetch and append model-specific guidance
    if model_id:
        model_query = (
            select(ProviderContent)
            .where(ProviderContent.provider_id == provider_id)
            .where(ProviderContent.model_id == model_id)
        )
        model_row = (await session.execute(model_query)).scalar_one_or_none()

        if model_row:
            result["model_specific"] = {
                "title": model_row.title,
                "content": model_row.content,
                "doc_url": model_row.doc_url
            }

    return result


# ---- Prompt Optimization ----

# OpenAI's official meta-prompt for prompt optimization
# Source: https://the-decoder.com/openai-releases-its-meta-prompt-for-prompt-optimization/
META_PROMPT = """Given a task description or existing prompt, produce a detailed system prompt to guide a language model in completing the task effectively.

# Guidelines

- Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
- Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
- Reasoning Before Conclusions: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
- Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
- Conclusion, classifications, or results should ALWAYS appear last.
- Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
- What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
- Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
- Formatting: Use markdown features for readability. DO NOT USE ``` CODE BLOCKS UNLESS SPECIFICALLY REQUESTED.
- Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
- Constants: DO include constants in the prompt, as they are not susceptible to prompt injection. Such as guides, rubrics, and examples.
- Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
- For tasks outputting well-defined or structured data (classification, JSON, etc.) bias towards outputting a JSON.
- JSON should never be wrapped in code blocks (```) unless explicitly requested.

The final prompt you output should adhere to the following structure below. Do not include any additional commentary, only output the completed system prompt. SPECIFICALLY, do not include any additional messages at the start or end of the prompt. (e.g. no "---")

[Concise instruction describing the task - this should be the first line in the prompt, no section header]

[Additional details as needed.]

[Optional sections with headings or bullet points for detailed steps.]

# Steps [optional]

[optional: a detailed breakdown of the steps necessary to accomplish the task]

# Output Format

[Specifically call out how the output should be formatted, be it response length, structure e.g. JSON, markdown, etc]

# Examples [optional]

[Optional: 1-3 well-defined examples with placeholders if necessary. Clearly mark where examples start and end, and what the input and output are. User placeholders as necessary.]
[If the examples are shorter than what a realistic example is expected to be, make a reference with () explaining how real examples should be longer / shorter / different. AND USE PLACEHOLDERS! ]

# Notes [optional]

[optional: edge cases, details, and an area to call or repeat out specific important considerations]
"""

# Provider-specific optimization hints
PROVIDER_HINTS = {
    "anthropic": "Claude models work best with XML-style tags like <instructions>, <context>, <thinking>, and <output>. Use explicit thinking blocks for complex reasoning tasks.",
    "openai": "GPT models benefit from clear delimiters (triple quotes, <<<>>>), step-by-step instructions, specific role definitions, and explicit output format specifications.",
    "deepseek": "DeepSeek-R1 models benefit from explicit <think> tags for reasoning tasks. Be explicit about showing work and breaking down complex queries into sequential prompts.",
    "google": "Gemini models work well with structured sections, explicit role definitions, and grounding passages. Specify token budgets and use numbered outputs.",
    "xai": "Grok models prefer explicit JSON schemas for structured output, clear role definitions, and tuning one parameter at a time."
}


class OptimizeRequest(BaseModel):
    model: str
    provider: Optional[str] = None
    kind: str  # 'system' | 'user'
    prompt: str
    system: Optional[str] = None


class OptimizeResponse(BaseModel):
    optimized: str
    changes: list[str] = []
    notes: list[str] = []


@app.post("/api/optimize", response_model=OptimizeResponse)
async def optimize_prompt(req: OptimizeRequest, session: AsyncSession = Depends(get_session)):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")

    # Use OpenAI's meta-prompt as system prompt
    system_prompt = META_PROMPT

    # Build user message - just the prompt to optimize plus provider context
    provider_id = (req.provider or "").lower()
    provider_hint = PROVIDER_HINTS.get(provider_id, "")

    # Simple, direct message: just the prompt + provider context
    user_parts = []

    # Add provider-specific guidance as context
    if provider_hint:
        user_parts.append(f"Provider context: This prompt will be used with {req.model} ({provider_id}). {provider_hint}")
        user_parts.append("")

    # Add system context if optimizing a user prompt
    if req.system and req.kind == "user":
        user_parts.append(f"System prompt context (for reference only, do not optimize this):")
        user_parts.append(req.system)
        user_parts.append("")

    # The actual prompt to optimize
    user_parts.append(req.prompt)

    user_msg = "\n".join(user_parts)

    # Call the same model to optimize for itself (e.g., Claude optimizes for Claude)
    svc = OpenRouterService()
    payload = await svc.completion(
        model=req.model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.5,  # Slightly higher for creative optimization suggestions
    )

    optimized_prompt = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    if not optimized_prompt:
        return OptimizeResponse(
            optimized=req.prompt,
            notes=["Optimization failed: empty response from model"],
            changes=[]
        )

    # Extract changes and notes from comparison
    changes = []
    notes = []

    # Simple heuristic: if the optimized prompt is significantly different, note it
    if len(optimized_prompt) > len(req.prompt) * 1.2:
        changes.append("Expanded prompt with additional structure and clarity")
    elif len(optimized_prompt) < len(req.prompt) * 0.8:
        changes.append("Condensed prompt for clarity")
    else:
        changes.append("Refined prompt structure and wording")

    # Check for provider-specific patterns
    if provider_id == "anthropic" and ("<" in optimized_prompt and ">" in optimized_prompt):
        notes.append("Added XML-style tags for better structure")
    elif provider_id == "openai" and ("```" in optimized_prompt or "<<<" in optimized_prompt):
        notes.append("Added delimiters for clear input/output separation")
    elif provider_id == "deepseek" and "<think>" in optimized_prompt.lower():
        notes.append("Added thinking blocks for reasoning tasks")

    if "# " in optimized_prompt or "## " in optimized_prompt:
        notes.append("Added section headers for organization")

    return OptimizeResponse(
        optimized=optimized_prompt,
        changes=changes,
        notes=notes
    )


# ---- Snapshot Save/Retrieve ----

class SaveRequest(BaseModel):
    title: str | None = None
    kind: str | None = None  # 'system','user','prompt','state'
    provider: str | None = None
    model: str | None = None
    data: dict | None = None  # arbitrary: system_prompt, user_prompt, response, parameters, notes


class SaveResponse(BaseModel):
    id: str
    title: str | None = None
    kind: str
    provider: str | None = None
    model: str | None = None
    created_at: str


@app.post("/api/saves", response_model=SaveResponse)
async def create_save(payload: SaveRequest, session: AsyncSession | None = Depends(try_get_session)):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
    await create_all()
    sid = str(uuid.uuid4())
    kind = payload.kind or "state"
    snap = Snapshot(
        id=sid,
        title=payload.title,
        kind=kind,
        provider=payload.provider,
        model=payload.model,
        data=payload.data or {},
    )
    session.add(snap)
    await session.commit()
    return SaveResponse(id=sid, title=payload.title, kind=kind, provider=payload.provider, model=payload.model, created_at=dt.datetime.utcnow().isoformat())


class SaveItem(BaseModel):
    id: str
    title: str | None = None
    kind: str
    provider: str | None = None
    model: str | None = None
    created_at: str


@app.get("/api/saves", response_model=list[SaveItem])
async def list_saves(session: AsyncSession | None = Depends(try_get_session)):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
    await create_all()
    rows = (await session.execute(select(Snapshot).order_by(Snapshot.created_at.desc()))).scalars().all()
    out: list[SaveItem] = []
    for r in rows:
        out.append(SaveItem(id=r.id, title=r.title, kind=r.kind, provider=r.provider, model=r.model, created_at=(r.created_at.isoformat() if r.created_at else "")))
    return out


@app.get("/api/saves/{sid}")
async def get_save(sid: str, session: AsyncSession | None = Depends(try_get_session)):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
    row = (await session.execute(select(Snapshot).where(Snapshot.id == sid))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": row.id,
        "title": row.title,
        "kind": row.kind,
        "provider": row.provider,
        "model": row.model,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "data": row.data or {},
    }
