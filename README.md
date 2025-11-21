# Prompt Engineering Studio

Web application for testing and optimizing AI prompts across multiple models via OpenRouter.

## Features

- Stream chat with 250+ AI models (OpenAI, Anthropic, Google, DeepSeek, xAI, etc.)
- Variable interpolation with `{{variable}}` syntax
- AI-powered prompt optimization
- Save/load prompt snapshots
- Tool calling support:
  - Web search via Brave Search API
  - Page reading via Jina Reader API (fetches full page content in Markdown)
- Model parameter controls (temperature, top-p, top-k, frequency/presence penalties, response format, stop sequences)
- Reasoning effort control for compatible models (DeepSeek, OpenAI o1)
- Provider-specific best practices and prompting guides

## Tech Stack

**Backend:** FastAPI, Python 3.13, PostgreSQL (optional), SQLAlchemy 2.0, uv
**Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite, Zustand
**AI:** OpenRouter API (250+ models)
**Tools:** Brave Search API, Jina Reader API

## Structure

```
prompt_studio/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point (62 lines)
│   │   ├── routers/          # API endpoints (chat, models, optimize, saves, providers)
│   │   └── core/             # Configuration
│   ├── models/               # Database models (model_config, provider_content, snapshot)
│   ├── services/             # OpenRouter, tool executor, model catalog
│   ├── config/               # Database, optimization prompts
│   ├── alembic/              # Migrations
│   └── justfile              # Development commands
└── frontend/
    └── src/
        ├── components/       # React components (20+)
        ├── store/            # Zustand stores
        └── services/         # API client
```

## Setup

**Prerequisites:**
- Python 3.13+ with uv
- Node.js 20+
- PostgreSQL 16 (optional)
- OpenRouter API key

**Backend:**
```bash
cd backend
just sync              # Install dependencies
cp .env.example .env   # Add OPENROUTER_API_KEY
just migrate           # Optional: run migrations
just seed              # Optional: load provider content
just start             # Start server
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Environment Variables

**Required:**
- `OPENROUTER_API_KEY` - Your OpenRouter API key

**Optional:**
- `DATABASE_URL` - PostgreSQL connection (for persistence)
- `OPENROUTER_HTTP_REFERER` - Attribution header
- `OPENROUTER_X_TITLE` - Attribution header
- `BRAVE_API_KEY` - For web search tool
- `JINA_API_KEY` - For enhanced page reading (200 RPM vs 20 RPM)

## API Endpoints

- `GET /health` - Health check
- `GET /api/chat/stream` - Stream chat with tool calling
- `POST /api/optimize` - Optimize prompts
- `GET /api/models` - List available models
- `POST /api/models/refresh` - Refresh model catalog
- `GET /api/providers` - List providers
- `GET /api/providers/{id}/guide` - Get optimization guide
- `GET /api/providers/{id}/prompting-guides` - Get prompting guides
- `POST /api/saves` - Save snapshot
- `GET /api/saves` - List snapshots
- `GET /api/saves/{id}` - Get snapshot

## Development

**Backend commands (from `backend/` directory):**
```bash
just start      # Start dev server
just test       # Run tests
just lint       # Run linting
just format     # Format code
just migrate    # Run migrations
just seed       # Seed database
```

**Frontend commands:**
```bash
npm run dev     # Start dev server
npm run build   # Production build
```

## Database

The app works without a database for basic chat. Database is optional and provides:
- Model catalog caching
- Provider content storage
- Snapshot persistence

Tables:
- `model_configs` - Model metadata and pricing
- `provider_content` - Best practices and guides
- `snapshots` - Saved prompt sessions

## Deployment

Prompt Studio is designed to be deployed with:
- **API** on Fly.io
- **PostgreSQL** on Neon
- **Frontend** on Vercel
- **CI/CD** via GitHub Actions

For a detailed, step-by-step deployment guide (including Fly/Neon/Vercel setup, GitHub secrets, and the CI pipeline stages), see:

- `docs/DEPLOYMENT.md`

## License

MIT
