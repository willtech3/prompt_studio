# Development Setup Guide

## Prerequisites

### Required Software
- **Python 3.13+**
- **Node.js 20+**
- **PostgreSQL 16**
- **uv** (Python package manager)
- **Git**

### Optional but Recommended
- **Docker Desktop** (for containerized development)
- **VSCode** with extensions:
  - Python
  - Pylance
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

## Quick Start (Using Docker)

```bash
# Clone the repository
git clone <repository-url>
cd prompt_studio

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your OpenRouter API key

# Start everything with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Access applications
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# Database: localhost:5432
```

## Manual Setup

### 1. Install Python 3.13+ with uv

#### macOS/Linux
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Create Python 3.13 environment
uv python install 3.13
```

#### Windows
```powershell
# Install uv
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Create Python 3.13 environment
uv python install 3.13
```

### 2. Install PostgreSQL

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16

# Create database and user
psql postgres
CREATE USER prompt_admin WITH PASSWORD 'your_password';
CREATE DATABASE prompt_studio OWNER prompt_admin;
GRANT ALL PRIVILEGES ON DATABASE prompt_studio TO prompt_admin;
\q
```

#### Ubuntu/Debian
```bash
# Add PostgreSQL APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update

# Install PostgreSQL
sudo apt-get install postgresql-16

# Create database and user
sudo -u postgres psql
CREATE USER prompt_admin WITH PASSWORD 'your_password';
CREATE DATABASE prompt_studio OWNER prompt_admin;
GRANT ALL PRIVILEGES ON DATABASE prompt_studio TO prompt_admin;
\q
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### 3. Backend Setup

```bash
cd backend

# Create virtual environment with uv
uv venv

# Activate virtual environment
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Create pyproject.toml if not exists
cat > pyproject.toml << 'EOF'
[project]
name = "prompt-studio-backend"
version = "0.1.0"
description = "Backend API for Prompt Engineering Studio"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0.35",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.5.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.12",
    "httpx>=0.27.2",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=5.0.0",
    "black>=24.0.0",
    "ruff>=0.7.0",
    "mypy>=1.12.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 88
target-version = "py313"

[tool.black]
line-length = 88
target-version = ["py313"]

[tool.mypy]
python_version = "3.13"
warn_return_any = true
warn_unused_configs = true
EOF

# Install dependencies
uv pip install -e ".[dev]"

# Create .env file
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql+asyncpg://prompt_admin:your_password@localhost:5432/prompt_studio

# Security
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Server
HOST=0.0.0.0
PORT=8000
RELOAD=true
LOG_LEVEL=info

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
EOF

# Edit .env with your actual values
echo "Edit backend/.env with your actual database password and OpenRouter API key"

# Initialize Alembic
alembic init alembic

# Update alembic.ini with your database URL
sed -i '' 's|sqlalchemy.url = driver://user:pass@localhost/dbname|sqlalchemy.url = postgresql://prompt_admin:your_password@localhost/prompt_studio|' alembic.ini

# Create initial app structure
mkdir -p app/api/v1/endpoints
mkdir -p app/models
mkdir -p app/schemas
mkdir -p app/services
mkdir -p app/core

# Create main.py
cat > app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="Prompt Engineering Studio API",
    description="API for managing and executing AI prompts",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Prompt Engineering Studio API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
EOF

# Run migrations (after creating them)
# alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend

# Create React app with Vite
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install axios @tanstack/react-query zustand react-router-dom
npm install -D @types/node tailwindcss postcss autoprefixer

# Initialize Tailwind CSS
npx tailwindcss init -p

# Update tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Update src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Prompt Engineering Studio
EOF

# Start the frontend development server
npm run dev
```

## Running the Full Stack

### Terminal 1: Database
```bash
# If using Docker
docker run --name prompt-studio-db \
  -e POSTGRES_USER=prompt_admin \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=prompt_studio \
  -p 5432:5432 \
  -d postgres:16-alpine

# Or use existing PostgreSQL installation
```

### Terminal 2: Backend
```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

## Verify Everything Works

### 1. Check Backend Health
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### 2. Check Frontend
Open http://localhost:5173 in your browser

### 3. Check Database Connection
```bash
cd backend
source .venv/bin/activate
python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://prompt_admin:your_password@localhost/prompt_studio')
conn = engine.connect()
print('Database connected successfully!')
conn.close()
"
```

## Development Workflow

### 1. Backend Development
```bash
# Format code
black app/

# Lint code
ruff check app/

# Type checking
mypy app/

# Run tests
pytest tests/ -v

# Create new migration
alembic revision --autogenerate -m "Description of change"

# Apply migrations
alembic upgrade head
```

### 2. Frontend Development
```bash
# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### 3. Database Management
```bash
# Connect to database
psql -U prompt_admin -d prompt_studio

# Backup database
pg_dump -U prompt_admin prompt_studio > backup.sql

# Restore database
psql -U prompt_admin prompt_studio < backup.sql

# Reset database (CAUTION: Deletes all data)
dropdb -U prompt_admin prompt_studio
createdb -U prompt_admin prompt_studio
cd backend && alembic upgrade head
```

## Common Issues and Solutions

### Issue: Port already in use
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue: Database connection refused
```bash
# Check if PostgreSQL is running
pg_isready  # macOS/Linux
pg_ctl status  # Windows

# Start PostgreSQL
brew services start postgresql@16  # macOS
sudo systemctl start postgresql  # Linux
# Use Services app on Windows
```

### Issue: Python version conflicts
```bash
# Ensure using Python 3.13+
python --version

# If wrong version, use uv to set correct version
uv python pin 3.13
uv venv --python 3.13
```

### Issue: Node modules issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Environment Variables Reference

### Backend (.env)
```ini
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname

# Security
SECRET_KEY=generate-a-secure-random-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Server
HOST=0.0.0.0
PORT=8000
RELOAD=true
LOG_LEVEL=info

# CORS
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend (.env)
```ini
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Prompt Engineering Studio
```

## Docker Compose Setup

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: prompt-studio-db
    environment:
      POSTGRES_USER: prompt_admin
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: prompt_studio
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prompt_admin"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: prompt-studio-backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://prompt_admin:your_password@postgres:5432/prompt_studio
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    container_name: prompt-studio-frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host

volumes:
  postgres_data:
```

## Production Deployment Checklist

- [ ] Set strong SECRET_KEY
- [ ] Use environment-specific .env files
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure rate limiting
- [ ] Set up CI/CD pipeline
- [ ] Document API with OpenAPI/Swagger

## Useful Commands

```bash
# Backend
uv pip list              # List installed packages
uv pip install package   # Install new package
uv pip sync             # Sync with pyproject.toml

# Frontend
npm list                # List installed packages
npm outdated           # Check for updates
npm update             # Update packages

# Database
psql -U prompt_admin -d prompt_studio  # Connect to DB
\dt                    # List tables
\d table_name          # Describe table
\q                     # Quit psql

# Docker
docker-compose up -d   # Start all services
docker-compose down    # Stop all services
docker-compose logs -f # View logs
docker-compose exec backend bash  # Shell into container
```

## Support

If you encounter issues:
1. Check the logs (backend, frontend, database)
2. Verify all environment variables are set
3. Ensure all services are running
4. Check network connectivity
5. Review error messages carefully

Happy coding! 🚀