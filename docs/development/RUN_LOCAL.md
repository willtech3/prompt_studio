# Run Prompt Engineering Studio (Local Dev)

Minimal steps to run the API and UI for manual testing.

## Prerequisites
- Python 3.13+
- `uv` package manager
- Node.js 18+ and npm
- OpenRouter API key in a project‑root `.env` file

Example `prompt_studio/.env`:

```
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxx
# Optional overrides
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## 1) Backend API (FastAPI)

```
cd prompt_studio/backend
uv venv
source .venv/bin/activate

# Install runtime deps (first run only)
uv pip install \
  fastapi==0.115.0 \
  'uvicorn[standard]'==0.32.0 \
  httpx==0.27.2 \
  python-dotenv==1.0.0 \
  pydantic==2.9.0 \
  pydantic-settings==2.5.0 \
  asyncpg==0.30.0 \
  sqlalchemy==2.0.35 \
  'python-jose[cryptography]'==3.3.0 \
  'passlib[bcrypt]'==1.7.4 \
  python-multipart==0.0.12

# Run the dev server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Health check:
```
curl http://127.0.0.1:8000/health
```

Quick streaming test (SSE):
```
curl -N "http://127.0.0.1:8000/api/chat/stream?model=openai/gpt-4o-mini&prompt=Hello%20world"
```

## 2) Frontend UI (Vite + React)

In a separate terminal:

```
cd prompt_studio/frontend
npm install
npm run dev
```

Open http://localhost:5173 and click "Run" to stream real completions.

The dev server proxies `/api/*` to `http://localhost:8000` (see `vite.config.ts`).

## Notes
- The backend loads `.env` from the project root automatically.
- Stop servers with Ctrl+C. If a port is stuck, kill the PID printed in your terminal or use `lsof -ti tcp:PORT | xargs kill -9`.
- For quick backend logs in this repo’s scripts, see `/tmp/pes_backend.log` and `/tmp/pes_vite.log` when started via helper snippets.

