# AI Agent Context - Prompt Engineering Studio

## Project Status
**Greenfield application with zero users.** This is a single-user local development tool. No production deployment, no authentication, no multi-user support.

**Development philosophy:**
- Keep code simple
- Avoid over-engineering
- Basic error handling only
- No retry logic or fallbacks yet
- Manual testing first
- Simple console logs

## What This Is
A web app for testing and optimizing AI prompts across 250+ models via OpenRouter API.

## Tech Stack
- **Backend**: FastAPI, Python 3.13, PostgreSQL (optional), SQLAlchemy 2.0, uv
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, Zustand
- **APIs**: OpenRouter (AI models), Brave Search (web search), Jina Reader (page reading)

## Current Implementation

### Backend (FastAPI)
**Entry point:** `backend/app/main.py` (62 lines)

**Routers:**
- `chat/router.py` - Stream chat with SSE, tool calling (refactored into modular components)
  - `chat/messages.py` - Message building and formatting
  - `chat/parameters.py` - Parameter validation and parsing
  - `chat/providers.py` - Provider-specific constraints
  - `chat/streaming.py` - SSE event streaming helpers
  - `chat/tools.py` - Tool schemas and execution
- `models.py` - Model catalog management
- `optimize.py` - Prompt optimization using meta-prompts
- `providers.py` - Provider guides and best practices
- `saves.py` - Snapshot save/load

**Services:**
- `openrouter.py` - OpenRouter API client (streaming, completion)
- `tool_executor.py` - Safe tool execution (search_web, read_url)
- `model_catalog.py` - Model catalog syncing from OpenRouter

**Database models:**
- `model_config.py` - Model metadata and pricing
- `provider_content.py` - Best practices and guides
- `snapshot.py` - Saved prompt sessions

**Config:**
- `db.py` - Database connection and session management
- `optimization_prompts.py` - Meta-prompts for optimization

### Frontend (React 19)
**Components (20+):**
- `PromptEditor.tsx` - Main prompt editor with variable interpolation
- `ResponsePanel.tsx` - Response streaming display with tool execution
- `ParametersPanel.tsx` - Model parameter controls
- `ModelDetails.tsx` - Model info display
- `HistoryPanel.tsx` - Prompt history
- `SettingsContent.tsx` - Settings panel
- `ToolChips.tsx` - Tool execution status chips
- `SearchResultsInline.tsx` - Search results display
- `ReasoningBlock.tsx` - Reasoning display for compatible models
- `PromptGuidanceModal.tsx` - Provider-specific guidance
- Others: Header, Logo, ToastContainer, etc.

**Stores (Zustand):**
- `promptStore.ts` - Prompt state, variables, parameters, history
- `settingsStore.ts` - App settings
- `themeStore.ts` - Theme management
- `toastStore.ts` - Toast notifications
- `uiStore.ts` - UI state

**Services:**
- `api.ts` - API client for backend

**Utils:**
- `modelPresets.ts` - Model-specific parameter presets
- `tokenEstimator.ts` - Token estimation
- `theme.ts` - Theme utilities

### Features Implemented
1. **Real-time chat streaming** via Server-Sent Events (SSE)
2. **Variable interpolation** with `{{variable}}` syntax
3. **Model parameters**: temperature, top-p, top-k, frequency penalty, presence penalty, response format, stop sequences
4. **Reasoning effort** for compatible models (DeepSeek, OpenAI o1)
5. **Tool calling**:
   - `search_web(query, num_results)` - Brave Search API
   - `read_url(urls, max_chars)` - Jina Reader API
6. **AI-powered optimization** using meta-prompts
7. **Provider guides** for Anthropic, OpenAI, Google, xAI, DeepSeek
8. **Snapshot save/load** for experimentation
9. **Model catalog** with 250+ models, refresh capability
10. **Responsive UI** with streaming, tool execution display

### Features NOT Implemented
- User authentication
- Multi-user support
- Evaluation metrics
- A/B testing
- Batch processing
- Cost tracking

## Database Schema
**Optional** - app works without database for basic chat.

**Tables:**
- `model_configs` - Model metadata (id, model_id, model_name, provider, context_length, max_completion_tokens, pricing, supports_tools, etc.)
- `provider_content` - Best practices (id, provider_id, content_type, model_id, title, content, doc_url)
- `snapshots` - Saved sessions (id, title, kind, provider, model, data, created_at, updated_at)

**No users table** - single-user local app.

## API Endpoints
```
GET  /health                              - Health check (DB and API key status)
GET  /api/chat/stream                     - Stream chat with tool calling
POST /api/optimize                        - Optimize prompts
GET  /api/models                          - List models
GET  /api/models/{model_path}/info        - Get model details
POST /api/models/refresh                  - Refresh model catalog
GET  /api/providers                       - List providers
GET  /api/providers/{id}/guide            - Get optimization guide
GET  /api/providers/{id}/prompting-guides - Get prompting guides
POST /api/saves                           - Create snapshot
GET  /api/saves                           - List snapshots
GET  /api/saves/{id}                      - Get snapshot
```

## Development Commands

**Always use justfile commands from `backend/` directory:**
```bash
just start      # Start FastAPI dev server
just stop       # Stop server
just test       # Run tests
just lint       # Run linting
just format     # Format code
just typecheck  # Type checking
just migrate    # Run migrations
just migration "name"  # Create migration
just seed       # Seed provider content
just sync       # Install/sync dependencies
just health     # Check API health
just models     # List models
```

**Frontend (from `frontend/` directory):**
```bash
npm run dev     # Start dev server
npm run build   # Production build
```

## Environment Variables
**Required:**
- `OPENROUTER_API_KEY` - OpenRouter API key

**Optional:**
- `DATABASE_URL` - PostgreSQL connection
- `OPENROUTER_HTTP_REFERER` - Attribution
- `OPENROUTER_X_TITLE` - Attribution
- `BRAVE_API_KEY` - Web search tool
- `JINA_API_KEY` - Enhanced page reading (200 RPM vs 20 RPM)

## File Locations
```
backend/
├── app/
│   ├── main.py                 # Entry point (62 lines)
│   ├── routers/
│   │   ├── chat/               # Modular chat router
│   │   │   ├── router.py       # Main chat endpoint
│   │   │   ├── messages.py     # Message building
│   │   │   ├── parameters.py   # Parameter parsing
│   │   │   ├── providers.py    # Provider constraints
│   │   │   ├── streaming.py    # SSE events
│   │   │   └── tools.py        # Tool schemas
│   │   ├── models.py           # Model catalog
│   │   ├── optimize.py         # Optimization
│   │   ├── providers.py        # Provider guides
│   │   └── saves.py            # Snapshots
│   └── core/
│       └── config.py           # CORS, env loading
├── models/
│   ├── model_config.py         # Model metadata
│   ├── provider_content.py     # Provider guides
│   └── snapshot.py             # Saved sessions
├── services/
│   ├── openrouter.py           # OpenRouter client
│   ├── tool_executor.py        # Tool execution
│   └── model_catalog.py        # Catalog syncing
├── config/
│   ├── db.py                   # Database setup
│   └── optimization_prompts.py # Meta-prompts
├── scripts/
│   └── seed_provider_content.py # Seed script
└── tests/
    ├── test_chat.py
    ├── test_health.py
    └── test_models.py

frontend/src/
├── components/                 # 20+ React components
├── store/                      # Zustand stores (5 stores)
├── services/                   # API client
├── utils/                      # Utilities
└── types/                      # TypeScript types
```

## Key Constraints
- OpenRouter API rate limits and pricing
- Brave Search API rate limits (varies by plan)
- Jina Reader API: 20 RPM (free), 200 RPM (with API key)
- Different models have different context windows and token limits
- Tool calling limited to 30 iterations max (configurable via `max_tool_calls` param)

## Non-Negotiable Rules
1. **USE JUSTFILE COMMANDS** - Always use `just` commands for backend tasks
2. **USE UV RUN** - If justfile doesn't have a command, use `uv run`
3. **NEVER `git commit .`** - Add files individually with `git add <file>`
4. **ALWAYS CHECK GIT REMOTE** - Run `git remote -v` before GitHub operations
5. **ALWAYS USE FEATURE BRANCHES** - Never commit directly to main

## Coding Philosophy
1. Avoid try/except unless absolutely needed
2. No retries or robustness yet - fix bugs as encountered
3. Code that is easy to read is easy to reason about
4. Code must be correct - always check docs before updating API calls

## Recent Work
- Backend refactoring (main.py: 960 → 62 lines)
- Chat router modularization (5 modules)
- Tool calling (Brave Search + Jina Reader)
- Prompt optimization with meta-prompts
- Snapshot save/load
- Provider guides for 5 providers
- Reasoning effort control
- Model catalog with 250+ models

## Next Steps
- Expand test coverage
- Add cost tracking
- Implement evaluation metrics
- Consider A/B testing framework
- Add batch processing
