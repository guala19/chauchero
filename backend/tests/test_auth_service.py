"""Tests for AuthService — token verification, user lookup, and Gmail linking."""

import pytest
from unittest.mock import patch, MagicMock

from app.services.auth_service import AuthService
from tests.factories import make_user


@pytest.fixture
def service(mock_db):
    return AuthService(mock_db)


# ── get_current_user ─────────────────────────────────────────────────────────


class TestGetCurrentUser:
    @patch("app.services.auth_service.get_user_by_rut")
    @patch("app.services.auth_service.verify_token")
    def test_valid_token_returns_user(self, mock_verify, mock_get_user, service):
        user = make_user()
        mock_verify.return_value = {"sub": user.rut}
        mock_get_user.return_value = user

        result = service.get_current_user("valid-token")
        assert result is not None
        assert result.rut == user.rut

    @patch("app.services.auth_service.verify_token")
    def test_invalid_token_returns_none(self, mock_verify, service):
        mock_verify.return_value = None
        assert service.get_current_user("bad-token") is None

    @patch("app.services.auth_service.verify_token")
    def test_no_sub_in_payload_returns_none(self, mock_verify, service):
        mock_verify.return_value = {"email": "test@example.com"}
        assert service.get_current_user("token-no-sub") is None

    @patch("app.services.auth_service.get_user_by_rut")
    @patch("app.services.auth_service.verify_token")
    def test_user_not_found_returns_none(self, mock_verify, mock_get_user, service):
        mock_verify.return_value = {"sub": "99.999.999-9"}
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


# ── link_gmail_account ───────────────────────────────────────────────────────


class TestLinkGmailAccount:
    @patch("app.services.auth_service.update_user_tokens")
    @patch("app.services.auth_service.Flow")
    def test_links_tokens_to_user(self, MockFlow, mock_update, service):
        mock_creds = MagicMock()
        mock_creds.refresh_token = "new-refresh"
        mock_creds.expiry = None
        mock_flow = MagicMock()
        mock_flow.credentials = mock_creds
        MockFlow.from_client_config.return_value = mock_flow

        user = make_user(email="existing@example.com")
        result = service.link_gmail_account("code", "state", user)

        mock_update.assert_called_once()
        assert result is user
