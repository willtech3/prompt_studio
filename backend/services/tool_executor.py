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

import ast
import asyncio
import operator
import os
from datetime import UTC, datetime

import httpx


class ToolExecutor:
    """Execute safe, predefined tools for prompt testing."""

    def __init__(self):
        """Initialize tool executor with available tools."""
        self.tools = {
            "search_web": self._search_web,
            "get_current_time": self._get_current_time,
            "calculate": self._calculate,
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
                    "description": "Search the web for current information. Returns top search results with titles, snippets, and URLs.",
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
            },
            {
                "type": "function",
                "function": {
                    "name": "get_current_time",
                    "description": "Get the current date and time in ISO 8601 format.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "timezone": {
                                "type": "string",
                                "description": "Timezone name (e.g., 'UTC', 'America/New_York'). Defaults to UTC.",
                                "default": "UTC"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "Safely evaluate a mathematical expression. Supports basic arithmetic: +, -, *, /, ** (power). No variables or functions allowed.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "Mathematical expression to evaluate (e.g., '25 * 17 + 89')"
                            }
                        },
                        "required": ["expression"]
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

    async def _search_web(self, query: str, num_results: int = 3, time_hint: str | None = None, after: str | None = None, before: str | None = None) -> dict:
        """
        Search the web using DuckDuckGo Instant Answer API.
        
        This is a free, no-auth-required API that provides instant answers and web results.
        For production, consider using Brave Search API, Perplexity, or SerpAPI.
        
        Args:
            query: Search query string
            num_results: Number of results to return (1-5)
            
        Returns:
            Dictionary with search results
        """
        # Validate inputs
        if not query or not query.strip():
            return {"error": "Query cannot be empty"}

        num_results = max(1, min(5, num_results))  # Clamp to 1-5

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Prefer Brave Search API when available for higher-quality results
                if self.brave_key:
                    freshness_map = {"day": "pd", "week": "pw", "month": "pm", "year": "py"}
                    params = {
                        "q": query,
                        "count": max(1, min(5, num_results)),
                    }
                    if time_hint in freshness_map:
                        params["freshness"] = freshness_map[time_hint]
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
                    web = (data or {}).get("web", {})
                    results_json = web.get("results", []) or []
                    results = []
                    for item in results_json[:num_results]:
                        url = item.get("url", "")
                        results.append({
                            "title": item.get("title") or url,
                            "snippet": item.get("snippet") or item.get("description", ""),
                            "url": url,
                            "source": (httpx.URL(url).host if url else "Brave"),
                        })
                    return {"query": query, "num_results": len(results), "results": results, "provider": "brave"}

                # Fallback: DuckDuckGo Instant Answer (fast but not always rich)
                response = await client.get(
                    "https://api.duckduckgo.com/",
                    params={
                        "q": query,
                        "format": "json",
                        "no_html": 1,
                        "skip_disambig": 1
                    }
                )
                response.raise_for_status()
                data = response.json()
                results = []
                if data.get("AbstractText"):
                    results.append({
                        "title": data.get("Heading", query),
                        "snippet": data.get("AbstractText", ""),
                        "url": data.get("AbstractURL", ""),
                        "source": data.get("AbstractSource", "DuckDuckGo")
                    })
                for topic in data.get("RelatedTopics", [])[:num_results - len(results)]:
                    if isinstance(topic, dict) and "Text" in topic:
                        results.append({
                            "title": topic.get("Text", "")[:100],
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", ""),
                            "source": "DuckDuckGo"
                        })
                if not results:
                    results = [{
                        "title": "No instant results found",
                        "snippet": f"DuckDuckGo did not return instant answers for '{query}'.",
                        "url": f"https://duckduckgo.com/?q={query}",
                        "source": "DuckDuckGo"
                    }]
                return {"query": query, "num_results": len(results), "results": results[:num_results], "provider": "duckduckgo"}

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

    async def _get_current_time(self, timezone: str = "UTC") -> dict:
        """
        Get current date and time.
        
        Args:
            timezone: Timezone name (currently only UTC is supported for simplicity)
            
        Returns:
            Dictionary with current time information
        """
        try:
            now = datetime.now(UTC)

            return {
                "timestamp": now.isoformat(),
                "timezone": "UTC",
                "unix_timestamp": int(now.timestamp()),
                "formatted": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "date": now.strftime("%Y-%m-%d"),
                "time": now.strftime("%H:%M:%S")
            }
        except Exception as e:
            return {
                "error": f"Failed to get time: {str(e)}"
            }

    async def _calculate(self, expression: str) -> dict:
        """
        Safely evaluate a mathematical expression using AST parsing.
        
        Only allows basic arithmetic operations: +, -, *, /, ** (power)
        No variables, functions, or other Python features allowed.
        
        Args:
            expression: Mathematical expression to evaluate
            
        Returns:
            Dictionary with calculation result
        """
        if not expression or not expression.strip():
            return {"error": "Expression cannot be empty"}

        # Define allowed operators
        allowed_operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Pow: operator.pow,
            ast.USub: operator.neg,  # Unary minus
            ast.UAdd: operator.pos,  # Unary plus
        }

        try:
            # Parse expression into AST
            node = ast.parse(expression.strip(), mode='eval')

            # Evaluate the AST safely
            result = self._eval_ast_node(node.body, allowed_operators)

            return {
                "expression": expression,
                "result": result,
                "formatted": f"{expression} = {result}"
            }

        except SyntaxError:
            return {
                "error": f"Invalid mathematical expression: '{expression}'",
                "expression": expression
            }
        except ZeroDivisionError:
            return {
                "error": "Division by zero",
                "expression": expression
            }
        except Exception as e:
            return {
                "error": f"Calculation failed: {str(e)}",
                "expression": expression,
                "hint": "Only basic arithmetic is supported: +, -, *, /, **"
            }

    def _eval_ast_node(self, node: ast.AST, operators: dict) -> float:
        """
        Recursively evaluate an AST node safely.
        
        Args:
            node: AST node to evaluate
            operators: Dictionary of allowed operators
            
        Returns:
            Numeric result
            
        Raises:
            ValueError: If node contains unsupported operations
        """
        if isinstance(node, ast.Constant):
            # Python 3.8+ uses ast.Constant for numbers
            if isinstance(node.value, (int, float)):
                return float(node.value)
            else:
                raise ValueError(f"Only numbers are allowed, not {type(node.value).__name__}")

        elif isinstance(node, ast.Num):
            # Older Python versions use ast.Num
            return float(node.n)

        elif isinstance(node, ast.BinOp):
            # Binary operation (e.g., 2 + 3)
            op = operators.get(type(node.op))
            if op is None:
                raise ValueError(f"Unsupported operator: {type(node.op).__name__}")

            left = self._eval_ast_node(node.left, operators)
            right = self._eval_ast_node(node.right, operators)
            return op(left, right)

        elif isinstance(node, ast.UnaryOp):
            # Unary operation (e.g., -5)
            op = operators.get(type(node.op))
            if op is None:
                raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")

            operand = self._eval_ast_node(node.operand, operators)
            return op(operand)

        else:
            raise ValueError(
                f"Unsupported expression type: {type(node).__name__}. "
                "Only numbers and basic arithmetic (+, -, *, /, **) are allowed."
            )
