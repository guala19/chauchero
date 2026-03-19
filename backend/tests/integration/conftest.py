"""
Integration test configuration.

Uses a real PostgreSQL database (chauchero_test) isolated from the dev DB.
All tables are truncated between tests to ensure isolation.

Requirements:
  - PostgreSQL running (same instance as dev, port 5432)
  - Run with: pytest tests/integration/ -v
"""

import os
import pytest
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Read DATABASE_URL directly from .env — do not trust os.environ here
# because tests/conftest.py overwrites it with a mock value for unit tests.
_env_file = Path(__file__).parents[2] / ".env"
_BASE_URL = ""
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL="):
            _BASE_URL = line.partition("=")[2].strip()
            break

if not _BASE_URL:
    _BASE_URL = os.environ.get("DATABASE_URL", "")

assert _BASE_URL, "DATABASE_URL not found — check backend/.env"

# Replace the DB name with chauchero_test
_TEST_DB_URL = _BASE_URL.rsplit("/", 1)[0] + "/chauchero_test"

os.environ["DATABASE_URL"] = _TEST_DB_URL


@pytest.fixture(scope="session")
def test_engine():
    """Create the test database and apply migrations once per session."""
    _is_ci = os.environ.get("CI") == "true"

    if not _is_ci:
        # Local dev: create test DB if it doesn't exist
        admin_url = _BASE_URL.rsplit("/", 1)[0] + "/postgres"
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = 'chauchero_test'")
            ).fetchone()
            if not exists:
                conn.execute(text("CREATE DATABASE chauchero_test"))
        admin_engine.dispose()

    if not _is_ci:
        # Local dev: run alembic migrations
        import subprocess, sys
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            env={**os.environ, "DATABASE_URL": _TEST_DB_URL},
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        )
        assert result.returncode == 0, f"Alembic failed:\n{result.stderr}"
    # In CI: DB and migrations are handled by the workflow before pytest runs

    engine = create_engine(_TEST_DB_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def db(test_engine):
    """Provide a clean DB session. Truncates all tables after each test."""
    Session = sessionmaker(bind=test_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        # Truncate all user data tables in reverse FK order
        with test_engine.connect() as conn:
            conn.execute(text("TRUNCATE transactions, bank_accounts, users RESTART IDENTITY CASCADE"))
            conn.commit()
