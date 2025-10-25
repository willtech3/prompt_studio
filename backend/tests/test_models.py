import asyncio

import pytest
from sqlalchemy import text

from config.db import init_engine


def _db_is_reachable() -> bool:
    try:
        engine = init_engine()
        if engine is None:
            return False

        async def _ping() -> None:
            async with engine.connect() as conn:  # type: ignore[attr-defined]
                await conn.execute(text("SELECT 1"))

        asyncio.run(_ping())
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _db_is_reachable(), reason="Database not reachable")
def test_models_list_shape(client):
    resp = client.get("/api/models")
    assert resp.status_code == 200
    payload = resp.json()
    assert isinstance(payload, dict)
    assert isinstance(payload.get("data"), list)
    if payload["data"]:
        m = payload["data"][0]
        assert isinstance(m, dict)
        assert ("id" in m) or ("name" in m)


