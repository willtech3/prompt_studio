from __future__ import annotations

from collections.abc import AsyncGenerator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool


class Base(DeclarativeBase):
    pass


class Settings(BaseSettings):
    """Application settings."""

    DATABASE_URL: str = "postgresql+asyncpg://prompt_admin:password@127.0.0.1:5432/prompt_studio"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_database_url() -> str | None:
    return settings.DATABASE_URL


def init_engine() -> AsyncEngine | None:
    global _engine, _sessionmaker
    if _engine is not None:
        return _engine
    db_url = get_database_url()
    if not db_url:
        return None
    # Use NullPool to avoid connection reuse issues with asyncpg in simple MVP usage
    # and tests. This keeps the behavior straightforward at the cost of some
    # connection overhead, which is fine for low traffic and local development.
    _engine = create_async_engine(db_url, future=True, poolclass=NullPool)
    _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def get_session() -> AsyncGenerator[AsyncSession]:
    if _sessionmaker is None:
        init_engine()
    if _sessionmaker is None:
        raise RuntimeError("DATABASE_URL not configured")
    async with _sessionmaker() as session:  # type: ignore[arg-type]
        yield session


async def create_all() -> None:
    engine = init_engine()
    if engine is None:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
