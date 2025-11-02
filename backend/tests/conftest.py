# ruff: noqa: I001
import os

from fastapi.testclient import TestClient
import pytest

# Ensure DB is optional in tests unless explicitly configured
os.environ.setdefault("DATABASE_URL", "")

from app.main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


