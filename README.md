# Prompt Engineering Studio

Web application for testing and optimizing prompts across multiple AI models via OpenRouter.

## Features

- Stream chat with 16+ AI models (OpenAI, Anthropic, Google, DeepSeek, XAI)
- Variable interpolation with `{{variable}}` syntax
- AI-powered prompt optimization
- Save/load prompt sessions
- Tool calling support (web search, time, calculator)
- Model parameter controls (temperature, top-p, top-k, etc.)

## Tech Stack

**Backend:** FastAPI, Python 3.13, PostgreSQL, SQLAlchemy 2.0, uv
**Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite, Zustand
**AI:** OpenRouter API

## Structure

```
prompt_studio/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/         # API endpoints
│   │   └── core/            # Configuration
│   ├── models/              # Database models
│   ├── services/            # OpenRouter, tool executor
│   ├── config/              # Database, prompts
│   └── alembic/             # Migrations
└── frontend/
    └── src/
        ├── components/
        ├── store/
        └── services/
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
uv sync
cp .env.example .env  # Add OPENROUTER_API_KEY
just migrate          # Optional: run migrations
just seed             # Optional: load best practices
just start            # Start server
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

Required:
- `OPENROUTER_API_KEY` - Your OpenRouter API key

Optional:
- `DATABASE_URL` - PostgreSQL connection (for persistence)
- `OPENROUTER_HTTP_REFERER` - Attribution header
- `OPENROUTER_X_TITLE` - Attribution header
- `BRAVE_API_KEY` - For web search tool

## API Endpoints

- `GET /health` - Health check
- `GET /api/chat/stream` - Stream chat with tool calling
- `POST /api/optimize` - Optimize prompts
- `GET /api/models` - List available models
- `POST /api/models/refresh` - Refresh model catalog
- `GET /api/providers` - List providers
- `GET /api/providers/{id}/guide` - Get optimization guide
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

## License

MIT
