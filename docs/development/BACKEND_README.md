# Prompt Studio Backend

FastAPI backend for Prompt Engineering Studio, built with Python 3.13+ and uv package management.

## Tech Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy (async)
- **Authentication**: JWT tokens
- **Package Manager**: uv
- **Python Version**: 3.13+
- **API Integration**: OpenRouter for AI models

## Quick Start

### Prerequisites
- Python 3.13+
- uv package manager
- PostgreSQL 16
- OpenRouter API key

### Installation

1. **Install uv**:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Set up Python environment**:
```bash
uv python install 3.13
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**:
```bash
uv pip install -e ".[dev]"
```

4. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials and OpenRouter API key
```

5. **Set up database**:
```bash
# Create database (if not exists)
createdb prompt_studio

# Run migrations
alembic upgrade head
```

6. **Start the server**:
```bash
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── api/
│   │   └── v1/
│   │       ├── router.py  # API router
│   │       └── endpoints/ # API endpoints
│   ├── core/
│   │   ├── config.py      # Settings management
│   │   ├── security.py    # Auth & security
│   │   └── database.py    # Database setup
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── alembic/               # Database migrations
├── tests/                 # Test suite
├── pyproject.toml         # Project dependencies
├── .python-version        # Python version (3.13)
└── .env.example           # Environment template
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user info

### Prompts
- `GET /api/v1/prompts` - List user prompts
- `POST /api/v1/prompts` - Create prompt
- `GET /api/v1/prompts/{id}` - Get prompt
- `PUT /api/v1/prompts/{id}` - Update prompt
- `DELETE /api/v1/prompts/{id}` - Delete prompt

### Execution
- `POST /api/v1/execute` - Execute prompt with model
- `GET /api/v1/executions` - List executions
- `GET /api/v1/executions/{id}` - Get execution details

### Models
- `GET /api/v1/models` - List available models
- `GET /api/v1/models/{id}` - Get model details

## Development

### Code Formatting
```bash
black app/ tests/
ruff check app/ tests/
```

### Type Checking
```bash
mypy app/
```

### Testing
```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=app

# Specific test file
pytest tests/test_auth.py -v
```

### Database Migrations

Create new migration:
```bash
alembic revision --autogenerate -m "Description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback migration:
```bash
alembic downgrade -1
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `CORS_ORIGINS` - Allowed CORS origins
- `LOG_LEVEL` - Logging level (debug/info/warning/error)

## API Documentation

When the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Common Commands

```bash
# Start development server
uvicorn app.main:app --reload

# Create new migration
alembic revision --autogenerate -m "Add new table"

# Run tests
pytest

# Format code
black app/

# Lint code
ruff check app/

# Type check
mypy app/

# Install new package
uv pip install package-name

# Update dependencies
uv pip compile pyproject.toml -o requirements.txt
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U prompt_admin -d prompt_studio
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Python Version Issues
```bash
# Check Python version
python --version

# Reinstall with uv
uv python install 3.13
uv venv --python 3.13
```

## Security Notes

- Always use environment variables for secrets
- Never commit `.env` file
- Use strong SECRET_KEY in production
- Enable HTTPS in production
- Implement rate limiting for API endpoints
- Validate and sanitize all inputs
- Use parameterized queries (SQLAlchemy does this)

## License

MIT