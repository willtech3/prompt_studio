# Testing Git Worktree Implementations

This guide will help you test the three parallel implementations of the Tool Calling Unified Plan.

## Worktree Overview

You have 3 agent implementations:

1. **FVCVO** (`/Users/wlane/.cursor/worktrees/prompt_studio/FVCVO`)
   - Branch: `feat-tool-plan-phases-FVCVO`
   - Modified: Backend chat router, OpenRouter service, Frontend components

2. **n2wP1** (`/Users/wlane/.cursor/worktrees/prompt_studio/n2wP1`)
   - Branch: `feat-tool-plan-phases-n2wP1`
   - Modified: Backend config, chat router, OpenRouter service, tool executor, Frontend components

3. **PPJWg** (`/Users/wlane/.cursor/worktrees/prompt_studio/PPJWg`)
   - Branch: `implement-tool-plan-PPJWg`
   - Modified: Backend config, chat router, OpenRouter service, tool executor, Frontend components
   - Includes: Test documentation files

## Quick Testing Workflow

### 1. Test Each Implementation

For each worktree, follow these steps:

```bash
# Navigate to worktree
cd /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO  # or n2wP1 or PPJWg

# Backend Setup & Start
cd backend
just stop    # Stop any running servers first
just sync    # Ensure dependencies are up to date
just start   # Start the backend server

# In a new terminal - Frontend Setup & Start
cd /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO/frontend  # adjust path
npm install  # Only if needed
npm run dev  # Start frontend

# Test and take notes
# When done testing, stop servers (Ctrl+C for frontend, `just stop` for backend)
```

### 2. Testing Checklist

Based on the TOOL_CALLING_UNIFIED_PLAN.md Phase 3 tests, verify:

#### **Provider Testing**
Test with each provider (if you have API keys):
- [ ] OpenAI gpt-4o
- [ ] Anthropic claude-sonnet-4
- [ ] Google gemini-2.0-flash
- [ ] XAI grok-4
- [ ] DeepSeek chat

#### **Feature Testing**
For each provider above, test these scenarios:
- [ ] **No tools**: Simple query without needing search (e.g., "What is 2+2?")
- [ ] **Single tool call**: Query requiring one search (e.g., "What happened in tech news today?")
- [ ] **Multi-step tools**: Query requiring multiple searches (e.g., "Compare the GDP of USA and China in 2024")
- [ ] **Provider-specific quirks**: Verify parallel_tool_calls behavior for Anthropic/XAI
- [ ] **Error scenarios**: Test with invalid queries, timeouts (if possible)
- [ ] **Clamp scenarios**: Trigger many tool calls to test rate limiting

#### **UI/UX Testing**
- [ ] **Reasoning Panel**: 
  - Does reasoning appear when supported?
  - Is there a spinner/placeholder while waiting?
  - Does it stay unobtrusive?
  
- [ ] **Search Results**:
  - Do search links appear progressively?
  - Are duplicates removed (same hostname+pathname)?
  - Does it auto-expand on first result?
  - Does it auto-collapse when main response starts?
  
- [ ] **Tool Visibility**:
  - Are utility tools (time/calc) hidden from chips/inline?
  - Are all tools visible in Run Inspector?
  
- [ ] **Warning Banner**:
  - If you trigger tool clamping, does a warning appear once?
  - Is it non-blocking?

- [ ] **SSE Stream**:
  - Open browser DevTools → Network → filter for EventStream
  - Verify SSE events match v1.1 spec (reasoning, tool_calls, tool_executing, tool_result, content, warning, done)

#### **Backend Behavior Testing**
- [ ] Check backend logs for feature flag status
- [ ] Verify finalize pass happens (look for final content)
- [ ] Check that tool_choice:none is forced on finalize
- [ ] Verify no tools triggered during provider guardrails

### 3. Document Your Findings

Create a comparison document:

```bash
cd /Users/wlane/Desktop/Code/prompt_studio
touch IMPLEMENTATION_COMPARISON.md
```

Use this template:

```markdown
# Implementation Comparison

Test Date: [DATE]
Tested By: [YOUR NAME]

## Implementation FVCVO

### What Works
- 
- 

### Issues Found
- 
- 

### Notes
- 

## Implementation n2wP1

### What Works
- 
- 

### Issues Found
- 
- 

### Notes
- 

## Implementation PPJWg

### What Works
- 
- 

### Issues Found
- 
- 

### Notes
- 

## Recommendation

Based on testing, I recommend implementation **[FVCVO/n2wP1/PPJWg]** because:
1. 
2. 
3. 

## Next Steps
- [ ] Merge recommended implementation to feature/tool-loop-v2
- [ ] Clean up worktrees
- [ ] Run final integration tests
```

### 4. Quick Comparison Commands

To see what each implementation changed:

```bash
cd /Users/wlane/Desktop/Code/prompt_studio

# Compare FVCVO to base
git diff feature/tool-loop-v2 feat-tool-plan-phases-FVCVO

# Compare n2wP1 to base
git diff feature/tool-loop-v2 feat-tool-plan-phases-n2wP1

# Compare PPJWg to base
git diff feature/tool-loop-v2 implement-tool-plan-PPJWg

# Compare implementations to each other
git diff feat-tool-plan-phases-FVCVO feat-tool-plan-phases-n2wP1
```

### 5. Check Implementation Summaries

```bash
# PPJWg has summary docs
cat /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg/TOOL_LOOP_V2_SUMMARY.md
cat /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg/TEST_V2_LOOP.md
```

### 6. Running Automated Tests

For each worktree:

```bash
cd /Users/wlane/.cursor/worktrees/prompt_studio/[WORKTREE]/backend
just test      # Run test suite
just lint      # Check code style
just typecheck # Run type checking
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Backend
cd backend
just stop

# Frontend - find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Environment Variables
Make sure your `.env` file is set up correctly in each worktree's backend:
```bash
cd /Users/wlane/.cursor/worktrees/prompt_studio/[WORKTREE]/backend
cat .env  # Verify OPENROUTER_API_KEY, DATABASE_URL, etc.
```

### Database Issues
If database migrations differ:
```bash
cd backend
just migrate  # Apply migrations
```

## Recommendation Process

1. **Test all three implementations** using the checklist above
2. **Document findings** in IMPLEMENTATION_COMPARISON.md
3. **Score each implementation** on:
   - Code quality (readability, maintainability)
   - Feature completeness (all Phase 1-2 items done?)
   - Stability (crashes, errors?)
   - UX quality (smooth, responsive?)
   - Test coverage
4. **Choose the best one** to merge into feature/tool-loop-v2
5. **Clean up** the other two worktrees

## After Testing - Merge Winner

Once you've chosen the best implementation:

```bash
# Return to main worktree
cd /Users/wlane/Desktop/Code/prompt_studio

# Merge the winning branch (example: PPJWg)
git checkout feature/tool-loop-v2
git merge implement-tool-plan-PPJWg

# Commit any remaining changes
git add backend/ frontend/
git commit -m "feat: implement tool-loop-v2 from winning worktree implementation"

# Clean up worktrees
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/FVCVO
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/n2wP1
git worktree remove /Users/wlane/.cursor/worktrees/prompt_studio/PPJWg

# Delete branches (optional)
git branch -D feat-tool-plan-phases-FVCVO
git branch -D feat-tool-plan-phases-n2wP1
git branch -D implement-tool-plan-PPJWg
```

## Testing Tips

1. **Use Bruno Collection**: The backend has Bruno API tests in `backend/bruno-collection/`
2. **Browser DevTools**: Keep Network tab open to watch SSE streams
3. **Backend Logs**: Watch terminal output for errors and warnings
4. **Take Screenshots**: Document UI behavior for comparison
5. **Test Iteratively**: Don't try to test everything at once - focus on one provider/scenario at a time
6. **Real Queries**: Use realistic queries that mirror actual usage
7. **Edge Cases**: Try to break it - long queries, rapid messages, invalid inputs

## Quick Reference

| Worktree | Path | Branch | Key Changes |
|----------|------|--------|-------------|
| FVCVO | `~/.cursor/worktrees/prompt_studio/FVCVO` | `feat-tool-plan-phases-FVCVO` | Backend + Frontend |
| n2wP1 | `~/.cursor/worktrees/prompt_studio/n2wP1` | `feat-tool-plan-phases-n2wP1` | Backend config, executor, Frontend |
| PPJWg | `~/.cursor/worktrees/prompt_studio/PPJWg` | `implement-tool-plan-PPJWg` | Backend config, executor, Frontend + Docs |

Good luck testing! 🚀

