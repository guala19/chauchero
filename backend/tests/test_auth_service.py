"""Tests for AuthService — OAuth flow, user creation, token verification."""

import pytest
from unittest.mock import patch, MagicMock

from app.services.auth_service import AuthService
from tests.factories import make_user


@pytest.fixture
def service(mock_db):
    return AuthService(mock_db)


# ── get_current_user ─────────────────────────────────────────────────────────


class TestGetCurrentUser:
    @patch("app.services.auth_service.get_user_by_id")
    @patch("app.services.auth_service.verify_token")
    def test_valid_token_returns_user(self, mock_verify, mock_get_user, service):
        user = make_user()
        mock_verify.return_value = {"sub": str(user.id)}
        mock_get_user.return_value = user

        result = service.get_current_user("valid-token")
        assert result is not None
        assert result.id == user.id

    @patch("app.services.auth_service.verify_token")
    def test_invalid_token_returns_none(self, mock_verify, service):
        mock_verify.return_value = None
        assert service.get_current_user("bad-token") is None

    @patch("app.services.auth_service.verify_token")
    def test_no_sub_in_payload_returns_none(self, mock_verify, service):
        mock_verify.return_value = {"email": "test@example.com"}
        assert service.get_current_user("token-no-sub") is None

    @patch("app.services.auth_service.get_user_by_id")
    @patch("app.services.auth_service.verify_token")
    def test_user_not_found_returns_none(self, mock_verify, mock_get_user, service):
        mock_verify.return_value = {"sub": "nonexistent-id"}
        mock_get_user.return_value = None
        assert service.get_current_user("token") is None


# ── get_authorization_url ────────────────────────────────────────────────────


class TestGetAuthorizationUrl:
    @patch("app.services.auth_service.Flow")
    def test_returns_url_and_state(self, MockFlow, service):
        mock_flow = MagicMock()
        mock_flow.authorization_url.return_value = ("https://accounts.google.com/auth", "state-abc")
        MockFlow.from_client_config.return_value = mock_flow

        url, state = service.get_authorization_url()
        assert url == "https://accounts.google.com/auth"
        assert state == "state-abc"


# ── handle_oauth_callback ───────────────────────────────────────────────────


class TestHandleOAuthCallback:
    @patch("app.services.auth_service.create_access_token")
    @patch("app.services.auth_service.create_user")
    @patch("app.services.auth_service.get_user_by_email")
    @patch("app.services.auth_service.Flow")
    def test_new_user_created(self, MockFlow, mock_get_email, mock_create, mock_token, service):
        # Setup mock flow
        mock_creds = MagicMock()
        mock_creds.refresh_token = "refresh-token"
        mock_creds.expiry = None
        mock_flow = MagicMock()
        mock_flow.credentials = mock_creds
        MockFlow.from_client_config.return_value = mock_flow

        # Mock user info from Google
        with patch.object(service, "_get_user_info", return_value={"email": "new@example.com"}):
            mock_get_email.return_value = None  # No existing user
            new_user = make_user(email="new@example.com")
            mock_create.return_value = new_user
            mock_token.return_value = "jwt-token"

            result = service.handle_oauth_callback("auth-code", "state-123")

        assert result["access_token"] == "jwt-token"
        assert result["token_type"] == "bearer"
        mock_create.assert_called_once()

    @patch("app.services.auth_service.create_access_token")
    @patch("app.services.auth_service.update_user_tokens")
    @patch("app.services.auth_service.get_user_by_email")
    @patch("app.services.auth_service.Flow")
    def test_existing_user_updated(self, MockFlow, mock_get_email, mock_update, mock_token, service):
        mock_creds = MagicMock()
        mock_creds.refresh_token = "new-refresh"
        mock_creds.expiry = None
        mock_flow = MagicMock()
        mock_flow.credentials = mock_creds
        MockFlow.from_client_config.return_value = mock_flow

        existing_user = make_user(email="existing@example.com")
        with patch.object(service, "_get_user_info", return_value={"email": "existing@example.com"}):
            mock_get_email.return_value = existing_user
            mock_token.return_value = "jwt-token"

            result = service.handle_oauth_callback("code", "state")

        mock_update.assert_called_once()
        assert result["access_token"] == "jwt-token"
