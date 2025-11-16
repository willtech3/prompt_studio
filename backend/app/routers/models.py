import os
import hashlib
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from models.model_config import ModelConfig
from services.model_catalog import refresh_model_catalog

# Router for model metadata endpoints
router = APIRouter(prefix="/api/models", tags=["models"])


MODELS_TTL_SECONDS = 3600
_models_cache: dict = {"expires": 0.0, "etag": "", "payload": {"data": []}}


@router.get("")
async def list_models(request: Request, response: Response, session: AsyncSession = Depends(get_session)):
    """Return available models from database with simple ETag/TTL caching."""
    now = time.time()
    if now > _models_cache["expires"]:
        rows = (
            (
                await session.execute(
                    select(ModelConfig).order_by(ModelConfig.provider, ModelConfig.model_id)
                )
            )
            .scalars()
            .all()
        )
        payload = {"data": [r.raw or {"id": r.model_id, "name": r.model_name} for r in rows]}
        etag = hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        _models_cache.update({"expires": now + MODELS_TTL_SECONDS, "etag": etag, "payload": payload})

    if request.headers.get("if-none-match") == _models_cache["etag"]:
        response.status_code = 304
        return
    response.headers["ETag"] = _models_cache["etag"]
    response.headers["Cache-Control"] = f"public, max-age={MODELS_TTL_SECONDS}"
    return _models_cache["payload"]


@router.get("/{model_path:path}/info")
async def get_model_info(model_path: str, session: AsyncSession = Depends(get_session)):
    """Return detailed model metadata for a given model ID."""
    row = (
        await session.execute(select(ModelConfig).where(ModelConfig.model_id == model_path))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Model not found")
    return row.raw or {"id": row.model_id, "name": row.model_name}


@router.post("/refresh")
async def models_refresh(session: AsyncSession = Depends(get_session)):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")
    try:
        stats = await refresh_model_catalog(session)
        return {"ok": True, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
