# FastAPI Documentation

## Overview
FastAPI is a modern, fast (high-performance), web framework for building APIs with Python based on standard Python type hints.

## Key Features
- **Very high performance**: On par with NodeJS and Go (thanks to Starlette and Pydantic)
- **Fast to code**: Increase development speed by 200% to 300%
- **Fewer bugs**: Reduce about 40% of human (developer) induced errors
- **Intuitive**: Great editor support with completion everywhere
- **Easy**: Designed to be easy to use and learn
- **Short**: Minimize code duplication
- **Robust**: Get production-ready code with automatic interactive documentation
- **Standards-based**: Based on OpenAPI and JSON Schema

## Installation

```bash
pip install fastapi
pip install "uvicorn[standard]"
```

## Quick Start

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    is_offer: bool = False

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.post("/items/")
def create_item(item: Item):
    return item
```

Run the server:
```bash
uvicorn main:app --reload
```

## Best Practices for 2025

### 1. Async/Await Usage
FastAPI is an async framework by design. Use async operations for I/O-bound tasks:

```python
@app.get("/async-endpoint")
async def async_endpoint():
    # Use async operations for database queries, API calls, etc.
    result = await some_async_operation()
    return result
```

**Important**: If you define a route as async, ensure all operations within are non-blocking. Blocking operations in async routes will freeze the event loop.

### 2. Dependency Injection
Use FastAPI's dependency injection system for reusable components:

```python
from fastapi import Depends

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/")
async def read_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

Dependencies are cached within a request scope, preventing unnecessary recalculation.

### 3. Pydantic Models
Use Pydantic models for request/response validation:

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    age: Optional[int] = Field(None, ge=0, le=120)

    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email')
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode
```

### 4. Error Handling
Implement comprehensive error handling:

```python
from fastapi import HTTPException, status

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id not in items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return items[item_id]
```

### 5. Security
Implement OAuth 2.0 with JWT tokens:

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username
```

### 6. Database Integration with SQLAlchemy

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
```

### 7. Background Tasks

```python
from fastapi import BackgroundTasks

def send_email(email: str, message: str):
    # Send email logic
    pass

@app.post("/send-notification/")
async def send_notification(
    email: str,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(send_email, email, "Notification message")
    return {"message": "Notification sent"}
```

### 8. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 9. Request Validation

```python
from fastapi import Query, Path, Body

@app.get("/items/")
async def read_items(
    q: str = Query(None, min_length=3, max_length=50, regex="^fixedquery$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    return {"q": q, "skip": skip, "limit": limit}

@app.put("/items/{item_id}")
async def update_item(
    item_id: int = Path(..., ge=1),
    item: Item = Body(..., embed=True)
):
    return {"item_id": item_id, "item": item}
```

### 10. Testing

```python
from fastapi.testclient import TestClient
import pytest

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}

@pytest.mark.asyncio
async def test_async_endpoint():
    response = client.get("/async-endpoint")
    assert response.status_code == 200
```

## Project Structure

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app instance
│   ├── config.py         # Configuration settings
│   ├── dependencies.py   # Shared dependencies
│   ├── middleware.py     # Custom middleware
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── users.py
│   │   │   │   └── items.py
│   │   │   └── router.py
│   │   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py
│   │   └── config.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   │
│   ├── schemas/
│   │   ├─��� __init__.py
│   │   ├── user.py
│   │   └── item.py
│   │
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   │
│   └── db/
│       ├── __init__.py
│       ├── base.py
│       └── session.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_api/
│       ├── __init__.py
│       └── test_users.py
│
├── alembic/           # Database migrations
├── requirements.txt
├── .env
└── docker-compose.yml
```

## Performance Optimization

### 1. Use Connection Pooling
```python
from sqlalchemy.pool import NullPool

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,  # For async, use NullPool
)
```

### 2. Implement Caching
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backend.redis import RedisBackend
from fastapi_cache.decorator import cache

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

@app.get("/cached-endpoint")
@cache(expire=60)
async def cached_endpoint():
    return {"data": "This will be cached for 60 seconds"}
```

### 3. Use Pagination
```python
from typing import List

@app.get("/items/", response_model=List[ItemResponse])
async def read_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = db.query(Item).offset(skip).limit(limit).all()
    return items
```

## Deployment

### Production Server with Gunicorn
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker Configuration
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Monitoring and Logging

```python
import logging
from fastapi import Request
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s"
    )
    return response
```

## Additional Resources
- [Official FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI GitHub Repository](https://github.com/tiangolo/fastapi)
- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Awesome FastAPI](https://github.com/mjhea0/awesome-fastapi)