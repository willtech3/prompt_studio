import json
import os
import asyncio


class _StubOpenRouterServiceV2:
    def __init__(self, *args, **kwargs):
        pass

    async def stream_events(self, model: str, messages: list[dict], **params):
        # Simulate reasoning tokens then a tool_call built over multiple deltas
        yield {"type": "reasoning", "content": "Considering sources… "}
        # Tool call appears in two argument chunks to test aggregation
        yield {
            "type": "tool_call_delta",
            "index": 0,
            "id": "call_0",
            "name": "search_web",
            "arguments": "{\"query\": \"latest financial news\"",
        }
        yield {
            "type": "tool_call_delta",
            "index": 0,
            "id": "call_0",
            "name": None,
            "arguments": "}",
        }
        # Router breaks after completing first tool call; remaining events should be ignored
        yield {"type": "done"}

    async def completion(self, model: str, messages: list[dict], **params):
        # Finalize with a simple content response
        return {
            "choices": [
                {
                    "message": {
                        "content": "Here is a concise report based on the search results.",
                    }
                }
            ]
        }

    async def stream_completion(self, model: str, messages: list[dict], **params):
        # Provide a small streamed fallback (not expected in happy-path)
        for chunk in ["Fallback ", "stream ", "content."]:
            yield chunk

    async def close(self):
        return None


class _StubToolExecutor:
    def __init__(self, *args, **kwargs):
        pass

    async def execute(self, tool_name: str, arguments: dict):
        # Return two links resembling a search result payload
        return {
            "success": True,
            "result": {
                "results": [
                    {"title": "News 1", "url": "https://example.com/a", "snippet": "A..."},
                    {"title": "News 2", "url": "https://example.com/b", "snippet": "B..."},
                ]
            },
        }


def _search_tool_schema_json():
    return json.dumps(
        [
            {
                "type": "function",
                "function": {
                    "name": "search_web",
                    "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
                },
            }
        ]
    )


def test_v2_streaming_order_and_events(client, monkeypatch):
    os.environ["OPENROUTER_API_KEY"] = "test-key"
    os.environ["TOOL_LOOP_V2"] = "true"

    # Patch the router's class references
    import app.routers.chat as chat_mod

    monkeypatch.setattr(chat_mod, "OpenRouterService", _StubOpenRouterServiceV2)
    monkeypatch.setattr(chat_mod, "ToolExecutor", _StubToolExecutor)

    params = {
        "model": "openai/gpt-5",
        "prompt": "Fetch the latest financial news from the last 7 days",
        "reasoning_effort": "medium",
        "tools": _search_tool_schema_json(),
    }

    types = []
    with client.stream("GET", "/api/chat/stream", params=params) as resp:
        assert resp.status_code == 200
        for raw in resp.iter_lines():
            if not raw:
                continue
            s = raw.decode() if isinstance(raw, (bytes, bytearray)) else raw
            if not s.startswith("data:"):
                continue
            payload = s[5:].strip()
            try:
                obj = json.loads(payload)
            except Exception:
                continue
            t = obj.get("type")
            if t:
                types.append(t)
            if t == "done":
                break

    # Expected order: reasoning → tool_calls → tool_executing → tool_result → content → done
    assert "reasoning" in types
    assert "tool_calls" in types
    assert "tool_executing" in types
    assert "tool_result" in types
    assert "content" in types
    assert types[-1] == "done"

    def _idx(x):
        return types.index(x)

    assert _idx("reasoning") < _idx("tool_calls") < _idx("tool_executing") < _idx("tool_result") < _idx("content") < _idx("done")


class _StubOpenRouterServiceLegacy:
    def __init__(self, *args, **kwargs):
        pass

    async def completion(self, model: str, messages: list[dict], **params):
        # Return a message-level tool_calls array to exercise legacy path
        return {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_legacy",
                                "function": {"name": "search_web", "arguments": json.dumps({"query": "finance"})},
                            }
                        ],
                    }
                }
            ]
        }

    async def stream_events(self, *args, **kwargs):
        # Not used in legacy flow for tool execution/finalize, but implement for safety
        if False:
            yield {"type": "done"}

    async def close(self):
        return None


def test_legacy_path_order_and_events(client, monkeypatch):
    os.environ["OPENROUTER_API_KEY"] = "test-key"
    os.environ["TOOL_LOOP_V2"] = "false"

    import app.routers.chat as chat_mod

    monkeypatch.setattr(chat_mod, "OpenRouterService", _StubOpenRouterServiceLegacy)
    monkeypatch.setattr(chat_mod, "ToolExecutor", _StubToolExecutor)

    params = {
        "model": "openai/gpt-4o-mini",
        "prompt": "Test legacy tool-calls",
        "tools": _search_tool_schema_json(),
    }

    types = []
    with client.stream("GET", "/api/chat/stream", params=params) as resp:
        assert resp.status_code == 200
        for raw in resp.iter_lines():
            if not raw:
                continue
            s = raw.decode() if isinstance(raw, (bytes, bytearray)) else raw
            if not s.startswith("data:"):
                continue
            payload = s[5:].strip()
            try:
                obj = json.loads(payload)
            except Exception:
                continue
            t = obj.get("type")
            if t:
                types.append(t)
            if t == "done":
                break

    # Legacy expected: tool_calls → tool_executing → tool_result → content → done
    assert "tool_calls" in types
    assert "tool_executing" in types
    assert "tool_result" in types
    assert "content" in types
    assert types[-1] == "done"

    def _idx(x):
        return types.index(x)

    assert _idx("tool_calls") < _idx("tool_executing") < _idx("tool_result") < _idx("content") < _idx("done")



