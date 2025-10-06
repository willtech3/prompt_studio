"""Seed provider content from markdown files in docs/prompting_guides/."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config.db import get_database_url, init_engine
from models.provider_content import ProviderContent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

# Path to prompting guides documentation
DOCS_DIR = Path(__file__).resolve().parents[2] / "docs" / "prompting_guides"

# Model ID mappings (model_id from OpenRouter to documentation filename)
MODEL_MAPPINGS = {
    # OpenAI
    "openai/gpt-4.1": "OPENAI_GPT41_GUIDE.md",
    "openai/gpt-4o": "OPENAI_GPT4O_GUIDE.md",
    "openai/gpt-5": "OPENAI_GPT5_GUIDE.md",
    # Anthropic
    "anthropic/claude-3.7-sonnet": "ANTHROPIC_CLAUDE37SONNET_GUIDE.md",
    "anthropic/claude-opus-4": "ANTHROPIC_CLAUDE_OPUS4_GUIDE.md",
    "anthropic/claude-opus-4.1": "ANTHROPIC_CLAUDE_OPUS41_GUIDE.md",
    "anthropic/claude-sonnet-4": "ANTHROPIC_CLAUDE_SONNET4_GUIDE.md",
    "anthropic/claude-sonnet-4.5": "ANTHROPIC_CLAUDE_SONNET45_GUIDE.md",
    # Google
    "google/gemini-2.5-flash": "GOOGLE_GEMINI25FLASH_GUIDE.md",
    "google/gemini-2.5-pro": "GOOGLE_GEMINI25PRO_GUIDE.md",
    # xAI
    "x-ai/grok-3": "XAI_GROK3_GUIDE.md",
    "x-ai/grok-4": "XAI_GROK4_GUIDE.md",
    "x-ai/grok-4-fast": "XAI_GROK4FAST_GUIDE.md",
    # DeepSeek
    "deepseek/deepseek-chat": "DEEPSEEK_CHAT_GUIDE.md",
    "deepseek/deepseek-r1": "DEEPSEEK_R1_GUIDE.md",
    "deepseek/deepseek-v3.2-exp": "DEEPSEEK_V32EXP_GUIDE.md",
}

# Provider prompting guide filenames
PROVIDER_FILES = {
    "openai": "OPENAI_BEST_PRACTICES.md",
    "anthropic": "ANTHROPIC_BEST_PRACTICES.md",
    "google": "GOOGLE_BEST_PRACTICES.md",
    "xai": "XAI_BEST_PRACTICES.md",
    "deepseek": "DEEPSEEK_BEST_PRACTICES.md",
}


# Optimization guides from app/main.py PROVIDER_GUIDES
OPTIMIZATION_GUIDES = {
    "openai": (
        "Be specific about role, task, constraints, success criteria. "
        "Use structure (headings, bullets, sections). Prefer explicit formats (JSON) when needed. "
        "For complex tasks: plan → answer."
    ),
    "anthropic": (
        "Keep durable rules in system. Use simple XML-like sections for instructions/context/output. "
        "Prefer lower temperature for analysis; use examples sparingly."
    ),
    "google": (
        "State role, constraints, and token budgets. Provide short grounding passages. "
        "Ask for numbered bullets or JSON outputs."
    ),
    "xai": (
        "Define role and strict JSON schema when extracting. Tune one stochastic parameter at a time."
    ),
    "deepseek": (
        "State objective, constraints, and evaluation criteria. Keep outputs atomic and structured."
    ),
}

# Best practices from frontend/src/components/BestPractices.tsx
BEST_PRACTICES = {
    "openai": {
        "title": "OpenAI – Essentials",
        "doc_url": "https://platform.openai.com/docs/guides/prompt-engineering",
        "content": {
            "bullets": [
                "Be specific: role, task, audience, constraints, success criteria.",
                "Provide context and structure; ask for a format (JSON, bullets).",
                "For complex tasks: plan → answer; keep temperature + top_p sane.",
            ],
            "structure": [
                "System: durable rules (tone, role, constraints).",
                "User: task + minimal context/examples.",
                "Output: strict format (JSON schema or bullets).",
            ],
            "why": [
                "Specificity reduces ambiguity and off‑target generations.",
                "Structure helps the model allocate tokens and plan.",
                "Explicit formats make downstream parsing reliable.",
            ],
            "examples": [
                {
                    "label": "Message structure",
                    "code": "System: You are a precise technical assistant.\\nUser:\\nTask: <what to do>\\nConstraints: <rules, tone, length>\\nInput <<<...content...>>>",
                },
                {
                    "label": "Structured output",
                    "code": 'Ask for JSON (response_format: json_object).\\nSchema: {"field": string, "items": string[]}',
                },
            ],
        },
    },
    "anthropic": {
        "title": "Anthropic (Claude) – Essentials",
        "doc_url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering",
        "content": {
            "bullets": [
                "Keep durable rules in system; be explicit and concise.",
                "Use simple XML tags to structure tasks and outputs.",
                "Prefer low temperature for analytical tasks; stream when helpful.",
            ],
            "structure": [
                "<instructions> rules and objective </instructions>",
                "<context> minimal grounding </context>",
                "<output> format + example </output>",
            ],
            "why": [
                "XML tags give Claude stable anchors for sections.",
                "Short context avoids drowning the task with noise.",
                "Lower temperature increases determinism for evals.",
            ],
            "examples": [
                {
                    "label": "XML structure",
                    "code": '<instructions>Do X following Y rules</instructions>\\n<context>short, relevant context</context>\\n<output>Return JSON: {"a": string, "b": number}</output>',
                },
                {
                    "label": "Plan → answer",
                    "code": "First: outline steps as a numbered list.\\nThen: produce the final answer only.",
                },
            ],
        },
    },
    "google": {
        "title": "Google (Gemini) – Essentials",
        "doc_url": "https://developers.google.com/machine-learning/resources/prompt-eng",
        "content": {
            "bullets": [
                "Be explicit; include role, constraints, success criteria.",
                "Ground with short passages or examples; keep prompts lean.",
                "Use streaming for long outputs; specify token budgets.",
            ],
            "structure": [
                "Role: <who should respond>",
                "Task: <what to produce> with limits",
                "Grounding: <<< short passage >>>",
                "Output: numbered bullets or JSON",
            ],
            "why": [
                "Clear roles improve adherence to style/voice.",
                "Grounding boosts factuality without overloading context.",
                "Budgets prevent over‑long, meandering answers.",
            ],
            "examples": [
                {
                    "label": "Prompt skeleton",
                    "code": "Role: concise assistant\\nTask: <task>\\nConstraints: <= 200 tokens, bullet list\\nGrounding: <<<short passage>>>\\nOutput: - bullet 1",
                },
            ],
        },
    },
    "xai": {
        "title": "xAI (Grok) – Essentials",
        "doc_url": "https://docs.x.ai/docs",
        "content": {
            "bullets": [
                "Specify role + task explicitly; ask for JSON when needed.",
                "Validate downstream; retry with corrective hints on schema errors.",
                "Tune a single stochastic param at a time (temperature/top_p).",
            ],
            "structure": [
                "System: strict rules + safety + tone",
                "User: input + expected JSON keys/types",
                "Output: JSON only, no prose",
            ],
            "why": [
                "JSON‑first prompts reduce scraping/cleanup work.",
                "Single‑parameter tuning isolates changes for evals.",
                "Explicit keys prevent missing fields in outputs.",
            ],
            "examples": [
                {
                    "label": "JSON extraction",
                    "code": 'Return only JSON: {"title": string, "date": string, "bullets": string[]}',
                },
            ],
        },
    },
    "deepseek": {
        "title": "DeepSeek – Essentials",
        "doc_url": "https://api-docs.deepseek.com",
        "content": {
            "bullets": [
                "State objective, constraints, and evaluation criteria.",
                "Prefer short, iterative calls over one very long generation.",
                "Keep outputs structured and atomic for reliability.",
            ],
            "structure": [
                "Goal: <clear objective>",
                "Constraints: <limits> (time/tokens/format)",
                "Eval: <what success looks like>",
                "Output: schema or bullets",
            ],
            "why": [
                "Iterating reduces failure surface and cost.",
                "Atomic outputs are easier to verify and chain.",
                "Explicit eval criteria improve consistency.",
            ],
            "examples": [
                {
                    "label": "Prompt skeleton",
                    "code": 'Role: senior analyst\\nTask: extract fields\\nSchema: {"company": string, "summary": string}\\nText <<<...>>>',
                },
            ],
        },
    },
}


def extract_doc_url(content: str) -> str:
    """Extract official documentation URL from markdown content."""
    lines = content.split('\n')
    for line in lines:
        if line.startswith('**Official Documentation:**'):
            # Extract URL from markdown link format
            url_start = line.find('https://')
            if url_start != -1:
                return line[url_start:].strip()
    return ""


def extract_title(content: str) -> str:
    """Extract title from first markdown heading."""
    lines = content.split('\n')
    for line in lines:
        if line.startswith('# '):
            return line[2:].strip()
    return "Best Practices"


async def seed_provider_content():
    """Seed provider content table from markdown files."""
    if not get_database_url():
        print("DATABASE_URL not configured, skipping seed")
        return

    engine = init_engine()
    if not engine:
        print("Failed to initialize database engine")
        return

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with sessionmaker() as session:
        # Delete existing data to reseed with new markdown-based content
        existing = (await session.execute(select(ProviderContent))).scalars().all()
        if existing:
            print(f"Found {len(existing)} existing provider content records. Deleting...")
            for record in existing:
                await session.delete(record)
            await session.commit()
            print(f"✓ Deleted {len(existing)} old records")

        print("\nSeeding provider content from markdown files...")

        # Seed provider-level prompting guides
        for provider_id, filename in PROVIDER_FILES.items():
            filepath = DOCS_DIR / filename
            if not filepath.exists():
                print(f"  ⚠️  Warning: {filename} not found, skipping")
                continue

            content = filepath.read_text(encoding='utf-8')
            doc_url = extract_doc_url(content)
            title = extract_title(content)

            record = ProviderContent(
                provider_id=provider_id,
                model_id=None,  # Provider-level guidance
                content_type="prompting_guide",
                title=title,
                content={"markdown": content},
                doc_url=doc_url,
            )
            session.add(record)
            print(f"  ✓ Added provider prompting guide: {provider_id}")

        # Seed model-specific guides
        for model_id, filename in MODEL_MAPPINGS.items():
            filepath = DOCS_DIR / filename
            if not filepath.exists():
                print(f"  ⚠️  Warning: {filename} not found, skipping")
                continue

            content = filepath.read_text(encoding='utf-8')
            doc_url = extract_doc_url(content)
            title = extract_title(content)

            # Extract provider_id from model_id (e.g., "openai/gpt-4.1" -> "openai")
            provider_id = model_id.split('/')[0]
            # Normalize xai provider
            if provider_id == "x-ai":
                provider_id = "xai"

            record = ProviderContent(
                provider_id=provider_id,
                model_id=model_id,
                content_type="model_guide",
                title=title,
                content={"markdown": content},
                doc_url=doc_url,
            )
            session.add(record)
            print(f"  ✓ Added model guide: {model_id}")

        await session.commit()
        print(f"\n✓ Provider content seeded successfully ({len(PROVIDER_FILES)} providers, {len(MODEL_MAPPINGS)} models)")


if __name__ == "__main__":
    asyncio.run(seed_provider_content())
