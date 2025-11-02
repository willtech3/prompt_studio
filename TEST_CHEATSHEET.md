# Worktree Testing Cheat Sheet

Quick commands for testing each implementation.

## Quick Test Commands

### PPJWg (Recommended First)
```bash
# Terminal 1 - Backend
cd /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg/backend
export TOOL_LOOP_V2=true
just stop && just start

# Terminal 2 - Frontend
cd /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg/frontend
npm run dev

# Terminal 3 - View docs
cat /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg/TOOL_LOOP_V2_SUMMARY.md
```

### n2wP1
```bash
# Terminal 1 - Backend
cd /Users/wlane/.cursor/worktrees/prompt_studio/n2wP1/backend
export TOOL_LOOP_V2=true
just stop && just start

# Terminal 2 - Frontend
cd /Users/wlane/.cursor/worktrees/prompt_studio/n2wP1/frontend
npm run dev
```

### FVCVO
```bash
# Terminal 1 - Backend
cd /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO/backend
export TOOL_LOOP_V2=true
just stop && just start

# Terminal 2 - Frontend
cd /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO/frontend
npm run dev
```

## Test Queries

### 1. Search Query (Tests V2 Loop)
```
Model: openai/gpt-4o
Prompt: What are the latest AI news today?
Tools: search_web enabled
Expected: Search results → auto-collapse → response
```

### 2. Utility Tools (Tests Hidden Visibility)
```
Model: openai/gpt-4o
Prompt: What time is it? Also calculate 15 * 23
Tools: All enabled
Expected: Tools run, no chips shown, see in Run Inspector
```

### 3. Multi-Search (Tests Deduplication)
```
Model: openai/gpt-4o
Prompt: Compare the GDP of USA and China in 2024
Tools: search_web enabled
Expected: Multiple searches, duplicates removed
```

### 4. No Tools (Tests Legacy Loop)
```
Model: openai/gpt-4o
Prompt: What is 2+2?
Tools: None
Expected: Simple response, uses legacy loop
```

## Quick Checks

### Is V2 Loop Enabled?
```bash
cd [WORKTREE]/backend
uv run python -c "from app.core.config import get_tool_loop_v2_enabled; print(get_tool_loop_v2_enabled())"
```

### View Backend Logs
Backend terminal shows SSE events in real-time

### View SSE Events
Browser DevTools → Network → EventStream → Messages tab

### Run Tests
```bash
cd [WORKTREE]/backend
just test
just lint
just typecheck
```

## Comparison Commands

```bash
cd /Users/wlane/Desktop/Code/prompt_studio

# See what changed in each
git diff --stat feature/tool-loop-v2 feat-tool-plan-phases-FVCVO
git diff --stat feature/tool-loop-v2 feat-tool-plan-phases-n2wP1
git diff --stat feature/tool-loop-v2 implement-tool-plan-PPJWg

# Compare implementations to each other
git diff FVCVO n2wP1 -- backend/app/routers/chat.py
git diff n2wP1 PPJWg -- backend/services/openrouter.py
```

## Stop Servers

```bash
# Backend
cd [WORKTREE]/backend && just stop

# Frontend (if running in background)
lsof -ti:5173 | xargs kill -9

# Or just Ctrl+C in the terminal
```

## After Testing

```bash
# Return to main worktree
cd /Users/wlane/Desktop/Code/prompt_studio

# Merge winner (example: PPJWg)
git checkout feature/tool-loop-v2
git merge implement-tool-plan-PPJWg
git status

# Clean up
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/n2wP1
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg
```

## UI Things to Check

- [ ] Search links appear progressively
- [ ] Search auto-expands on first result
- [ ] Search auto-collapses when response starts
- [ ] Utility tools NOT in chips
- [ ] All tools in Run Inspector
- [ ] Warning banner if 6+ tool calls
- [ ] Reasoning appears when supported
- [ ] Smooth streaming, no stuttering
- [ ] DevTools shows metadata in SSE

## Providers to Test

- [ ] openai/gpt-4o
- [ ] anthropic/claude-sonnet-4
- [ ] google/gemini-2.0-flash
- [ ] x-ai/grok-4
- [ ] deepseek/deepseek-chat

## Score Each Implementation

| Criteria | FVCVO | n2wP1 | PPJWg |
|----------|-------|-------|-------|
| Code Quality (1-5) | | | |
| Completeness (1-5) | | | |
| Stability (1-5) | | | |
| UX Quality (1-5) | | | |
| Testing (1-5) | | | |
| **TOTAL** | **/25** | **/25** | **/25** |

## Winner: ________________

Reason: _______________________________________________

---

**Full guides:**
- `WORKTREE_TESTING_SUMMARY.md` - Complete overview
- `TESTING_WORKTREES.md` - Detailed testing guide
- `PPJWg/TOOL_LOOP_V2_SUMMARY.md` - Implementation details
- `PPJWg/TEST_V2_LOOP.md` - Quick test guide

