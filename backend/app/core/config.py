from pathlib import Path
import os

from dotenv import load_dotenv


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


def is_tool_loop_v2_enabled() -> bool:
    """Feature flag for the refactored tool loop (TOOL_LOOP_V2).

    Default: False. Set env TOOL_LOOP_V2=true to enable.
    """
    return str(os.getenv("TOOL_LOOP_V2", "false")).strip().lower() in {"1", "true", "yes", "on"}
