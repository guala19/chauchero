"""Tests for Pydantic schemas — validation, serialization, edge cases."""

import pytest
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from app.schemas.transaction import (
    TransactionUpdate,
    TransactionResponse,
    SyncStats,
    SyncResponse,
)
from app.schemas.user import UserResponse, TokenResponse
from app.schemas.bank import BankInfo


# ── TransactionUpdate ────────────────────────────────────────────────────────


class TestTransactionUpdate:
    def test_all_optional(self):
        update = TransactionUpdate()
        dumped = update.model_dump(exclude_unset=True)
        assert dumped == {}

    def test_partial_fields(self):
        update = TransactionUpdate(notes="hello")
        dumped = update.model_dump(exclude_unset=True)
        assert dumped == {"notes": "hello"}

    def test_all_fields(self):
        update = TransactionUpdate(
            description="New Desc",
            category="food",
            notes="note",
            is_validated=True,
        )
        dumped = update.model_dump(exclude_unset=True)
        assert len(dumped) == 4


# ── TransactionResponse ─────────────────────────────────────────────────────


class TestTransactionResponse:
    def test_from_dict(self):
        data = {
            "id": uuid4(),
            "account_id": uuid4(),
            "amount": Decimal("5000"),
            "transaction_date": datetime(2026, 1, 1),
            "description": "Test",
            "transaction_type": "debit",
            "parser_confidence": 90,
            "is_validated": True,
            "created_at": datetime(2026, 1, 1),
        }
        resp = TransactionResponse(**data)
        assert resp.amount == Decimal("5000")
        assert resp.category is None
        assert resp.notes is None


# ── SyncStats / SyncResponse ────────────────────────────────────────────────


class TestSyncSchemas:
    def test_sync_stats(self):
        stats = SyncStats(
            emails_fetched=10,
            transactions_created=5,
            transactions_skipped=3,
            parsing_errors=1,
            unsupported_banks=1,
        )
        assert stats.emails_fetched == 10

    def test_sync_response(self):
        resp = SyncResponse(
            success=True,
            message="Done",
            stats=SyncStats(
                emails_fetched=0,
                transactions_created=0,
                transactions_skipped=0,
                parsing_errors=0,
                unsupported_banks=0,
            ),
        )
        assert resp.success is True


# ── UserResponse / TokenResponse ─────────────────────────────────────────────


class TestUserSchemas:
    def test_user_response(self):
        resp = UserResponse(
            rut="12.345.678-5",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            created_at=datetime(2026, 1, 1),
        )
        assert resp.last_sync_at is None

    def test_token_response(self):
        user = UserResponse(
            rut="12.345.678-5",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            created_at=datetime(2026, 1, 1),
        )
        resp = TokenResponse(
            access_token="abc",
            token_type="bearer",
            user=user,
        )
        assert resp.access_token == "abc"


# ── BankInfo ─────────────────────────────────────────────────────────────────


class TestBankInfo:
    def test_defaults(self):
        info = BankInfo(name="Test", email_domains=["a@b.cl"])
        assert info.supported is True

    def test_explicit_supported_false(self):
        info = BankInfo(name="Test", email_domains=[], supported=False)
        assert info.supported is False
