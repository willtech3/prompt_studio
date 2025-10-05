# OpenRouter API Documentation

## Overview
OpenRouter provides a unified API to access 16 AI models from dozens of providers through a single endpoint, with automatic fallbacks and cost optimization.

## Key Features
- **Unified Interface**: Single API for all models
- **Automatic Fallbacks**: Seamless provider switching on errors
- **Cost Optimization**: Routes to most cost-effective providers
- **No Markup**: Pass-through pricing from providers
- **OpenAI Compatible**: Drop-in replacement for OpenAI API

## Getting Started

### API Key
Get your API key from [OpenRouter](https://openrouter.ai/keys)

### Base URL
```
https://openrouter.ai/api/v1
```

## Authentication

Include your API key in the Authorization header:
```javascript
headers: {
  'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
}
```

## Core Endpoints

### 1. List Available Models
```http
GET /api/v1/models
```

Response:
```json
{
  "data": [
    {
      "id": "openai/gpt-4-turbo-preview",
      "name": "GPT-4 Turbo",
      "description": "OpenAI's latest GPT-4 Turbo model",
      "pricing": {
        "prompt": "0.00001",     // per token
        "completion": "0.00003"   // per token
      },
      "context_length": 128000,
      "top_provider": {
        "max_completion_tokens": 4096,
        "is_moderated": false
      }
    }
  ]
}
```

### 2. Create Chat Completion
```http
POST /api/v1/chat/completions
```

Request:
```json
{
  "model": "openai/gpt-4-turbo-preview",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stream": false,
  "route": "fallback"  // Optional: "fallback" or specific provider
}
```

Response:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "openai/gpt-4-turbo-preview",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! I'm doing well, thank you for asking."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

### 3. Streaming Completions
```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4-turbo-preview',
    messages: messages,
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;

      const parsed = JSON.parse(data);
      console.log(parsed.choices[0]?.delta?.content || '');
    }
  }
}
```

## Python Integration

### Using OpenAI SDK
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

completion = client.chat.completions.create(
    model="openai/gpt-4-turbo-preview",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a haiku about programming"}
    ],
    temperature=0.7,
    max_tokens=100
)

print(completion.choices[0].message.content)
```

### Using httpx (Async)
```python
import httpx
import asyncio
import json

async def generate_completion(prompt: str, model: str = "openai/gpt-4-turbo-preview"):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7
            }
        )
        return response.json()

# Usage
result = await generate_completion("Explain quantum computing")
```

## FastAPI Service Implementation

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import httpx
from enum import Enum

app = FastAPI()

class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    META = "meta"

class Message(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str

class CompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False
    top_p: Optional[float] = 1.0
    frequency_penalty: Optional[float] = 0
    presence_penalty: Optional[float] = 0

class OpenRouterService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )

    async def list_models(self) -> Dict[str, Any]:
        response = await self.client.get(f"{self.base_url}/models")
        return response.json()

    async def create_completion(self, request: CompletionRequest) -> Dict[str, Any]:
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=request.dict()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))

    async def create_streaming_completion(self, request: CompletionRequest):
        request.stream = True
        async with self.client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json=request.dict()
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data != "[DONE]":
                        yield f"data: {data}\n\n"

# Initialize service
openrouter = OpenRouterService(api_key=OPENROUTER_API_KEY)

@app.get("/api/models")
async def get_models():
    """List all available models from OpenRouter"""
    return await openrouter.list_models()

@app.post("/api/completions")
async def create_completion(request: CompletionRequest):
    """Create a chat completion"""
    return await openrouter.create_completion(request)

@app.post("/api/completions/stream")
async def create_streaming_completion(request: CompletionRequest):
    """Create a streaming chat completion"""
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        openrouter.create_streaming_completion(request),
        media_type="text/event-stream"
    )
```

## Advanced Features

### 1. Provider Routing
Control how OpenRouter routes your requests:

```json
{
  "model": "openai/gpt-4",
  "route": "fallback",  // Automatic fallback on errors
  "provider": {
    "order": ["openai", "together"],  // Preferred provider order
    "require_parameters": true,
    "data_collection": "deny",
    "allow_fallbacks": true
  }
}
```

### 2. Cost Optimization
```json
{
  "model": "openai/gpt-4",
  "route": "floor"  // Routes to cheapest available provider
}
```

### 3. Performance Optimization
```json
{
  "model": "openai/gpt-4",
  "route": "nitro"  // Routes for fastest response time
}
```

### 4. Model-Specific Parameters
Different models support different parameters:

```python
# For Anthropic Claude
{
    "model": "anthropic/claude-3-opus",
    "messages": [...],
    "max_tokens": 4096,
    "temperature": 0.7,
    "top_k": 40,  # Claude-specific
    "top_p": 0.95
}

# For Google models
{
    "model": "google/gemini-pro",
    "messages": [...],
    "temperature": 0.7,
    "top_k": 40,
    "top_p": 0.95,
    "candidate_count": 1  # Gemini-specific
}
```

## Error Handling

### Common Error Codes
```python
ERROR_CODES = {
    400: "Bad Request - Invalid parameters",
    401: "Unauthorized - Invalid API key",
    402: "Payment Required - Insufficient credits",
    403: "Forbidden - Access denied",
    404: "Not Found - Model not available",
    429: "Too Many Requests - Rate limit exceeded",
    500: "Internal Server Error",
    502: "Bad Gateway - Provider error",
    503: "Service Unavailable"
}

async def handle_openrouter_error(response: httpx.Response):
    if response.status_code != 200:
        error_data = response.json()
        error_message = error_data.get("error", {}).get("message", "Unknown error")

        if response.status_code == 429:
            retry_after = response.headers.get("retry-after", "60")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limited. Retry after {retry_after} seconds"
            )

        raise HTTPException(
            status_code=response.status_code,
            detail=f"{ERROR_CODES.get(response.status_code, 'Error')}: {error_message}"
        )
```

## Rate Limiting

OpenRouter implements rate limiting based on your account tier:

```python
import time
from typing import Dict, Any

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests = []

    async def check_rate_limit(self):
        now = time.time()
        # Remove requests older than 1 minute
        self.requests = [req for req in self.requests if req > now - 60]

        if len(self.requests) >= self.requests_per_minute:
            sleep_time = 60 - (now - self.requests[0])
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

        self.requests.append(now)
```

## Cost Tracking

Track token usage and costs:

```python
class CostTracker:
    def __init__(self):
        self.total_tokens = 0
        self.total_cost = 0.0

    def track_usage(self, response: Dict[str, Any], model_pricing: Dict[str, float]):
        usage = response.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        # Get model pricing (per token)
        prompt_price = model_pricing.get("prompt", 0)
        completion_price = model_pricing.get("completion", 0)

        # Calculate cost
        prompt_cost = prompt_tokens * prompt_price
        completion_cost = completion_tokens * completion_price
        total_cost = prompt_cost + completion_cost

        self.total_tokens += prompt_tokens + completion_tokens
        self.total_cost += total_cost

        return {
            "tokens": {
                "prompt": prompt_tokens,
                "completion": completion_tokens,
                "total": prompt_tokens + completion_tokens
            },
            "cost": {
                "prompt": prompt_cost,
                "completion": completion_cost,
                "total": total_cost
            },
            "cumulative": {
                "tokens": self.total_tokens,
                "cost": self.total_cost
            }
        }
```

## Best Practices

### 1. Use Environment Variables
```python
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
```

### 2. Implement Retry Logic
```python
import backoff

@backoff.on_exception(
    backoff.expo,
    httpx.HTTPStatusError,
    max_tries=3,
    max_time=30
)
async def make_request_with_retry(client, url, json_data):
    response = await client.post(url, json=json_data)
    response.raise_for_status()
    return response.json()
```

### 3. Cache Model Information
```python
from functools import lru_cache
from datetime import datetime, timedelta

class ModelCache:
    def __init__(self, ttl_minutes: int = 60):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)

    async def get_models(self, fetch_func):
        now = datetime.now()
        if "models" in self.cache:
            cached_data, timestamp = self.cache["models"]
            if now - timestamp < self.ttl:
                return cached_data

        data = await fetch_func()
        self.cache["models"] = (data, now)
        return data
```

### 4. Monitor Performance
```python
import logging
from time import time

logger = logging.getLogger(__name__)

async def timed_request(func, *args, **kwargs):
    start = time()
    try:
        result = await func(*args, **kwargs)
        duration = time() - start
        logger.info(f"Request completed in {duration:.2f}s")
        return result
    except Exception as e:
        duration = time() - start
        logger.error(f"Request failed after {duration:.2f}s: {e}")
        raise
```

## Pricing

### Fee Structure (2025)
- **Credit Purchase Fee**: 5.5% (minimum $0.80)
- **Crypto Payments**: 5% fee
- **BYOK (Bring Your Own Key)**:
  - First 1M requests/month: Free
  - After 1M requests: 5% of standard cost

### Model Pricing Examples
```python
MODEL_PRICING = {
    "openai/gpt-4-turbo-preview": {
        "prompt": 0.00001,      # per token
        "completion": 0.00003    # per token
    },
    "anthropic/claude-3-opus": {
        "prompt": 0.000015,
        "completion": 0.000075
    },
    "google/gemini-pro": {
        "prompt": 0.0000005,
        "completion": 0.0000015
    },
    "meta/llama-3-70b": {
        "prompt": 0.0000008,
        "completion": 0.0000008
    }
}
```

## Compliance and Privacy

### Data Privacy Settings
```json
{
  "provider": {
    "data_collection": "deny",  // Prevent data collection
    "moderation": false         // Disable content moderation
  }
}
```

### Zero Data Retention (ZDR)
Enable ZDR for sensitive data:
```python
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Zero-Data-Retention": "true"
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check if key has sufficient permissions
   - Ensure proper header format

2. **Rate Limiting**
   - Implement exponential backoff
   - Check retry-after header
   - Consider upgrading account tier

3. **Model Availability**
   - Some models may be temporarily unavailable
   - Use fallback models
   - Check model status endpoint

4. **Streaming Issues**
   - Ensure proper SSE parsing
   - Handle connection timeouts
   - Implement reconnection logic

## Additional Resources
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [API Reference](https://openrouter.ai/docs/api-reference)
- [Model Catalog](https://openrouter.ai/models)
- [Pricing Calculator](https://openrouter.ai/pricing)
- [Status Page](https://status.openrouter.ai/)