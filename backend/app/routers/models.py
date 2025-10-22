from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from config.db import create_all, get_session
from models.model_config import ModelConfig
from services.model_catalog import refresh_model_catalog

# Router for model metadata endpoints
router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
async def list_models(session: AsyncSession = Depends(get_session)):
    """Return available models from database."""
    await create_all()
    rows = (
        await session.execute(
            select(ModelConfig).order_by(ModelConfig.provider, ModelConfig.model_id)
        )
    ).scalars().all()
    return {"data": [r.raw or {"id": r.model_id, "name": r.model_name} for r in rows]}


@router.get("/{model_path:path}/info")
async def get_model_info(model_path: str, session: AsyncSession = Depends(get_session)):
    """Return detailed model metadata for a given model ID."""
    await create_all()
    row = (
        await session.execute(
            select(ModelConfig).where(ModelConfig.model_id == model_path)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Model not found")
    return row.raw or {"id": row.model_id, "name": row.model_name}


@router.post("/refresh")
async def models_refresh(session: AsyncSession = Depends(get_session)):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")
    try:
        await create_all()
        stats = await refresh_model_catalog(session)
        return {"ok": True, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
