# Prompt Engineering Studio

A web application for testing and optimizing prompts across multiple models using OpenRouter's API.

## What It Does

- Test prompts against different AI models (OpenAI, Anthropic, Google, DeepSeek, XAI)
- Stream responses in real-time with markdown rendering
- Save and restore prompt sessions (snapshots)
- Adjust model parameters (temperature, top-p, penalties, etc.)
- Interpolate variables in prompts using `{{variable}}` syntax

## Technology Stack

**Backend:** FastAPI (Python 3.13), PostgreSQL 16, SQLAlchemy 2.0, uv package manager

**Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite, Zustand

**AI:** OpenRouter API for model access

## Project Structure

```
prompt_studio/
├── backend/
│   ├── app/main.py           # FastAPI application
│   ├── models/               # SQLAlchemy models
│   ├── services/             # OpenRouter integration
│   ├── config/               # Database configuration
│   └── alembic/              # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── store/            # Zustand state management
│   │   └── services/api.ts   # API client
│   └── public/
└── docs/                     # Documentation
```

## Quick Start

**Prerequisites:**
- Python 3.13+ with `uv` package manager
- Node.js 20+
- PostgreSQL 16 (optional—app works without DB)
- OpenRouter API key ([get one here](https://openrouter.ai))

**Backend:**
```bash
cd backend
uv venv && source .venv/bin/activate
uv pip install -r pyproject.toml
cp .env.example .env  # Add OPENROUTER_API_KEY
alembic upgrade head  # Optional: if using database
python scripts/seed_provider_content.py  # Optional: load best practices
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

**Note:** Database is optional for basic chat. Required for snapshots, best practices, and model catalog.

## Environment Variables

Set these in `.env` (backend loads both `backend/.env` and project root `.env`):

- `OPENROUTER_API_KEY` — your OpenRouter API key (required for API calls)
- `OPENROUTER_BASE_URL` — override base URL if needed (optional)
- `OPENROUTER_TIMEOUT` — request timeout in seconds, default `120` (optional)
- `DATABASE_URL` — PostgreSQL connection string for persistence (optional)
- `OPENROUTER_HTTP_REFERER` — app/site URL for OpenRouter attribution header (optional)
- `OPENROUTER_X_TITLE` — human-readable app name for OpenRouter attribution header (optional)

Attribution headers help your app appear on OpenRouter’s leaderboard and request pages. When the last two are set, the backend automatically includes `HTTP-Referer` and `X-Title` headers on OpenRouter requests.

## Features

**Streaming & Rendering:**
- Server-Sent Events (SSE) for real-time streaming
- Markdown rendering with syntax highlighting
- Copy to clipboard

**Model Controls:**
- 16 models across OpenAI, Anthropic, Google, DeepSeek, XAI
- Parameter adjustment: temperature, top-p, top-k, penalties, seed, stop sequences
- Reasoning effort control for compatible models

**Prompt Tools:**
- Variable interpolation with `{{variable}}` syntax
- AI-powered prompt optimization
- Provider-specific best practices and guides

**State Management:**
- Save/load snapshots (full UI state including prompts, parameters, responses)
- History browsing with timestamps
- Dark/light theme with system preference detection

## Development Commands

**Backend (from `backend/` directory):**
```bash
just start      # Start dev server
just test       # Run tests
just lint       # Lint code
just migrate    # Run database migrations
just seed       # Seed provider content
```

**Frontend:**
```bash
npm run dev     # Start dev server
npm run build   # Production build
```

## License

MIT
