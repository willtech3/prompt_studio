# Claude Context - Prompt Engineering Studio

## ⚠️ IMPORTANT: Greenfield Project Status
**This is a GREENFIELD APPLICATION with ZERO users.** We are in the initial development phase with no production deployment or user base yet. Therefore:
- **Keep code simple and clean** - No over-engineering needed
- **Avoid premature optimization** - Build what works first
- **No complex error handling yet** - Basic error handling is sufficient
- **Skip retry logic and fallbacks** - Add these only when we have real users
- **Minimal testing initially** - Focus on getting features working
- **No elaborate monitoring/logging** - Simple console logs are fine for now

## Project Overview
Prompt Engineering Studio is a web application for testing and optimizing AI prompts across multiple models using OpenRouter's unified API. The platform helps users write better prompts through guidance, testing, and real-time experimentation.

## Core Purpose
- **Primary Goal**: Build a tool that helps users write better AI prompts through guidance, testing, and optimization
- **Target Users**: Developers, prompt engineers, content creators, and businesses using AI
- **Key Value**: Save time and money by optimizing prompts before production use

## Technical Stack

### Backend (Python 3.13+)
- **Framework**: FastAPI (async)
- **Package Manager**: uv (modern Python package management)
- **Database**: PostgreSQL 16 with SQLAlchemy 2.0 (optional)
- **API Integration**: OpenRouter for 250+ AI models
- **External APIs**: Brave Search API (web search), Jina Reader API (page reading)

### Frontend (React 19)
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with Tailwind
- **Icons**: Lucide React
- **State Management**: Zustand
- **Build Tool**: Vite
- **Markdown**: react-markdown with syntax highlighting

## Implemented Features

### Core Features (✅ Complete)
1. **Real-time chat streaming** with 250+ OpenRouter models via Server-Sent Events (SSE)
2. **Variable interpolation** with `{{variable}}` syntax
3. **Model parameter controls**: temperature, top-p, top-k, frequency/presence penalties, response format, stop sequences
4. **Reasoning effort control** for compatible models (DeepSeek, OpenAI o1)
5. **AI-powered prompt optimization** using meta-prompts
6. **Provider-specific best practices and guides** (Anthropic, OpenAI, Google, xAI, DeepSeek)
7. **Save/load prompt snapshots** for experimentation
8. **Tool calling support**:
   - `search_web`: Web search via Brave Search API
   - `read_url`: Page reading via Jina Reader API (converts URLs to LLM-friendly Markdown)
9. **Model catalog** with refresh capability and detailed model info
10. **Responsive UI** with prompt editor, parameter controls, response streaming, tool execution display

### Future Features (Not Implemented)
1. User authentication (single-user local app for now)
2. Multi-user support and team collaboration
3. Evaluation metrics and scoring
4. A/B testing framework
5. Batch processing
6. Cost tracking and analytics

## Database Schema (Current)
```sql
-- Optional tables (app works without database for basic chat)
model_configs (
  id, model_id, model_name, provider, context_length,
  max_completion_tokens, pricing, supports_tools, ...
)

provider_content (
  id, provider_id, content_type, model_id,
  title, content, doc_url, ...
)

snapshots (
  id, title, kind, provider, model,
  data, created_at, updated_at
)
```
Note: Database is optional. The app functions without it for basic chat. No users table - this is a single-user local app.

## API Endpoints
```
GET  /health                              - Health check (includes DB and API key status)
GET  /api/chat/stream                     - Stream chat with tool calling
POST /api/optimize                        - Optimize prompts using meta-prompt
GET  /api/models                          - List available models
GET  /api/models/{model_path}/info        - Get model details
POST /api/models/refresh                  - Refresh model catalog from OpenRouter
GET  /api/providers                       - List providers with model counts
GET  /api/providers/{id}/guide            - Get optimization guide for provider
GET  /api/providers/{id}/prompting-guides - Get prompting guides (general + model-specific)
POST /api/saves                           - Create snapshot
GET  /api/saves                           - List snapshots
GET  /api/saves/{id}                      - Get snapshot by ID
```

## Development Approach
1. **Start Simple**: Get a basic working version quickly - NO over-engineering
2. **Iterate**: Add features one at a time when actually needed
3. **Manual Testing First**: Test features manually before writing automated tests
4. **Build for Zero Users**: We have no users yet, so don't build for scale
5. **Add Complexity Later**: Only add retry logic, fallbacks, and robust error handling when we have real users

## Important Constraints
- **OpenRouter API**: Rate limits and pricing constraints
- **Token Limits**: Different models have different context windows
- **Response Time**: Keep UI responsive during API calls
- **Cost Management**: Track and display costs transparently
- **Tool APIs**: Brave Search and Jina Reader have rate limits

## File Structure
```
prompt_studio/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point (62 lines)
│   │   ├── routers/          # API endpoints
│   │   │   ├── chat/         # Modular chat router (messages, parameters, providers, streaming, tools)
│   │   │   ├── models.py     # Model catalog management
│   │   │   ├── optimize.py   # Prompt optimization
│   │   │   ├── providers.py  # Provider guides and content
│   │   │   └── saves.py      # Snapshot management
│   │   └── core/             # Configuration (CORS, env loading)
│   ├── models/               # SQLAlchemy models (model_config, provider_content, snapshot)
│   ├── services/             # External services
│   │   ├── openrouter.py     # OpenRouter API client
│   │   ├── model_catalog.py  # Model catalog syncing
│   │   └── tool_executor.py  # Safe tool execution (search_web, read_url)
│   ├── config/               # Database config, optimization prompts
│   ├── alembic/              # Database migrations
│   ├── scripts/              # Utility scripts (seed_provider_content.py)
│   ├── tests/                # Tests (basic structure in place)
│   ├── pyproject.toml        # Dependencies and tool config
│   └── justfile              # Development commands
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (20+ components)
│   │   ├── store/            # Zustand stores (prompt, settings, theme, toast, ui)
│   │   ├── services/         # API client
│   │   ├── utils/            # Utilities (theme, tokenEstimator, modelPresets)
│   │   └── types/            # TypeScript types
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite build config
└── docs/                     # Documentation
    ├── api/                  # OpenRouter API docs
    ├── frameworks/           # FastAPI, React 19, Tailwind CSS v4 docs
    └── prompting_guides/     # Provider-specific prompting guides
```

## Development Workflow
1. Backend API first (can test with Bruno/curl)
2. Database schema and models (optional)
3. Basic frontend UI
4. Integration and refinement
5. Advanced features incrementally

## Common Development Commands (via justfile)

The backend includes a `justfile` with common development commands. **Always use these commands** instead of running tools directly:

```bash
# Navigate to backend directory first
cd backend

# Start/stop server
just start          # Start FastAPI dev server
just stop           # Stop running server

# Testing & quality
just test           # Run tests with coverage
just lint           # Run ruff linting
just format         # Format code with ruff
just typecheck      # Run mypy type checking

# Database
just migrate        # Run pending migrations
just migration "description"  # Create new migration
just seed           # Seed provider content

# Dependencies
just sync           # Install/sync dependencies

# Utilities
just health         # Check API health
just models         # List available models
```

All commands use `uv run` internally, so you never need to manually activate the virtual environment.

## Success Metrics
- **Technical**: < 2s page load, < 200ms API response (excluding AI calls)
- **User**: Successfully execute prompts, save/load prompts, compare models
- **Business**: Track token usage, optimize costs, improve prompt quality

## Current Status (November 2025)
- ✅ MVP Complete - All core features implemented
- ✅ Backend fully functional with streaming, tool calling, optimization
- ✅ Frontend with React 19, full UI implementation
- ✅ Database schema and migrations in place
- ✅ Model catalog with 250+ OpenRouter models
- ✅ Provider best practices and guides (5 providers)
- ✅ Tool calling with Brave Search and Jina Reader
- ✅ Chat router refactored into modular components
- ⏳ No authentication (single-user local app)
- ⏳ Basic test structure in place (3 test files)

## Recent Completed Work
1. Backend refactoring (main.py reduced from 960 to 62 lines)
2. Router extraction (chat, models, optimize, saves, providers)
3. Chat router modularization (messages, parameters, providers, streaming, tools)
4. Tool calling implementation (web search via Brave, page reading via Jina)
5. Prompt optimization with meta-prompts
6. Snapshot save/load functionality
7. Provider-specific guides and best practices
8. Reasoning effort control for compatible models
9. Model catalog refresh from OpenRouter

## Next Steps
1. Expand test coverage for critical endpoints
2. Add cost tracking and analytics
3. Implement evaluation metrics
4. Consider A/B testing framework
5. Add batch processing capabilities

## 🚨 NON-NEGOTIABLE RULES
1. **USE JUSTFILE COMMANDS** - Always use commands from `backend/justfile` for Python/API development tasks (start, stop, test, lint, format, etc.) instead of running commands directly
2. **USE UV RUN** - If justfile doesn't have a command you need, use `uv run` instead of activating venv manually (e.g., `uv run uvicorn`, `uv run pytest`)
3. **NEVER use `git commit .`** - Always add files individually with `git add <specific-file>` to avoid committing unintended files
4. **ALWAYS CHECK GIT REMOTE FIRST** - Before creating GitHub issues, PRs, or any GitHub operations, ALWAYS run `git remote -v` first to verify the correct repository owner/name. NEVER assume repository ownership.
5. **ALWAYS USE FEATURE BRANCHES** - Never commit directly to main. Always create a new feature branch (e.g., `git checkout -b feature/description`) before making changes, then merge via pull request.

## Technical Notes
- Use async/await for consistency (not for premature optimization)
- Basic try/catch is sufficient - no complex error recovery needed yet
- Console.log is fine for now - no logging frameworks needed
- Environment variables for config is good practice
- Skip rate limiting until we have actual users to limit

## Remember
This is a tool to help people write better prompts. Every feature should serve that goal. Start with the simplest version that provides value, then iterate based on usage and feedback.

## Coding Rules (MVP)

1. We avoid try/except blocks unless they are absolutely needed. We don't need to code overly defensively.
2. Retries and robustness are not currently a priority. We'll fix bugs as we encounter them and rely on assumptions for the sake of simplicity for now.
3. Code that is easy to read is easy to reason about.
4. Code must be correct or it doesn't work. Always check docs before updating API calls or making assumptions about how something works.
