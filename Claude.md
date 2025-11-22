# Claude Context - Prompt Engineering Studio

## GREENFIELD PROJECT STATUS

**This is a GREENFIELD APPLICATION with ZERO users.** We are in the initial development phase with no production deployment or user base yet. Therefore:

- **Keep code simple and clean** - No over-engineering
- **Avoid premature optimization** - Build what works first
- **Basic error handling only** - No complex retry logic or fallbacks
- **Minimal testing initially** - Focus on getting features working
- **Simple logging** - Console logs are sufficient

## Project Overview

Prompt Engineering Studio is a web application for testing and optimizing AI prompts across 250+ models via OpenRouter's unified API. It helps users write better prompts through guidance, testing, real-time experimentation, and tool-augmented AI interactions.

**Primary Goal**: Help users write better AI prompts through guidance, testing, and optimization
**Target Users**: Developers, prompt engineers, content creators, and businesses using AI
**Key Value**: Save time and money by optimizing prompts before production use

## Technical Stack

### Backend (Python 3.13+)
- **Framework**: FastAPI (async, high-performance)
- **Package Manager**: uv (modern Python dependency management)
- **Database**: PostgreSQL 16 with SQLAlchemy 2.0 (optional - app works without it)
- **Migrations**: Alembic
- **HTTP Client**: httpx (async)
- **Validation**: Pydantic 2.0
- **Compression**: BrotliMiddleware
- **Code Quality**: Ruff (linting/formatting), pytest, mypy (optional)

### Frontend (React 19)
- **Framework**: React 19 with TypeScript 5.6
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS v4 with PostCSS
- **State Management**: Zustand (5 stores)
- **Icons**: Lucide React
- **Markdown**: react-markdown with remark-gfm and rehype-highlight

### External APIs
- **OpenRouter API**: 250+ AI models (OpenAI, Anthropic, Google, DeepSeek, xAI, etc.)
- **Brave Search API**: Web search tool (structured rich results)
- **Jina Reader API**: URL to Markdown conversion (optional, improves rate limits)

## Implemented Features (MVP Complete)

1. **Real-time chat streaming** with 250+ models via Server-Sent Events (SSE)
2. **Variable interpolation** with `{{variable}}` syntax
3. **Model parameter controls**: temperature, top-p, top-k, frequency/presence penalties, response format, stop sequences
4. **Reasoning effort control** for compatible models (DeepSeek, OpenAI o1)
5. **AI-powered prompt optimization** using meta-prompts
6. **Provider-specific best practices and guides** (Anthropic, OpenAI, Google, xAI, DeepSeek)
7. **Save/load prompt snapshots** for experimentation
8. **Tool calling support**:
   - `search_web`: Web search via Brave Search API (10 results, structured data)
   - `read_url`: Page reading via Jina Reader API (converts URLs to Markdown)
9. **Model catalog** with refresh capability and detailed model info
10. **Request tracing** with X-Request-ID headers for debugging
11. **Responsive UI** with prompt editor, parameter controls, response streaming, tool execution display

### Future Features (Not Implemented)
- User authentication (single-user local app for now)
- Multi-user support and team collaboration
- Evaluation metrics and scoring
- A/B testing framework
- Batch processing
- Cost tracking and analytics

## File Structure

```
prompt_studio/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point (62 lines)
│   │   ├── routers/             # API endpoints
│   │   │   ├── chat/            # Modular chat router
│   │   │   │   ├── router.py    # Main streaming endpoint
│   │   │   │   ├── messages.py  # Message building, tool results
│   │   │   │   ├── parameters.py# Parameter parsing/validation
│   │   │   │   ├── providers.py # Provider constraints, tool choice
│   │   │   │   ├── streaming.py # SSE event formatting
│   │   │   │   └── tools.py     # Tool schema definitions
│   │   │   ├── models.py        # Model catalog management
│   │   │   ├── optimize.py      # Prompt optimization
│   │   │   ├── providers.py     # Provider guides and content
│   │   │   └── saves.py         # Snapshot management
│   │   ├── core/
│   │   │   └── config.py        # CORS, environment loading
│   │   └── middleware/
│   │       └── request_id.py    # Request ID tracing
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── model_config.py      # Model metadata and pricing
│   │   ├── provider_content.py  # Best practices and guides
│   │   └── snapshot.py          # Saved prompt sessions
│   ├── services/                 # External service integrations
│   │   ├── openrouter.py        # OpenRouter API client (~200 lines)
│   │   ├── tool_executor.py     # Tool execution (search, read_url) (~300 lines)
│   │   └── model_catalog.py     # Model catalog syncing
│   ├── config/
│   │   ├── db.py                # Database setup (async, NullPool)
│   │   └── optimization_prompts.py # Meta-prompts
│   ├── alembic/                  # Database migrations (6 migrations)
│   ├── scripts/
│   │   └── seed_provider_content.py
│   ├── tests/                    # Test suite
│   │   ├── conftest.py          # pytest fixtures
│   │   ├── test_health.py
│   │   ├── test_chat.py
│   │   └── test_models.py
│   ├── pyproject.toml           # Dependencies and tool config
│   └── justfile                 # Development commands
├── frontend/
│   ├── src/
│   │   ├── components/          # React components (21 components)
│   │   │   ├── Header.tsx       # Top navigation
│   │   │   ├── PromptEditor.tsx # System/user prompt editing
│   │   │   ├── ResponsePanel.tsx# Streaming response display
│   │   │   ├── ParametersPanel.tsx # Model parameter controls
│   │   │   ├── LeftDrawer.tsx   # History/library sidebar
│   │   │   ├── SettingsSheet.tsx# Settings overlay
│   │   │   ├── ReasoningBlock.tsx # Reasoning phase display
│   │   │   ├── ToolChips.tsx    # Tool execution status
│   │   │   ├── RunInspectorDrawer.tsx # Tool execution details
│   │   │   ├── SearchResultsInline.tsx # Search result display
│   │   │   └── ... (11 more)
│   │   ├── store/               # Zustand state management
│   │   │   ├── promptStore.ts   # Main app state
│   │   │   ├── settingsStore.ts # User preferences
│   │   │   ├── themeStore.ts    # Dark mode
│   │   │   ├── toastStore.ts    # Notifications
│   │   │   └── uiStore.ts       # UI state (drawers, modals)
│   │   ├── services/
│   │   │   └── api.ts           # API client (~150 lines)
│   │   ├── types/
│   │   │   └── models.ts        # TypeScript interfaces
│   │   ├── hooks/
│   │   │   └── useAutoGrow.ts   # Auto-expanding textarea
│   │   ├── utils/
│   │   │   ├── tokenEstimator.ts
│   │   │   ├── theme.ts
│   │   │   └── modelPresets.ts
│   │   └── main.tsx             # React entry point
│   ├── package.json
│   ├── vite.config.ts           # Dev server, API proxy
│   ├── tsconfig.json            # TypeScript strict mode
│   └── tailwind.config.js       # Tailwind v4 config
└── docs/
    ├── api/                     # OpenRouter API docs
    ├── frameworks/              # Framework guides
    └── prompting_guides/        # Provider-specific guides (20+)
```

## API Endpoints

```
GET  /health                              - Health check (DB, API key status)
GET  /api/chat/stream                     - Stream chat with tool calling (SSE)
POST /api/optimize                        - Optimize prompts using meta-prompt
GET  /api/models                          - List available models (ETag cached)
GET  /api/models/{model_path}/info        - Get model details
POST /api/models/refresh                  - Refresh model catalog from OpenRouter
GET  /api/providers                       - List providers with model counts
GET  /api/providers/{id}/guide            - Get optimization guide for provider
GET  /api/providers/{id}/prompting-guides - Get prompting guides (general + model)
POST /api/saves                           - Create snapshot
GET  /api/saves                           - List snapshots
GET  /api/saves/{id}                      - Get snapshot by ID
```

## Database Schema

```sql
-- Optional tables (app works without database for basic chat)
model_configs (
  id UUID, model_id (unique), model_name, provider, context_length,
  max_completion_tokens, pricing JSONB, supports_streaming,
  canonical_slug, architecture, supported_parameters,
  raw JSONB, created_at, updated_at
)

provider_content (
  id UUID, provider_id, content_type, model_id (nullable),
  title, content JSONB, doc_url, created_at, updated_at
)

snapshots (
  id UUID string, title, kind, provider, model,
  data JSON, created_at, updated_at
)
```

Note: Database is optional. The app functions without it for basic chat. No users table - single-user local app.

## Development Commands

### Backend (via justfile - from `backend/` directory)

```bash
# Server
just start              # Start FastAPI dev server (port 8000, hot-reload)
just stop               # Stop running server

# Testing & Quality
just test               # Run tests with coverage
just lint               # Run ruff linting
just format             # Format code with ruff
just format-check       # Check formatting only

# Database
just migrate            # Run Alembic migrations
just migration "name"   # Create new migration
just seed               # Seed provider content
just db                 # Start PostgreSQL (macOS)

# Dependencies
just sync               # Install/sync dependencies with uv

# Utilities
just health             # Health check endpoint
just models             # List available models
just clean              # Clean caches and temp files
```

### Frontend (from `frontend/` directory)

```bash
npm run dev             # Start Vite dev server (port 5173)
npm run build           # TypeScript + Vite production build
npm run preview         # Preview production build
```

## Environment Variables

**Required:**
```bash
OPENROUTER_API_KEY=sk-or-...    # OpenRouter API key
```

**Optional:**
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host/db  # PostgreSQL connection
OPENROUTER_HTTP_REFERER=https://yoursite.com         # Attribution header
OPENROUTER_X_TITLE=Prompt Studio                     # Attribution header
OPENROUTER_TIMEOUT=120                               # Request timeout (seconds)
BRAVE_API_KEY=...                                    # For web search tool
JINA_API_KEY=...                                     # Enhanced page reading (200 vs 20 RPM)
```

## NON-NEGOTIABLE RULES

1. **USE JUSTFILE COMMANDS** - Always use commands from `backend/justfile` for Python/API development (start, stop, test, lint, format, etc.) instead of running commands directly

2. **USE UV RUN** - If justfile doesn't have a command, use `uv run` instead of activating venv manually (e.g., `uv run pytest`, `uv run python script.py`)

3. **NEVER use `git commit .`** - Always add files individually with `git add <specific-file>` to avoid committing unintended files

4. **ALWAYS CHECK GIT REMOTE FIRST** - Before creating GitHub issues, PRs, or any GitHub operations, run `git remote -v` first to verify the correct repository owner/name. Never assume repository ownership.

5. **ALWAYS USE FEATURE BRANCHES** - Never commit directly to main. Create feature branches (e.g., `git checkout -b feature/description`), then merge via pull request.

## Coding Rules (MVP Phase)

1. **Avoid excessive try/except** - Only use when absolutely necessary. Don't code overly defensively.

2. **Skip retries and complex fallbacks** - Fix bugs as encountered; rely on assumptions for simplicity.

3. **Prioritize readability** - Code that is easy to read is easy to reason about.

4. **Verify before assuming** - Always check docs before updating API calls or making assumptions about libraries/frameworks.

5. **No over-engineering** - Build only what's needed now. Add complexity when real users need it.

## Architecture Notes

### Backend
- **Modular routers** - Each feature in separate router file/package
- **Service abstraction** - External API calls in dedicated service classes
- **Async throughout** - Use async/await consistently (FastAPI requirement)
- **NullPool database** - Avoids connection reuse complexity in MVP
- **Request ID tracing** - X-Request-ID header propagated through all services

### Frontend
- **Zustand stores** - Lightweight state management (no Redux boilerplate)
- **SSE streaming** - EventSource API for real-time chat
- **Tailwind v4** - Uses new `@import` syntax and PostCSS plugin
- **TypeScript strict** - Full type safety enabled

### Tool Calling
- Models decide when to use tools (no forced tool choice)
- `search_web` returns 10 structured results via Brave Rich Search API
- `read_url` converts pages to LLM-friendly Markdown via Jina Reader
- Tool execution traces displayed in RunInspectorDrawer

## Current Status (November 2025)

- MVP Complete - All core features implemented
- Backend: FastAPI with streaming, tool calling, optimization, request tracing
- Frontend: React 19 with full UI, reasoning display, tool execution UI
- Database: Optional PostgreSQL with 3 tables
- Models: 250+ via OpenRouter
- Tools: Web search (Brave) + URL reading (Jina)
- Tests: Basic structure (4 test files)
- Auth: None (single-user local app)

## Recent Completed Work

1. `read_url` tool for page reading via Jina Reader API
2. Request ID tracing middleware for debugging
3. Reasoning phase display with proper ref-based closure
4. Error message handling improvements (tolerant parsing)
5. Rich Search API integration for structured web results
6. Removal of forced tool_choice logic (trust model decisions)
7. Chat router modularization (6 modules)
8. Provider-specific prompting guides (20+ guides)

## Next Steps

1. Expand test coverage for critical endpoints
2. Add cost tracking and analytics
3. Implement evaluation metrics
4. Consider A/B testing framework
5. Add batch processing capabilities

## Remember

This is a tool to help people write better prompts. Every feature should serve that goal. Start with the simplest version that provides value, then iterate based on usage and feedback.
