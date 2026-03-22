"""Tests for email verification and password reset endpoints."""

import pytest
from unittest.mock import patch, MagicMock

with patch("app.core.database.engine") as _mock_engine:
    _mock_engine.begin = MagicMock(return_value=MagicMock(__enter__=MagicMock(), __exit__=MagicMock()))
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db

from app.core.password import hash_password
from app.core.email_service import create_verification_token, create_reset_token
from app.core.security import create_access_token
from tests.factories import make_user


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── POST /auth/verify-email ─────────────────────────────────────────────────


class TestVerifyEmail:
    @patch("app.routers.auth.get_user_by_rut")
    def test_verify_email_success(self, mock_get_rut, client):
        user = make_user(rut="12.345.678-9")
        mock_get_rut.return_value = user
        token = create_verification_token("12.345.678-9")

        res = client.post(f"/auth/verify-email?token={token}")
        assert res.status_code == 200
        assert "verificado" in res.json()["message"].lower()

    def test_verify_email_invalid_token(self, client):
        res = client.post("/auth/verify-email?token=invalid.token.here")
        assert res.status_code == 400

    def test_verify_email_wrong_purpose(self, client):
        """A password reset token should not verify email."""
        token = create_reset_token("12.345.678-9")
        res = client.post(f"/auth/verify-email?token={token}")
        assert res.status_code == 400

    @patch("app.routers.auth.get_user_by_rut")
    def test_already_verified_returns_ok(self, mock_get_rut, client):
        user = make_user(rut="12.345.678-9")
        user.email_verified = True
        mock_get_rut.return_value = user
        token = create_verification_token("12.345.678-9")

        res = client.post(f"/auth/verify-email?token={token}")
        assert res.status_code == 200
        assert "ya verificado" in res.json()["message"].lower()


# ── POST /auth/forgot-password ──────────────────────────────────────────────


class TestForgotPassword:
    @patch("app.routers.auth.send_password_reset_email")
    @patch("app.routers.auth.get_user_by_email")
    def test_sends_email_for_existing_user(self, mock_get_email, mock_send, client):
        user = make_user(email="test@ejemplo.cl")
        mock_get_email.return_value = user
        mock_send.return_value = True

        res = client.post("/auth/forgot-password", json={"email": "test@ejemplo.cl"})
        assert res.status_code == 200
        mock_send.assert_called_once()

    @patch("app.routers.auth.get_user_by_email")
    def test_returns_ok_for_nonexistent_email(self, mock_get_email, client):
        """Should NOT reveal whether email exists."""
        mock_get_email.return_value = None

        res = client.post("/auth/forgot-password", json={"email": "noexiste@ejemplo.cl"})
        assert res.status_code == 200
        assert "si el email existe" in res.json()["message"].lower()


# ── POST /auth/reset-password ───────────────────────────────────────────────


class TestResetPassword:
    @patch("app.routers.auth.get_user_by_rut")
    def test_reset_password_success(self, mock_get_rut, client):
        user = make_user(rut="12.345.678-9")
        mock_get_rut.return_value = user
        token = create_reset_token("12.345.678-9")

        res = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "nueva_clave_segura",
            "confirm_password": "nueva_clave_segura",
        })
        assert res.status_code == 200
        assert "restablecida" in res.json()["message"].lower()

    def test_reset_invalid_token(self, client):
        res = client.post("/auth/reset-password", json={
            "token": "invalid.token",
            "new_password": "nueva_clave_segura",
            "confirm_password": "nueva_clave_segura",
        })
        assert res.status_code == 400

    def test_reset_wrong_purpose(self, client):
        """A verification token should not reset password."""
        token = create_verification_token("12.345.678-9")
        res = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "nueva_clave_segura",
            "confirm_password": "nueva_clave_segura",
        })
        assert res.status_code == 400

    def test_reset_password_mismatch(self, client):
        token = create_reset_token("12.345.678-9")
        res = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "nueva_clave_segura",
            "confirm_password": "otra_clave_diferente",
        })
        assert res.status_code == 422

    def test_reset_weak_password(self, client):
        token = create_reset_token("12.345.678-9")
        res = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "corta",
            "confirm_password": "corta",
        })
        assert res.status_code == 422

    @patch("app.routers.auth.get_user_by_rut")
    def test_reset_clears_lockout(self, mock_get_rut, client):
        """Password reset should also clear account lockout."""
        user = make_user(rut="12.345.678-9")
        user.failed_login_attempts = 10
        mock_get_rut.return_value = user
        token = create_reset_token("12.345.678-9")

        res = client.post("/auth/reset-password", json={
            "token": token,
            "new_password": "nueva_clave_segura",
            "confirm_password": "nueva_clave_segura",
        })
        assert res.status_code == 200
        assert user.failed_login_attempts == 0
