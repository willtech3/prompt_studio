"""
Safe tool executor for prompt testing.

Provides sandboxed execution of predefined tools for testing tool-calling prompts.
This is NOT an agent execution platform - only safe, read-only tools are provided.

Security principles:
- No arbitrary code execution (no eval/exec)
- All external API calls have timeouts
- Input validation on all parameters
- Structured error responses
"""

import asyncio
import os

import httpx


class ToolExecutor:
    """Execute safe, predefined tools for prompt testing.

    For web search we standardize on Brave Search only for consistency across
    all models/providers.
    """

    def __init__(self, request_id: str | None = None):
        """Initialize tool executor with available tools."""
        self.tools = {
            "search_web": self._search_web,
            "read_url": self._read_url,
        }
        # Per-tool timeouts - None means no timeout
        self.tool_timeouts = {
            "search_web": 15.0,
            "read_url": 60.0,
        }
        self.brave_key = os.getenv("BRAVE_API_KEY")
        self.jina_key = os.getenv("JINA_API_KEY")  # Optional: improves rate limits
        self.request_id = request_id


    async def execute(self, tool_name: str, arguments: dict) -> dict:
        """
        Execute a tool with given arguments.
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Dictionary of arguments for the tool
            
        Returns:
            Dictionary with either:
            - {"success": true, "result": <tool_result>}
            - {"success": false, "error": <error_message>}
        """
        if tool_name not in self.tools:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}. Available tools: {', '.join(self.tools.keys())}"
            }

        try:
            # Execute tool with optional timeout protection
            timeout = self.tool_timeouts.get(tool_name)
            if timeout is not None:
                result = await asyncio.wait_for(
                    self.tools[tool_name](**arguments),
                    timeout=timeout
                )
            else:
                result = await self.tools[tool_name](**arguments)

            # If tool returned a structured error payload, surface as failed for clearer UI state
            if isinstance(result, dict) and result.get("error"):
                return {
                    "success": False,
                    "error": str(result.get("error")),
                    "result": result,
                }
            return {"success": True, "result": result}
        except TimeoutError:
            timeout = self.tool_timeouts.get(tool_name)
            return {
                "success": False,
                "error": f"Tool '{tool_name}' timed out after {timeout} seconds"
            }
        except TypeError as e:
            return {
                "success": False,
                "error": f"Invalid arguments for '{tool_name}': {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' failed: {str(e)}"
            }

    async def _fetch_rich_data(self, client: httpx.AsyncClient, callback_key: str) -> dict | None:
        """Fetch rich structured data from Brave API callback endpoint."""
        try:
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": self.brave_key,
            }
            if self.request_id:
                headers["X-Request-Id"] = self.request_id

            response = await client.get(
                "https://api.search.brave.com/res/v1/web/rich",
                params={"callback_key": callback_key},
                headers=headers,
            )
            return response.json() if response.status_code == 200 else None
        except Exception:
            return None

    def _extract_web_result(self, item: dict) -> dict:
        """Extract and enrich a single web search result."""
        url = item.get("url", "")
        result = {
            "title": item.get("title") or url,
            "description": item.get("description", ""),
            "url": url,
            "source": (httpx.URL(url).host if url else "Brave"),
        }

        # Add optional metadata fields
        if item.get("thumbnail"):
            result["thumbnail"] = item["thumbnail"].get("src")

        if item.get("location"):
            loc = item["location"]
            result["location"] = {
                "coordinates": loc.get("coordinates"),
                "address": loc.get("postal_address", {}).get("displayAddress"),
            }

        if item.get("profile"):
            result["publisher"] = item["profile"].get("name")

        if item.get("language"):
            result["language"] = item["language"]

        if item.get("subtype"):
            result["type"] = item["subtype"]

        return result

    async def _search_web(
        self,
        query: str,
        num_results: int = 10
    ) -> dict:
        """
        Search the web using Brave Search API (uniform across all models).

        Args:
            query: Search query string
            num_results: Number of results to return (1-10, default 10)

        Returns:
            Dictionary with search results and optional rich data, or an error message.
        """
        if not query or not query.strip():
            return {"error": "Query cannot be empty"}

        num_results = max(1, min(10, num_results))

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if not self.brave_key:
                    return {
                        "error": "BRAVE_API_KEY is not set. Configure BRAVE_API_KEY to enable web search.",
                        "query": query,
                    }

                # Fetch search results with rich callback enabled
                headers = {
                    "Accept": "application/json",
                    "X-Subscription-Token": self.brave_key,
                }
                if self.request_id:
                    headers["X-Request-Id"] = self.request_id

                response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={
                        "q": query,
                        "count": num_results,  # Already clamped to 1-10 above
                        "enable_rich_callback": "1",
                    },
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

                # Fetch rich data if available (weather, stocks, sports, calculator, etc.)
                rich_data = None
                if "rich" in data and "hint" in data["rich"]:
                    callback_key = data["rich"]["hint"].get("callback_key")
                    if callback_key:
                        rich_data = await self._fetch_rich_data(client, callback_key)

                # Extract and enrich web results
                web = data.get("web", {})
                results_json = web.get("results", []) or []
                results = [self._extract_web_result(item) for item in results_json[:num_results]]

                # Build response
                response_data = {
                    "query": query,
                    "num_results": len(results),
                    "results": results,
                    "provider": "brave"
                }

                if rich_data:
                    response_data["rich"] = rich_data

                return response_data

        except httpx.HTTPError as e:
            return {"error": f"Search failed: {str(e)}", "query": query}
        except Exception as e:
            return {"error": f"Unexpected error during search: {str(e)}", "query": query}

    async def _read_url(
        self,
        urls: list[str] | str,
        max_chars: int | None = None,
    ) -> dict:
        """Read and return LLM-friendly content from web pages using Jina Reader API.

        Jina Reader converts any URL to clean Markdown optimized for LLMs.
        It handles JavaScript rendering, PDFs, images, and respects robots.txt.

        Args:
            urls: Single URL or list of URLs to fetch.
            max_chars: Optional soft character limit per page (default: 12000).

        Returns:
            Dictionary with list of page payloads and any per-URL errors.
        """
        # Normalize input to list
        if isinstance(urls, str):
            url_list = [urls]
        else:
            url_list = [u for u in urls if isinstance(u, str)]

        url_list = [u for u in url_list if u and u.strip()]
        if not url_list:
            return {"error": "At least one valid URL is required"}

        # Limit the number of URLs per call to keep latency predictable
        MAX_URLS = 8
        truncated_urls: list[str] = []
        if len(url_list) > MAX_URLS:
            truncated_urls = url_list[MAX_URLS:]
            url_list = url_list[:MAX_URLS]

        # Clamp max_chars to reasonable range (Jina handles truncation intelligently)
        if max_chars is None:
            max_chars = 12000
        try:
            max_chars_int = int(max_chars)
        except (TypeError, ValueError):
            max_chars_int = 12000
        max_chars = max(500, min(50000, max_chars_int))

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Fetch all URLs concurrently using Jina Reader
            tasks = [
                self._fetch_single_url_jina(client, url, max_chars)
                for url in url_list
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        pages = []
        for url, result in zip(url_list, results):
            if isinstance(result, Exception):
                pages.append({"url": url, "error": str(result)})
            else:
                pages.append(result)

        response: dict = {
            "pages": pages,
            "count": len(pages),
        }
        if truncated_urls:
            response["truncated"] = {
                "max_urls": MAX_URLS,
                "dropped_urls": truncated_urls,
            }
        return response

    async def _fetch_single_url_jina(
        self,
        client: httpx.AsyncClient,
        url: str,
        max_chars: int,
    ) -> dict:
        """Fetch a single URL using Jina Reader API.

        Jina Reader prepends https://r.jina.ai/ to convert URLs to LLM-friendly Markdown.
        """
        try:
            # Build Jina Reader URL
            jina_url = f"https://r.jina.ai/{url}"

            # Prepare headers (default is Markdown text response)
            headers = {
                "Accept": "text/plain",  # Get Markdown as plain text
            }
            if self.request_id:
                headers["X-Request-Id"] = self.request_id

            # Add API key if available (improves rate limits from 20 to 200 RPM)
            if self.jina_key:
                headers["Authorization"] = f"Bearer {self.jina_key}"

            response = await client.get(
                jina_url,
                headers=headers,
                follow_redirects=True,
            )
            response.raise_for_status()

            # Jina returns clean Markdown in response body
            content = response.text

            # Apply character limit if content is too long
            if max_chars and len(content) > max_chars:
                # Truncate but try to end at a sentence boundary
                truncated = content[:max_chars]
                last_period = truncated.rfind(". ")
                if last_period > max_chars * 0.8:  # Only use if within last 20%
                    truncated = truncated[:last_period + 1]
                content = truncated + "\n\n[Content truncated...]"

            # Extract title from Jina's Title: line or first heading
            title = url
            lines = content.split("\n", 10)
            for line in lines:
                # Jina includes "Title: " in response
                if line.startswith("Title: "):
                    title = line.replace("Title: ", "").strip()
                    break
                # Fallback to markdown heading
                elif line.startswith("# "):
                    title = line.replace("# ", "").strip()
                    break

            return {
                "url": url,
                "title": title,
                "content": content,
            }

        except httpx.HTTPError as e:
            return {"url": url, "error": f"Fetch failed: {str(e)}"}
        except Exception as e:
            return {"url": url, "error": f"Unexpected error: {str(e)}"}
