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


def create_search_tool_schema() -> dict[str, Any]:
    """Create minimal search_web tool schema.

    Returns:
        OpenAI-compatible tool schema for web search
    """
    return {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for current information. Returns search results with titles, descriptions, and URLs. Also returns rich structured data when available (weather forecasts, stock quotes, sports scores, calculations, currency conversion, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (1-10)",
                        "default": 10
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
