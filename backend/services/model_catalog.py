from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .openrouter import OpenRouterService
from models.model_config import ModelConfig


async def refresh_model_catalog(session: AsyncSession) -> dict[str, int]:
    """Refresh model catalog from OpenRouter API into model_configs table."""
    svc = OpenRouterService()
    data = await svc.list_models()
    items = data.get("data", []) or []
    inserted = 0
    updated = 0

    existing = {m.model_id: m for m in (await session.execute(select(ModelConfig))).scalars().all()}
    for item in items:
        if not isinstance(item, dict):
            continue

        model_id = str(item.get("id"))
        name = item.get("name") or model_id
        pricing = item.get("pricing") or {}
        context_len = item.get("context_length")
        top_provider = item.get("top_provider") or {}
        architecture = item.get("architecture") or {}

        # Extract provider from model_id (e.g., "openai/gpt-4" -> "openai")
        provider = model_id.split("/")[0] if "/" in model_id else "unknown"

        record = existing.get(model_id)
        if record is None:
            record = ModelConfig(
                model_id=model_id,
                model_name=name,
                provider=provider,
                description=item.get("description"),
                context_length=context_len,
                top_provider_context_length=top_provider.get("context_length"),
                max_completion_tokens=top_provider.get("max_completion_tokens"),
                is_moderated=top_provider.get("is_moderated"),
                supports_streaming=True,  # Most OpenRouter models support streaming
                pricing=pricing,
                architecture=architecture,
                model_created=item.get("created"),
                per_request_limits=item.get("per_request_limits"),
                supported_parameters=item.get("supported_parameters"),
                raw=item,
            )
            session.add(record)
            inserted += 1
        else:
            # Update existing record
            record.model_name = name
            record.provider = provider
            record.description = item.get("description")
            record.context_length = context_len
            record.top_provider_context_length = top_provider.get("context_length")
            record.max_completion_tokens = top_provider.get("max_completion_tokens")
            record.is_moderated = top_provider.get("is_moderated")
            record.pricing = pricing
            record.architecture = architecture
            record.model_created = item.get("created")
            record.per_request_limits = item.get("per_request_limits")
            record.supported_parameters = item.get("supported_parameters")
            record.raw = item
            updated += 1

    await session.commit()
    await svc.close()
    return {"inserted": inserted, "updated": updated}
