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

    def __init__(self):
        """Initialize tool executor with available tools."""
        self.tools = {
            "search_web": self._search_web,
        }
        self.timeout = 7.5  # trade a bit more latency for better results
        self.brave_key = os.getenv("BRAVE_API_KEY")


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
            # Execute tool with timeout protection
            result = await asyncio.wait_for(
                self.tools[tool_name](**arguments),
                timeout=self.timeout
            )
            # If tool returned a structured error payload, surface as failed for clearer UI state
            if isinstance(result, dict) and result.get("error"):
                return {
                    "success": False,
                    "error": str(result.get("error")),
                    "result": result,
                }
            return {"success": True, "result": result}
        except TimeoutError:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' timed out after {self.timeout} seconds"
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
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/rich",
                params={"callback_key": callback_key},
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": self.brave_key,
                },
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
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if not self.brave_key:
                    return {
                        "error": "BRAVE_API_KEY is not set. Configure BRAVE_API_KEY to enable web search.",
                        "query": query,
                    }

                # Fetch search results with rich callback enabled
                response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={
                        "q": query,
                        "count": num_results,  # Already clamped to 1-10 above
                        "enable_rich_callback": "1",
                    },
                    headers={
                        "Accept": "application/json",
                        "X-Subscription-Token": self.brave_key,
                    },
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
