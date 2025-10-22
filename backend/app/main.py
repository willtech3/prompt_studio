import contextlib
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import create_all, get_session, init_engine
from services.openrouter import OpenRouterService

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


# moved: GET /api/chat/stream endpoint to routers/chat.py


# ---- Prompt Optimization ----

# OpenAI's official meta-prompt for prompt optimization
# Source: https://the-decoder.com/openai-releases-its-meta-prompt-for-prompt-optimization/
META_PROMPT = """Given a task description or existing prompt, produce a detailed system prompt to guide a language model in completing the task effectively.

# Guidelines

- Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
- Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
- Reasoning Before Conclusions: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
- Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
- Conclusion, classifications, or results should ALWAYS appear last.
- Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
- What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
- Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
- Formatting: Use markdown features for readability. DO NOT USE ``` CODE BLOCKS UNLESS SPECIFICALLY REQUESTED.
- Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
- Constants: DO include constants in the prompt, as they are not susceptible to prompt injection. Such as guides, rubrics, and examples.
- Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
- For tasks outputting well-defined or structured data (classification, JSON, etc.) bias towards outputting a JSON.
- JSON should never be wrapped in code blocks (```) unless explicitly requested.

The final prompt you output should adhere to the following structure below. Do not include any additional commentary, only output the completed system prompt. SPECIFICALLY, do not include any additional messages at the start or end of the prompt. (e.g. no "---")

[Concise instruction describing the task - this should be the first line in the prompt, no section header]

[Additional details as needed.]

[Optional sections with headings or bullet points for detailed steps.]

# Steps [optional]

[optional: a detailed breakdown of the steps necessary to accomplish the task]

# Output Format

[Specifically call out how the output should be formatted, be it response length, structure e.g. JSON, markdown, etc]

# Examples [optional]

[Optional: 1-3 well-defined examples with placeholders if necessary. Clearly mark where examples start and end, and what the input and output are. User placeholders as necessary.]
[If the examples are shorter than what a realistic example is expected to be, make a reference with () explaining how real examples should be longer / shorter / different. AND USE PLACEHOLDERS! ]

# Notes [optional]

[optional: edge cases, details, and an area to call or repeat out specific important considerations]
"""

# Provider-specific optimization hints
PROVIDER_HINTS = {
    "anthropic": """Claude models work best with XML-style tags like <instructions>, <context>, <thinking>, and <output>. Use explicit thinking blocks for complex reasoning tasks.

    For tool calling: Claude Sonnet 4.5 supports parallel tool execution (up to 5 tools simultaneously). Use <thinking> blocks to reason about which tools to call and why. Example: '<thinking>I need current data, so I'll call search_web first, then analyze the results.</thinking>'""",
    "openai": """GPT models benefit from clear delimiters (triple quotes, <<<>>>), step-by-step instructions, specific role definitions, and explicit output format specifications.

    For tool calling: GPT-4+ supports parallel function calling (up to 10 tools). Be explicit about when to use tools: 'Use search_web for current information, then calculate for math.' Provide clear, detailed function descriptions in your tool schemas.""",
    "deepseek": """DeepSeek-R1 models benefit from explicit <think> tags for reasoning tasks. Be explicit about showing work and breaking down complex queries into sequential prompts.

    For tool calling: DeepSeek models work well with sequential tool calls. Use explicit reasoning: 'First, I'll search for X using search_web. Then, based on those results, I'll calculate Y.' Break complex multi-tool workflows into clear steps.""",
    "google": """Gemini models work well with structured sections, explicit role definitions, and grounding passages. Specify token budgets and use numbered outputs.

    For tool calling: Gemini supports function declarations. Use structured, numbered instructions: '1. Search for current data using search_web. 2. Extract key metrics. 3. Format results as JSON.' Be explicit about output format expectations.""",
    "xai": """Grok models prefer explicit JSON schemas for structured output, clear role definitions, and tuning one parameter at a time.

    For tool calling: Grok models benefit from clear tool usage instructions. Specify exact function names and expected parameters. Example: 'When asked about current events, call search_web with the query parameter. When asked for calculations, call calculate with the expression parameter.'""",
}


class OptimizeRequest(BaseModel):
    model: str
    provider: str | None = None
    kind: str  # 'system' | 'user'
    prompt: str
    system: str | None = None


class OptimizeResponse(BaseModel):
    optimized: str
    changes: list[str] = []
    notes: list[str] = []


@app.post("/api/optimize", response_model=OptimizeResponse)
async def optimize_prompt(
    req: OptimizeRequest, _session: AsyncSession = Depends(get_session)
):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY not set")

    # Use OpenAI's meta-prompt as system prompt
    system_prompt = META_PROMPT

    # Build user message - just the prompt to optimize plus provider context
    provider_id = (req.provider or "").lower()
    provider_hint = PROVIDER_HINTS.get(provider_id, "")

    # Simple, direct message: just the prompt + provider context
    user_parts = []

    # Add provider-specific guidance as context
    if provider_hint:
        user_parts.append(
            f"Provider context: This prompt will be used with {req.model} ({provider_id}). {provider_hint}"
        )
        user_parts.append("")

    # Add system context if optimizing a user prompt
    if req.system and req.kind == "user":
        user_parts.append(
            "System prompt context (for reference only, do not optimize this):"
        )
        user_parts.append(req.system)
        user_parts.append("")

    # The actual prompt to optimize
    user_parts.append(req.prompt)

    user_msg = "\n".join(user_parts)

    # Call the same model to optimize for itself (e.g., Claude optimizes for Claude)
    svc = OpenRouterService()
    try:
        payload = await svc.completion(
            model=req.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.5,  # Slightly higher for creative optimization suggestions
        )

        optimized_prompt = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not optimized_prompt:
            return OptimizeResponse(
                optimized=req.prompt,
                notes=["Optimization failed: empty response from model"],
                changes=[],
            )

        # Extract changes and notes from comparison
        changes = []
        notes = []

        # Simple heuristic: if the optimized prompt is significantly different, note it
        if len(optimized_prompt) > len(req.prompt) * 1.2:
            changes.append("Expanded prompt with additional structure and clarity")
        elif len(optimized_prompt) < len(req.prompt) * 0.8:
            changes.append("Condensed prompt for clarity")
        else:
            changes.append("Refined prompt structure and wording")

        # Check for provider-specific patterns
        if provider_id == "anthropic" and (
            "<" in optimized_prompt and ">" in optimized_prompt
        ):
            notes.append("Added XML-style tags for better structure")
        elif provider_id == "openai" and (
            "```" in optimized_prompt or "<<<" in optimized_prompt
        ):
            notes.append("Added delimiters for clear input/output separation")
        elif provider_id == "deepseek" and "<think>" in optimized_prompt.lower():
            notes.append("Added thinking blocks for reasoning tasks")

        if "# " in optimized_prompt or "## " in optimized_prompt:
            notes.append("Added section headers for organization")

        return OptimizeResponse(
            optimized=optimized_prompt, changes=changes, notes=notes
        )
    finally:
        await svc.close()
