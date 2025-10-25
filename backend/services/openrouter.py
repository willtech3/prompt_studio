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

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = base_url or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self._client: httpx.AsyncClient | None = None

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
    ) -> AsyncGenerator[Any]:
        """Stream completion chunks from OpenRouter.

        For simplicity, this yields either:
          - plain string content chunks (normal text deltas)
          - a tuple ("reasoning", text) when the provider emits a reasoning/thinking delta
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
                        choice = (obj.get("choices") or [{}])[0]
                        delta = choice.get("delta", {}) if isinstance(choice.get("delta", {}), dict) else {}
                        message = choice.get("message", {}) if isinstance(choice.get("message", {}), dict) else {}

                        # Try to surface streamed reasoning when available (provider-specific)
                        reasoning_text = None
                        r = delta.get("reasoning")
                        if isinstance(r, dict):
                            reasoning_text = r.get("content") or r.get("text")
                        elif isinstance(r, str):
                            reasoning_text = r

                        # Some providers use "thinking"
                        if not reasoning_text:
                            thinking = delta.get("thinking")
                            if isinstance(thinking, dict):
                                reasoning_text = thinking.get("content") or thinking.get("text")
                            elif isinstance(thinking, str):
                                reasoning_text = thinking

                        if reasoning_text:
                            # Yield typed event for upstream router to forward as SSE
                            yield ("reasoning", reasoning_text)
                            continue

                        # Some providers emit a reasoning summary only at final message
                        if message:
                            msg_reasoning = message.get("reasoning") or message.get("reasoning_content")
                            if isinstance(msg_reasoning, dict):
                                msg_text = msg_reasoning.get("content") or msg_reasoning.get("text")
                                if msg_text:
                                    yield ("reasoning", msg_text)
                                    # do not continue; a final message may also include content below
                            elif isinstance(msg_reasoning, str):
                                yield ("reasoning", msg_reasoning)

                        content_text = delta.get("content") or message.get("content")
                        if content_text:
                            yield content_text
                    except Exception:
                        # Minimal error handling for MVP
                        # Yield raw to avoid hiding useful info
                        yield data

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
