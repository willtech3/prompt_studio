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

    def get_available_tools(self) -> list[dict]:
        """
        Return OpenAI-compatible tool schemas for all available tools.

        Returns list of tool definitions that can be passed to OpenRouter.
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": "search_web",
                    "description": "Search the web for current information. Returns search results with titles, descriptions, and URLs. Also returns rich structured data when available (weather forecasts, stock quotes, sports scores, calculations, currency conversion, etc.).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query to look up"
                            },
                            "num_results": {
                                "type": "integer",
                                "description": "Number of results to return (1-5)",
                                "default": 3
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

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

    async def _search_web(
        self,
        query: str,
        num_results: int = 10,
        time_hint: str | None = None,
        after: str | None = None,
        before: str | None = None
    ) -> dict:
        """
        Search the web using Brave Search API (uniform across all models).

        Args:
            query: Search query string
            num_results: Number of results to return (1-5)
            time_hint: Ignored - kept for compatibility with model calls
            after: Ignored - kept for compatibility with model calls
            before: Ignored - kept for compatibility with model calls

        Returns:
            Dictionary with search results, or an error message when misconfigured.
        """
        # Note: time_hint, after, before are accepted but ignored
        # They were too restrictive and caused 0 results for many queries
        # Validate inputs
        if not query or not query.strip():
            return {"error": "Query cannot be empty"}

        num_results = max(1, min(5, num_results))  # Clamp to 1-5

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if not self.brave_key:
                    return {
                        "error": "BRAVE_API_KEY is not set. Configure BRAVE_API_KEY to enable web search.",
                        "query": query,
                    }

                # Enable rich search callbacks for structured data (weather, stocks, sports, etc.)
                params = {
                    "q": query,
                    "count": max(1, min(5, num_results)),
                    "enable_rich_callback": "1",
                }

                r = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params=params,
                    headers={
                        "Accept": "application/json",
                        "X-Subscription-Token": self.brave_key,
                    },
                )
                r.raise_for_status()
                data = r.json()

                # Check if rich data is available (weather, stocks, sports, calculator, etc.)
                rich_data = None
                if "rich" in data and "hint" in data["rich"]:
                    callback_key = data["rich"]["hint"].get("callback_key")

                    if callback_key:
                        # Fetch rich data from callback endpoint
                        rich_response = await client.get(
                            "https://api.search.brave.com/res/v1/web/rich",
                            params={"callback_key": callback_key},
                            headers={
                                "Accept": "application/json",
                                "X-Subscription-Token": self.brave_key,
                            },
                        )
                        if rich_response.status_code == 200:
                            rich_data = rich_response.json()

                # Extract standard web results
                web = (data or {}).get("web", {})
                results_json = web.get("results", []) or []
                results = []
                for item in results_json[:num_results]:
                    url = item.get("url", "")
                    result = {
                        "title": item.get("title") or url,
                        "description": item.get("description", ""),
                        "url": url,
                        "source": (httpx.URL(url).host if url else "Brave"),
                    }

                    # Add extra data fields if available
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

                    # Add language and type metadata
                    if item.get("language"):
                        result["language"] = item["language"]
                    if item.get("subtype"):
                        result["type"] = item["subtype"]

                    results.append(result)

                response = {
                    "query": query,
                    "num_results": len(results),
                    "results": results,
                    "provider": "brave"
                }

                # Include rich data if available (weather, stocks, sports, calculator, etc.)
                if rich_data:
                    response["rich"] = rich_data

                return response

        except httpx.HTTPError as e:
            return {
                "error": f"Search failed: {str(e)}",
                "query": query
            }
        except Exception as e:
            return {
                "error": f"Unexpected error during search: {str(e)}",
                "query": query
            }
