"""Tests for email/password registration and login endpoints."""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Patch create_all before importing app so it doesn't try to connect to the DB
with patch("app.core.database.engine") as _mock_engine:
    _mock_engine.begin = MagicMock(return_value=MagicMock(__enter__=MagicMock(), __exit__=MagicMock()))
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db

from app.core.password import hash_password, verify_password
from app.core.rate_limiter import is_account_locked, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES
from tests.factories import make_user

VALID_RUT = "12.345.678-9"
VALID_REGISTER = {
    "email": "nuevo@ejemplo.cl",
    "password": "clave_segura_123",
    "confirm_password": "clave_segura_123",
    "first_name": "Diego",
    "last_name": "González",
    "rut": VALID_RUT,
}


@pytest.fixture
def client(mock_db):
    """Unauthenticated client with DB override."""
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Password utilities ──────────────────────────────────────────────────────


class TestPasswordUtils:
    def test_hash_and_verify(self):
        hashed = hash_password("mi_clave_segura")
        assert verify_password("mi_clave_segura", hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("correcta")
        assert not verify_password("incorrecta", hashed)

    def test_hash_is_not_plaintext(self):
        password = "mi_clave_segura"
        hashed = hash_password(password)
        assert hashed != password


# ── POST /auth/register ─────────────────────────────────────────────────────


class TestRegister:
    @patch("app.routers.auth.create_user")
    @patch("app.routers.auth.get_user_by_rut")
    @patch("app.routers.auth.get_user_by_email")
    def test_register_success(self, mock_get_email, mock_get_rut, mock_create, client):
        mock_get_email.return_value = None
        mock_get_rut.return_value = None
        user = make_user(email="nuevo@ejemplo.cl", first_name="Diego", last_name="González", rut=VALID_RUT)
        mock_create.return_value = user

        res = client.post("/auth/register", json=VALID_REGISTER)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "nuevo@ejemplo.cl"
        assert data["user"]["rut"] == VALID_RUT

    @patch("app.routers.auth.get_user_by_email")
    def test_register_duplicate_email(self, mock_get_email, client):
        mock_get_email.return_value = make_user(email="existe@ejemplo.cl")

        res = client.post("/auth/register", json={**VALID_REGISTER, "email": "existe@ejemplo.cl"})
        assert res.status_code == 409
        assert "email" in res.json()["detail"].lower()

    @patch("app.routers.auth.get_user_by_rut")
    @patch("app.routers.auth.get_user_by_email")
    def test_register_duplicate_rut(self, mock_get_email, mock_get_rut, client):
        mock_get_email.return_value = None
        mock_get_rut.return_value = make_user(rut=VALID_RUT)

        res = client.post("/auth/register", json=VALID_REGISTER)
        assert res.status_code == 409
        assert "rut" in res.json()["detail"].lower()

    def test_register_password_mismatch(self, client):
        res = client.post("/auth/register", json={
            **VALID_REGISTER,
            "confirm_password": "otra_clave_456",
        })
        assert res.status_code == 422

    def test_register_weak_password(self, client):
        res = client.post("/auth/register", json={
            **VALID_REGISTER,
            "password": "corta",
            "confirm_password": "corta",
        })
        assert res.status_code == 422

    def test_register_missing_rut(self, client):
        payload = {k: v for k, v in VALID_REGISTER.items() if k != "rut"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 422

    def test_register_invalid_rut_format(self, client):
        res = client.post("/auth/register", json={**VALID_REGISTER, "rut": "12345678-9"})
        assert res.status_code == 422


# ── POST /auth/login ────────────────────────────────────────────────────────


class TestLogin:
    @patch("app.routers.auth.reset_failed_logins")
    @patch("app.routers.auth.get_user_by_email")
    def test_login_success(self, mock_get_email, mock_reset, client):
        hashed = hash_password("clave_segura_123")
        user = make_user(email="diego@ejemplo.cl", password_hash=hashed)
        mock_get_email.return_value = user

        res = client.post("/auth/login", json={
            "email": "diego@ejemplo.cl",
            "password": "clave_segura_123",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "diego@ejemplo.cl"
        mock_reset.assert_called_once()

    @patch("app.routers.auth.record_failed_login")
    @patch("app.routers.auth.get_user_by_email")
    def test_login_wrong_password_records_failure(self, mock_get_email, mock_record, client):
        hashed = hash_password("clave_correcta")
        user = make_user(email="diego@ejemplo.cl", password_hash=hashed)
        mock_get_email.return_value = user

        res = client.post("/auth/login", json={
            "email": "diego@ejemplo.cl",
            "password": "clave_incorrecta",
        })
        assert res.status_code == 401
        mock_record.assert_called_once()

    @patch("app.routers.auth.get_user_by_email")
    def test_login_nonexistent_email(self, mock_get_email, client):
        mock_get_email.return_value = None

        res = client.post("/auth/login", json={
            "email": "noexiste@ejemplo.cl",
            "password": "clave_segura_123",
        })
        assert res.status_code == 401
        assert "incorrectas" in res.json()["detail"].lower()


# ── Account lockout ─────────────────────────────────────────────────────────


class TestAccountLockout:
    @patch("app.routers.auth.get_user_by_email")
    def test_locked_account_returns_423(self, mock_get_email, client):
        user = make_user(email="locked@ejemplo.cl", password_hash="anything")
        user.failed_login_attempts = MAX_FAILED_ATTEMPTS
        user.last_failed_login_at = datetime.now(timezone.utc)
        mock_get_email.return_value = user

        res = client.post("/auth/login", json={
            "email": "locked@ejemplo.cl",
            "password": "cualquier_clave",
        })
        assert res.status_code == 423
        assert "bloqueada" in res.json()["detail"].lower()

    def test_is_account_locked_under_threshold(self):
        user = make_user()
        user.failed_login_attempts = MAX_FAILED_ATTEMPTS - 1
        user.last_failed_login_at = datetime.now(timezone.utc)
        assert is_account_locked(user) is False

    def test_is_account_locked_at_threshold(self):
        user = make_user()
        user.failed_login_attempts = MAX_FAILED_ATTEMPTS
        user.last_failed_login_at = datetime.now(timezone.utc)
        assert is_account_locked(user) is True

    def test_lockout_expires_after_duration(self):
        user = make_user()
        user.failed_login_attempts = MAX_FAILED_ATTEMPTS
        user.last_failed_login_at = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_DURATION_MINUTES + 1)
        assert is_account_locked(user) is False

    @patch("app.routers.auth.reset_failed_logins")
    @patch("app.routers.auth.get_user_by_email")
    def test_successful_login_after_lockout_expires(self, mock_get_email, mock_reset, client):
        """After lockout expires, user can login again."""
        hashed = hash_password("clave_correcta")
        user = make_user(email="recovered@ejemplo.cl", password_hash=hashed)
        user.failed_login_attempts = MAX_FAILED_ATTEMPTS
        user.last_failed_login_at = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_DURATION_MINUTES + 1)
        mock_get_email.return_value = user

        res = client.post("/auth/login", json={
            "email": "recovered@ejemplo.cl",
            "password": "clave_correcta",
        })
        assert res.status_code == 200
        mock_reset.assert_called_once()
