"""Message handling utilities for chat routing."""

import json
from typing import Any


def build_initial_messages(
    system: str | None, prompt: str | None
) -> list[dict[str, Any]]:
    """Build initial message array from system and user prompts.

    Args:
        system: Optional system prompt
        prompt: Optional user prompt

    Returns:
        List of message dictionaries
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if prompt:
        messages.append({"role": "user", "content": prompt})
    else:
        messages.append({"role": "user", "content": "Hello"})
    return messages


def content_to_text(content: Any) -> str:
    """Extract text from various content formats.

    Handles string content and structured content blocks.

    Args:
        content: Content in various formats

    Returns:
        Extracted text string
    """
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = []
        for block in content:
            if (
                isinstance(block, dict)
                and block.get("type") == "text"
                and isinstance(block.get("text"), str)
            ):
                parts.append(block.get("text", ""))
        return "\n".join([p for p in parts if p])

    return ""


def append_tool_result(
    messages: list[dict[str, Any]],
    tool_call_id: str,
    result: dict[str, Any]
) -> list[dict[str, Any]]:
    """Append tool execution result to messages.

    Args:
        messages: Existing message list
        tool_call_id: ID of the tool call
        result: Tool execution result

    Returns:
        Updated message list
    """
    if result.get("success"):
        tool_content = json.dumps(result.get("result", {}))
    else:
        tool_content = json.dumps(
            {"error": result.get("error", "Tool execution failed")}
        )

    messages.append({
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": tool_content,
    })

    return messages


def append_finalization_prompt(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Append prompt asking model to finalize response.

    Args:
        messages: Existing message list

    Returns:
        Updated message list
    """
    messages.append({
        "role": "user",
        "content": "Please use the tool results above to answer my original question.",
    })
    return messages


def build_assistant_tool_message(tool_calls: list[dict[str, Any]]) -> dict[str, Any]:
    """Build assistant message with tool calls.

    Args:
        tool_calls: List of tool call dictionaries

    Returns:
        Assistant message dictionary
    """
    return {
        "role": "assistant",
        "tool_calls": [
            {
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": tc["arguments"],
                },
            }
            for tc in tool_calls
        ]
    }