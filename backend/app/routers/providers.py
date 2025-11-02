from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from models.model_config import ModelConfig
from models.provider_content import ProviderContent

router = APIRouter(prefix="/api/providers", tags=["providers"])


def _display_name(provider_id: str) -> str:
    mapping = {
        "xai": "xAI",
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "google": "Google",
        "mistral": "Mistral",
        "meta": "Meta",
        "perplexity": "Perplexity",
        "cohere": "Cohere",
    }
    return mapping.get(provider_id, provider_id.title())


@router.get("")
async def list_providers(session: AsyncSession = Depends(get_session)):
    """Return list of supported providers with their model counts."""
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
    supported = (
        (await session.execute(select(ProviderContent.provider_id).distinct())).scalars().all()
    )

    providers = []
    for provider_id in supported:
        providers.append(
            {
                "id": provider_id,
                "name": _display_name(provider_id),
                "model_count": provider_counts.get(provider_id, 0),
            }
        )

    return {"data": sorted(providers, key=lambda p: p["id"])}


@router.get("/{provider_id}/guide")
async def get_provider_guide(provider_id: str, session: AsyncSession = Depends(get_session)):
    """Return optimization guide for a provider as a structured object."""
    row = (
        await session.execute(
            select(ProviderContent)
            .where(ProviderContent.provider_id == provider_id)
            .where(ProviderContent.content_type == "optimization_guide")
        )
    ).scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Provider guide not found")

    return {"title": row.title, "content": row.content, "doc_url": row.doc_url}


@router.get("/{provider_id}/prompting-guides")
async def get_provider_prompting_guides(
    provider_id: str,
    model_id: str | None = Query(
        None, description="Optional model ID for model-specific guidance"
    ),
    session: AsyncSession = Depends(get_session),
):
    """Return prompting guides for a provider, optionally filtered by model."""
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
        "doc_url": general_row.doc_url,
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
                "doc_url": model_row.doc_url,
            }

    return result
