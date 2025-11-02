"""Streaming event formatting utilities for SSE."""

import json
from typing import Any


def format_sse_event(data: dict[str, Any]) -> str:
    """Format data as Server-Sent Event.

    Args:
        data: Data dictionary to send

    Returns:
        SSE-formatted string
    """
    return f"data: {json.dumps(data)}\n\n"


def stream_content_event(content: str) -> str:
    """Format content streaming event.

    Args:
        content: Content text

    Returns:
        SSE-formatted content event
    """
    return format_sse_event({"type": "content", "content": content})


def stream_reasoning_event(content: str) -> str:
    """Format reasoning streaming event.

    Args:
        content: Reasoning text

    Returns:
        SSE-formatted reasoning event
    """
    return format_sse_event({"type": "reasoning", "content": content})


def stream_tool_calls_event(calls: list[dict[str, Any]]) -> str:
    """Format tool calls event.

    Args:
        calls: List of tool call dictionaries

    Returns:
        SSE-formatted tool calls event
    """
    return format_sse_event({"type": "tool_calls", "calls": calls})


def stream_tool_executing_event(
    tool_id: str,
    name: str,
    category: str = "other",
    visibility: str = "secondary"
) -> str:
    """Format tool executing event.

    Args:
        tool_id: Tool call ID
        name: Tool name
        category: Tool category
        visibility: Tool visibility level

    Returns:
        SSE-formatted tool executing event
    """
    return format_sse_event({
        "type": "tool_executing",
        "id": tool_id,
        "name": name,
        "category": category,
        "visibility": visibility
    })


def stream_tool_result_event(
    tool_id: str,
    name: str,
    result: dict[str, Any],
    category: str = "other",
    visibility: str = "secondary"
) -> str:
    """Format tool result event.

    Args:
        tool_id: Tool call ID
        name: Tool name
        result: Tool execution result
        category: Tool category
        visibility: Tool visibility level

    Returns:
        SSE-formatted tool result event
    """
    return format_sse_event({
        "type": "tool_result",
        "id": tool_id,
        "name": name,
        "result": result,
        "category": category,
        "visibility": visibility
    })


def stream_error_event(error: str) -> str:
    """Format error event.

    Args:
        error: Error message

    Returns:
        SSE-formatted error event
    """
    return format_sse_event({"type": "error", "error": error})


def stream_warning_event(message: str, code: str | None = None) -> str:
    """Format warning event.

    Args:
        message: Warning message
        code: Optional warning code

    Returns:
        SSE-formatted warning event
    """
    data = {"type": "warning", "message": message}
    if code:
        data["code"] = code
    return format_sse_event(data)


def stream_debug_event(message: str) -> str:
    """Format debug event.

    Args:
        message: Debug message

    Returns:
        SSE-formatted debug event
    """
    return format_sse_event({"type": "debug", "message": message})


def stream_done_event() -> str:
    """Format stream completion event.

    Returns:
        SSE-formatted done event
    """
    return format_sse_event({"type": "done", "done": True})