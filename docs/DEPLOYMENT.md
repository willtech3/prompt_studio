## Deployment Guide - Prompt Studio

This guide explains how to deploy Prompt Studio using:

- **API** on Fly.io  
- **Database** on Neon PostgreSQL  
- **Frontend** on Vercel  
- **CI/CD** via GitHub Actions with pinned dependencies

The deployment goal is described in the project issue  
[`EPIC: POC deploy — Vercel FE + Fly API + Neon DB (+ seed)`](https://github.com/willtech3/prompt_studio/issues/24).

---

### 1. Prerequisites

- GitHub repository: `willtech3/prompt_studio`
- Fly.io account (`fly auth signup`)
- Neon PostgreSQL account
- Vercel account
- OpenRouter API key

Recommended service names:

- **Fly app**: `prompt-studio-api`
- **Neon database**: `prompt-studio`
- **Vercel project**: `prompt-studio-frontend`
- **Custom domain**: `prompt-studio.willtech3.com`

---

### 2. Neon PostgreSQL (Database)

1. Create a new **Neon** project with **PostgreSQL 16**.
2. Create a database (e.g. `prompt_studio`).
3. From the Neon dashboard, copy the **connection string**, which will look like:

   ```text
   postgresql://USER:PASSWORD@HOSTNAME:5432/DB_NAME?sslmode=require
   ```

4. Convert this to the **async SQLAlchemy URL** used by the backend:

   ```text
   postgresql+asyncpg://USER:PASSWORD@HOSTNAME:5432/DB_NAME?sslmode=require
   ```

5. You will use this value as `DATABASE_URL` in **Fly.io secrets** and optional local `.env`.

---

### 3. Fly.io API Deployment (Backend)

The backend is packaged via a Dockerfile (`backend/Dockerfile`) and configured with `backend/fly.toml`.

#### 3.1. One-time Fly app setup

Run these commands locally (from the repo root):

```bash
cd backend
fly auth login
fly apps create prompt-studio-api
```

If you choose a different app name, update `app` in `backend/fly.toml`.

#### 3.2. Configure Fly secrets

Set required environment variables on Fly (replace values accordingly):

```bash
cd backend
fly secrets set \
  DATABASE_URL="postgresql+asyncpg://USER:PASSWORD@HOSTNAME:5432/DB_NAME?sslmode=require" \
  OPENROUTER_API_KEY="your-openrouter-key" \
  OPENROUTER_HTTP_REFERER="https://prompt-studio.willtech3.com" \
  OPENROUTER_X_TITLE="Prompt Studio" \
  BRAVE_API_KEY="optional-brave-api-key" \
  JINA_API_KEY="optional-jina-api-key"
```

The backend reads `DATABASE_URL` via `config.db.Settings`.

#### 3.3. Manual Fly deployment

To deploy manually (outside CI):

```bash
cd backend
fly deploy
```

The `backend/fly.toml` includes:

- `build.dockerfile = "Dockerfile"` – uses the pinned `uv.lock` + `pyproject.toml`
- `[deploy].release_command` – runs Alembic migrations and seeds provider content:

  ```text
  uv run alembic upgrade head && uv run python scripts/seed_provider_content.py
  ```

After a successful deploy, the API will be available at a URL like:

```text
https://prompt-studio-api.fly.dev
```

You will use that URL in Vercel rewrites.

---

### 4. Vercel Frontend Deployment

The frontend is a Vite + React app under `frontend/`, with `frontend/vercel.json` configuring API rewrites.

#### 4.1. Vercel project setup

1. In Vercel, **import** the GitHub repo `willtech3/prompt_studio`.
2. In the Vercel project settings:
   - Set **Root Directory**: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. No extra environment variables are required for the frontend; it calls the API via `/api/*`.

#### 4.2. Configure API rewrites

`frontend/vercel.json` contains:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://prompt-studio-api.fly.dev/api/$1"
    }
  ]
}
```

If your Fly app name differs or you use a custom Fly domain, update the `destination` accordingly.

#### 4.3. Custom domain

To serve the SPA at `https://prompt-studio.willtech3.com`:

1. In Vercel project settings, add the **custom domain** `prompt-studio.willtech3.com`.
2. In your DNS provider, create a **CNAME** record:
   - **Host**: `prompt-studio`
   - **Value**: `cname.vercel-dns.com`
3. Wait for DNS to propagate; Vercel will issue TLS automatically.

---

### 5. GitHub Actions CI/CD

CI/CD is configured in `.github/workflows/ci.yml` with three stages:

1. **lint** – backend + frontend linting
2. **test** – backend tests
3. **deploy** – Fly API + Vercel frontend (only on `main` branch pushes)

All builds use pinned dependencies:

- **Backend**: `uv sync --frozen` with `backend/uv.lock`
- **Frontend**: `npm ci` with `frontend/package-lock.json`

#### 5.1. Required GitHub secrets

Add these secrets in **GitHub → Settings → Secrets and variables → Actions**:

- `FLY_API_TOKEN` – from `fly auth token`
- `VERCEL_TOKEN` – create at `https://vercel.com/account/tokens`
- `VERCEL_ORG_ID` – from Vercel project settings
- `VERCEL_PROJECT_ID` – from Vercel project settings

The workflow will:

- Deploy the backend using `flyctl deploy` with the existing `backend/fly.toml`.
- Deploy the frontend using a pinned Vercel CLI (`vercel@39.1.1`).

#### 5.2. Manual CI-style checks

You can run the same checks locally:

```bash
# Backend
cd backend
uv sync --frozen
just lint
just test

# Frontend
cd ../frontend
npm ci
npm run lint
npm run build
```

---

### 6. Final Success Criteria Checklist

- `https://prompt-studio.willtech3.com` loads the SPA served by Vercel.
- All `/api/...` calls from the frontend succeed via Vercel → Fly.io rewrites (no CORS warnings).
- Fly deploys run the Alembic migrations and seed provider content successfully (DB populated).
- Neon Postgres uses `sslmode=require` and the connection string matches `postgresql+asyncpg://...`.
- CI pipeline runs **lint**, **test**, and then **deploy** stages on `main` pushes.



