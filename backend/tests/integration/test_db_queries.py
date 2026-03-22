"""
Integration tests for DB query functions against a real PostgreSQL database.

These tests verify the actual SQL behavior: upserts, deduplication,
FK cascades, and data integrity — things mocks cannot catch.
"""

import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone

from app.db.queries.users import (
    create_user,
    get_user_by_email,
    get_user_by_rut,
    update_user_tokens,
    update_last_sync,
    acquire_sync_lock,
    release_sync_lock,
    clear_gmail_token,
)
from app.db.queries.bank_accounts import get_or_create_account
from app.db.queries.transactions import upsert_transaction, bulk_upsert_transactions, get_user_transactions

_rut_counter = 0

def _next_rut():
    """Generate a unique RUT for each test."""
    global _rut_counter
    _rut_counter += 1
    n = _rut_counter
    return f"{n // 1000000}.{(n // 1000) % 1000:03d}.{n % 1000:03d}-0"


def _create_test_user(db, email, **kwargs):
    """Shortcut to create a user with required fields for tests."""
    return create_user(
        db,
        rut=kwargs.pop("rut", _next_rut()),
        email=email,
        password_hash=kwargs.pop("password_hash", "$2b$12$test_hash_placeholder_value"),
        first_name=kwargs.pop("first_name", "Test"),
        last_name=kwargs.pop("last_name", "User"),
        **kwargs,
    )


# ── User queries ──────────────────────────────────────────────────────────────

class TestUserQueries:
    def test_create_and_retrieve_by_email(self, db):
        user = _create_test_user(db, email="test@example.com")
        found = get_user_by_email(db, "test@example.com")
        assert found is not None
        assert found.rut == user.rut

    def test_get_by_rut(self, db):
        rut = "11.111.111-1"
        user = _create_test_user(db, email="byrut@example.com", rut=rut)
        found = get_user_by_rut(db, rut)
        assert found is not None
        assert found.email == "byrut@example.com"

    def test_missing_email_returns_none(self, db):
        assert get_user_by_email(db, "nope@example.com") is None

    def test_missing_rut_returns_none(self, db):
        assert get_user_by_rut(db, "99.999.999-9") is None

    def test_update_tokens(self, db):
        user = _create_test_user(db, email="tokens@example.com")
        updated = update_user_tokens(db, user, refresh_token="new-refresh-token")
        assert updated.gmail_refresh_token == "new-refresh-token"

    def test_update_last_sync(self, db):
        user = _create_test_user(db, email="sync@example.com")
        now = datetime.now(timezone.utc)
        update_last_sync(db, user, now)
        db.refresh(user)
        assert user.last_sync_at is not None

    def test_clear_gmail_token(self, db):
        user = _create_test_user(db, email="clear@example.com", gmail_refresh_token="old-token")
        clear_gmail_token(db, user)
        db.refresh(user)
        assert user.gmail_refresh_token is None


# ── Sync lock queries ─────────────────────────────────────────────────────────

class TestSyncLockQueries:
    def test_acquire_lock_on_unlocked_user(self, db):
        user = _create_test_user(db, email="lock1@example.com")
        assert acquire_sync_lock(db, user) is True
        db.refresh(user)
        assert user.is_syncing is True
        assert user.sync_started_at is not None

    def test_acquire_lock_fails_when_already_locked(self, db):
        user = _create_test_user(db, email="lock2@example.com")
        acquire_sync_lock(db, user)
        assert acquire_sync_lock(db, user) is False

    def test_release_lock_clears_fields(self, db):
        user = _create_test_user(db, email="lock3@example.com")
        acquire_sync_lock(db, user)
        release_sync_lock(db, user)
        db.refresh(user)
        assert user.is_syncing is False
        assert user.sync_started_at is None

    def test_stale_lock_auto_reset(self, db):
        from datetime import timedelta
        user = _create_test_user(db, email="lock4@example.com")
        # Manually set a stale lock (15 minutes ago)
        user.is_syncing = True
        user.sync_started_at = datetime.now(timezone.utc) - timedelta(minutes=15)
        db.commit()
        # acquire_sync_lock should detect stale and reset
        assert acquire_sync_lock(db, user) is True


# ── Bank account queries ──────────────────────────────────────────────────────

class TestBankAccountQueries:
    def test_creates_account_on_first_call(self, db):
        user = _create_test_user(db, email="bank1@example.com")
        account = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="1234")
        assert account is not None
        assert account.bank_name == "Banco de Chile"

    def test_returns_existing_account_on_second_call(self, db):
        user = _create_test_user(db, email="bank2@example.com")
        a1 = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="5678")
        a2 = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="5678")
        assert a1.id == a2.id

    def test_different_last_4_creates_different_account(self, db):
        user = _create_test_user(db, email="bank3@example.com")
        a1 = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="1111")
        a2 = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="2222")
        assert a1.id != a2.id


# ── Transaction upsert & deduplication ───────────────────────────────────────

class TestTransactionUpsert:
    def _make_tx(self, db, user, email_id="email-001"):
        account = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="9999")
        return upsert_transaction(
            db,
            account_id=account.id,
            amount=Decimal("50000"),
            transaction_date=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
            description="Supermercado Lider",
            transaction_type="debit",
            email_id=email_id,
            email_subject="Cargo en Cuenta",
            parser_confidence=95,
        )

    def test_creates_transaction(self, db):
        user = _create_test_user(db, email="tx1@example.com")
        result = self._make_tx(db, user)
        assert result is True

    def test_same_email_id_returns_false_second_time(self, db):
        """Core dedup test — same email_id must never create a duplicate."""
        user = _create_test_user(db, email="tx2@example.com")
        first = self._make_tx(db, user, email_id="dedup-001")
        second = self._make_tx(db, user, email_id="dedup-001")
        assert first is True
        assert second is False  # Already exists — upsert skips insert

    def test_different_email_ids_create_separate_transactions(self, db):
        user = _create_test_user(db, email="tx3@example.com")
        t1 = self._make_tx(db, user, email_id="unique-001")
        t2 = self._make_tx(db, user, email_id="unique-002")
        assert t1 is True
        assert t2 is True
        txs = get_user_transactions(db, user, limit=10, offset=0)
        assert len(txs) == 2

    def test_get_user_transactions_returns_correct_count(self, db):
        user = _create_test_user(db, email="tx4@example.com")
        self._make_tx(db, user, email_id="list-001")
        self._make_tx(db, user, email_id="list-002")
        self._make_tx(db, user, email_id="list-003")
        txs = get_user_transactions(db, user, limit=10, offset=0)
        assert len(txs) == 3

    def test_transactions_isolated_between_users(self, db):
        user1 = _create_test_user(db, email="iso1@example.com")
        user2 = _create_test_user(db, email="iso2@example.com")
        self._make_tx(db, user1, email_id="iso-user1-001")
        txs_user2 = get_user_transactions(db, user2, limit=10, offset=0)
        assert len(txs_user2) == 0


# ── Bulk upsert transactions ────────────────────────────────────────────────

class TestBulkUpsertTransactions:
    def _make_row(self, account_id, email_id="bulk-001"):
        return {
            "account_id": account_id,
            "amount": Decimal("15000"),
            "transaction_date": datetime(2026, 3, 5, 10, 0, tzinfo=timezone.utc),
            "description": "Test Merchant",
            "transaction_type": "debit",
            "email_id": email_id,
            "email_subject": "Cargo en Cuenta",
            "parser_confidence": 90,
        }

    def test_inserts_multiple_rows(self, db):
        user = _create_test_user(db, email="bulk1@example.com")
        account = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="1111")
        rows = [
            self._make_row(account.id, email_id="bulk-001"),
            self._make_row(account.id, email_id="bulk-002"),
            self._make_row(account.id, email_id="bulk-003"),
        ]
        inserted = bulk_upsert_transactions(db, rows)
        assert inserted == 3
        txs = get_user_transactions(db, user, limit=10, offset=0)
        assert len(txs) == 3

    def test_skips_duplicates_in_batch(self, db):
        """If the same email_id appears twice in a batch, only one is inserted."""
        user = _create_test_user(db, email="bulk2@example.com")
        account = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="2222")
        rows = [
            self._make_row(account.id, email_id="dup-001"),
            self._make_row(account.id, email_id="dup-001"),
        ]
        inserted = bulk_upsert_transactions(db, rows)
        assert inserted == 1

    def test_partial_duplicates_inserts_new_only(self, db):
        """Mix of existing and new email_ids: only new ones are inserted."""
        user = _create_test_user(db, email="bulk3@example.com")
        account = get_or_create_account(db, user, bank_name="Banco de Chile", last_4_digits="3333")

        # Insert first batch
        first_batch = [
            self._make_row(account.id, email_id="existing-001"),
            self._make_row(account.id, email_id="existing-002"),
        ]
        bulk_upsert_transactions(db, first_batch)

        # Insert second batch with overlap
        second_batch = [
            self._make_row(account.id, email_id="existing-001"),  # already exists
            self._make_row(account.id, email_id="existing-002"),  # already exists
            self._make_row(account.id, email_id="new-001"),       # new
        ]
        inserted = bulk_upsert_transactions(db, second_batch)
        assert inserted == 1

        txs = get_user_transactions(db, user, limit=10, offset=0)
        assert len(txs) == 3

    def test_empty_list_returns_zero(self, db):
        inserted = bulk_upsert_transactions(db, [])
        assert inserted == 0
