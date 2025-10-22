# Tool Calling Test Guide

## The Problem
The model is outputting text that **looks like** tool calls (`<search_web>` tags) instead of **actually calling** the function calling API.

## Root Cause
Not all models on OpenRouter support function calling. The model you tested likely:
1. Doesn't support tool calling
2. Is hallucinating tool call syntax from training data

## Models That Support Tool Calling

### ✅ Confirmed Working
- **OpenAI GPT-4** (`openai/gpt-4` or `openai/gpt-4-turbo`)
- **OpenAI GPT-4o** (`openai/gpt-4o`)
- **Anthropic Claude 3.5 Sonnet** (`anthropic/claude-3.5-sonnet`)
- **Anthropic Claude Sonnet 4** (`anthropic/claude-sonnet-4`)
- **Google Gemini Pro** (`google/gemini-pro`)

### ❌ May Not Work
- Older models (GPT-3.5, older Claude versions)
- Some open-source models
- Models not explicitly documented as supporting function calling

## How to Test Properly

### Step 1: Select a Tool-Calling Model
In the UI:
1. Click the model selector
2. Choose **`openai/gpt-4o`** or **`anthropic/claude-sonnet-4`**

### Step 2: Enter Tool Schemas
In Parameters > "Show details for nerds" > Tool Schemas:

```json
[
  {
    "type": "function",
    "function": {
      "name": "calculate",
      "description": "Evaluate a mathematical expression",
      "parameters": {
        "type": "object",
        "properties": {
          "expression": {
            "type": "string",
            "description": "Math expression to evaluate (e.g., '25 * 17 + 89')"
          }
        },
        "required": ["expression"]
      }
    }
  }
]
```

### Step 3: Test with a Simple Prompt

**For GPT-4:**
```
What is 25 * 17 + 89? Please calculate this.
```

**For Claude:**
```
Calculate 25 * 17 + 89 for me.
```

### Step 4: Expected Behavior

✅ **Correct (tool calling working):**
- You see a blue "Tool Executions" section
- Shows: `calculate` with status "Executing..." then "Completed"
- View result shows: `{"expression": "25 * 17 + 89", "result": 514}`
- Final response: "The result is 514"

❌ **Incorrect (tool calling not working):**
- No "Tool Executions" section appears
- Model outputs text like `<calculate>25 * 17 + 89</calculate>`
- Or model just tries to do the math in text

## Debugging Checklist

If tool calling still doesn't work:

1. **Check Model Support**
   - Use `openai/gpt-4o` or `anthropic/claude-sonnet-4`
   - These are confirmed to support tool calling

2. **Check Backend Logs**
   - Look for `tool_calls` in the response
   - Should see: `{"type": "tool_calls", "calls": [...]}`

3. **Check Tool Schema Format**
   - Must be valid JSON
   - Must follow OpenAI function calling format
   - Use the examples from "Show example" button

4. **Check API Key**
   - Ensure `OPENROUTER_API_KEY` is set
   - Check it has credits/access

## Example: Working Tool Call Flow

### Request to Backend:
```
GET /api/chat/stream?model=openai/gpt-4o&prompt=Calculate 25+89&tools=[...]
```

### Backend to OpenRouter:
```json
{
  "model": "openai/gpt-4o",
  "messages": [{"role": "user", "content": "Calculate 25+89"}],
  "tools": [{"type": "function", "function": {...}}]
}
```

### OpenRouter Response:
```json
{
  "choices": [{
    "message": {
      "tool_calls": [{
        "id": "call_123",
        "function": {
          "name": "calculate",
          "arguments": "{\"expression\":\"25+89\"}"
        }
      }]
    }
  }]
}
```

### Backend Executes Tool:
```python
result = await tool_executor.execute("calculate", {"expression": "25+89"})
# Returns: {"success": True, "result": {"expression": "25+89", "result": 114}}
```

### Backend Sends to OpenRouter Again:
```json
{
  "messages": [
    {"role": "user", "content": "Calculate 25+89"},
    {"role": "assistant", "tool_calls": [...]},
    {"role": "tool", "tool_call_id": "call_123", "content": "{...result...}"}
  ]
}
```

### Final Response:
```
"The result of 25 + 89 is 114."
```

## Common Issues & Solutions

### Issue: Model outputs XML-style tool calls
**Solution:** Switch to a tool-calling model (GPT-4o, Claude Sonnet 4)

### Issue: No tool calls are made at all
**Solution:** Make the prompt more explicit:
- "Use the calculate tool to compute X"
- "Search the web for information about Y"

### Issue: Tool calls shown but not executed
**Solution:** Check backend logs for errors in ToolExecutor

### Issue: Tools parameter not being sent
**Solution:** Ensure JSON in Tool Schemas textarea is valid

## Test Script (Manual)

Use Bruno or curl:

```bash
curl -X GET "http://localhost:8000/api/chat/stream?model=openai/gpt-4o&prompt=What+is+2+2&tools=%5B%7B%22type%22%3A%22function%22%2C%22function%22%3A%7B%22name%22%3A%22calculate%22%2C%22description%22%3A%22Calculate%22%2C%22parameters%22%3A%7B%22type%22%3A%22object%22%2C%22properties%22%3A%7B%22expression%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22required%22%3A%5B%22expression%22%5D%7D%7D%7D%5D"
```

Expected: See `data: {"type":"tool_calls",...}` in the response

---

**TL;DR:** Use `openai/gpt-4o` or `anthropic/claude-sonnet-4` and try the calculate example above. These models definitely support tool calling.

