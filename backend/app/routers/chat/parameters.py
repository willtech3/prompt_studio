"""Parameter processing and validation for chat routing."""

import json
from typing import Any

from .providers import get_provider_id


def build_chat_params(
    temperature: float | None = 0.7,
    top_p: float | None = 1.0,
    max_tokens: int | None = None,
    top_k: int | None = None,
    frequency_penalty: float | None = None,
    presence_penalty: float | None = None,
    reasoning_effort: str | None = None,
) -> dict[str, Any]:
    """Build base chat parameters.

    Args:
        temperature: Sampling temperature (0-2)
        top_p: Nucleus sampling (0-1)
        max_tokens: Maximum tokens to generate
        top_k: Top-K sampling
        frequency_penalty: Frequency penalty (-2 to 2)
        presence_penalty: Presence penalty (-2 to 2)
        reasoning_effort: Reasoning effort level

    Returns:
        Dictionary of chat parameters
    """
    params = {"temperature": temperature, "top_p": top_p}

    if max_tokens is not None:
        params["max_tokens"] = max_tokens

    if reasoning_effort and reasoning_effort.lower() != "auto":
        params["reasoning"] = {"effort": reasoning_effort.lower()}

    if top_k is not None:
        params["top_k"] = top_k
    if frequency_penalty is not None:
        params["frequency_penalty"] = frequency_penalty
    if presence_penalty is not None:
        params["presence_penalty"] = presence_penalty

    return params


def parse_response_format(
    response_format: str | None,
    model_id: str
) -> dict[str, Any] | None:
    """Parse and validate response format parameter.

    Args:
        response_format: Response format string or JSON
        model_id: Model identifier

    Returns:
        Parsed response format or None
    """
    if not response_format:
        return None

    provider = get_provider_id(model_id)
    # xAI models don't support response_format
    if provider in {"xai"}:
        return None

    rf_text = str(response_format).strip()

    # Try to parse as JSON
    try:
        rf_obj = json.loads(rf_text)
        if isinstance(rf_obj, dict):
            return rf_obj
    except Exception:
        pass

    # Handle shorthand formats
    rf_lower = rf_text.lower()
    if rf_lower in ("json", "json_object", "jsonobject"):
        return {"type": "json_object"}

    return None


def parse_stop_sequences(stop: str | None) -> list[str] | None:
    """Parse stop sequences from string input.

    Supports comma and newline separators.

    Args:
        stop: Stop sequence string

    Returns:
        List of stop sequences or None
    """
    if not stop:
        return None

    # Split by comma and newline
    separators = [",", "\n"]
    parts = [stop]
    for sep in separators:
        parts = sum([p.split(sep) for p in parts], [])

    # Clean and filter
    stop_list = [s.strip() for s in parts if s.strip()]
    return stop_list if stop_list else None


def parse_tool_schemas(
    tool_schemas_raw: str | None
) -> tuple[list[dict[str, Any]] | None, set[str]]:
    """Parse and validate tool schemas from JSON string.

    Args:
        tool_schemas_raw: JSON string of tool schemas

    Returns:
        Tuple of (parsed schemas or None, set of tool names)
    """
    if not tool_schemas_raw:
        return None, set()

    try:
        parsed_schemas = json.loads(tool_schemas_raw)
        if not isinstance(parsed_schemas, list):
            raise ValueError("Tools must be a JSON array")

        tool_names = set()
        for tool in parsed_schemas:
            try:
                name = tool.get("function", {}).get("name")
                if name:
                    tool_names.add(name)
            except Exception:
                pass

        return parsed_schemas, tool_names

    except json.JSONDecodeError:
        raise ValueError("Invalid tools JSON")
    except Exception as e:
        raise ValueError(f"Error parsing tools: {str(e)}")


def merge_params(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    """Merge parameter dictionaries.

    Args:
        base: Base parameters
        overrides: Override parameters

    Returns:
        Merged parameters
    """
    result = base.copy()
    result.update(overrides)
    return result
