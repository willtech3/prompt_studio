from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from typing import Optional

from services.openrouter import OpenRouterService
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
):
    async def generate():
        # If no API key is set, return a helpful message.
        if not os.getenv("OPENROUTER_API_KEY"):
            yield "data: Set OPENROUTER_API_KEY to enable streaming.\n\n"
            return

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        if prompt:
            messages.append({"role": "user", "content": prompt})
        else:
            messages.append({"role": "user", "content": "Hello"})

        svc = OpenRouterService()
        params = {"temperature": temperature, "top_p": top_p}
        if max_tokens is not None:
            params["max_tokens"] = max_tokens
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
            async for chunk in svc.stream_completion(model=model, messages=messages, **params):
                # Wrap chunk in JSON format expected by frontend
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            # Send done signal
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            # Minimal error surfacing
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
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
        # Minimal helpful error
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")

    await create_all()
    # Fetch guide from database
    guide_row = (await session.execute(
        select(ProviderContent)
        .where(ProviderContent.provider_id == (req.provider or "").lower())
        .where(ProviderContent.content_type == "optimization_guide")
    )).scalar_one_or_none()

    guide = guide_row.content.get("guide", "Be clear, concise, and explicit.") if guide_row else "Be clear, concise, and explicit."
    sys = (
        "You are an expert prompt engineer. Optimize the given {kind} prompt "
        "for the specified model while preserving the user's intent. Apply the provider's prompting guides. "
        "Return strictly JSON with keys: optimized (string), changes (string[]), notes (string[])."
    ).format(kind=req.kind)

    user_parts = [
        f"PROVIDER_GUIDE:\n{guide}",
        f"MODEL_ID: {req.model}",
        f"PROMPT_KIND: {req.kind}",
    ]
    if req.system:
        user_parts.append(f"SYSTEM_CONTEXT:\n{req.system}")
    user_parts.append(f"ORIGINAL_PROMPT:\n<<<\n{req.prompt}\n>>>")
    user_parts.append(
        "Requirements:\n- Keep meaning.\n- Improve clarity and structure.\n- Add delimiters/sections where useful.\n- Suggest JSON format only when helpful."
    )
    user_msg = "\n\n".join(user_parts)

    svc = OpenRouterService()
    payload = await svc.completion(
        model=req.model,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    content = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    try:
        data = json.loads(content)
    except Exception:
        # If not JSON, return as optimized text with a simple note
        return OptimizeResponse(optimized=content or req.prompt, notes=["Model returned non-JSON output; used raw content."], changes=[])

    optimized = str(data.get("optimized", "")).strip() or req.prompt
    changes = data.get("changes") or []
    notes = data.get("notes") or []
    if not isinstance(changes, list):
        changes = [str(changes)]
    if not isinstance(notes, list):
        notes = [str(notes)]
    return OptimizeResponse(optimized=optimized, changes=[str(c) for c in changes], notes=[str(n) for n in notes])


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
