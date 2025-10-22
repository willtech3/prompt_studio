# Refactor main.py into Router-Based Architecture

## Current State

`backend/app/main.py` is 829 lines containing:

- Configuration and app initialization (lines 1-71)
- Chat streaming endpoint with tool calling (lines 73-451, **378 lines**)
- Model catalog endpoints (lines 454-481)
- Provider content endpoints (lines 484-577)
- Prompt optimization endpoint with constants (lines 580-750)
- Snapshot/save CRUD endpoints (lines 753-829)

## Proposed Structure

### 1. Keep Minimal in `app/main.py`

- FastAPI app initialization
- Middleware setup (CORS)
- Router registration (include all new routers)
- Health endpoint (keep simple)
- Environment loading function

### 2. Create `app/routers/` directory with domain-specific routers

**app/routers/chat.py** (~400 lines)

- `GET /api/chat/stream` endpoint
- `parse_time_constraints()` helper function (used only by chat)
- All chat-related Pydantic models if needed

**app/routers/models.py** (~30 lines)

- `GET /api/models` - List models
- `GET /api/models/{model_path:path}/info` - Model details
- `POST /api/models/refresh` - Refresh catalog

**app/routers/providers.py** (~100 lines)

- `GET /api/providers` - List providers
- `GET /api/providers/{provider_id}/guide` - Optimization guide
- `GET /api/providers/{provider_id}/prompting-guides` - Prompting guides

**app/routers/optimize.py** (~180 lines)

- `POST /api/optimize` endpoint
- `OptimizeRequest` and `OptimizeResponse` models
- Import constants from new config module

**app/routers/saves.py** (~80 lines)

- `POST /api/saves` - Create save
- `GET /api/saves` - List saves
- `GET /api/saves/{sid}` - Get save by ID
- `SaveRequest`, `SaveResponse`, `SaveItem` models

### 3. Create `app/config/optimization_prompts.py`

- `META_PROMPT` constant (OpenAI's meta-prompt)
- `PROVIDER_HINTS` dictionary (provider-specific optimization hints)

### 4. Update imports throughout routers

Each router will need:

```python
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from config.db import get_session, create_all, try_get_session
# + domain-specific imports
```

## Benefits

- **Modularity**: Each domain is isolated and independently testable
- **Maintainability**: Easier to find and modify specific functionality
- **Scalability**: Can add new routers without touching existing code
- **FastAPI Best Practice**: Standard pattern for larger applications
- **Reduced Cognitive Load**: ~80-180 lines per file vs 829 lines

## File Size Reduction

- `main.py`: 829 → ~100 lines (87% reduction)
- Clear separation of concerns
- Each router is focused on a single domain

## Implementation Steps

1. Create app/routers/ directory with __init__.py
2. Create app/config/optimization_prompts.py with META_PROMPT and PROVIDER_HINTS constants
3. Extract chat endpoint and parse_time_constraints to app/routers/chat.py
4. Extract model endpoints to app/routers/models.py
5. Extract provider endpoints to app/routers/providers.py
6. Extract optimization endpoint to app/routers/optimize.py with models
7. Extract saves endpoints to app/routers/saves.py with models
8. Refactor main.py to minimal app initialization and router registration
9. Test all endpoints work correctly after refactoring using Bruno collection





