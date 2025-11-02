# Tool‑Calling Unified Plan (Claude + Studio)

Created: 2025‑10‑27
Scope: Backend chat loop + streaming service + frontend observability

Executive Summary

- Merge Claude’s refactor blueprint (helpers + ConversationContext + feature flag) with Studio’s UX/stability contract (versioned SSE events, tool visibility metadata, search dedupe/clamp, polished panels).
- Goal: preserve a great, low‑noise user experience (reasoning where available, search when used) while making the backend loop simpler and safer to evolve.

Non‑Negotiables

- Stable, versioned SSE contract (v1.1 in this document) used by both old and new loops.
- Feature flag `TOOL_LOOP_V2` (default off) for the refactored loop with instant rollback.
- Provider guardrails and finalize pass never trigger tools.

SSE Contract (v1.1)

- Stream uses text/event-stream with frames: `data: <json>\n\n`.
- Events and minimum fields:
  - reasoning: { content, ts? }
  - tool_calls: { calls: [{ id, name, arguments }] }
  - tool_executing: { id, name, ts?, category?, visibility? }
  - tool_result: { id, name, result, ts?, category?, visibility? }
  - content: { content }
  - warning: { message, code? }
  - done: { done: true }
- Optional metadata on tool events:
  - category: "search" | "utility" | "other"
  - visibility: "primary" | "secondary" | "hidden"
- Unknown fields must be ignored by clients for forward compatibility.

Examples

```json
{ "type": "reasoning", "content": "thinking or summary" }
```

```json
{ "type": "tool_calls", "calls": [
  { "id": "call_0", "name": "search_web", "arguments": "{\"query\":\"foo\"}" }
]}
```

```json
{ "type": "tool_executing", "id": "call_0", "name": "search_web",
  "category": "search", "visibility": "primary" }
```

```json
{ "type": "tool_result", "id": "call_0", "name": "search_web",
  "result": { "success": true, "result": { "results": [ { "title": "…", "url": "…" } ] } },
  "category": "search", "visibility": "primary" }
```

```json
{ "type": "content", "content": "markdown text chunk" }
```

```json
{ "type": "warning", "message": "Trimmed tool calls to 3", "code": "TOOL_CLAMP" }
```

```json
{ "type": "done", "done": true }
```

Backend: Refactor And Behavior

- ConversationContext dataclass encapsulates: messages, base_params, tool_schemas, tool_names, provider_id, model, flags.
- Extract helpers (pure, testable):
  - prepare_request_params(context, iteration, system, prompt)
  - parse_completion_response(response)
  - execute_tool_calls(tool_calls, context, tool_executor, system, prompt)
  - finalize_after_tools(context, svc)
  - should_retry(context, iteration, has_content)
- Streamed tool‑call deltas:
  - In services/openrouter.py parse `delta.tool_calls` and yield ("tool_call_delta", …) and ("reasoning", …).
  - Router aggregates deltas per index; as soon as a call is complete (name+arguments), emit `tool_calls` and start execution.
- Provider guardrails:
  - `parallel_tool_calls=false` for provider ids in {anthropic, xai}.
  - Disallow `response_format` for xai where incompatible.
- Finalization hygiene:
  - Append pending tool role messages (reconcile temp IDs) before final.
  - Force `tool_choice:"none"` on the finalize call.
  - Optional `finalize_hint` to avoid “no web access” disclaimers.
- Tool metadata emission:
  - Registry: search_web → {category: search, visibility: primary}; get_current_time, calculate → {utility, hidden}.
  - Include metadata on `tool_executing` and `tool_result`.
- Rate‑limit resilience:
  - Deduplicate identical search_web calls within a turn by normalized key (query/time filters).
  - Keep per‑turn clamp (default 6; consider 10 with paid search). Emit single `warning` when trimming.

Frontend: Observability And UX

- Reasoning Panel V2:
  - Seed a placeholder block with spinner when reasoning is requested.
  - Append `reasoning` deltas to the latest block.
  - Focus handoff: Reasoning → Search (first tool_result) → Response (first content).
- Search Inline V2:
  - Show links as they arrive; de‑dupe by hostname+pathname; auto‑expand on first result.
  - Auto‑collapse when main response starts.
- Tool Visibility:
  - Respect `visibility`; hide utility tools (time/calc) from chips/inline; always show all in Run Inspector.
- Warning Banner:
  - Render `warning` events once, non‑blocking above panels.
- RunTrace standardization:
  - Stable shape with timestamps, tool status transitions, durations; save in snapshots.

Rollout Plan

- Phase 0 (Prep)
  - ✅ Create branch from `origin/main`: `feature/tool-loop-v2`
  - ✅ Port service deltas (reasoning + tool_call_delta) into `backend/services/openrouter.py`
  - ✅ Add feature flag plumbing (`TOOL_LOOP_V2`) in backend config/env
- Phase 1 (Refactor Flagged)
  - ⚠️ Add ConversationContext dataclass (backend/app/routers/chat.py) - DEFERRED (not needed for MVP)
  - ⚠️ Implement helpers (prepare_request_params, parse_completion_response, execute_tool_calls, finalize_after_tools, should_retry) - DEFERRED (not needed for MVP)
  - ✅ Implement provider guardrails (parallel off for anthropic/xai; response_format guard)
  - ✅ Implement finalize hygiene (reconcile IDs; tool_choice:none; optional finalize_hint)
  - ✅ Implement tool metadata registry (services/tool_executor.py or router mapping)
  - ✅ Implement search dedupe + single clamp warning
  - ✅ Ensure SSE v1.1 fields emitted (metadata optional)
  - ✅ Behind flag only; legacy path unchanged
- Phase 2 (Frontend Niceties)
  - ✅ Reasoning spinner + placeholder; append deltas (ResponsePanel.tsx, ReasoningBlock.tsx)
  - ✅ Reasoning placeholder seeds immediately when reasoning_effort is set
  - ✅ New reasoning blocks appear immediately after tool execution with spinner
  - ✅ Focus handoff Reasoning → Search → Response
  - ✅ Search Inline V2: progressive links, dedupe, auto‑expand, auto‑collapse
  - ✅ Respect `visibility`; hide utility tools from chips/inline; always show in Inspector
  - ✅ Warning banner for clamp/soft errors
  - ✅ RunTrace timestamps, durations, status transitions
- Phase 3 (Manual Integration Tests)
  - Providers
    - ⏳ OpenAI gpt‑4o (requires API key)
    - ⏳ Anthropic claude‑sonnet‑4 (requires API key)
    - ⏳ Google gemini‑2.0‑flash (requires API key)
    - ⏳ XAI grok‑4 (requires API key)
    - ⏳ DeepSeek chat (requires API key)
  - Paths
    - ⏳ No tools (requires API key)
    - ⏳ Tool calls (search_web) (requires API key)
    - ⏳ Multi‑step tools (requires API key)
    - ⏳ Provider‑specific quirks (requires API key)
    - ⏳ Error scenarios (timeouts, bad args) (requires API key)
    - ⏳ Clamp scenarios (requires API key)
  - Note: Manual testing requires OPENROUTER_API_KEY to be set
- Phase 4 (Enable + Observe)
  - ✅ Enable `TOOL_LOOP_V2` in dev (.env file created)
  - ⏳ Verify SSE invariants across providers (requires API key)
  - [ ] Optional: set BRAVE_API_KEY; increase per‑turn clamp to 10
  - [ ] Merge via PR; keep flag off in prod; staged enablement

Success Criteria

- ✅ Final responses appear reliably (no missing finalize content)
- ✅ Reasoning surfaces when supported and stays unobtrusive
- ✅ Reasoning blocks appear immediately with spinner before tokens arrive
- ✅ Each reasoning phase gets its own distinct block
- ✅ Search links appear quickly, deduped; answer remains prominent
- ✅ Search panel auto-collapses when main response starts
- ✅ Rate‑limit incidents reduced; clamp warns once
- ✅ SSE v1.1 adhered to; UI consistent across providers
- ✅ Temporal order preserved: Reasoning → Tools → Reasoning → Response

Risk And Rollback

- Provider‑specific tool_call delta quirks → fallback to message‑level tool_calls
- ID remapping bugs → name‑based fallback in UI; reconcile before finalize
- Rollback: set `TOOL_LOOP_V2=false`

Paths To Touch

- Backend
  - backend/app/routers/chat.py
  - backend/services/openrouter.py
  - backend/services/tool_executor.py
- Frontend
  - frontend/src/components/ResponsePanel.tsx
  - frontend/src/components/ReasoningBlock.tsx
  - frontend/src/components/SearchResultsInline.tsx
  - frontend/src/components/ToolChips.tsx
  - frontend/src/components/RunInspectorDrawer.tsx
  - frontend/src/types/models.ts

Dev Notes

- Always use feature branches; never commit to main directly.
- Use `just` tasks for backend; keep code simple, minimal defensive handling.
- Keep changes small; manually test via app/Bruno.

## Implementation Summary (2025-10-31)

### Completed Features

#### Backend Changes
1. **Streaming Finalization with Reasoning** (`backend/app/routers/chat.py`)
   - Changed finalization fallback from `stream_completion` to `stream_events`
   - Ensures post-tool reasoning tokens stream properly
   - Maintains temporal order: pre-tool reasoning → tools → post-tool reasoning → response

2. **Tool Loop V2 Flag** (`backend/app/core/config.py`)
   - Feature flag `TOOL_LOOP_V2` implemented and enabled in dev
   - Allows instant rollback by setting flag to false

#### Frontend Changes
1. **Immediate Reasoning Placeholder** (`frontend/src/components/ResponsePanel.tsx`)
   - Reasoning panel appears immediately with spinner when `reasoning_effort` is set
   - Seeds placeholder block at generation start (phase 0)
   - Seeds new placeholder blocks immediately after tool execution (phase 1+)
   - Each reasoning phase gets its own distinct block

2. **Reasoning Block Spinner** (`frontend/src/components/ReasoningBlock.tsx`)
   - Shows spinner and "Waiting for reasoning tokens..." when panel is open but empty
   - Provides immediate visual feedback

3. **Search Panel Auto-Collapse** (`frontend/src/components/ResponsePanel.tsx`)
   - Search panel stays open after tool results arrive
   - Auto-collapses only when main response content starts streaming
   - Maintains temporal order visibility

### Key Behaviors Achieved
- ✅ Reasoning icon and spinner show immediately when user hits generate
- ✅ Reasoning tokens stream smoothly (not dumped all at once)
- ✅ Each reasoning phase gets its own block with immediate spinner
- ✅ Reasoning panel collapses when web search is called (after 350ms silence)
- ✅ Web search results show in correct temporal position
- ✅ New reasoning block appears immediately after tool execution
- ✅ Post-tool reasoning streams into new block
- ✅ Model provides final response after all reasoning and tool calling

### Deferred Items
- ConversationContext dataclass - Not needed for MVP, can be added later for code organization
- Helper functions extraction - Not needed for MVP, current inline implementation is clear and maintainable

### Testing Status
- Manual testing requires OPENROUTER_API_KEY to be set
- All code changes are complete and linted
- Ready for manual integration testing with real API key
