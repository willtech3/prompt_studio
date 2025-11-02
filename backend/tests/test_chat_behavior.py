import json
from collections.abc import AsyncGenerator
from typing import Any


class FakeOpenRouterService:
    """Fake service that emits reasoning and a single tool_call_delta, then finalizes."""

    def __init__(self, *args, **kwargs):
        pass

    async def _client_ctx(self):
        return None

    async def list_models(self) -> dict[str, Any]:  # pragma: no cover - unused in this test
        return {"data": []}

    async def completion(self, _model: str, _messages: list[dict[str, Any]], **_params: Any) -> dict[str, Any]:
        # Return a minimal OpenAI-style response with final content
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Here is the final answer based on the tool results.",
                    }
                }
            ]
        }

    async def stream_completion(
        self, _model: str, _messages: list[dict[str, Any]], **_params: Any
    ) -> AsyncGenerator[str]:  # pragma: no cover - fallback path not used here
        yield "fallback content"

    async def stream_events(
        self, _model: str, _messages: list[dict[str, Any]], **_params: Any
    ) -> AsyncGenerator[dict[str, Any]]:
        # Emit a couple of reasoning chunks
        yield {"type": "reasoning", "content": "Thinking about how to proceed... "}
        yield {"type": "reasoning", "content": "We should search the web for recent info."}
        # Emit tool call delta in two argument chunks to simulate streaming assembly
        yield {
            "type": "tool_call_delta",
            "index": 0,
            "id": "call_0",
            "name": "search_web",
            "arguments": "{\"query\": \"latest finance",
        }
        yield {
            "type": "tool_call_delta",
            "index": 0,
            "id": "call_0",
            "name": "search_web",
            "arguments": " news\"}",
        }
        # End of first turn streaming
        yield {"type": "done"}

    async def close(self) -> None:
        return None


def test_stream_order_reasoning_tooling_content(monkeypatch, client):
    # Ensure streaming path v2 is enabled and API key check passes
    monkeypatch.setenv("TOOL_LOOP_V2", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "testing")

    # Inject fake OpenRouter client
    import app.routers.chat as chat_router
    monkeypatch.setattr(chat_router, "OpenRouterService", FakeOpenRouterService)

    # Stub tool execution to avoid network
    import services.tool_executor as te

    async def _fake_execute(_self, name: str, _arguments: dict) -> dict:
        assert name == "search_web"
        # Minimal successful result with links to surface in UI
        return {
            "success": True,
            "result": {
                "results": [
                    {
                        "title": "Example News",
                        "url": "https://example.com/news",
                        "source": "Example",
                        "snippet": "A snippet of financial news.",
                    }
                ]
            },
        }

    monkeypatch.setattr(te.ToolExecutor, "execute", _fake_execute)

    # Provide minimal tools JSON with search_web
    tools = json.dumps(te.ToolExecutor().get_available_tools())

    params = {
        "model": "openai/gpt-4o-mini",
        "prompt": "Fetch the latest financial news from the last 7 days",
        "tools": tools,
        "tool_choice": "auto",
        "reasoning_effort": "medium",
        # Avoid DB path for max_tokens lookup
        "max_tokens": 300,
    }

    # Override DB dependency to avoid requiring a DATABASE_URL
    from app.main import app
    from config.db import get_session as _get_session

    async def _dummy_dep():
        class _Dummy:
            async def execute(self, *_args, **_kwargs):
                class _R:
                    def scalar_one_or_none(self):
                        return None

                return _R()

        yield _Dummy()

    app.dependency_overrides[_get_session] = _dummy_dep

    order = []
    events = []
    with client.stream("GET", "/api/chat/stream", params=params) as resp:
        assert resp.status_code == 200
        for raw in resp.iter_lines():
            if not raw:
                continue
            s = raw.decode() if isinstance(raw, bytes) else raw
            if not s.startswith("data:"):
                continue
            payload = s[5:].strip()
            try:
                obj = json.loads(payload)
            except Exception:  # pragma: no cover - ignore non-JSON lines
                continue
            t = obj.get("type")
            events.append(obj)
            if t in {"reasoning", "tool_calls", "tool_executing", "tool_result", "content", "done"}:
                order.append(t)
            if t == "done":
                break

    # Cleanup DB override so other tests aren't affected
    app.dependency_overrides.pop(_get_session, None)

    # Ensure basic presence of phases
    assert "reasoning" in order, f"order missing reasoning: {order}"
    assert "tool_calls" in order, f"order missing tool_calls: {order}"
    assert "tool_executing" in order, f"order missing tool_executing: {order}"
    assert "tool_result" in order, f"order missing tool_result: {order}"
    assert "content" in order, f"order missing content: {order}"
    assert order.index("reasoning") < order.index("tool_calls")
    assert order.index("tool_calls") < order.index("tool_executing")
    assert order.index("tool_executing") < order.index("tool_result")
    assert order.index("tool_result") < order.index("content")

    # Validate tool metadata presence on tool events
    tool_exec = next((e for e in events if e.get("type") == "tool_executing"), None)
    tool_res = next((e for e in events if e.get("type") == "tool_result"), None)
    assert tool_exec and tool_exec.get("name") == "search_web"
    assert tool_exec.get("category") == "search"
    assert tool_res and tool_res.get("result", {}).get("success") is True
    assert tool_res.get("category") == "search"


