"""Provider content model - stores custom guides and best practices."""
from __future__ import annotations

import datetime as dt
import uuid as uuid_pkg
from sqlalchemy import String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from config.db import Base


class ProviderContent(Base):
    """Custom content for supported providers (guides, best practices, etc)."""

    __tablename__ = "provider_content"

    id: Mapped[uuid_pkg.UUID] = mapped_column(primary_key=True, default=uuid_pkg.uuid4)
    provider_id: Mapped[str] = mapped_column(String(32), index=True)  # 'openai', 'anthropic', etc.
    content_type: Mapped[str] = mapped_column(String(50), index=True)  # 'optimization_guide', 'best_practice'
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[dict] = mapped_column(JSONB)  # Flexible JSON structure
    doc_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    def __repr__(self):
        return f"<ProviderContent(provider={self.provider_id}, type={self.content_type})>"
