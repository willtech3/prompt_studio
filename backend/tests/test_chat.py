import contextlib
import json
import os


def test_chat_stream_smoke(client):
    # Assume OPENROUTER_API_KEY is set; allow natural failure if not
    model_id = os.getenv("SMOKE_MODEL_ID", "openai/gpt-4o-mini")
    params = {"prompt": "Hi", "model": model_id}

    # Use streaming to validate SSE contract and that we receive some data
    with client.stream("GET", "/api/chat/stream", params=params) as resp:
        assert resp.status_code == 200
        # Content-Type should indicate SSE
        assert resp.headers.get("content-type", "").startswith("text/event-stream")

        lines = []
        for line in resp.iter_lines():
            if line:
                s = line.decode() if isinstance(line, bytes) else line
                if s.startswith("data:"):
                    lines.append(s[5:].strip())
            if len(lines) >= 3:
                break

        # Assert some response was returned
        assert any(lines)

        # Optionally check that at least one parseable JSON payload has an expected type
        parsed = []
        for d in lines:
            # Best-effort JSON parse; ignore non-JSON chunks
            with contextlib.suppress(Exception):
                parsed.append(json.loads(d))
        if parsed:
            assert any(
                p.get("type") in {"content", "reasoning", "tool_calls", "done"}
                for p in parsed
                if isinstance(p, dict)
            )


