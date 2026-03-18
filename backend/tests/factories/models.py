"""Lightweight model factories — no ORM session needed for unit tests."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock


def make_user(
    *,
    id=None,
    email="test@example.com",
    gmail_refresh_token="fake-refresh-token",
    gmail_token_expires_at=None,
    last_sync_at=None,
    is_syncing=False,
    sync_started_at=None,
    created_at=None,
    updated_at=None,
):
    user = MagicMock()
    user.id = id or uuid.uuid4()
    user.email = email
    user.gmail_refresh_token = gmail_refresh_token
    user.gmail_token_expires_at = gmail_token_expires_at
    user.last_sync_at = last_sync_at
    user.is_syncing = is_syncing
    user.sync_started_at = sync_started_at
    user.created_at = created_at or datetime.now(timezone.utc)
    user.updated_at = updated_at or datetime.now(timezone.utc)
    return user


def make_bank_account(
    *,
    id=None,
    user_id=None,
    bank_name="Banco de Chile",
    last_4_digits="1234",
    currency="CLP",
):
    account = MagicMock()
    account.id = id or uuid.uuid4()
    account.user_id = user_id or uuid.uuid4()
    account.bank_name = bank_name
    account.last_4_digits = last_4_digits
    account.currency = currency
    return account


def make_transaction(
    *,
    id=None,
    account_id=None,
    amount=Decimal("10000"),
    transaction_date=None,
    description="Test Merchant",
    transaction_type="debit",
    category=None,
    email_id=None,
    email_subject="Test Subject",
    parser_confidence=100,
    is_validated=True,
    notes=None,
    created_at=None,
    updated_at=None,
):
    tx = MagicMock()
    tx.id = id or uuid.uuid4()
    tx.account_id = account_id or uuid.uuid4()
    tx.amount = amount
    tx.transaction_date = transaction_date or datetime.now(timezone.utc)
    tx.description = description
    tx.transaction_type = transaction_type
    tx.category = category
    tx.email_id = email_id or f"msg-{uuid.uuid4().hex[:8]}"
    tx.email_subject = email_subject
    tx.parser_confidence = parser_confidence
    tx.is_validated = is_validated
    tx.notes = notes
    tx.created_at = created_at or datetime.now(timezone.utc)
    tx.updated_at = updated_at or datetime.now(timezone.utc)
    return tx
