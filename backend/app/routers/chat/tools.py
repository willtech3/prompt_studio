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
    if name_lower in {"search_web", "read_url"}:
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
            "description": (
                "Search the web for current information. Returns search results with titles, descriptions, and URLs. "
                "Also returns rich structured data when available (weather forecasts, stock quotes, sports scores, calculations, currency conversion, etc.). "
                "Use this tool to find relevant web pages before reading them in detail with read_url. "
                "Prefer fewer, well-targeted searches over many similar searches."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up. Be specific and combine related concepts into a single query when possible.",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (1-10). Default is 10 which provides good coverage.",
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        },
    }


def create_read_url_tool_schema() -> dict[str, Any]:
    """Create tool schema for reading web pages via Jina Reader API.

    Returns:
        OpenAI-compatible tool schema for reading URLs
    """
    return {
        "type": "function",
        "function": {
            "name": "read_url",
            "description": (
                "Fetch and read the full content from one or more web pages. "
                "Returns clean Markdown content optimized for LLM analysis. "
                "Use this AFTER search_web to get detailed information from the most relevant pages found in search results. "
                "This tool provides the actual page content, not just snippets. "
                "Prefer reading multiple URLs in a single call rather than making separate calls for each URL."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "array",
                        "maxItems": 10,
                        "items": {
                            "type": "string",
                            "description": "A valid HTTP or HTTPS URL to fetch",
                        },
                        "description": (
                            "List of web page URLs to read. You can pass multiple URLs in one call. "
                            "Recommend selecting 2-5 of the most relevant pages from search results "
                            "to get comprehensive information efficiently. "
                            "Up to 8 URLs will be read per call; any additional URLs will be ignored and reported."
                        ),
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": (
                            "Optional character limit for content per URL (default: 12000). "
                            "Content will be intelligently truncated if it exceeds this limit. "
                            "Use higher values (20000-30000) for in-depth articles."
                        ),
                        "default": 12000,
                    },
                },
                "required": ["urls"],
            },
        },
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
            "arguments": builder["arguments"],
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
