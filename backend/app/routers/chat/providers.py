"""Provider-specific logic and constraints."""

from typing import Any


def get_provider_id(model_id: str | None) -> str:
    """Extract provider ID from model ID.

    Args:
        model_id: Model identifier (e.g., "openai/gpt-4")

    Returns:
        Provider ID (e.g., "openai")
    """
    try:
        return (model_id or "").split("/")[0].split(":")[0].replace("-", "")
    except Exception:
        return ""


def should_disable_parallel_tools(provider: str) -> bool:
    """Check if provider requires disabling parallel tool calls.

    Args:
        provider: Provider ID

    Returns:
        True if parallel tools should be disabled
    """
    return provider in {"anthropic", "xai"}


def supports_response_format(provider: str) -> bool:
    """Check if provider supports response_format parameter.

    Args:
        provider: Provider ID

    Returns:
        True if response_format is supported
    """
    # xAI models don't support response_format
    return provider not in {"xai"}


def apply_provider_constraints(
    params: dict[str, Any], model_id: str, has_tools: bool = False
) -> dict[str, Any]:
    """Apply provider-specific parameter constraints.

    Args:
        params: Base parameters
        model_id: Model identifier
        has_tools: Whether tools are being used

    Returns:
        Updated parameters with provider constraints
    """
    provider = get_provider_id(model_id)

    # Apply parallel tool call constraints
    if has_tools and should_disable_parallel_tools(provider):
        params["parallel_tool_calls"] = False

    # Remove response_format for unsupported providers
    if not supports_response_format(provider) and "response_format" in params:
        del params["response_format"]

    return params


def get_tool_choice_override(
    tool_choice: str | None, provider: str, tool_names: set[str]
) -> str | dict[str, Any]:
    """Get provider-appropriate tool choice value.

    Args:
        tool_choice: Requested tool choice
        provider: Provider ID
        tool_names: Available tool names

    Returns:
        Provider-appropriate tool choice value
    """
    # xAI has issues with forced tool choice
    if provider == "xai" and tool_choice not in ("auto", "none", None):
        return "auto"

    # Handle specific tool forcing
    if tool_choice and tool_choice not in ("auto", "none", "required"):
        if tool_choice in tool_names:
            return {
                "type": "function",
                "function": {"name": tool_choice},
            }
        return "auto"

    # Handle standard choices
    if tool_choice == "none":
        return "none"
    elif tool_choice == "required":
        return "required"
    else:
        return "auto"
