# Tool Calling Implementation Plan

**Branch:** `feature/tool-calling`  
**Status:** 🚧 In Progress  
**Estimated Effort:** 4-6 hours  
**Target:** Minimal, useful tool calling support for prompt testing

---

## Overview

Enable users to test prompts that use tool calling (function calling) with complete execution flow visibility. This allows users to:
- Test if their prompts correctly trigger tool calls
- See tool execution results
- Understand the complete tool calling workflow
- Learn provider-specific tool calling patterns

**Key Principle:** Keep it minimal - only safe, sandboxed tools for testing purposes. This is NOT an agent execution platform.

---

## Implementation Checklist

### Phase 1: Backend Foundation (2-3 hours)

#### 1.1 Tool Executor Service
- [ ] Create `backend/services/tool_executor.py`
- [ ] Implement `ToolExecutor` class with safe execution sandbox
- [ ] Add `search_web` tool (using DuckDuckGo API or similar)
- [ ] Add `get_current_time` tool (safe, simple)
- [ ] Add `calculate` tool (safe math evaluator using AST)
- [ ] Add error handling for unknown tools
- [ ] Add timeout protection (5 second max per tool)
- [ ] Add unit tests for each tool

**Files to Create:**
- `backend/services/tool_executor.py`

**Success Criteria:**
- Can execute 3 tools safely
- Returns structured results
- Handles errors gracefully
- No security vulnerabilities (no eval, no arbitrary code execution)

#### 1.2 Update OpenRouter Service
- [ ] Review `backend/services/openrouter.py` 
- [ ] Ensure `completion()` method supports `tools` parameter
- [ ] Ensure proper handling of `tool_calls` in response
- [ ] Add support for `tool_choice` parameter
- [ ] Test with a provider that supports tools (OpenAI, Anthropic)

**Files to Modify:**
- `backend/services/openrouter.py`

**Success Criteria:**
- Can pass tools to OpenRouter
- Can receive tool_calls in response
- Properly structured for multi-turn conversations

#### 1.3 Update Streaming Endpoint
- [ ] Modify `stream_chat()` in `backend/app/main.py`
- [ ] Add `tools` query parameter (JSON string)
- [ ] Add `tool_choice` query parameter
- [ ] Add `max_tool_calls` parameter (default: 5)
- [ ] Implement tool calling loop (non-streaming for tool use)
- [ ] Send tool call intentions to frontend
- [ ] Execute tools via ToolExecutor
- [ ] Send tool results to frontend
- [ ] Continue conversation with tool results
- [ ] Stream final answer after tools complete

**Files to Modify:**
- `backend/app/main.py`

**Message Types to Send:**
```typescript
{type: 'tool_calls', calls: [{name: string, args: string}]}
{type: 'tool_executing', name: string}
{type: 'tool_result', name: string, result: any}
{type: 'content', content: string}
{type: 'done', done: true}
{type: 'error', error: string}
```

**Success Criteria:**
- Complete tool calling loop works
- Multiple tools can be called in sequence
- Results are properly formatted
- Errors are handled gracefully
- Max iterations prevent infinite loops

---

### Phase 2: Frontend Integration (1-2 hours)

#### 2.1 Update Response Panel
- [ ] Modify `frontend/src/components/ResponsePanel.tsx`
- [ ] Add state for tracking tool executions
- [ ] Add `ToolExecutionDisplay` component
- [ ] Handle `tool_calls` SSE message type
- [ ] Handle `tool_executing` SSE message type
- [ ] Handle `tool_result` SSE message type
- [ ] Display tool execution timeline
- [ ] Show tool arguments and results (collapsible)
- [ ] Add loading states for executing tools
- [ ] Style tool execution cards distinctly

**Files to Modify:**
- `frontend/src/components/ResponsePanel.tsx`

**UI Design:**
```
🔧 Tool Executions
┌─────────────────────────────────┐
│ search_web ✅ Completed         │
│ Args: {"query": "AI news"}      │
│ ▸ View result                   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ calculate ⏳ Running...          │
│ Args: {"expr": "2 + 2"}         │
└─────────────────────────────────┘

Response:
Based on my search results...
```

**Success Criteria:**
- Tool calls are visually distinct from response
- Clear indication of tool execution status
- Results are readable and formatted
- Timeline shows order of execution

#### 2.2 Add Tool Schema Input (Optional/Simple)
- [ ] Add collapsible "Tools" section to ParametersPanel
- [ ] Add textarea for JSON tool schemas
- [ ] Add validation for JSON format
- [ ] Add example/template button
- [ ] Pass tools to API call

**Files to Modify:**
- `frontend/src/components/ParametersPanel.tsx`

**Success Criteria:**
- Users can paste tool schemas
- Invalid JSON shows error
- Easy to enable/disable tools

---

### Phase 3: Provider Guidance (30 min)

#### 3.1 Update Provider Hints
- [ ] Extend `PROVIDER_HINTS` in `backend/app/main.py`
- [ ] Add tool calling guidance for Anthropic
- [ ] Add tool calling guidance for OpenAI  
- [ ] Add tool calling guidance for Google
- [ ] Include example patterns
- [ ] Document parallel tool execution capabilities

**Files to Modify:**
- `backend/app/main.py` (PROVIDER_HINTS dict)

**Example Addition:**
```python
PROVIDER_HINTS = {
    "anthropic": """Claude models work best with XML-style tags...
    
    **Tool Calling:**
    - Claude Sonnet 4.5 supports parallel tool execution (up to 5 tools)
    - Use <thinking> blocks to reason before calling tools
    - Example: <thinking>I need current data, so I'll call search_web</thinking>
    """,
    # ... etc
}
```

**Success Criteria:**
- Clear guidance on tool calling per provider
- Examples show best practices
- Users understand provider differences

---

### Phase 4: Documentation & Testing (1 hour)

#### 4.1 Update Documentation
- [ ] Update `backend/README.md` with tool calling section
- [ ] Add example tool schemas
- [ ] Document available tools
- [ ] Add troubleshooting guide
- [ ] Update API documentation with new parameters

**Files to Modify:**
- `backend/README.md`
- `docs/development/RUN_LOCAL.md`

#### 4.2 Create Tool Calling Guide
- [ ] Create `docs/TOOL_CALLING_GUIDE.md`
- [ ] Explain what tool calling is
- [ ] Show example prompts
- [ ] Demonstrate each built-in tool
- [ ] Provide best practices
- [ ] Show provider-specific patterns

**Files to Create:**
- `docs/TOOL_CALLING_GUIDE.md`

#### 4.3 Manual Testing Checklist
- [ ] Test with Claude Sonnet 4.5 (parallel tools)
- [ ] Test with GPT-4 (function calling)
- [ ] Test with Google Gemini (if supported)
- [ ] Test single tool call
- [ ] Test multiple sequential tool calls
- [ ] Test parallel tool calls
- [ ] Test tool call errors
- [ ] Test max iterations limit
- [ ] Test invalid tool schemas
- [ ] Test without tools (ensure no regression)
- [ ] Test streaming still works for non-tool prompts

#### 4.4 Bruno API Tests
- [ ] Add Bruno collection for tool calling
- [ ] Test single tool execution
- [ ] Test multiple tools
- [ ] Test error cases
- [ ] Document expected responses

**Files to Create:**
- `backend/bruno-collection/Tools/Single Tool Call.bru`
- `backend/bruno-collection/Tools/Multiple Tools.bru`

---

## Implementation Notes

### Safe Tool Execution

**Security Principles:**
1. No arbitrary code execution (no `eval()`, no `exec()`)
2. Use AST parsing for math expressions
3. Timeout all external API calls (5 seconds max)
4. Rate limit tool executions (prevent abuse)
5. Sanitize all inputs
6. Return structured errors, not exceptions

**Example Safe Calculator:**
```python
def _calculate(self, expression: str) -> dict:
    """Safe calculator using AST parsing."""
    import ast
    import operator
    
    allowed = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
    }
    
    try:
        node = ast.parse(expression, mode='eval')
        result = self._eval_node(node.body, allowed)
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"error": f"Invalid expression: {str(e)}"}
```

### Tool Schema Format

**OpenAI Function Calling Format:**
```json
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
          "description": "The search query"
        },
        "num_results": {
          "type": "integer",
          "description": "Number of results to return (1-10)"
        }
      },
      "required": ["query"]
    }
  }
}
```

### Message Flow

**Complete Tool Calling Flow:**
```
1. User: "Search for AI news"
   [tools: search_web schema]

2. Frontend -> Backend: 
   GET /api/chat/stream?prompt=...&tools=[...]

3. Backend -> OpenRouter:
   POST /chat/completions
   {messages: [...], tools: [...]}

4. OpenRouter -> Backend:
   {tool_calls: [{name: "search_web", args: "..."}]}

5. Backend:
   - Execute search_web
   - Get results
   
6. Backend -> Frontend (SSE):
   data: {type: 'tool_calls', calls: [...]}
   data: {type: 'tool_result', name: 'search_web', result: {...}}

7. Backend -> OpenRouter:
   POST /chat/completions
   {messages: [...previous..., tool_result, ...]}

8. OpenRouter -> Backend:
   {content: "Based on search results..."}

9. Backend -> Frontend (SSE):
   data: {type: 'content', content: "Based on..."}
   data: {type: 'done', done: true}
```

---

## Testing Scenarios

### Scenario 1: Simple Calculator
**Prompt:** "What is 25 * 17 + 89?"  
**Tools:** `[calculate]`  
**Expected:** Model calls calculate("25 * 17 + 89"), returns 514

### Scenario 2: Web Search
**Prompt:** "What are the latest developments in AI?"  
**Tools:** `[search_web]`  
**Expected:** Model calls search_web("latest AI developments"), summarizes results

### Scenario 3: Multi-Tool Chain
**Prompt:** "Search for AI news and tell me what time it is"  
**Tools:** `[search_web, get_current_time]`  
**Expected:** Model calls both tools, combines information

### Scenario 4: Error Handling
**Prompt:** "Use the database tool"  
**Tools:** `[search_web]`  
**Expected:** Model doesn't hallucinate tools, uses available ones or explains limitation

### Scenario 5: No Tools Needed
**Prompt:** "Write a poem about cats"  
**Tools:** `[search_web]`  
**Expected:** Model writes poem without calling tools

---

## Success Metrics

**Functionality:**
- ✅ Can execute at least 3 safe tools
- ✅ Complete tool calling loop works end-to-end
- ✅ Frontend displays tool executions clearly
- ✅ Works with Claude and GPT-4 models
- ✅ No security vulnerabilities introduced

**User Experience:**
- ✅ Users can paste tool schemas easily
- ✅ Tool executions are visible and understandable
- ✅ Errors are clear and actionable
- ✅ Loading states show progress
- ✅ No confusion about what's happening

**Code Quality:**
- ✅ No `eval()` or unsafe execution
- ✅ Proper error handling throughout
- ✅ Code is well-documented
- ✅ Follows existing patterns
- ✅ Under 500 lines of new code

---

## Out of Scope (For Later)

❌ **NOT implementing now:**
- Custom tool creation by users
- Tool marketplace/registry
- Persistent tool storage
- Advanced tool chaining logic
- Tool usage analytics
- Automatic tool recommendation
- Tool execution history
- A/B testing for tools
- Tool performance metrics

These can be added later based on user feedback.

---

## Rollout Plan

1. **Merge Criteria:**
   - All checkboxes completed
   - Manual testing passed
   - No security issues
   - Documentation complete
   - Code reviewed

2. **Announcement:**
   - Update README with tool calling example
   - Add to changelog
   - Document known limitations

3. **Monitoring:**
   - Watch for errors in tool execution
   - Gather feedback on usability
   - Monitor which tools are most used

---

## Questions/Decisions

- [ ] Which search API to use? (DuckDuckGo, Brave, Perplexity via OpenRouter?)
- [ ] Max tool execution time? (5 seconds recommended)
- [ ] Max tool calls per conversation? (5 recommended)
- [ ] Should tools be enabled by default or opt-in? (Opt-in recommended)
- [ ] Rate limiting on tool executions? (Not needed for MVP)

---

## Related Files

**New Files:**
- `backend/services/tool_executor.py`
- `docs/TOOL_CALLING_GUIDE.md`
- `backend/bruno-collection/Tools/*.bru`

**Modified Files:**
- `backend/app/main.py`
- `backend/services/openrouter.py`
- `frontend/src/components/ResponsePanel.tsx`
- `frontend/src/components/ParametersPanel.tsx`
- `backend/README.md`

---

## Timeline

- **Phase 1:** 2-3 hours (Backend foundation)
- **Phase 2:** 1-2 hours (Frontend integration)
- **Phase 3:** 30 minutes (Provider guidance)
- **Phase 4:** 1 hour (Documentation & testing)

**Total: 4-6 hours**

---

## Notes

- Keep it simple - this is v1
- Focus on testing/debugging use case
- Security is critical (no arbitrary code execution)
- Visual feedback is important for UX
- Document limitations clearly

---

**Last Updated:** 2025-10-09  
**Branch:** `feature/tool-calling`  
**Assigned To:** Development Team

