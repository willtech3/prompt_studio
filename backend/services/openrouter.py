from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from typing import Any

import httpx


class OpenRouterService:
    """Minimal OpenRouter client for MVP.

    Notes:
    - Keep simple; no retries or complex error handling yet.
    - Streaming returns raw text chunks suitable for SSE forwarding.
    """

    def __init__(self, api_key: str | None = None, base_url: str | None = None, request_id: str | None = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = base_url or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self._client: httpx.AsyncClient | None = None
        self.request_id = request_id

    async def _client_ctx(self) -> httpx.AsyncClient:
        if self._client is None:
            # Base headers
            headers: dict[str, str] = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            # Optional OpenRouter attribution headers
            # Set via env to support leaderboard and app attribution
            # https://openrouter.ai/docs#headers
            referer = os.getenv("OPENROUTER_HTTP_REFERER")
            title = os.getenv("OPENROUTER_X_TITLE")
            if referer:
                headers["HTTP-Referer"] = referer
            if title:
                headers["X-Title"] = title

            # Attach request correlation id if available
            if self.request_id:
                headers["X-Request-Id"] = self.request_id

            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=float(os.getenv("OPENROUTER_TIMEOUT", "120")),
            )
        return self._client

    async def list_models(self) -> dict[str, Any]:
        client = await self._client_ctx()
        r = await client.get("/models")
        r.raise_for_status()
        return r.json()

    async def completion(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **params: Any,
    ) -> dict[str, Any]:
        client = await self._client_ctx()
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        payload.update(params)
        r = await client.post("/chat/completions", json=payload)
        if r.status_code >= 400:
            # Bubble up server error details to help debug bad requests
            try:
                data = r.json()
                detail = data.get("error") or data
            except Exception:
                detail = r.text
            raise httpx.HTTPStatusError(
                f"{r.status_code} from OpenRouter: {detail}",
                request=r.request,
                response=r,
            )
        r.raise_for_status()
        return r.json()

    async def stream_completion(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **params: Any,
    ) -> AsyncGenerator[str]:
        """Stream completion chunks from OpenRouter as raw text.

        Yields text content deltas suitable for SSE `data: <chunk>\n\n` forwarding.
        """
        client = await self._client_ctx()

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        # Pull out optional reasoning if provided via params
        reasoning = params.pop("reasoning", None)
        if reasoning:
            payload["reasoning"] = reasoning
        payload.update(params)

        async with client.stream("POST", "/chat/completions", json=payload) as resp:
            if resp.status_code >= 400:
                # Read server body for clearer diagnostics
                body = None
                try:
                    await resp.aread()
                    try:
                        body_json = resp.json()
                        body = body_json.get("error") or body_json
                    except Exception:
                        body = resp.text
                except Exception:
                    body = None
                msg = f"{resp.status_code} from OpenRouter"
                if body:
                    msg += f": {body}"
                raise httpx.HTTPStatusError(msg, request=resp.request, response=resp)
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    # Attempt to extract text delta from JSON; if parsing fails, yield raw
                    try:
                        import json as _json

                        obj = _json.loads(data)
                        delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except Exception:
                        # Minimal error handling for MVP
                        # Yield raw to avoid hiding useful info
                        yield data

    async def stream_events(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **params: Any,
    ) -> AsyncGenerator[dict[str, Any]]:
        """Stream OpenRouter events with parsed deltas.

        Yields dictionaries with types:
          - {"type": "content_delta", "content": str}
          - {"type": "reasoning", "content": str}
          - {"type": "tool_call_delta", "index": int, "id": str|None, "name": str|None, "arguments": str|None}
          - {"type": "done"}
        """
        client = await self._client_ctx()

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        reasoning = params.pop("reasoning", None)
        if reasoning:
            payload["reasoning"] = reasoning
        payload.update(params)

        async with client.stream("POST", "/chat/completions", json=payload) as resp:
            if resp.status_code >= 400:
                body = None
                try:
                    await resp.aread()
                    try:
                        body_json = resp.json()
                        body = body_json.get("error") or body_json
                    except Exception:
                        body = resp.text
                except Exception:
                    body = None
                msg = f"{resp.status_code} from OpenRouter"
                if body:
                    msg += f": {body}"
                raise httpx.HTTPStatusError(msg, request=resp.request, response=resp)
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    yield {"type": "done"}
                    break
                try:
                    import json as _json

                    obj = _json.loads(data)
                    choice = (obj.get("choices") or [{}])[0]
                    delta = choice.get("delta") or {}

                    # Content streaming
                    if isinstance(delta.get("content"), str) and delta.get("content"):
                        yield {"type": "content_delta", "content": delta.get("content")}

                    # Reasoning streaming (varies by provider)
                    if "reasoning" in delta:
                        r = delta.get("reasoning")
                        if isinstance(r, str) and r.strip():
                            yield {"type": "reasoning", "content": r}
                        elif isinstance(r, dict):
                            # DeepSeek uses "content", Claude uses "text"
                            text = r.get("content") or r.get("text") or ""
                            if isinstance(text, str) and text.strip():
                                yield {"type": "reasoning", "content": text}

                    # Tool calls delta in OpenAI-compatible schema
                    if isinstance(delta.get("tool_calls"), list):
                        for tc in delta.get("tool_calls"):
                            try:
                                idx = tc.get("index")
                                func = tc.get("function") or {}
                                name = func.get("name")
                                args_chunk = func.get("arguments")
                                call_id = tc.get("id")
                                yield {
                                    "type": "tool_call_delta",
                                    "index": idx if isinstance(idx, int) else 0,
                                    "id": call_id,
                                    "name": name,
                                    "arguments": args_chunk,
                                }
                            except Exception:
                                # ignore malformed partials
                                pass
                except Exception:
                    # On parse errors, surface raw line as content to aid debugging
                    yield {"type": "content_delta", "content": data}

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
