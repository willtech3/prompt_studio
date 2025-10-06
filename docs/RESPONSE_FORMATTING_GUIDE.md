# Response Formatting Guide

## Overview

Prompt Studio uses **Server-Sent Events (SSE)** to stream AI responses from OpenRouter in real-time, rendering them progressively as markdown. This guide explains the complete flow from API request to rendered UI.

---

## Architecture

### 1. Frontend → Backend Request

The frontend ([api.ts:23](../frontend/src/services/api.ts#L23)) creates an EventSource connection:

```typescript
streamChat(request: { model, prompt, system?, temperature?, ... }): EventSource {
  const params = new URLSearchParams()
  params.set('model', request.model)
  params.set('prompt', request.prompt)
  // ... other parameters

  return new EventSource(`/api/chat/stream?${params.toString()}`)
}
```

**Key points:**
- Uses browser's native `EventSource` API
- All parameters passed as URL query params
- Vite dev server proxies `/api/*` to backend (localhost:8000)

### 2. Backend → OpenRouter Streaming

Backend ([app/main.py:71](../backend/app/main.py#L71)) streams from OpenRouter:

```python
@app.get("/api/chat/stream")
async def stream_chat(
    model: str,
    prompt: str = "",
    system: Optional[str] = None,
    temperature: float = 0.7,
    # ... other parameters
):
    async def generate():
        svc = OpenRouterService()
        async for chunk in svc.stream_completion(model, messages, **params):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Response format:**
```
data: {"content": "Hello"}

data: {"content": " world"}

data: {"done": true}

```

### 3. Frontend Receives & Renders

ResponsePanel ([ResponsePanel.tsx:67](../frontend/src/components/ResponsePanel.tsx#L67)) listens for chunks:

```typescript
es.addEventListener('message', (e) => {
  const parsed = JSON.parse(e.data)
  if (parsed.done) {
    setIsStreaming(false)
    api.stopStream(currentStream.current)
  } else if (parsed.content) {
    appendResponse(parsed.content)  // Adds to existing response
  }
})
```

**Rendering** ([ResponsePanel.tsx:156](../frontend/src/components/ResponsePanel.tsx#L156)):
```tsx
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
  >
    {response}
  </ReactMarkdown>
</div>
```

---

## Markdown Rendering Stack

**Packages used:**
- `react-markdown` - Core markdown parser and renderer
- `remark-gfm` - GitHub Flavored Markdown (tables, strikethrough, task lists)
- `rehype-highlight` - Syntax highlighting for code blocks
- `highlight.js` - Language detection and themes (dark theme only)
- `@tailwindcss/typography` - Base prose styles

**Custom styles** ([styles.css:10](../frontend/src/styles.css#L10)):
- Custom prose overrides for dark mode
- Code blocks forced to `#0a0c10` background
- Paragraph spacing (1em top/bottom)
- Heading hierarchy with proper weights
- List, table, and blockquote styling

---

## How Models Output Markdown

Modern LLMs are trained on markdown and naturally use it. No special prompting needed:

**Common patterns:**
- Headers: `#`, `##`, `###`
- Bold/italic: `**bold**`, `*italic*`
- Lists: `-` for bullets, `1.` for numbered
- Code blocks: ````python ... ````
- Inline code: `` `code` ``
- Links: `[text](url)`
- Tables: Pipe-separated with headers

**If you need explicit formatting**, add to your prompt:
```
Format your response with:
- Clear section headers (##)
- Code examples in code blocks
- Bullet points for key steps
```

---

## Variable Interpolation

Before sending to API, prompts are interpolated ([ResponsePanel.tsx:36](../frontend/src/components/ResponsePanel.tsx#L36)):

```typescript
const interpolate = (text?: string) => {
  if (!text) return ''
  return text.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_m, key) => {
    const found = variables.find((v) => v.name.trim() === key)
    return found ? found.value : _m
  })
}
```

**Example:**
- User prompt: `Summarize {{topic}} in {{language}}`
- Variables: `topic="AI", language="Spanish"`
- Sent to API: `Summarize AI in Spanish`

---

## Streaming States

**State management** (Zustand store):
```typescript
isStreaming: boolean      // true while receiving chunks
response: string          // accumulated response text
appendResponse(chunk)     // adds chunk to response
setResponse(text)         // replaces entire response
```

**UI indicators:**
- Generate button (green) when idle
- Stop button (gray) when streaming
- "Generating…" text with pulse animation
- Response renders incrementally as chunks arrive

---

## Error Handling

**Stream errors** ([ResponsePanel.tsx:83](../frontend/src/components/ResponsePanel.tsx#L83)):
```typescript
es.addEventListener('error', () => {
  setIsStreaming(false)
  api.stopStream(currentStream.current)
})
```

**Backend errors** ([app/main.py:158](../backend/app/main.py#L158)):
```python
except Exception as e:
    yield f"data: {json.dumps({'error': str(e)})}\n\n"
```

Currently basic error handling—no retries or fallbacks needed for greenfield MVP.

---

## Parameters Passed to OpenRouter

All parameters from UI settings are forwarded:

**Core parameters:**
- `model` - Model ID (e.g., `anthropic/claude-3.5-sonnet`)
- `temperature` (0-2) - Sampling randomness
- `top_p` (0-1) - Nucleus sampling
- `max_tokens` - Response length limit

**Advanced parameters** (optional):
- `top_k`, `min_p`, `top_a` - Additional sampling controls
- `frequency_penalty`, `presence_penalty`, `repetition_penalty` - Repetition control
- `seed` - Deterministic sampling
- `response_format` - Force JSON output
- `stop` - Custom stop sequences
- `logprobs`, `top_logprobs` - Token probability output
- `logit_bias` - Token bias adjustments
- `reasoning_effort` - For reasoning models (low/medium/high)

---

## Accessibility

**Screen reader support:**
```tsx
<div className="prose..." aria-live="polite">
```

The `aria-live="polite"` attribute announces new content to screen readers as it streams in.

---

## Troubleshooting

### No response streaming
- Check backend is running (localhost:8000)
- Verify `OPENROUTER_API_KEY` is set in backend `.env`
- Check browser console for EventSource errors

### Raw markdown showing
- Ensure `@tailwindcss/typography` is installed
- Verify `prose` classes are applied
- Check custom prose CSS is loaded

### Code blocks not highlighted
- `rehype-highlight` and `highlight.js` must be installed
- Import highlight.js CSS: `import 'highlight.js/styles/github-dark.css'`

### Stream doesn't stop
- Click Stop button to close EventSource
- Backend will continue generating but frontend ignores it

---

## Implementation Notes

**Why SSE instead of WebSocket?**
- Simpler: browser-native `EventSource` API
- One-way streaming sufficient for this use case
- Better for serverless/stateless backends

**Why accumulate on frontend instead of backend?**
- Reduces memory on backend (stateless)
- Frontend already needs state for UI rendering
- Simpler backend implementation

**Why dark mode only for code?**
- MVP focuses on dark theme
- `github-dark.css` provides consistent styling
- Can add theme switching later if needed

---

This guide reflects the **actual implementation** as of MVP completion. All file references link to specific line numbers in the codebase.
