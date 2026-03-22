"""Tests for TransactionService — sync, CRUD, debug, email processing."""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.services.transaction_service import (
    TransactionService,
    SyncCooldownError,
    SyncInProgressError,
)
from app.services.gmail_service import GmailAuthError
from app.parsers.base import ParsedTransaction
from tests.factories import make_user, make_email_data, make_parsed_transaction, make_bank_account, make_transaction


@pytest.fixture
def service(mock_db):
    return TransactionService(mock_db)


@pytest.fixture
def user():
    return make_user(gmail_refresh_token="valid-refresh-token")


@pytest.fixture
def user_no_token():
    return make_user(gmail_refresh_token=None)


# ── sync_transactions_for_user ───────────────────────────────────────────────


class TestSyncTransactions:
    def test_no_gmail_token_raises(self, service, user_no_token):
        with pytest.raises(ValueError, match="token de Gmail"):
            service.sync_transactions_for_user(user_no_token)

    @patch("app.services.transaction_service.GmailService")
    def test_gmail_auth_error_raises_value_error(self, MockGmail, service, user):
        MockGmail.return_value.fetch_bank_emails.side_effect = GmailAuthError("expired")
        with pytest.raises(ValueError, match="token de Gmail expiró"):
            service.sync_transactions_for_user(user)

    @patch("app.services.transaction_service.update_last_sync")
    @patch("app.services.transaction_service.GmailService")
    def test_empty_inbox_returns_zero_stats(self, MockGmail, mock_update, service, user):
        MockGmail.return_value.fetch_bank_emails.return_value = []

        stats = service.sync_transactions_for_user(user)

        assert stats["emails_fetched"] == 0
        assert stats["transactions_created"] == 0
        mock_update.assert_called_once()

    @patch("app.services.transaction_service.update_last_sync")
    @patch("app.services.transaction_service.bulk_upsert_transactions", return_value=1)
    @patch("app.services.transaction_service.get_or_create_account")
    @patch("app.services.transaction_service.parser_registry")
    @patch("app.services.transaction_service.GmailService")
    def test_successful_sync_counts(
        self, MockGmail, mock_registry, mock_get_account, mock_bulk_upsert, mock_update, service, user
    ):
        email = make_email_data()
        MockGmail.return_value.fetch_bank_emails.return_value = [email]

        mock_parser = MagicMock()
        mock_parser.bank_name = "Banco de Chile"
        mock_parser.parse.return_value = make_parsed_transaction()
        mock_registry.get_parser_for_email.return_value = mock_parser

        mock_get_account.return_value = make_bank_account()

        stats = service.sync_transactions_for_user(user)

        assert stats["emails_fetched"] == 1
        assert stats["transactions_created"] == 1

    @patch("app.services.transaction_service.update_last_sync")
    @patch("app.services.transaction_service.parser_registry")
    @patch("app.services.transaction_service.GmailService")
    def test_no_parser_counts_as_unsupported(
        self, MockGmail, mock_registry, mock_update, service, user
    ):
        MockGmail.return_value.fetch_bank_emails.return_value = [make_email_data()]
        mock_registry.get_parser_for_email.return_value = None

        stats = service.sync_transactions_for_user(user)
        assert stats["unsupported_banks"] == 1

    @patch("app.services.transaction_service.update_last_sync")
    @patch("app.services.transaction_service.GmailService")
    def test_force_full_sync_ignores_last_sync(self, MockGmail, mock_update, service, user):
        user.last_sync_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        MockGmail.return_value.fetch_bank_emails.return_value = []

        service.sync_transactions_for_user(user, force_full_sync=True)

        _, kwargs = MockGmail.return_value.fetch_bank_emails.call_args
        assert kwargs["after_date"] is None


# ── check_sync_cooldown ───────────────────────────────────────────────────────


class TestSyncCooldown:
    def test_no_last_sync_allows(self, service):
        user = make_user(last_sync_at=None)
        assert service.check_sync_cooldown(user) is None

    def test_recent_sync_returns_minutes_remaining(self, service):
        user = make_user(last_sync_at=datetime.now(timezone.utc) - timedelta(minutes=2))
        remaining = service.check_sync_cooldown(user)
        assert remaining is not None
        assert remaining > 0

    def test_expired_cooldown_returns_none(self, service):
        user = make_user(last_sync_at=datetime.now(timezone.utc) - timedelta(minutes=10))
        assert service.check_sync_cooldown(user) is None

    def test_cooldown_raises_in_sync_flow(self, service):
        user = make_user(last_sync_at=datetime.now(timezone.utc) - timedelta(minutes=1))
        with pytest.raises(SyncCooldownError) as exc_info:
            service.sync_transactions_for_user(user)
        assert exc_info.value.minutes_remaining > 0

    def test_cooldown_error_carries_minutes(self):
        err = SyncCooldownError(3)
        assert err.minutes_remaining == 3
        assert "3" in str(err)


# ── sync lock ─────────────────────────────────────────────────────────────────


class TestSyncLock:
    def test_locked_user_raises_sync_in_progress(self, service):
        user = make_user(is_syncing=True, sync_started_at=datetime.now(timezone.utc))
        with patch("app.services.transaction_service.acquire_sync_lock", return_value=False):
            with pytest.raises(SyncInProgressError):
                service.sync_transactions_for_user(user)

    def test_stale_lock_is_reset_and_allows_sync(self, service):
        # Stale lock (> 10 min): DB UPDATE matches, returns a row → acquired
        stale_time = datetime.now(timezone.utc) - timedelta(minutes=15)
        user = make_user(is_syncing=True, sync_started_at=stale_time)
        service.db.execute.return_value.fetchone.return_value = MagicMock()
        from app.db.queries.users import acquire_sync_lock
        result = acquire_sync_lock(service.db, user)
        assert result is True

    def test_fresh_lock_blocks(self, service):
        # Active lock: DB UPDATE matches no rows → not acquired
        user = make_user(is_syncing=True, sync_started_at=datetime.now(timezone.utc))
        service.db.execute.return_value.fetchone.return_value = None
        from app.db.queries.users import acquire_sync_lock
        result = acquire_sync_lock(service.db, user)
        assert result is False


# ── _prepare_transaction ─────────────────────────────────────────────────────


class TestPrepareTransaction:
    @patch("app.services.transaction_service.parser_registry")
    def test_no_parser_returns_no_parser(self, mock_registry, service, user):
        mock_registry.get_parser_for_email.return_value = None
        result = service._prepare_transaction(user, make_email_data())
        assert result == "no_parser"

    @patch("app.services.transaction_service.parser_registry")
    def test_parser_returns_none_is_error(self, mock_registry, service, user):
        mock_parser = MagicMock()
        mock_parser.parse.return_value = None
        mock_registry.get_parser_for_email.return_value = mock_parser
        result = service._prepare_transaction(user, make_email_data())
        assert result == "error"

    @patch("app.services.transaction_service.get_or_create_account")
    @patch("app.services.transaction_service.parser_registry")
    def test_successful_parse_returns_dict_with_correct_values(
        self, mock_registry, mock_get_account, service, user
    ):
        parsed = make_parsed_transaction(
            amount=Decimal("25000"),
            description="LIDER EXPRESS",
            transaction_type="debit",
        )
        email = make_email_data(message_id="msg-123", subject="Cargo en Cuenta")
        account = make_bank_account()

        mock_parser = MagicMock()
        mock_parser.bank_name = "Banco de Chile"
        mock_parser.parse.return_value = parsed
        mock_registry.get_parser_for_email.return_value = mock_parser
        mock_get_account.return_value = account

        result = service._prepare_transaction(user, email)

        assert isinstance(result, dict)
        assert result["account_id"] == account.id
        assert result["amount"] == Decimal("25000")
        assert result["email_id"] == "msg-123"
        assert result["email_subject"] == "Cargo en Cuenta"
        assert result["description"] == "Lider Express"  # sanitized: capitalized
        assert result["transaction_type"] == "debit"
        assert result["parser_confidence"] == 100

    @patch("app.services.transaction_service.get_or_create_account")
    @patch("app.services.transaction_service.parser_registry")
    def test_prepare_transaction_assigns_category(
        self, mock_registry, mock_get_account, service, user
    ):
        parsed = make_parsed_transaction(
            description="UBER EATS CHILE",
            transaction_type="debit",
            category=None,
        )
        mock_parser = MagicMock()
        mock_parser.bank_name = "Banco de Chile"
        mock_parser.parse.return_value = parsed
        mock_registry.get_parser_for_email.return_value = mock_parser
        mock_get_account.return_value = make_bank_account()

        result = service._prepare_transaction(user, make_email_data())

        assert isinstance(result, dict)
        assert result["category"] is not None
        assert result["category"] != ""

    @patch("app.services.transaction_service.get_or_create_account")
    @patch("app.services.transaction_service.parser_registry")
    def test_prepare_transaction_preserves_parser_category(
        self, mock_registry, mock_get_account, service, user
    ):
        parsed = make_parsed_transaction(
            description="Some Merchant",
            category="Supermercado",
        )
        mock_parser = MagicMock()
        mock_parser.bank_name = "Banco de Chile"
        mock_parser.parse.return_value = parsed
        mock_registry.get_parser_for_email.return_value = mock_parser
        mock_get_account.return_value = make_bank_account()

        result = service._prepare_transaction(user, make_email_data())

        assert result["category"] == "Supermercado"

    @patch("app.services.transaction_service.parser_registry")
    def test_parser_exception_returns_error(self, mock_registry, service, user):
        mock_parser = MagicMock()
        mock_parser.parse.side_effect = Exception("boom")
        mock_registry.get_parser_for_email.return_value = mock_parser

        result = service._prepare_transaction(user, make_email_data())
        assert result == "error"
        service.db.rollback.assert_called_once()

    @patch("app.services.transaction_service.parser_registry")
    def test_invalid_transaction_returns_error(self, mock_registry, service, user):
        mock_parser = MagicMock()
        mock_parser.bank_name = "Banco de Chile"
        # Amount=0 → invalid
        mock_parser.parse.return_value = make_parsed_transaction(amount=Decimal("0"))
        mock_registry.get_parser_for_email.return_value = mock_parser

        result = service._prepare_transaction(user, make_email_data())
        assert result == "error"


# ── list_transactions ────────────────────────────────────────────────────────


class TestListTransactions:
    @patch("app.services.transaction_service.get_user_transactions")
    def test_delegates_to_query(self, mock_query, service, user):
        mock_query.return_value = [make_transaction()]
        result = service.list_transactions(user, limit=10, offset=5)

        mock_query.assert_called_once_with(
            service.db, user, account_id=None, limit=10, offset=5,
            cursor_date=None, cursor_id=None,
        )
        assert len(result) == 1


# ── update_transaction ───────────────────────────────────────────────────────


class TestUpdateTransaction:
    @patch("app.services.transaction_service.update_transaction")
    @patch("app.services.transaction_service.get_user_transaction_by_id")
    def test_updates_existing(self, mock_get, mock_update, service, user):
        tx = make_transaction()
        mock_get.return_value = tx
        mock_update.return_value = tx

        result = service.update_transaction(user, tx.id, {"notes": "new"})
        assert result is not None
        mock_update.assert_called_once_with(service.db, tx, notes="new")

    @patch("app.services.transaction_service.get_user_transaction_by_id")
    def test_not_found_returns_none(self, mock_get, service, user):
        mock_get.return_value = None
        result = service.update_transaction(user, "missing-id", {"notes": "x"})
        assert result is None


# ── categorize_uncategorized ─────────────────────────────────────────────────


class TestCategorizeUncategorized:
    def test_categorizes_none_category_transactions(self, service, user):
        tx1 = MagicMock()
        tx1.description = "UBER EATS CHILE"
        tx1.transaction_type = "debit"
        tx1.category = None

        tx2 = MagicMock()
        tx2.description = "LIDER EXPRESS"
        tx2.transaction_type = "debit"
        tx2.category = None

        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [tx1, tx2]
        service.db.query.return_value = mock_query

        result = service.categorize_uncategorized(user)

        assert result["total_uncategorized"] == 2
        assert result["categorized"] == 2
        assert tx1.category is not None
        assert tx2.category is not None
        service.db.commit.assert_called_once()

    def test_no_uncategorized_skips_commit(self, service, user):
        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []
        service.db.query.return_value = mock_query

        result = service.categorize_uncategorized(user)

        assert result["total_uncategorized"] == 0
        assert result["categorized"] == 0
        service.db.commit.assert_not_called()


# ── debug_gmail_query ────────────────────────────────────────────────────────


class TestDebugGmailQuery:
    def test_returns_queries(self, service, user):
        user.last_sync_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        result = service.debug_gmail_query(user)

        assert "last_sync_at" in result
        assert "query_incremental" in result
        assert "query_full_resync" in result
        assert "after:" in result["query_incremental"]
        assert "after:" not in result["query_full_resync"]


# ── debug_gmail_scan ─────────────────────────────────────────────────────────


class TestDebugGmailScan:
    def test_no_token_raises(self, service, user_no_token):
        with pytest.raises(ValueError, match="No Gmail token"):
            service.debug_gmail_scan(user_no_token, 10)

    @patch("app.services.transaction_service.GmailService")
    def test_returns_results(self, MockGmail, service, user):
        MockGmail.return_value.fetch_bank_emails.return_value = []
        MockGmail.build_search_query.return_value = "(from:x)"

        result = service.debug_gmail_scan(user, 10)

        assert result["emails_found"] == 0
        assert isinstance(result["results"], list)
