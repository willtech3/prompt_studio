# OpenRouter API Verification for Tool-Calling Unified Plan

**Created:** 2025-10-27  
**Status:** Research Complete - Ready for Implementation

## Executive Summary

The Tool-Calling Unified Plan is **fundamentally sound** and aligns well with OpenRouter's documented API. This document clarifies implementation details based on web research and existing documentation.

---

## ✅ Verified Behaviors

### 1. **SSE Streaming Format**
- **OpenRouter Format**: `data: <json>\n\n` with `data: [DONE]` terminator
- **Plan Format**: `data: <json>\n\n` with `{ "type": "done", "done": true }` terminator
- ✅ **Status**: Compatible. Plan's custom terminator is fine for application-level use.

### 2. **Tool Calling Response Format**
- **OpenRouter**: Uses OpenAI-compatible format with `tool_calls` array
  ```json
  {
    "choices": [{
      "message": {
        "tool_calls": [{
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "search_web",
            "arguments": "{\"query\": \"foo\"}"
          }
        }]
      }
    }]
  }
  ```
- ✅ **Status**: Plan matches exactly.

### 3. **Tool Choice Parameter**
- **OpenRouter Supports**: `"auto"`, `"none"`, `"required"`, or `{"type": "function", "function": {"name": "..."}}`
- **Plan Usage**: Forces `tool_choice: "none"` on finalize call
- ✅ **Status**: Valid approach.

### 4. **Provider Guardrails**
- **xAI Known Issues** (documented):
  - Forced `tool_choice` can fail with "Required function is not present"
  - Should use `tool_choice: "auto"` instead
  - May reject `response_format` parameter
- **Plan Response**: Disables forced tool_choice for xAI, blocks `response_format`
- ✅ **Status**: Correctly addresses documented issues.

### 5. **Parallel Tool Calls Parameter**
- **OpenRouter**: `parallel_tool_calls` boolean parameter (default: `true`)
- **Plan**: Disables for Anthropic and xAI
- ✅ **Status**: Parameter exists and is supported.

---

## 🔍 Needs Implementation Testing

### 1. **Streaming Tool Call Deltas** ⚠️

**What the Plan Assumes:**
```typescript
// Plan expects OpenRouter to stream tool_calls as deltas:
delta: {
  tool_calls: [{
    index: 0,
    id: "call_123",  // May be partial
    function: {
      name: "search_web",  // May arrive in chunks
      arguments: "{\"query"  // Arrives progressively
    }
  }]
}
```

**What We Know:**
- ✅ OpenRouter normalizes to OpenAI Chat API schema
- ✅ OpenRouter documentation confirms `delta` contains `content`, `role`, and `tool_calls`
- ✅ OpenAI API **does** stream tool_calls as deltas with `index` field
- ⚠️ **BUT**: We need to test this with OpenRouter across providers

**Current Implementation:**
```python
# backend/services/openrouter.py line 135
delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
```
- Currently only extracts `content` deltas
- **Does NOT** handle `delta.tool_calls` yet

**Implementation Requirements:**
```python
# Need to add in openrouter.py stream_completion():
delta = obj.get("choices", [{}])[0].get("delta", {})

# Handle content deltas
if content := delta.get("content"):
    yield ("content", content)

# Handle tool_call deltas
if tool_calls := delta.get("tool_calls"):
    for tc in tool_calls:
        yield ("tool_call_delta", {
            "index": tc.get("index"),
            "id": tc.get("id"),
            "function": {
                "name": tc.get("function", {}).get("name"),
                "arguments": tc.get("function", {}).get("arguments")
            }
        })

# Handle reasoning/thinking content
if isinstance(delta.get("content"), list):
    for block in delta["content"]:
        if block.get("type") == "thinking":
            yield ("reasoning", block.get("thinking", ""))
```

**Testing Plan:**
- Test with OpenAI models (gpt-4o) - known to stream deltas
- Test with Anthropic models (claude-sonnet-4)
- Test with Google models (gemini-2.0-flash)
- Test with xAI models (grok-4)
- Test with DeepSeek models

**Fallback Strategy:**
If some providers don't stream tool_calls as deltas:
- Check for complete `message.tool_calls` in non-delta responses
- Emit tool_calls event once complete message arrives
- Log provider-specific behavior for documentation

---

### 2. **Reasoning/Thinking Content Format** ✅ (Mostly Clear)

**What the Plan Assumes:**
- Custom `{ "type": "reasoning", "content": "..." }` SSE event
- Extracted from OpenRouter's thinking blocks

**What We Know:**
- ✅ OpenRouter returns `type: "thinking"` blocks in message content (documented)
- ✅ Current implementation already extracts these (chat.py line 357)
- ✅ OpenRouter supports `reasoning` **request** parameter: `{"effort": "low|medium|high"}`
- ⚠️ **Clarification**: The plan's "reasoning" SSE events are **application-level transformations** of OpenRouter's thinking blocks

**Implementation Status:**
```python
# backend/app/routers/chat.py line 351-363 (ALREADY IMPLEMENTED)
if (content_blocks := message.get("content")) and isinstance(content_blocks, list):
    for block in content_blocks:
        if isinstance(block, dict) and block.get("type") == "thinking":
            reasoning_content = block.get("thinking", "")
            break

if reasoning_content:
    yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning_content})}\n\n"
```

**What's NOT Yet Implemented:**
- Streaming reasoning deltas (currently only emits complete thinking blocks)
- Need to handle `delta.content` array with thinking blocks during streaming

**Updated Implementation Needed:**
```python
# In streaming loop, check if delta.content is a list
if isinstance(delta.get("content"), list):
    for block in delta["content"]:
        if isinstance(block, dict):
            if block.get("type") == "thinking":
                # Stream reasoning deltas
                yield ("reasoning", block.get("thinking", ""))
            elif block.get("type") == "text":
                yield ("content", block.get("text", ""))
```

---

### 3. **Anthropic-Specific Behavior** ⚠️

**Known Issue (from GitHub):**
- Anthropic's native tool call IDs use format: `toolu_...`
- OpenAI format uses: `call_...`
- OpenRouter **should** normalize this, but there may be edge cases

**Plan Response:**
- Plan doesn't specifically address this
- Should be handled by OpenRouter's normalization

**Testing Requirements:**
- Test Anthropic models specifically for tool call ID format
- Verify IDs match between assistant message and tool response message
- If IDs don't match, implement name-based fallback in reconciliation logic

**Parallel Tool Calls for Anthropic:**
- Plan disables `parallel_tool_calls` for Anthropic
- **Unclear if necessary** - needs testing to verify if Anthropic has issues
- May be conservative approach; could be provider-agnostic

**Action Items:**
1. Test Anthropic with `parallel_tool_calls: true` - document any issues
2. Test Anthropic with `parallel_tool_calls: false` - verify sequential behavior
3. Document findings and adjust guardrails accordingly

---

## 📝 Clarified Implementation Details

### 1. **Tool Metadata (category, visibility)** ✅

**Status**: **Application-Level Feature** (not from OpenRouter)

The plan's tool metadata is **custom** and added by the backend:

```python
# Example tool metadata registry (to be implemented)
TOOL_METADATA = {
    "search_web": {
        "category": "search",
        "visibility": "primary"
    },
    "get_current_time": {
        "category": "utility",
        "visibility": "hidden"
    },
    "calculate": {
        "category": "utility",
        "visibility": "hidden"
    }
}
```

This is **NOT** part of OpenRouter's API response. Backend adds metadata when emitting SSE events:

```json
{
  "type": "tool_executing",
  "id": "call_123",
  "name": "search_web",
  "category": "search",
  "visibility": "primary"
}
```

---

### 2. **Finalize Hint** ✅

**Status**: **Application-Level Feature** (not OpenRouter parameter)

The "finalize_hint" is **NOT** an OpenRouter parameter. It's a custom system message strategy:

```python
# Implementation approach:
if finalize_hint:
    # Add a system message or modify existing system prompt
    messages.append({
        "role": "system",
        "content": "Provide your final answer without disclaimers about web access or tools."
    })

# Then make the final call with tool_choice: "none"
response = await svc.completion(
    model=model,
    messages=messages,
    tool_choice="none",
    **params
)
```

Purpose: Prevents models from saying "I don't have web access" after successfully using search.

---

## 🎯 Implementation Recommendations

### Phase 0 (Prep) - Additions

1. **Add Streaming Delta Test Script**
   ```bash
   # Create: backend/tests/test_streaming_deltas.py
   # Test tool_calls streaming with real API calls
   # Document provider-specific behaviors
   ```

2. **Verify Across Providers**
   - OpenAI: gpt-4o (baseline - known to work)
   - Anthropic: claude-sonnet-4
   - Google: gemini-2.0-flash
   - xAI: grok-4
   - DeepSeek: deepseek-chat

### Phase 1 (Refactor) - Critical Updates

1. **Update `OpenRouterService.stream_completion()`**
   - Parse `delta.tool_calls` in addition to `delta.content`
   - Parse `delta.content` as list for thinking blocks
   - Yield tuples: `("type", data)` instead of just strings
   - Keep backward compatibility for non-tool streams

2. **Implement Tool Metadata Registry**
   - Add `TOOL_METADATA` dict in `services/tool_executor.py`
   - Include category and visibility for each tool
   - Document extension points for custom tools

3. **Provider Guardrails**
   - Implement `parallel_tool_calls: false` for xAI (confirmed needed)
   - **TEST** before adding for Anthropic (unclear if needed)
   - Add response_format guard for xAI (confirmed needed)

4. **Finalize Hygiene**
   - Implement finalize_hint as system message strategy
   - Always use `tool_choice: "none"` on final call
   - Reconcile pending tool messages before finalize

### Testing Priority

**High Priority:**
1. ✅ Tool call delta streaming (OpenAI baseline)
2. ✅ Reasoning/thinking block extraction (current implementation)
3. ⚠️ xAI provider guardrails (documented issues)

**Medium Priority:**
1. ⚠️ Anthropic parallel_tool_calls behavior
2. ⚠️ Anthropic tool call ID format
3. ✅ Search deduplication logic

**Low Priority:**
1. ✅ Tool metadata (application-level, can iterate)
2. ✅ Finalize hint (nice-to-have, not critical)
3. ✅ Warning banners (UX enhancement)

---

## 🚨 Risk Assessment

### Low Risk
- SSE format changes (fully backward compatible)
- Tool metadata (additive feature)
- Finalize hint (optional enhancement)

### Medium Risk
- Tool call delta streaming (fallback: use complete messages)
- Anthropic parallel_tool_calls (fallback: keep enabled)
- Reasoning streaming (fallback: non-streaming extraction works)

### High Risk (Mitigated by Feature Flag)
- Provider-specific quirks causing tool execution failures
- ID reconciliation bugs between tool calls and responses
- Race conditions in delta aggregation

**Mitigation**: `TOOL_LOOP_V2` feature flag allows instant rollback to current implementation.

---

## 📚 References

### OpenRouter Documentation
- **API Reference**: https://openrouter.ai/docs/api-reference
- **Tool Calling**: https://openrouter.ai/docs/features/tool-calling
- **Reasoning Tokens**: https://openrouter.ai/docs/api-reference/responses-api/reasoning
- **Provider Parameters**: https://openrouter.ai/docs/api-reference/parameters

### Known Issues
- **xAI Tool Choice Bug**: GitHub issues [zed#34185](https://github.com/zed-industries/zed/issues/34185), [zed#36994](https://github.com/zed-industries/zed/issues/36994)
- **Anthropic Tool ID Format**: [gptel#747](https://github.com/karthink/gptel/issues/747)

### OpenAI Compatibility
- OpenRouter follows OpenAI Chat Completions API
- OpenAI streaming: https://platform.openai.com/docs/api-reference/streaming
- Tool calling format matches OpenAI exactly

---

## ✅ Final Verdict

**The Tool-Calling Unified Plan is APPROVED for implementation** with these clarifications:

1. ✅ **SSE Contract**: Sound, with understanding that reasoning/metadata are custom
2. ✅ **Tool Calling**: Follows OpenAI/OpenRouter format exactly
3. ⚠️ **Streaming Deltas**: Needs testing but architecture is correct
4. ✅ **Provider Guardrails**: xAI guardrails are documented and correct
5. ⚠️ **Anthropic Behavior**: Test before adding parallel_tool_calls guard
6. ✅ **Feature Flag**: Critical for safe rollout

**Proceed with implementation** following the phased approach, with emphasis on Phase 0 testing to validate streaming delta assumptions.









