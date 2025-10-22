import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import try_get_session
from models.snapshot import Snapshot

router = APIRouter(prefix="/api/saves", tags=["saves"])


# Pydantic Models


class SaveRequest(BaseModel):
    title: str | None = None
    kind: str | None = None  # 'system','user','prompt','state'
    provider: str | None = None
    model: str | None = None
    data: dict | None = (
        None  # arbitrary: system_prompt, user_prompt, response, parameters, notes
    )


class SaveResponse(BaseModel):
    id: str
    title: str | None = None
    kind: str
    provider: str | None = None
    model: str | None = None
    created_at: dt.datetime


class SaveItem(BaseModel):
    id: str
    title: str | None = None
    kind: str
    provider: str | None = None
    model: str | None = None
    created_at: dt.datetime | None = None


# Endpoints


@router.post("", response_model=SaveResponse)
async def create_save(
    payload: SaveRequest, session: AsyncSession | None = Depends(try_get_session)
):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
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
    # Refresh to ensure DB-assigned timestamps are returned
    await session.refresh(snap)
    return SaveResponse(
        id=sid,
        title=payload.title,
        kind=kind,
        provider=payload.provider,
        model=payload.model,
        created_at=snap.created_at,
    )


@router.get("", response_model=list[SaveItem])
async def list_saves(session: AsyncSession | None = Depends(try_get_session)):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
    rows = (
        (await session.execute(select(Snapshot).order_by(Snapshot.created_at.desc())))
        .scalars()
        .all()
    )
    out: list[SaveItem] = []
    for r in rows:
        out.append(
            SaveItem(
                id=r.id,
                title=r.title,
                kind=r.kind,
                provider=r.provider,
                model=r.model,
                created_at=r.created_at,
            )
        )
    return out


@router.get("/{sid}")
async def get_save(sid: str, session: AsyncSession | None = Depends(try_get_session)):
    if session is None:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")
    row = (
        await session.execute(select(Snapshot).where(Snapshot.id == sid))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": row.id,
        "title": row.title,
        "kind": row.kind,
        "provider": row.provider,
        "model": row.model,
        "created_at": row.created_at,
        "data": row.data or {},
    }
