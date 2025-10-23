import contextlib
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.db import create_all, init_engine

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


def get_cors_origins() -> list[str]:
    # Minimal: allow local dev frontends
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def load_env_from_project_root() -> None:
    """Load .env from backend cwd and project root.

    - First try default CWD (backend) for local overrides
    - Then try project root (../../.env from this file)
    """
    # Load from backend current working directory first
    load_dotenv(override=False)

    # Load from project root if present
    try:
        root_env = Path(__file__).resolve().parents[2] / ".env"
        if root_env.exists():
            load_dotenv(dotenv_path=str(root_env), override=False)
    except Exception:
        # Keep minimal: ignore if path resolution fails
        pass


load_env_from_project_root()

app = FastAPI(title="Prompt Engineering Studio API", version="0.1.0")

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


# Register placeholder routers (no behavior changes)
app.include_router(chat_routes.router)
app.include_router(model_routes.router)
app.include_router(provider_routes.router)
app.include_router(saves_routes.router)
app.include_router(optimize_routes.router)


@app.get("/health")
async def health():
    # also report DB availability
    db_ready = init_engine() is not None
    return {"status": "healthy", "db": db_ready}


# Endpoints moved to dedicated routers:
# - GET /api/chat/stream → routers/chat.py
# - POST /api/optimize → routers/optimize.py
