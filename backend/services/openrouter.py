from __future__ import annotations

from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
import os


class OpenRouterService:
    """Minimal OpenRouter client for MVP.

    Notes:
    - Keep simple; no retries or complex error handling yet.
    - Streaming returns raw text chunks suitable for SSE forwarding.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = base_url or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self._client: Optional[httpx.AsyncClient] = None

    async def _client_ctx(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=float(os.getenv("OPENROUTER_TIMEOUT", "120")),
            )
        return self._client

    async def list_models(self) -> Dict[str, Any]:
        client = await self._client_ctx()
        r = await client.get("/models")
        r.raise_for_status()
        return r.json()

    async def completion(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        **params: Any,
    ) -> Dict[str, Any]:
        client = await self._client_ctx()
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        payload.update(params)
        r = await client.post("/chat/completions", json=payload)
        r.raise_for_status()
        return r.json()

    async def stream_completion(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        **params: Any,
    ) -> AsyncGenerator[str, None]:
        """Stream completion chunks from OpenRouter as raw text.

        Yields text content deltas suitable for SSE `data: <chunk>\n\n` forwarding.
        """
        client = await self._client_ctx()

        payload: Dict[str, Any] = {
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

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
