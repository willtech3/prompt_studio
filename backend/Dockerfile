FROM python:3.13-slim

# Ensure Python behaves reasonably in containers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (for asyncpg/psycopg and tooling)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Install uv (Python package/dependency manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

# Copy dependency metadata first for better Docker layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies using locked versions (no dev deps in image)
RUN uv sync --frozen --no-dev

# Copy the rest of the backend application code
COPY . /app

# Expose the port that Fly will route to
ENV PORT=8080
EXPOSE 8080

# Default command: run FastAPI with Uvicorn
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]


