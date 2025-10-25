# Tool Calling Loop Refactoring Plan

> **Created:** October 23, 2025
> **Status:** Planning
> **Priority:** Medium
> **Complexity:** Medium

## Executive Summary

The tool calling loop in `app/routers/chat.py` (lines 286-512, ~226 lines) has grown complex with deep nesting (5-6 levels) and mixed responsibilities. This document proposes a refactoring to reduce complexity, improve readability, and make future changes easier while maintaining exact behavioral compatibility.

**Key Goals:**
- Reduce nesting from 5-6 levels to 2-3 max
- Separate concerns into focused helper functions
- Reduce total code by ~27% (226 → ~165 lines)
- Make code easier to reason about and modify
- Enable future features (parallel tools, timeouts, etc.)

## Current State Analysis

### Complexity Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total lines (tool loop) | 226 | ~165 |
| Max nesting depth | 5-6 levels | 2-3 levels |
| Number of functions | 1 (monolithic) | 6 (modular) |
| Responsibilities per function | 7+ | 1-2 |
| Boolean state flags | 5 | 0 (use dataclass) |

### Code Location

**File:** `app/routers/chat.py`
**Function:** `stream_chat() -> generate()`
**Lines:** 286-512 (main tool calling loop)

### Identified Issues

#### 1. **Deep Nesting (5-6 Levels)**

```python
if parsed_tool_schemas and tool_executor:           # Level 1
    while iteration < limit:                         # Level 2
        if tool_calls := message.get("tool_calls"):  # Level 3
            for tool_call in tool_calls:             # Level 4
                if func_name == "search_web":        # Level 5
                    try:                             # Level 6
                        # code here
```

**Problem:** Hard to follow control flow, easy to get lost.

#### 2. **Mixed Responsibilities**

The main loop handles:
1. Tool call detection
2. Tool execution and result streaming
3. Reasoning content extraction
4. Provider-specific workarounds (XAI)
5. Time constraint inference for search
6. Forced tool choice heuristics
7. Content finalization with double fallback
8. Retry/continue logic
9. Iteration limit enforcement

**Problem:** Changing one aspect risks breaking others.

#### 3. **Scattered State**

State tracked across multiple variables:
- `should_force_tools_first_turn`
- `implies_needs_tools`
- `any_tools_executed`
- `sent_any_content`
- `iteration` count
- `messages` list
- `params` dict

**Problem:** Hard to understand what state affects what logic.

#### 4. **Complex Finalization Logic (Lines 436-476)**

```python
# Try non-streaming finalization
finalize_success = False
try:
    finalize_params = params.copy()
    finalize_params["tools"] = parsed_tool_schemas
    finalize_params["tool_choice"] = "none"
    finalize_response = await svc.completion(...)
    finalize_content = _content_to_text(...)
    if finalize_content:
        yield ...
        finalize_success = True
        break
except Exception as e:
    yield debug_message(...)

# Fallback to streaming
if not finalize_success:
    try:
        stream_params = params.copy()
        async for chunk in svc.stream_completion(...):
            yield ...
            sent_any_content = True
        if final_content_parts:
            break
    except Exception as e:
        yield error_message(...)
        break
```

**Problem:** Duplicated fallback logic, confusing control flow with multiple breaks.

#### 5. **Opaque Retry Logic (Lines 488-506)**

```python
else:  # no tool_calls
    content = _content_to_text(message.get("content", ""))
    any_tools_executed = any(True for msg in messages if msg.get("role") == "tool")
    if content:
        if iteration == 2 and not any_tools_executed and should_force_tools_first_turn:
            messages.append(message)
            continue
        else:
            yield content_event(content)
            sent_any_content = True
            break
    else:
        if iteration <= 2 and not any_tools_executed:
            messages.append(message)
            continue
        else:
            yield default_content()
            sent_any_content = True
            break
```

**Problem:** Complex nested conditions make it hard to predict when the loop continues vs breaks.

## UI Implementation (Good Reference)

The frontend's `ResponsePanel.tsx` demonstrates a cleaner pattern we should emulate:

```typescript
// Clear event types
if (parsed.type === 'tool_calls') {
    // Handle tool calls
} else if (parsed.type === 'tool_executing') {
    // Update status to 'running'
} else if (parsed.type === 'tool_result') {
    // Update to 'completed' or 'failed'
} else if (parsed.type === 'content') {
    // Append response
} else if (parsed.type === 'done') {
    // Cleanup
}
```

**Key Insights:**
- Clear state machine: `queued` → `running` → `completed`/`failed`
- Event-driven approach
- No deep nesting
- Each handler is focused

**Backend should mirror this clarity.**

## Proposed Architecture

### Overview

Transform the monolithic loop into a coordinated set of focused helper functions with a clean dataclass for state management.

### 1. ConversationContext Dataclass

Encapsulates all scattered state in one place:

```python
from dataclasses import dataclass, field

@dataclass
class ConversationContext:
    """Encapsulates conversation state for tool calling loop."""

    # Core data
    messages: list[dict]
    base_params: dict
    tool_schemas: list[dict] | None
    tool_names: set[str]
    provider_id: str
    model: str

    # State tracking
    tools_executed: list[str] = field(default_factory=list)
    forced_tool_first_turn: bool = False
    content_yielded: bool = False

    def add_message(self, message: dict) -> None:
        """Add message to conversation."""
        self.messages.append(message)

    def has_executed_tools(self) -> bool:
        """Check if any tools have been executed."""
        return len(self.tools_executed) > 0

    def mark_tool_executed(self, tool_name: str) -> None:
        """Record that a tool was executed."""
        self.tools_executed.append(tool_name)

    def provider_allows_forced_tool_choice(self) -> bool:
        """Check if provider supports forced tool_choice."""
        # XAI has known issues with forced tool_choice
        return self.provider_id not in {"xai"}
```

**Benefits:**
- All state in one place
- Clear interface via methods
- Easy to test
- Easy to extend (add new state fields)

### 2. Helper Function: prepare_request_params()

**Responsibility:** Build request parameters for a single completion call.

```python
def prepare_request_params(
    context: ConversationContext,
    iteration: int,
    system_prompt: str | None,
    user_prompt: str,
) -> dict:
    """
    Prepare parameters for OpenRouter completion request.

    Handles:
    - Tool choice inference (auto, forced, or none)
    - Provider-specific workarounds
    - Heuristic-based tool forcing for search queries

    Returns:
        Dictionary of request parameters ready for OpenRouter API
    """
    params = context.base_params.copy()

    if not context.tool_schemas:
        return params

    # Add tools to request
    params["tools"] = context.tool_schemas
    params["parallel_tool_calls"] = True  # Enable concurrent tool execution

    # Determine tool_choice
    tool_choice = "auto"  # Default

    # Check if we should force tools on first iteration
    if iteration == 1:
        implies_needs_search = (
            "search_web" in context.tool_names
            and _prompt_implies_web_search(system_prompt, user_prompt)
        )

        if implies_needs_search and context.provider_allows_forced_tool_choice():
            tool_choice = {"type": "function", "function": {"name": "search_web"}}
            context.forced_tool_first_turn = True

    params["tool_choice"] = tool_choice
    return params
```

**Size:** ~30 lines
**Nesting:** 2-3 levels max

### 3. Helper Function: parse_completion_response()

**Responsibility:** Extract structured data from OpenRouter response.

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class CompletionResult:
    """Structured result from completion response."""
    message: dict
    reasoning: str | None
    tool_calls: list[dict] | None
    content: str | None
    finish_reason: str | None

    @property
    def has_tool_calls(self) -> bool:
        return bool(self.tool_calls)

    @property
    def has_content(self) -> bool:
        return bool(self.content)


def parse_completion_response(response: dict) -> CompletionResult:
    """
    Parse OpenRouter completion response into structured result.

    Extracts:
    - Reasoning/thinking content blocks
    - Tool calls
    - Text content
    - Finish reason

    Returns:
        CompletionResult with extracted data
    """
    message = response.get("choices", [{}])[0].get("message", {})

    # Extract reasoning content (interleaved thinking)
    reasoning = None
    content_blocks = message.get("content")
    if isinstance(content_blocks, list):
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "thinking":
                reasoning = block.get("thinking", "")
                break

    # Extract tool calls
    tool_calls = message.get("tool_calls")

    # Extract text content
    content = _content_to_text(message.get("content", ""))

    # Get finish reason
    finish_reason = response.get("choices", [{}])[0].get("finish_reason")

    return CompletionResult(
        message=message,
        reasoning=reasoning,
        tool_calls=tool_calls,
        content=content,
        finish_reason=finish_reason,
    )
```

**Size:** ~20 lines
**Nesting:** 2 levels max

### 4. Helper Function: execute_tool_calls()

**Responsibility:** Execute all tool calls and yield events.

```python
async def execute_tool_calls(
    tool_calls: list[dict],
    context: ConversationContext,
    tool_executor: ToolExecutor,
    system_prompt: str | None,
    user_prompt: str,
):
    """
    Execute tool calls and yield SSE events.

    Yields:
        - tool_calls event (all tools being called)
        - tool_executing event (per tool)
        - tool_result event (per tool)

    Side effects:
        - Adds assistant message to context
        - Adds tool result messages to context
        - Marks tools as executed in context
    """
    # Yield tool_calls announcement
    tool_call_info = [
        {
            "id": tc.get("id", "unknown"),
            "name": tc["function"]["name"],
            "arguments": tc["function"]["arguments"],
        }
        for tc in tool_calls
    ]
    yield json.dumps({"type": "tool_calls", "calls": tool_call_info})

    # Add assistant message with tool calls to conversation
    assistant_message = {
        "role": "assistant",
        "content": None,
        "tool_calls": tool_calls,
    }
    context.add_message(assistant_message)

    # Execute each tool
    for tool_call in tool_calls:
        tool_call_id = tool_call.get("id", "unknown")
        func_name = tool_call["function"]["name"]
        func_args_str = tool_call["function"]["arguments"]

        # Yield executing event
        yield json.dumps({
            "type": "tool_executing",
            "id": tool_call_id,
            "name": func_name,
        })

        # Parse arguments
        try:
            func_args = json.loads(func_args_str)
        except json.JSONDecodeError:
            func_args = {}

        # Inject time constraints for search_web
        if func_name == "search_web":
            func_args = _inject_time_constraints(
                func_args,
                system_prompt,
                user_prompt
            )

        # Execute tool
        result = await tool_executor.execute(func_name, func_args)

        # Yield result event
        yield json.dumps({
            "type": "tool_result",
            "id": tool_call_id,
            "name": func_name,
            "result": result,
        })

        # Add tool result to conversation
        tool_content = json.dumps(
            result.get("result", {}) if result.get("success")
            else {"error": result.get("error", "Tool execution failed")}
        )
        context.add_message({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": tool_content,
        })

        # Mark tool as executed
        context.mark_tool_executed(func_name)
```

**Size:** ~40 lines
**Nesting:** 2-3 levels max

### 5. Helper Function: finalize_after_tools()

**Responsibility:** Get final answer after tool execution.

```python
async def finalize_after_tools(
    context: ConversationContext,
    svc: OpenRouterService,
) -> tuple[str, bool]:
    """
    Get final response after tool execution.

    Tries two approaches:
    1. Non-streaming completion with tool_choice="none"
    2. Streaming completion (fallback)

    Returns:
        Tuple of (content, success)
    """
    # Add prompt for model to synthesize answer
    context.add_message({
        "role": "user",
        "content": "Please use the tool results above to answer my original question.",
    })

    # Attempt 1: Non-streaming completion
    try:
        params = context.base_params.copy()
        params["tools"] = context.tool_schemas
        params["tool_choice"] = "none"

        response = await svc.completion(
            model=context.model,
            messages=context.messages,
            **params
        )

        message = response.get("choices", [{}])[0].get("message", {})
        content = _content_to_text(message.get("content", ""))

        if content:
            return content, True
    except Exception:
        # Fall through to streaming
        pass

    # Attempt 2: Streaming completion
    content_parts = []
    async for chunk in svc.stream_completion(
        model=context.model,
        messages=context.messages,
        **context.base_params
    ):
        content_parts.append(chunk)

    return "".join(content_parts), bool(content_parts)
```

**Size:** ~30 lines
**Nesting:** 2 levels max

### 6. Helper Function: should_retry()

**Responsibility:** Determine if loop should continue without content.

```python
def should_retry(
    context: ConversationContext,
    iteration: int,
    has_content: bool,
) -> bool:
    """
    Determine if we should retry when no content or tool calls received.

    Retry conditions:
    - Early iterations (1-2) AND no tools executed yet
    - Forced tool on first turn but model didn't use it (iteration 2 only)

    Returns:
        True if should continue loop, False to break
    """
    # Never retry if we have content
    if has_content:
        return False

    # Don't retry after iteration 2
    if iteration > 2:
        return False

    # Don't retry if we've already executed tools
    if context.has_executed_tools():
        return False

    # Special case: forced tool on first turn but model ignored it
    # Give it one more chance (iteration 2)
    if iteration == 2 and context.forced_tool_first_turn:
        return True

    # General retry for early iterations
    if iteration <= 2:
        return True

    return False
```

**Size:** ~15 lines
**Nesting:** 1 level max

### 7. Refactored Main Loop

**Responsibility:** Coordinate the flow, delegate to helpers.

```python
async def generate():
    """Generate streaming response with tool calling support."""
    sent_any_content = False

    # Early validation
    if not os.getenv("OPENROUTER_API_KEY"):
        yield "data: Set OPENROUTER_API_KEY to enable streaming.\n\n"
        return

    # Initialize context
    context = ConversationContext(
        messages=_build_initial_messages(system, prompt),
        base_params=_build_base_params(parameters, effective_max_tokens),
        tool_schemas=parsed_tool_schemas,
        tool_names=tool_names,
        provider_id=_provider_id_from_model(model),
        model=model,
    )

    # Simple streaming path (no tools)
    if not parsed_tool_schemas or not tool_executor:
        async for chunk in svc.stream_completion(
            model=model,
            messages=context.messages,
            **context.base_params
        ):
            yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            sent_any_content = True

        yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
        return

    # Tool calling loop
    max_iterations = max_tool_calls or 20

    for iteration in range(1, max_iterations + 1):
        # 1. Prepare request parameters
        request_params = prepare_request_params(context, iteration, system, prompt)

        # 2. Make API call
        response = await svc.completion(
            model=context.model,
            messages=context.messages,
            **request_params
        )

        # 3. Parse response
        result = parse_completion_response(response)

        # 4. Handle reasoning if present
        if result.reasoning:
            yield f"data: {json.dumps({'type': 'reasoning', 'content': result.reasoning})}\n\n"

        # 5. Route based on response type
        if result.has_tool_calls:
            # Execute tools and continue loop
            async for event in execute_tool_calls(
                result.tool_calls,
                context,
                tool_executor,
                system,
                prompt
            ):
                yield f"data: {event}\n\n"

            # Get final answer
            final_content, success = await finalize_after_tools(context, svc)

            if success and final_content:
                yield f"data: {json.dumps({'type': 'content', 'content': final_content})}\n\n"
                sent_any_content = True
                break

            # If finalization failed, continue loop
            continue

        elif result.has_content:
            # Check if we should retry (forced tool first turn edge case)
            if should_retry(context, iteration, has_content=True):
                context.add_message(result.message)
                continue

            # We have content, yield it and exit
            yield f"data: {json.dumps({'type': 'content', 'content': result.content})}\n\n"
            sent_any_content = True
            break

        else:
            # No tools, no content - decide whether to retry
            if should_retry(context, iteration, has_content=False):
                context.add_message(result.message)
                continue

            # Give up, send default message
            yield f"data: {json.dumps({'type': 'content', 'content': 'No additional content generated.'})}\n\n"
            sent_any_content = True
            break

    # Check if we hit iteration limit
    if iteration >= max_iterations and not sent_any_content:
        yield f"data: {json.dumps({'type': 'warning', 'message': f'Reached maximum tool call iterations ({max_iterations})'})}\n\n"
        yield f"data: {json.dumps({'type': 'content', 'content': 'Stopped after maximum tool calls.'})}\n\n"

    # Done
    yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
```

**Size:** ~90 lines (including comments)
**Nesting:** 2-3 levels max
**Readability:** High - clear flow, each step documented

### Total Line Count Comparison

| Component | Current | Proposed | Change |
|-----------|---------|----------|--------|
| Main loop | 226 | 90 | -136 (-60%) |
| Helper functions | 0 | 135 | +135 |
| **Total** | **226** | **225** | **-1 (-0.4%)** |

**Note:** While the total line count is similar, the refactored code is:
- Much more readable (2-3 nesting vs 5-6)
- Easier to test (helpers are pure/focused)
- Easier to modify (isolated concerns)
- Easier to extend (add new features without touching main loop)

## Supporting Utilities

### Time Constraint Injection

```python
def _inject_time_constraints(
    func_args: dict,
    system_prompt: str | None,
    user_prompt: str,
) -> dict:
    """Inject time constraints into search_web tool arguments."""
    combined_text = f"{system_prompt or ''} \n {user_prompt}"
    hint = parse_time_constraints(combined_text)

    if hint:
        for key in ("time_hint", "after", "before"):
            if key not in func_args and (value := hint.get(key)):
                func_args[key] = value

    return func_args
```

### Prompt Analysis

```python
def _prompt_implies_web_search(
    system_prompt: str | None,
    user_prompt: str,
) -> bool:
    """
    Check if prompt implies need for web search.

    Looks for keywords like: news, latest, recent, current, find, search
    Or time constraints like "today", "last week", etc.
    """
    combined = f"{system_prompt or ''} {user_prompt}".lower()

    keywords = [
        "news", "latest", "recent", "current",
        "last ", "past ", "find", "look up", "search"
    ]

    if any(kw in combined for kw in keywords):
        return True

    if parse_time_constraints(combined):
        return True

    return False
```

### Message Building

```python
def _build_initial_messages(
    system: str | None,
    prompt: str,
) -> list[dict]:
    """Build initial messages array."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if prompt:
        messages.append({"role": "user", "content": prompt})
    else:
        messages.append({"role": "user", "content": "Hello"})
    return messages


def _build_base_params(
    parameters: dict,
    effective_max_tokens: int | None,
) -> dict:
    """Build base parameters dict from request parameters."""
    params = {
        "temperature": parameters.get("temperature", 0.7),
        "top_p": parameters.get("top_p", 1.0),
    }

    if effective_max_tokens:
        params["max_tokens"] = effective_max_tokens

    # Add optional parameters if provided
    optional_params = [
        "reasoning", "top_k", "frequency_penalty", "presence_penalty",
        "repetition_penalty", "min_p", "top_a", "seed",
        "response_format", "stop", "logprobs", "top_logprobs", "logit_bias"
    ]

    for key in optional_params:
        if key in parameters and parameters[key] is not None:
            params[key] = parameters[key]

    return params
```

## Migration Strategy

### Phase 1: Extract Helpers (Low Risk)

**Goal:** Create helper functions alongside existing code without changing main loop.

**Steps:**
1. Create new file: `app/routers/chat_helpers.py`
2. Implement all helper functions
3. Write unit tests for pure functions:
   - `parse_completion_response()`
   - `should_retry()`
   - `_prompt_implies_web_search()`
   - `_inject_time_constraints()`
4. Test manually via Python REPL

**Risk:** Low - no changes to existing code yet
**Duration:** 2-3 hours
**Deliverable:** Working helper functions with tests

### Phase 2: Refactor Main Loop (Medium Risk)

**Goal:** Rewrite `generate()` to use helpers.

**Steps:**
1. Comment out existing loop implementation
2. Implement new loop using helpers
3. Add feature flag for A/B testing:
   ```python
   USE_REFACTORED_LOOP = os.getenv("USE_REFACTORED_CHAT_LOOP", "false").lower() == "true"
   ```
4. Test both implementations side-by-side
5. Compare output streams for equivalence
6. Create manual test plan (see Testing section)

**Risk:** Medium - changes core logic
**Rollback:** Feature flag allows instant rollback
**Duration:** 4-6 hours
**Deliverable:** Working refactored loop with feature flag

### Phase 3: Integration Testing (Medium Risk)

**Goal:** Verify refactored implementation matches old behavior.

**Steps:**
1. Test all model providers:
   - OpenAI (gpt-4o)
   - Anthropic (claude-sonnet-4)
   - Google (gemini-2.0-flash)
   - XAI (grok-4)
   - DeepSeek (deepseek-chat)
2. Test all code paths:
   - Simple prompt (no tools)
   - Tool calling (search_web)
   - Multi-step tool usage
   - Provider-specific edge cases
   - Error scenarios
3. Create Bruno API test cases
4. Document any differences found

**Risk:** Medium - may find edge cases
**Duration:** 3-4 hours
**Deliverable:** Test report, Bruno test suite

### Phase 4: Deployment & Monitoring (Low Risk)

**Goal:** Deploy to production with safety measures.

**Steps:**
1. Deploy with feature flag OFF (default to old code)
2. Enable feature flag for 10% of requests (if traffic exists)
3. Monitor error rates, response times
4. Gradually increase to 50%, then 100%
5. Remove old code after 2-3 releases of stability
6. Clean up feature flag

**Risk:** Low - gradual rollout with monitoring
**Duration:** 1-2 weeks (gradual)
**Deliverable:** Production deployment

### Phase 5: Enhancements (Low Risk)

**Goal:** Add new features enabled by refactor.

**Possible enhancements:**
1. Add `parallel_tool_calls` parameter support
2. Implement tool execution timeouts
3. Add tool result caching
4. Support concurrent tool execution
5. Add detailed execution tracing

**Risk:** Low - additive changes
**Duration:** Variable per feature
**Deliverable:** Enhanced functionality

## Testing Plan

### Manual Testing Checklist

Test each scenario with both old and new implementations:

#### Basic Scenarios
- [ ] Simple prompt, no tools, OpenAI model
- [ ] Simple prompt, no tools, Claude model
- [ ] Simple prompt, no tools, Gemini model
- [ ] System + user prompt combination

#### Tool Calling Scenarios
- [ ] Search query with "latest news" (forces search_web)
- [ ] Search query with time constraint ("last week")
- [ ] Multi-step tool usage (multiple searches)
- [ ] Tool execution failure
- [ ] Model decides not to use available tools

#### Provider-Specific Scenarios
- [ ] XAI model with tools (auto tool_choice only)
- [ ] XAI model without response_format
- [ ] Claude with reasoning effort
- [ ] Gemini with top-k parameter

#### Edge Cases
- [ ] Empty prompt (defaults to "Hello")
- [ ] Very long prompt (context window limits)
- [ ] Stop button during tool execution
- [ ] Rapid consecutive requests
- [ ] Tool execution timeout
- [ ] Network error during streaming

#### Parameters
- [ ] All temperature values (0, 0.7, 2)
- [ ] max_tokens limiting
- [ ] Reasoning effort (low, medium, high)
- [ ] Response format JSON
- [ ] Stop sequences
- [ ] Seed for reproducibility

### Automated Testing (Future)

```python
# tests/test_chat_helpers.py

def test_parse_completion_response_with_tool_calls():
    response = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": "call_123",
                        "function": {
                            "name": "search_web",
                            "arguments": '{"query": "test"}'
                        }
                    }
                ]
            }
        }]
    }

    result = parse_completion_response(response)

    assert result.has_tool_calls is True
    assert len(result.tool_calls) == 1
    assert result.tool_calls[0]["function"]["name"] == "search_web"
    assert result.has_content is False


def test_should_retry_early_iteration():
    context = ConversationContext(
        messages=[],
        base_params={},
        tool_schemas=None,
        tool_names=set(),
        provider_id="openai",
        model="gpt-4o"
    )

    # Should retry on iteration 1 with no content, no tools
    assert should_retry(context, iteration=1, has_content=False) is True

    # Should not retry if tools were executed
    context.mark_tool_executed("search_web")
    assert should_retry(context, iteration=1, has_content=False) is False


def test_prompt_implies_web_search():
    assert _prompt_implies_web_search(None, "latest AI news") is True
    assert _prompt_implies_web_search(None, "what happened last week") is True
    assert _prompt_implies_web_search(None, "explain quantum physics") is False
```

### Bruno API Tests

Create test collection in `bruno-collection/Chat/`:

```
Tool Calling Tests/
├── Simple Search.bru          # Basic search_web usage
├── Time Constrained Search.bru # Search with "last week"
├── Multi Step Tools.bru       # Multiple tool calls
├── Tool Failure.bru           # Handle tool errors
└── XAI Auto Tools.bru         # XAI provider workaround
```

## Risk Assessment

### High Risk Areas

1. **Finalization Logic Changes**
   - **Risk:** Breaking the double-fallback pattern
   - **Mitigation:** Extensive testing, keep old code for comparison
   - **Rollback:** Feature flag instant rollback

2. **Retry Logic Changes**
   - **Risk:** Infinite loops or premature exits
   - **Mitigation:** Iteration limit enforcement, unit tests
   - **Impact:** Medium - could hang requests or miss content

3. **Provider-Specific Workarounds**
   - **Risk:** Breaking XAI or other provider integrations
   - **Mitigation:** Test with all providers, maintain workaround logic
   - **Impact:** High - could break specific models

### Medium Risk Areas

1. **State Management Changes**
   - **Risk:** Missing state transitions
   - **Mitigation:** ConversationContext encapsulation, thorough testing
   - **Impact:** Medium - could cause incorrect behavior

2. **Event Streaming Order**
   - **Risk:** UI expecting events in specific order
   - **Mitigation:** Review UI code, ensure event order preserved
   - **Impact:** Medium - could break UI display

### Low Risk Areas

1. **Helper Function Extraction**
   - **Risk:** Minimal - pure functions
   - **Mitigation:** Unit tests
   - **Impact:** Low - isolated changes

2. **Documentation/Comments**
   - **Risk:** None
   - **Impact:** None

## Success Criteria

### Functional Requirements
- [ ] All existing features work identically
- [ ] No regressions in tool calling behavior
- [ ] All model providers work correctly
- [ ] UI displays tool execution correctly
- [ ] Streaming works without interruption

### Code Quality Metrics
- [ ] Max nesting depth ≤ 3 levels
- [ ] Main loop ≤ 100 lines
- [ ] Each helper function has single responsibility
- [ ] Code is easier to understand (peer review)
- [ ] New features can be added without touching main loop

### Performance
- [ ] No increase in response time
- [ ] No increase in memory usage
- [ ] Same number of API calls as before

### Testing
- [ ] All manual test scenarios pass
- [ ] Bruno API tests pass
- [ ] Unit tests for helpers at 80%+ coverage (future)

## Future Enhancements Enabled

Once refactored, these features become easy to add:

### 1. Parallel Tool Execution

```python
# In execute_tool_calls()
if context.base_params.get("parallel_tool_calls", True):
    tasks = [tool_executor.execute(tc.name, tc.args) for tc in tool_calls]
    results = await asyncio.gather(*tasks)
else:
    results = [await tool_executor.execute(tc.name, tc.args) for tc in tool_calls]
```

### 2. Tool Execution Timeouts

```python
async def execute_tool_with_timeout(name: str, args: dict, timeout: float = 10.0):
    try:
        return await asyncio.wait_for(
            tool_executor.execute(name, args),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        return {"success": False, "error": f"Tool {name} timed out after {timeout}s"}
```

### 3. Tool Result Caching

```python
class CachedToolExecutor:
    def __init__(self, executor: ToolExecutor):
        self.executor = executor
        self.cache: dict[str, Any] = {}

    async def execute(self, name: str, args: dict):
        cache_key = f"{name}:{json.dumps(args, sort_keys=True)}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        result = await self.executor.execute(name, args)
        self.cache[cache_key] = result
        return result
```

### 4. Detailed Execution Tracing

```python
@dataclass
class ExecutionTrace:
    timestamp: str
    iteration: int
    action: str  # "request", "tool_call", "finalize"
    data: dict

# Add to context
context.traces: list[ExecutionTrace] = []

# Record each step
context.traces.append(ExecutionTrace(
    timestamp=datetime.utcnow().isoformat(),
    iteration=iteration,
    action="tool_call",
    data={"tool": func_name, "args": func_args}
))
```

### 5. Multi-Model Tool Routing

```python
def select_model_for_tool(tool_name: str, default_model: str) -> str:
    """Route specific tools to specific models."""
    routing = {
        "complex_reasoning": "anthropic/claude-opus-4",
        "search_web": default_model,  # Use user's choice
        "code_execution": "openai/gpt-4o",
    }
    return routing.get(tool_name, default_model)
```

## Rollback Plan

### Immediate Rollback (< 5 minutes)

If critical issues discovered:

1. **Feature Flag Method:**
   ```bash
   # Set environment variable
   export USE_REFACTORED_CHAT_LOOP=false

   # Restart service
   just stop && just start
   ```

2. **Code Revert:**
   ```bash
   # Revert to previous commit
   git revert <commit-hash>
   git push

   # Redeploy
   ```

### Partial Rollback

If issues with specific providers:

```python
# In generate()
if provider_id in {"xai"} and USE_REFACTORED_CHAT_LOOP:
    # Use old implementation for problematic providers
    return await _legacy_generate()
```

### Data to Monitor

- Error rate (track 4xx, 5xx responses)
- Response time P50, P95, P99
- Tool execution success rate
- Provider-specific error rates
- User-reported issues

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Extract Helpers | 2-3 hours | None |
| 2. Refactor Loop | 4-6 hours | Phase 1 |
| 3. Integration Testing | 3-4 hours | Phase 2 |
| 4. Deployment | 1-2 weeks | Phase 3 |
| 5. Enhancements | Variable | Phase 4 |
| **Total (Dev)** | **~12-16 hours** | - |

**Note:** Timeline assumes greenfield project approach with manual testing first.

## References

### OpenRouter Documentation
- Tool Calling: https://openrouter.ai/docs/features/tool-calling
- API Parameters: https://openrouter.ai/docs/api-reference/parameters
- Local docs: `docs/api/OPENROUTER_DOCUMENTATION.md`

### Internal Documentation
- Project guidelines: `CLAUDE.md`
- API collection: `bruno-collection/`
- Current implementation: `app/routers/chat.py:286-512`

### Related Issues
- XAI tool_choice issue: https://github.com/zed-industries/zed/issues/34185

## Appendix

### Current Code Statistics

```bash
# Line count by section
Lines 160-285: Setup and parameter building (125 lines)
Lines 286-512: Tool calling loop (226 lines)
Lines 513-526: Simple streaming fallback (13 lines)

# Cyclomatic complexity
Main loop: ~15-20 (very high)
Helper functions: N/A (none exist)

# Nesting depth
Maximum: 6 levels
Average: 3-4 levels
```

### Proposed Code Statistics

```bash
# Line count by component
ConversationContext: 35 lines
prepare_request_params(): 30 lines
parse_completion_response(): 20 lines
execute_tool_calls(): 40 lines
finalize_after_tools(): 30 lines
should_retry(): 15 lines
Main loop: 90 lines
Utilities: 30 lines
Total: ~290 lines (vs 226, but with better organization)

# Cyclomatic complexity
Main loop: ~5-7 (low)
Helpers: ~2-4 each (very low)

# Nesting depth
Maximum: 3 levels
Average: 2 levels
```

---

**Document Owner:** Development Team
**Last Updated:** October 23, 2025
**Status:** Awaiting approval for implementation
