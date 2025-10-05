# PostgreSQL Documentation for Prompt Engineering Studio

## Overview
PostgreSQL 16 is chosen as the database for this project due to its:
- Excellent JSON/JSONB support for storing model responses
- Full-text search capabilities
- Strong ACID compliance
- Advanced indexing options
- Excellent performance with proper optimization
- Native support for arrays and complex data types

## Installation

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu/Debian
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install postgresql-16
```

### Docker
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: prompt_studio_db
    environment:
      POSTGRES_USER: prompt_admin
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: prompt_studio
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

volumes:
  postgres_data:
```

## Database Configuration

### Connection String
```python
# .env
DATABASE_URL=postgresql://prompt_admin:password@localhost:5432/prompt_studio
```

### SQLAlchemy Configuration
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os

DATABASE_URL = os.getenv("DATABASE_URL")

# For async operations
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

### Async Configuration with asyncpg
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async_engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_size=20,
    max_overflow=40,
)

AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

## Database Schema

### Complete Schema Definition
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    openrouter_api_key TEXT,  -- Encrypted
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Model configurations
CREATE TABLE model_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR(255) NOT NULL UNIQUE,
    model_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    context_length INTEGER,
    max_tokens INTEGER,
    supports_streaming BOOLEAN DEFAULT true,
    supports_functions BOOLEAN DEFAULT false,
    pricing JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    best_practices JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prompts table with versioning
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    system_prompt TEXT,
    variables JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prompt executions
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    model_config_id UUID NOT NULL REFERENCES model_configs(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_variables JSONB DEFAULT '{}',
    request_payload JSONB NOT NULL,
    response_data JSONB NOT NULL,
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,
    cost_estimate DECIMAL(10, 6),
    execution_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evaluations
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluation_template_id UUID REFERENCES evaluation_templates(id),
    evaluation_criteria JSONB NOT NULL,
    scores JSONB NOT NULL,
    automated_feedback JSONB DEFAULT '{}',
    human_feedback TEXT,
    overall_score DECIMAL(5, 2),
    passed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evaluation templates
CREATE TABLE evaluation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    scoring_rubric JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- A/B Tests
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_prompt_id UUID NOT NULL REFERENCES prompts(id),
    variant_b_prompt_id UUID NOT NULL REFERENCES prompts(id),
    model_config_id UUID REFERENCES model_configs(id),
    evaluation_template_id UUID REFERENCES evaluation_templates(id),
    sample_size INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'draft',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Prompt templates library
CREATE TABLE prompt_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    model_recommendations TEXT[],
    use_cases TEXT,
    is_official BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance
```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Project indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Prompt indexes
CREATE INDEX idx_prompts_project_id ON prompts(project_id);
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_parent_id ON prompts(parent_id) WHERE parent_id IS NOT NULL;

-- Full-text search on prompts
CREATE INDEX idx_prompts_content_fts ON prompts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_prompts_title_trgm ON prompts USING GIN(title gin_trgm_ops);

-- Execution indexes
CREATE INDEX idx_executions_prompt_id ON executions(prompt_id);
CREATE INDEX idx_executions_user_id ON executions(user_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX idx_executions_model_config ON executions(model_config_id);

-- Evaluation indexes
CREATE INDEX idx_evaluations_execution_id ON evaluations(execution_id);
CREATE INDEX idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX idx_evaluations_overall_score ON evaluations(overall_score);

-- JSONB indexes for better query performance
CREATE INDEX idx_prompts_variables ON prompts USING GIN(variables);
CREATE INDEX idx_executions_response ON executions USING GIN(response_data);
CREATE INDEX idx_users_settings ON users USING GIN(settings);
```

### Triggers for Updated Timestamps
```sql
-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_configs_updated_at BEFORE UPDATE ON model_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_templates_updated_at BEFORE UPDATE ON evaluation_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## SQLAlchemy Models

```python
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    Text, DECIMAL, JSON, ARRAY, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    openrouter_api_key = Column(Text)
    settings = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    prompts = relationship("Prompt", back_populates="user", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="user")
    evaluations = relationship("Evaluation", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint('user_id', 'name'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    settings = Column(JSONB, default={})
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    prompts = relationship("Prompt", back_populates="project", cascade="all, delete-orphan")

class Prompt(Base):
    __tablename__ = "prompts"
    __table_args__ = (
        Index('idx_prompts_content_fts', 'content'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    system_prompt = Column(Text)
    variables = Column(JSONB, default=[])
    tags = Column(ARRAY(String), default=[])
    version = Column(Integer, default=1)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("prompts.id"))
    is_template = Column(Boolean, default=False)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="prompts")
    user = relationship("User", back_populates="prompts")
    executions = relationship("Execution", back_populates="prompt")
    parent = relationship("Prompt", remote_side=[id])
```

## Query Examples

### 1. Full-Text Search
```python
from sqlalchemy import text

async def search_prompts(search_term: str, db: AsyncSession):
    query = text("""
        SELECT id, title, content,
               ts_rank(to_tsvector('english', content), plainto_tsquery(:search)) AS rank
        FROM prompts
        WHERE to_tsvector('english', content) @@ plainto_tsquery(:search)
        ORDER BY rank DESC
        LIMIT 20
    """)

    result = await db.execute(query, {"search": search_term})
    return result.fetchall()
```

### 2. JSONB Queries
```python
# Query prompts with specific variables
prompts_with_var = await db.execute(
    select(Prompt).where(
        Prompt.variables.contains([{"name": "company_name"}])
    )
)

# Update user settings
await db.execute(
    update(User)
    .where(User.id == user_id)
    .values(settings=func.jsonb_set(User.settings, '{theme}', '"dark"'))
)
```

### 3. Window Functions
```sql
-- Get prompt versions with rank
WITH prompt_versions AS (
    SELECT
        id,
        title,
        version,
        parent_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(parent_id, id) ORDER BY version DESC) as version_rank
    FROM prompts
    WHERE user_id = :user_id
)
SELECT * FROM prompt_versions WHERE version_rank = 1;
```

### 4. Aggregate Statistics
```python
async def get_user_statistics(user_id: UUID, db: AsyncSession):
    query = text("""
        SELECT
            COUNT(DISTINCT p.id) as total_prompts,
            COUNT(DISTINCT e.id) as total_executions,
            SUM(e.tokens_total) as total_tokens,
            SUM(e.cost_estimate) as total_cost,
            AVG(e.execution_time_ms) as avg_execution_time,
            COUNT(DISTINCT e.model_config_id) as models_used
        FROM users u
        LEFT JOIN prompts p ON u.id = p.user_id
        LEFT JOIN executions e ON p.id = e.prompt_id
        WHERE u.id = :user_id
        GROUP BY u.id
    """)

    result = await db.execute(query, {"user_id": user_id})
    return result.fetchone()
```

## Migrations with Alembic

### Initialize Alembic
```bash
alembic init alembic
```

### Configuration
```python
# alembic.ini
sqlalchemy.url = postgresql://user:pass@localhost/dbname

# alembic/env.py
from app.models import Base
target_metadata = Base.metadata
```

### Create Migration
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Backup and Restore

### Backup Database
```bash
# Full backup
pg_dump -U prompt_admin -d prompt_studio > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U prompt_admin -d prompt_studio | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Custom format (allows parallel restore)
pg_dump -U prompt_admin -d prompt_studio -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore Database
```bash
# From SQL file
psql -U prompt_admin -d prompt_studio < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -U prompt_admin -d prompt_studio

# From custom format
pg_restore -U prompt_admin -d prompt_studio -j 4 backup.dump
```

## Performance Optimization

### 1. Connection Pooling
```python
# Use pgbouncer for connection pooling
# pgbouncer.ini
[databases]
prompt_studio = host=localhost port=5432 dbname=prompt_studio

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### 2. Query Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT p.*, COUNT(e.id) as execution_count
FROM prompts p
LEFT JOIN executions e ON p.id = e.prompt_id
WHERE p.user_id = 'user-uuid'
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Update statistics
ANALYZE prompts;
ANALYZE executions;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

### 3. Monitoring
```sql
-- Check slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Security Best Practices

### 1. Encryption
```python
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self, key: str):
        self.cipher = Fernet(key.encode())

    def encrypt(self, text: str) -> str:
        return self.cipher.encrypt(text.encode()).decode()

    def decrypt(self, encrypted_text: str) -> str:
        return self.cipher.decrypt(encrypted_text.encode()).decode()
```

### 2. Row-Level Security
```sql
-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY user_prompts ON prompts
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

### 3. Audit Logging
```python
async def log_action(
    db: AsyncSession,
    user_id: UUID,
    action: str,
    resource_type: str,
    resource_id: UUID,
    details: dict
):
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host,
        user_agent=request.headers.get("User-Agent")
    )
    db.add(audit_log)
    await db.commit()
```

## Resources
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)