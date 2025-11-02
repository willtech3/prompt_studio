"""Tool handling and execution utilities."""

import json
from typing import Any


def get_tool_metadata(name: str) -> dict[str, str]:
    """Get metadata for tool visibility and categorization.

    Args:
        name: Tool name

    Returns:
        Dictionary with category and visibility
    """
    name_lower = (name or "").lower()
    if name_lower == "search_web":
        return {"category": "search", "visibility": "primary"}
    return {"category": "other", "visibility": "secondary"}


def should_auto_inject_search(prompt: str | None, has_tools: bool) -> bool:
    """Check if search tool should be auto-injected based on prompt.

    Args:
        prompt: User prompt
        has_tools: Whether tools are already provided

    Returns:
        True if search should be auto-injected
    """
    if has_tools:
        return False

    prompt_lower = (prompt or "").lower()
    recency_keywords = [
        "news", "latest", "recent", "current", "last ", "past ",
        "look up", "search", "today", "yesterday", "this week",
        "last week", "this month", "last month"
    ]
    return any(keyword in prompt_lower for keyword in recency_keywords)


def create_search_tool_schema() -> dict[str, Any]:
    """Create minimal search_web tool schema.

    Returns:
        OpenAI-compatible tool schema for web search
    """
    return {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for current information. Returns top results with titles, snippets, and URLs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results (1-5)",
                        "default": 3
                    },
                    "time_hint": {
                        "type": "string",
                        "enum": ["day", "week", "month", "year"],
                        "description": "Freshness hint"
                    },
                    "after": {
                        "type": "string",
                        "description": "YYYY-MM-DD"
                    },
                    "before": {
                        "type": "string",
                        "description": "YYYY-MM-DD"
                    }
                },
                "required": ["query"]
            }
        }
    }


def build_tool_call_from_delta(builder: dict[str, Any]) -> dict[str, Any] | None:
    """Build a complete tool call from accumulated deltas.

    Args:
        builder: Accumulated tool call data

    Returns:
        Complete tool call or None if incomplete
    """
    if not builder.get("name") or not builder.get("arguments"):
        return None

    try:
        # Validate JSON arguments
        json.loads(builder["arguments"])
        return {
            "id": builder.get("id") or "call_generated",
            "name": builder["name"],
            "arguments": builder["arguments"]
        }
    except json.JSONDecodeError:
        return None


def parse_tool_arguments(arguments_str: str) -> dict[str, Any]:
    """Parse tool arguments from JSON string.

    Args:
        arguments_str: JSON string of arguments

    Returns:
        Parsed arguments dictionary
    """
    try:
        return json.loads(arguments_str)
    except json.JSONDecodeError:
        return {}
