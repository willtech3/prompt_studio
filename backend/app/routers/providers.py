from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config.db import get_session, create_all
from models.provider_content import ProviderContent
from models.model_config import ModelConfig

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("")
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


@router.get("/{provider_id}/guide")
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


@router.get("/{provider_id}/prompting-guides")
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
