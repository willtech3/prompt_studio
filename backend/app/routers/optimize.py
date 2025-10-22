"""Prompt optimization router."""

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.optimization_prompts import META_PROMPT, PROVIDER_HINTS
from services.openrouter import OpenRouterService

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


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


@router.post("", response_model=OptimizeResponse)
async def optimize_prompt(req: OptimizeRequest):
    """Optimize a prompt using OpenAI's meta-prompt and provider-specific hints."""
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
