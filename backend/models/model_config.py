"""Model configuration."""
from __future__ import annotations

import datetime as dt
import uuid as uuid_pkg
from sqlalchemy import String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from config.db import Base


class ModelConfig(Base):
    """Model configuration and metadata."""

    __tablename__ = "model_configs"

    id: Mapped[uuid_pkg.UUID] = mapped_column(primary_key=True, default=uuid_pkg.uuid4)
    model_id: Mapped[str] = mapped_column(String(255), unique=True)
    model_name: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(100))
    context_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    supports_streaming: Mapped[bool | None] = mapped_column(Boolean, default=True, nullable=True)
    pricing: Mapped[dict | None] = mapped_column(JSONB, default={}, nullable=True)

    # New OpenRouter fields
    canonical_slug: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_created: Mapped[int | None] = mapped_column(Integer, nullable=True)
    architecture: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    top_provider_context_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_moderated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    per_request_limits: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    supported_parameters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    def __repr__(self):
        return f"<ModelConfig(id={self.model_id}, name={self.model_name})>"
