# OpenRouter API Documentation

> **Last Updated:** October 23, 2025
> **API Version:** v1
> **Base URL:** `https://openrouter.ai/api/v1`

## Overview

OpenRouter provides a unified API to access 500+ AI models from dozens of providers through a single endpoint, with automatic fallbacks, intelligent routing, and cost optimization.

### Key Features

- **Unified Interface**: Single API for all models (OpenAI-compatible)
- **Automatic Fallbacks**: Seamless provider switching on errors
- **Intelligent Routing**: Cost, performance, or custom routing
- **Tool/Function Calling**: Standardized across all providers
- **Multimodal Support**: Images, PDFs, audio inputs
- **Web Search Integration**: Native search capabilities
- **Prompt Caching**: Reduce costs for repeated prompts
- **Structured Outputs**: JSON mode and schema-based outputs
- **No Markup**: Pass-through pricing from providers

## Quick Start

### 1. Get API Key
Get your API key from [OpenRouter](https://openrouter.ai/keys)

### 2. Authentication
Include your API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 3. Basic Request
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-sonnet-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Core Endpoints

### 1. List Available Models
```http
GET /api/v1/models
```

Returns all available models with pricing, capabilities, and context limits.

**Response:**
```json
{
  "data": [
    {
      "id": "anthropic/claude-sonnet-4",
      "name": "Claude Sonnet 4",
      "context_length": 200000,
      "pricing": {
        "prompt": "0.000003",
        "completion": "0.000015"
      },
      "top_provider": {
        "max_completion_tokens": 8000
      }
    }
  ]
}
```

### 2. Create Chat Completion
```http
POST /api/v1/chat/completions
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model ID (e.g., "openai/gpt-4o", "anthropic/claude-sonnet-4") |
| `messages` | array | Yes | Array of message objects with `role` and `content` |
| `temperature` | float | No | Sampling temperature (0-2, default: 1) |
| `max_tokens` | integer | No | Maximum tokens to generate |
| `top_p` | float | No | Nucleus sampling (0-1, default: 1) |
| `top_k` | integer | No | Top-K sampling (provider-specific) |
| `frequency_penalty` | float | No | Penalize frequent tokens (-2 to 2) |
| `presence_penalty` | float | No | Penalize present tokens (-2 to 2) |
| `repetition_penalty` | float | No | Penalize repetitions (>0) |
| `seed` | integer | No | Deterministic sampling seed |
| `stop` | array/string | No | Stop sequences |
| `stream` | boolean | No | Enable streaming responses |
| `tools` | array | No | Tool/function definitions (see Tool Calling section) |
| `tool_choice` | string/object | No | Control tool usage: "auto", "none", "required", or specific function |
| `parallel_tool_calls` | boolean | No | Allow simultaneous tool execution (default: true) |
| `response_format` | object | No | Force output format (e.g., `{"type": "json_object"}`) |
| `logprobs` | boolean | No | Return log probabilities |
| `top_logprobs` | integer | No | Number of top tokens to include (1-5) |

**Provider-Specific Parameters:**
- `reasoning`: Object with `effort` field for reasoning models (e.g., `{"effort": "high"}`)
- `safe_prompt`: Boolean for Mistral models
- `raw_mode`: Boolean for Hyperbolic models

**Important Notes:**
- If a parameter is not supported by the chosen model, it is silently ignored
- `response_format` is only supported by OpenAI, Nitro, and select other models
- `tool_choice` routing: Only providers that support tool use will be used when tools are specified

## Tool/Function Calling

### Overview

Tool calling allows LLMs to request execution of external functions. The LLM suggests which tool to call with what arguments, but **does not execute the tool directly**. The client must execute the tool and return results to the LLM.

OpenRouter standardizes tool calling across all providers using OpenAI's tool calling format.

### Workflow

1. **Send Request with Tools**: Include `tools` array with function definitions
2. **Model Requests Tool**: Model responds with `tool_calls` array
3. **Execute Tools**: Client executes requested functions locally
4. **Return Results**: Send tool results back to model
5. **Final Response**: Model uses results to generate answer

### Tool Definition Format

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_web",
        "description": "Search the web for current information",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            },
            "num_results": {
              "type": "integer",
              "description": "Number of results (1-5)",
              "default": 3
            }
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

### Tool Choice Parameter

Controls how the model uses tools:

| Value | Behavior |
|-------|----------|
| `"auto"` | Model decides whether to call tools (default) |
| `"none"` | Model will not call any tools |
| `"required"` | Model must call at least one tool |
| `{"type": "function", "function": {"name": "function_name"}}` | Force specific tool |

**Example - Force Specific Tool:**
```json
{
  "tool_choice": {
    "type": "function",
    "function": {"name": "search_web"}
  }
}
```

### Parallel Tool Calls

Controls whether the model can call multiple tools simultaneously:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `parallel_tool_calls` | boolean | `true` | When `true`, model can call multiple functions simultaneously. When `false`, functions are called sequentially. |

**Example:**
```json
{
  "tools": [...],
  "tool_choice": "auto",
  "parallel_tool_calls": true
}
```

**When to use:**
- `true` (default): Enable when tools are independent and can run concurrently
- `false`: Use when tools must execute in sequence or have dependencies

### Tool Call Response Format

When the model wants to use a tool:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "search_web",
            "arguments": "{\"query\": \"latest AI news\", \"num_results\": 3}"
          }
        }
      ]
    }
  }]
}
```

### Sending Tool Results

After executing the tool, send results back:

```json
{
  "messages": [
    {"role": "user", "content": "What's the latest AI news?"},
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [...]  // Previous tool call
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "{\"results\": [...]}",  // Tool execution result as JSON string
      "name": "search_web"  // Optional
    }
  ]
}
```

### Interleaved Thinking

Some models support "interleaved thinking" - reasoning between tool calls:

```json
{
  "choices": [{
    "message": {
      "content": [
        {"type": "text", "text": "I need to search for current data..."},
        {"type": "thinking", "thinking": "The user wants recent information, so I should use search_web..."},
        {"type": "tool_use", ...}
      ]
    }
  }]
}
```

### Best Practices

1. **Clear Descriptions**: Provide detailed function and parameter descriptions
2. **Structured Parameters**: Use JSON schema with proper types and constraints
3. **Error Handling**: Handle tool execution failures gracefully
4. **Iteration Limits**: Prevent infinite tool calling loops (max 5-20 iterations)
5. **Token Management**: Monitor token usage as tool calls increase context
6. **Tool Design**: Create focused, single-purpose tools

### Finding Tool-Compatible Models

Filter models by tool support:
```
https://openrouter.ai/models?supported_parameters=tools
```

## Provider-Specific Notes

### Known Issues & Limitations

#### xAI (Grok Models)
- **Tool Calling Compatibility**: Known OpenRouter/xAI integration issues with forced `tool_choice`
  - Error: "Required function is not present in the provided tools"
  - **Workaround**: Use `tool_choice: "auto"` instead of forcing specific functions
  - GitHub Issues: [zed#34185](https://github.com/zed-industries/zed/issues/34185), [zed#36994](https://github.com/zed-industries/zed/issues/36994)
- **Response Format**: xAI models may reject `response_format` parameter
- **Reasoning**: Mandatory reasoning, cannot be disabled

#### Anthropic (Claude)
- **Thinking Variant Deprecated**: `:thinking` variant no longer supported
- **Use Instead**: `reasoning` parameter: `{"effort": "low|medium|high"}`
- **Reasoning Tokens**: Available in response

#### OpenAI (o-series)
- **Reasoning Tokens**: Not visible in response despite being used

#### Google (Gemini Flash Thinking)
- **Reasoning Tokens**: Not visible in response

### Parameter Support Matrix

| Parameter | OpenAI | Anthropic | Google | xAI | DeepSeek |
|-----------|--------|-----------|--------|-----|----------|
| `tools` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tool_choice` (forced) | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| `response_format` | ✅ | ❌ | Limited | ⚠️ | ✅ |
| `top_k` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `logit_bias` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `reasoning` | ✅ | ✅ | ✅ | ✅ | ✅ |

⚠️ = Supported but with known issues

## Error Handling

### Error Response Format

```typescript
{
  error: {
    code: number;
    message: string;
    metadata?: Record<string, unknown>;
  }
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request parameters |
| 401 | Invalid Credentials | Verify API key |
| 402 | Insufficient Credits | Add credits to account |
| 403 | Moderation Flagged | Review input content |
| 408 | Request Timeout | Retry with timeout handling |
| 429 | Rate Limited | Implement backoff, check retry-after header |
| 502 | Provider Down | Try different model/provider |
| 503 | No Available Providers | Wait and retry, use fallback |

### Streaming Errors

**Pre-stream errors**: Standard JSON error response

**Mid-stream errors**: Sent as SSE events
```json
data: {
  "error": {
    "code": "server_error",
    "message": "Provider disconnected"
  },
  "choices": [{
    "finish_reason": "error"
  }]
}
```

### Error Handling Best Practices

```python
import httpx

try:
    response = await client.post(url, json=payload)

    if response.status_code >= 400:
        # Extract detailed error
        try:
            error_data = response.json()
            detail = error_data.get("error", {})
            message = detail.get("message", response.text)
            metadata = detail.get("metadata", {})
        except:
            detail = response.text

        raise httpx.HTTPStatusError(
            f"{response.status_code} from OpenRouter: {detail}",
            request=response.request,
            response=response
        )

    response.raise_for_status()
    return response.json()

except httpx.HTTPStatusError as e:
    # Handle specific errors
    if e.response.status_code == 429:
        retry_after = e.response.headers.get("retry-after", "60")
        # Implement backoff
    elif e.response.status_code == 502:
        # Try fallback model
    # ... handle other cases
```

## Python Integration

### Using httpx (Recommended for FastAPI)

```python
from typing import Optional, Dict, Any, AsyncGenerator
import httpx
import os

class OpenRouterService:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = base_url or "https://openrouter.ai/api/v1"
        self._client: Optional[httpx.AsyncClient] = None

    async def _client_ctx(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            # Optional: Attribution headers for leaderboard
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

    async def completion(
        self,
        model: str,
        messages: list[Dict[str, Any]],
        **params: Any,
    ) -> Dict[str, Any]:
        client = await self._client_ctx()
        payload = {"model": model, "messages": messages, **params}

        r = await client.post("/chat/completions", json=payload)

        if r.status_code >= 400:
            # Enhanced error handling
            try:
                data = r.json()
                detail = data.get("error") or data
            except:
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
        messages: list[Dict[str, Any]],
        **params: Any,
    ) -> AsyncGenerator[str, None]:
        client = await self._client_ctx()
        payload = {"model": model, "messages": messages, "stream": True, **params}

        async with client.stream("POST", "/chat/completions", json=payload) as resp:
            if resp.status_code >= 400:
                await resp.aread()
                try:
                    body = resp.json().get("error") or resp.text
                except:
                    body = resp.text
                raise httpx.HTTPStatusError(
                    f"{resp.status_code} from OpenRouter: {body}",
                    request=resp.request,
                    response=resp
                )

            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        obj = json.loads(data)
                        delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
                        if delta:
                            yield delta
                    except:
                        yield data

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
```

### Using OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

completion = client.chat.completions.create(
    model="anthropic/claude-sonnet-4",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(completion.choices[0].message.content)
```

## Advanced Features

### 1. Provider Routing

Control how requests are routed:

```json
{
  "model": "openai/gpt-4",
  "route": "fallback",  // "fallback", "floor", "nitro"
  "provider": {
    "order": ["openai", "together"],
    "require_parameters": true,
    "data_collection": "deny",
    "allow_fallbacks": true
  }
}
```

**Route Types:**
- `fallback`: Automatic provider switching on errors (default)
- `floor`: Routes to cheapest provider
- `nitro`: Routes for fastest response time

### 2. Response Format / Structured Outputs

Force JSON output (OpenAI, Nitro, select models only):

```json
{
  "response_format": {
    "type": "json_object"
  },
  "messages": [
    {
      "role": "system",
      "content": "You must respond with valid JSON"
    }
  ]
}
```

### 3. Prompt Caching

Reduce costs for repeated prompts by caching common prefixes.

### 4. Attribution Headers

For leaderboard and app attribution:

```python
headers = {
    "HTTP-Referer": "https://your-app.com",
    "X-Title": "Your App Name"
}
```

## Best Practices

### 1. Environment Variables
```python
import os
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
```

### 2. Resource Cleanup
```python
# Always close clients
svc = OpenRouterService()
try:
    result = await svc.completion(...)
finally:
    await svc.close()
```

### 3. Provider-Specific Handling

```python
def _provider_id_from_model(model_id: str | None) -> str:
    """Extract provider prefix from model ID."""
    try:
        return (model_id or "").split("/")[0].split(":")[0].replace("-", "")
    except:
        return ""

# Use for provider-specific logic
provider = _provider_id_from_model("xai/grok-4")
if provider == "xai":
    # Skip forced tool_choice for xAI
    tool_choice = "auto"
```

### 4. Error Handling

```python
try:
    response = await svc.completion(model=model, messages=messages)
except httpx.HTTPStatusError as e:
    if e.response.status_code == 502:
        # Provider down - try fallback
        response = await svc.completion(model=fallback_model, messages=messages)
    elif e.response.status_code == 429:
        # Rate limited - implement backoff
        await asyncio.sleep(60)
        response = await svc.completion(model=model, messages=messages)
    else:
        raise
```

### 5. Tool Calling Iteration Limits

```python
max_iterations = 5
iteration = 0

while iteration < max_iterations:
    response = await svc.completion(model=model, messages=messages, tools=tools)

    tool_calls = response["choices"][0]["message"].get("tool_calls")
    if not tool_calls:
        break  # Final answer

    # Execute tools and add results to messages
    for tool_call in tool_calls:
        result = execute_tool(tool_call)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call["id"],
            "content": json.dumps(result)
        })

    iteration += 1
```

## Pricing

### Fee Structure (2025)
- **Credit Purchase**: 5.5% fee (minimum $0.80)
- **Crypto Payments**: 5% fee
- **BYOK (Bring Your Own Key)**:
  - First 1M requests/month: Free
  - After 1M: 5% of standard cost

### Example Pricing (per token)
```python
MODEL_PRICING = {
    "openai/gpt-4o": {
        "prompt": 0.0000025,
        "completion": 0.000010
    },
    "anthropic/claude-sonnet-4": {
        "prompt": 0.000003,
        "completion": 0.000015
    },
    "google/gemini-2.0-flash": {
        "prompt": 0.00000010,
        "completion": 0.00000040
    }
}
```

## Rate Limits

Rate limits vary by account tier. Check current limits at:
```
https://openrouter.ai/docs/api-reference/limits
```

## Additional Resources

- **Main Documentation**: https://openrouter.ai/docs
- **API Reference**: https://openrouter.ai/docs/api-reference
- **Model Catalog**: https://openrouter.ai/models
- **Tool-Compatible Models**: https://openrouter.ai/models?supported_parameters=tools
- **Pricing Calculator**: https://openrouter.ai/pricing
- **Status Page**: https://status.openrouter.ai/
- **FAQ**: https://openrouter.ai/docs/faq
