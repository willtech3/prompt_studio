import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from brotli_asgi import BrotliMiddleware
from .middleware.request_id import RequestIdMiddleware

from config.db import create_all, init_engine

from .core.config import get_cors_origins, load_env_from_project_root
from .routers import (
    chat as chat_routes,
)
from .routers import (
    models as model_routes,
)
from .routers import (
    optimize as optimize_routes,
)
from .routers import (
    providers as provider_routes,
)
from .routers import (
    saves as saves_routes,
)

load_env_from_project_root()

app = FastAPI(title="Prompt Engineering Studio API", version="0.1.0", default_response_class=ORJSONResponse)

# Response compression
app.add_middleware(BrotliMiddleware)
app.add_middleware(RequestIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _ensure_db_tables() -> None:
    """Create DB tables on startup (best-effort for dev)."""
    with contextlib.suppress(Exception):
        await create_all()


app.include_router(chat_routes.router)
app.include_router(model_routes.router)
app.include_router(provider_routes.router)
app.include_router(saves_routes.router)
app.include_router(optimize_routes.router)


@app.get("/health")
async def health():
    import os
    # also report DB availability
    db_ready = init_engine() is not None
    brave_key_set = bool(os.getenv("BRAVE_API_KEY"))
    return {"status": "healthy", "db": db_ready, "brave_api_key_set": brave_key_set}
