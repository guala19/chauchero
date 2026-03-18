import os

# Override settings before any app import — prevents connecting to real DB
os.environ["DATABASE_URL"] = "postgresql://chauchero:dev_password_change_in_prod@localhost:5432/chauchero_db"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-minimum-32-chars!!")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

import pytest
from unittest.mock import MagicMock
from app.parsers.banco_chile import BancoChileParser


@pytest.fixture
def parser():
    return BancoChileParser()


@pytest.fixture
def mock_db():
    """Mock SQLAlchemy session for unit tests."""
    db = MagicMock()
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.refresh = MagicMock()
    db.add = MagicMock()
    return db
