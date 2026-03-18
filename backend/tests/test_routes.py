"""Tests for API endpoints — thin route handler tests with mocked services."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import timedelta
from uuid import uuid4

# Patch create_all before importing app so it doesn't try to connect to the DB
with patch("app.core.database.engine") as _mock_engine:
    _mock_engine.begin = MagicMock(return_value=MagicMock(__enter__=MagicMock(), __exit__=MagicMock()))
    from fastapi.testclient import TestClient
    from app.main import app
    from app.routers.deps import get_current_user
    from app.core.database import get_db

from tests.factories import make_user, make_transaction


# ── Test setup ───────────────────────────────────────────────────────────────


@pytest.fixture
def user():
    return make_user()


@pytest.fixture
def client(user, mock_db):
    """FastAPI test client with auth and DB overridden."""
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client(mock_db):
    """Test client without auth override — will fail auth."""
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── GET / ────────────────────────────────────────────────────────────────────


class TestRoot:
    def test_root(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["message"] == "Chauchero API"

    def test_health(self, client):
        # Health check opens its own SessionLocal — patch it so SELECT 1 succeeds
        with patch("app.main.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value = mock_session
            res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
        assert res.json()["db"] == "ok"


# ── GET /banks/supported ─────────────────────────────────────────────────────


class TestBanksEndpoint:
    def test_lists_supported_banks(self, client):
        res = client.get("/banks/supported")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "Banco de Chile"
        assert "email_domains" in data[0]


# ── GET /transactions/ ───────────────────────────────────────────────────────


class TestListTransactions:
    @patch("app.routers.transactions.TransactionService")
    def test_returns_list(self, MockService, client, user):
        tx = make_transaction()
        MockService.return_value.list_transactions.return_value = [tx]

        res = client.get("/transactions/")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 1

    @patch("app.routers.transactions.TransactionService")
    def test_empty_list(self, MockService, client):
        MockService.return_value.list_transactions.return_value = []
        res = client.get("/transactions/")
        assert res.status_code == 200
        assert res.json() == []

    @patch("app.routers.transactions.TransactionService")
    def test_pagination_params(self, MockService, client, user):
        MockService.return_value.list_transactions.return_value = []
        res = client.get("/transactions/?limit=10&offset=20")
        assert res.status_code == 200
        call_kwargs = MockService.return_value.list_transactions.call_args
        assert call_kwargs.kwargs["limit"] == 10
        assert call_kwargs.kwargs["offset"] == 20

    def test_requires_auth(self, unauth_client):
        res = unauth_client.get("/transactions/")
        assert res.status_code in (401, 422)


# ── PATCH /transactions/{id} ─────────────────────────────────────────────────


class TestUpdateTransaction:
    @patch("app.routers.transactions.TransactionService")
    def test_update_success(self, MockService, client):
        tx = make_transaction()
        MockService.return_value.update_transaction.return_value = tx

        res = client.patch(
            f"/transactions/{tx.id}",
            json={"notes": "updated note"},
        )
        assert res.status_code == 200

    @patch("app.routers.transactions.TransactionService")
    def test_not_found(self, MockService, client):
        MockService.return_value.update_transaction.return_value = None
        res = client.patch(
            f"/transactions/{uuid4()}",
            json={"notes": "x"},
        )
        assert res.status_code == 404

    @patch("app.routers.transactions.TransactionService")
    def test_partial_update(self, MockService, client):
        tx = make_transaction()
        MockService.return_value.update_transaction.return_value = tx

        res = client.patch(
            f"/transactions/{tx.id}",
            json={"category": "food"},
        )
        assert res.status_code == 200
        call_kwargs = MockService.return_value.update_transaction.call_args
        assert "category" in call_kwargs.kwargs["fields"]


# ── POST /transactions/sync ──────────────────────────────────────────────────


class TestSyncTransactions:
    @patch("app.routers.transactions.TransactionService")
    def test_cooldown_returns_429(self, MockService, client):
        from app.services.transaction_service import SyncCooldownError
        MockService.return_value.sync_transactions_for_user.side_effect = SyncCooldownError(4)
        res = client.post("/transactions/sync")
        assert res.status_code == 429
        assert "4" in res.json()["detail"]

    @patch("app.routers.transactions.TransactionService")
    def test_sync_in_progress_returns_409(self, MockService, client):
        from app.services.transaction_service import SyncInProgressError
        MockService.return_value.sync_transactions_for_user.side_effect = SyncInProgressError()
        res = client.post("/transactions/sync")
        assert res.status_code == 409

    @patch("app.routers.transactions.TransactionService")
    def test_successful_sync(self, MockService, client):
        MockService.return_value.sync_transactions_for_user.return_value = {
            "emails_fetched": 5,
            "transactions_created": 3,
            "transactions_skipped": 1,
            "parsing_errors": 1,
            "unsupported_banks": 0,
        }
        res = client.post("/transactions/sync")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["stats"]["transactions_created"] == 3

    @patch("app.routers.transactions.TransactionService")
    def test_gmail_auth_error_returns_401(self, MockService, client):
        from app.services.gmail_service import GmailAuthError
        MockService.return_value.sync_transactions_for_user.side_effect = GmailAuthError(
            "Tu token de Gmail expiró"
        )
        res = client.post("/transactions/sync")
        assert res.status_code == 401

    @patch("app.routers.transactions.TransactionService")
    def test_value_error_with_token_returns_401(self, MockService, client):
        MockService.return_value.sync_transactions_for_user.side_effect = ValueError(
            "Tu token de Gmail expiró o fue revocado."
        )
        res = client.post("/transactions/sync")
        assert res.status_code == 401

    @patch("app.routers.transactions.TransactionService")
    def test_generic_value_error_returns_400(self, MockService, client):
        MockService.return_value.sync_transactions_for_user.side_effect = ValueError(
            "Invalid sync parameter"
        )
        res = client.post("/transactions/sync")
        assert res.status_code == 400

    @patch("app.routers.transactions.TransactionService")
    def test_unexpected_error_returns_500(self, MockService, client):
        MockService.return_value.sync_transactions_for_user.side_effect = RuntimeError("boom")
        res = client.post("/transactions/sync")
        assert res.status_code == 500

    @patch("app.routers.transactions.TransactionService")
    def test_custom_params(self, MockService, client):
        MockService.return_value.sync_transactions_for_user.return_value = {
            "emails_fetched": 0,
            "transactions_created": 0,
            "transactions_skipped": 0,
            "parsing_errors": 0,
            "unsupported_banks": 0,
        }
        res = client.post("/transactions/sync?max_emails=100&force_full_sync=true")
        assert res.status_code == 200


# ── GET /auth/google/login ───────────────────────────────────────────────────


class TestAuthLogin:
    @patch("app.routers.auth.AuthService")
    def test_returns_auth_url(self, MockAuth, client):
        MockAuth.return_value.get_authorization_url.return_value = (
            "https://accounts.google.com/auth",
            "state-123",
        )
        res = client.get("/auth/google/login")
        assert res.status_code == 200
        data = res.json()
        assert "auth_url" in data
        assert "state" in data


# ── GET /auth/me ─────────────────────────────────────────────────────────────


class TestAuthMe:
    def test_returns_user(self, client, user):
        res = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer test-token"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == user.email


# ── POST /auth/refresh ───────────────────────────────────────────────────────


class TestAuthRefresh:
    def test_valid_token_returns_new_token(self, client, user):
        res = client.post("/auth/refresh", headers={"Authorization": "Bearer valid-token"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_no_auth_returns_422(self, unauth_client):
        res = unauth_client.post("/auth/refresh")
        assert res.status_code in (401, 422)


class TestAuthRefreshExpired:
    def test_recently_expired_token_accepted(self, client):
        import uuid as _uuid
        import datetime as _dt
        fake_id = _uuid.uuid4()
        expired_token = "Bearer some.expired.token"
        with patch("app.routers.auth.verify_token") as mock_verify, \
             patch("app.routers.auth.get_user_by_id") as mock_get_user:
            mock_verify.return_value = {"sub": str(fake_id)}
            mock_user = MagicMock()
            mock_user.id = fake_id
            mock_user.email = "test@example.com"
            mock_user.created_at = _dt.datetime.now(_dt.timezone.utc)
            mock_user.last_sync_at = None
            mock_get_user.return_value = mock_user
            res = client.post(
                "/auth/refresh-expired",
                headers={"Authorization": expired_token},
            )
        assert res.status_code == 200

    def test_bad_format_returns_401(self, client):
        res = client.post(
            "/auth/refresh-expired",
            headers={"Authorization": "NotBearer token"},
        )
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        with patch("app.routers.auth.verify_token", return_value=None):
            res = client.post(
                "/auth/refresh-expired",
                headers={"Authorization": "Bearer expired.too.old"},
            )
        assert res.status_code == 401


# ── Health check edge cases ───────────────────────────────────────────────────


class TestHealthCheck:
    def test_db_down_returns_503(self, client):
        with patch("app.main.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session.execute.side_effect = Exception("connection refused")
            mock_session_cls.return_value = mock_session
            res = client.get("/health")
        assert res.status_code == 503
        assert res.json()["detail"]["status"] == "unhealthy"


# ── Debug endpoints ──────────────────────────────────────────────────────────


class TestDebugEndpoints:
    @patch("app.routers.transactions.TransactionService")
    def test_debug_gmail_query(self, MockService, client):
        MockService.return_value.debug_gmail_query.return_value = {
            "last_sync_at": None,
            "query_incremental": "(from:x)",
            "query_full_resync": "(from:x)",
        }
        res = client.get("/transactions/debug/gmail-query")
        assert res.status_code == 200

    @patch("app.routers.transactions.TransactionService")
    def test_debug_gmail_scan(self, MockService, client):
        MockService.return_value.debug_gmail_scan.return_value = {
            "gmail_query": "(from:x)",
            "emails_found": 0,
            "last_sync_at": None,
            "results": [],
        }
        res = client.get("/transactions/debug/gmail-scan")
        assert res.status_code == 200
