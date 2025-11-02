# Paid Search Options and True Streaming Plan

This document outlines recommended approaches when upgrading to a paid search provider (Brave Search API or Perplexity), plus the minimal backend/frontend work to support "true streaming" of the model's tool decisions. We keep the MVP ethos: simple first, then iterate.

## Goals

- Reliable, up‑to‑date search results during tool use.
- Predictable limits: clamp total searches per turn to 10 even with paid plans.
- Smooth UX: reasoning appears immediately; search runs without hammering; final answer streams.
- Minimal risk to existing flow (keep the current SSE contract).

---

## Option A: Brave Search (paid)

We already support Brave via `BRAVE_API_KEY` in `ToolExecutor._search_web`. With a paid plan:

- Set `BRAVE_API_KEY` in the environment. No code change required to switch from DuckDuckGo to Brave; the code autodetects the key.
- Keep our per-turn clamp in the router to at most 10 tool calls for `search_web`.
- Optionally, raise `ToolExecutor.timeout` slightly (e.g., 8–10s) if needed.
- Use `freshness` hints we already pass (`day|week|month|year`) for recency. The tool maps these to Brave `freshness=pd|pw|pm|py`.

Pros

- Drop‑in with the current tool, good result quality, predictable pricing.
- Minimal code risk; we already handle Brave response shapes.

Cons

- No streaming of individual search results (HTTP GET completes per call). We stream “tool_result” only once per call, not mid-fetch.

---

## Option B: Perplexity (paid)

Two ways to integrate, ordered by simplicity:

1) Use Perplexity Web Search API endpoints (if available to your plan) as a new tool (e.g., `search_perplexity`).
   - Add `PERPLEXITY_API_KEY` env var.
   - Implement `ToolExecutor._search_perplexity(query, num_results=3, ...)` using `httpx` with a short timeout (7–10s).
   - Normalize response shape to our tool output: `{ title, snippet, url, source }[]`.
   - Update `ToolExecutor.get_available_tools()` to include a new tool definition. Optionally keep `search_web` and let prompts choose.

2) Use Perplexity “answer”/chat endpoints as a tool (less preferred for MVP)
   - Harder to ensure deterministic, link‑rich results.

Pros

- Strong result quality and citations.

Cons

- Requires adding a new tool and small UI affordances for a second search tool (or aliasing `search_web` behind a provider setting).

---

## Clamp Strategy (paid or free)

- Keep total tool calls per model turn capped at 10 (router-level) even with paid plans.
- Keep per-call `num_results` within a reasonable bound (e.g., 3–5) to avoid noisy result lists.
- Continue disabling `parallel_tool_calls` for aggressive providers if they cause spiky behavior; revisit after we add better scheduling.

Implementation status: router already supports a per-turn cap; adjust default from 6 → 10 if you upgrade.

---

## True Streaming: What’s Needed

“True streaming” here means the UI reacts while the model is still deciding tools, then executes tools as soon as each call is complete, not only after the first non‑streaming turn. Steps:

1) Streamed tool-call deltas (backend/service)
   - Update `OpenRouterService.stream_completion` to parse `delta.tool_calls` (providers that support it emit partial tool calls during the stream).
   - Emit typed events from the service such as `("tool_call_delta", partial)` and `("tool_call_complete", call)` in addition to the existing `("reasoning", text)` and content chunks.

2) Early emission of tool calls (router)
   - When a tool call becomes complete (function name + well‑formed args), yield an SSE `tool_calls` event immediately.
   - Begin executing tools as they complete (not waiting for the whole first turn). Queue results and stream each `tool_executing`/`tool_result` separately.

3) UI adjustments
   - ResponsePanel: handle `tool_call_delta` (to show “planning tool use…”) and convert to “running” on `tool_executing`.
   - Keep the existing inline search results and chips; they’ll simply appear earlier.

4) Finalization remains the same
   - After tools complete, keep the current finalize step (`tool_choice: "none"`) to force a normal content stream.

Notes

- Not all providers stream `tool_calls` deltas; when unavailable, we fall back to the current non‑streaming first turn.
- This is a modest refactor; start with Brave paid (Option A) + 10‑call clamp first to stabilize usage, then add streamed tool-call support.

---

## Recommended Rollout

1) Brave paid (flip env only) + raise per‑turn cap to 10.
2) If still constrained or citations matter more, add Perplexity as a second tool.
3) Implement true streaming of tool-call deltas once the above is stable.

Environment variables

```bash
# Brave paid
export BRAVE_API_KEY=...  # already supported

# Perplexity (if adopted)
export PERPLEXITY_API_KEY=...
```

Configuration knobs

- Router query params (defaults safe for free tiers):
  - `per_turn_tool_cap` (suggest 10 with paid plans)
  - `max_tool_calls` (iterations safeguard)
  - `finalize_hint` (off by default; turn on if a model ignores tool results)

