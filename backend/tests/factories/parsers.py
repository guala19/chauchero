"""Factory for ParsedTransaction objects."""

from datetime import datetime, timezone
from decimal import Decimal
from app.parsers.base import ParsedTransaction


def make_parsed_transaction(
    *,
    amount=Decimal("10000"),
    transaction_date=None,
    description="Test Merchant",
    transaction_type="debit",
    last_4_digits="1234",
    category=None,
    confidence=100,
    raw_data=None,
):
    return ParsedTransaction(
        amount=amount,
        transaction_date=transaction_date or datetime.now(timezone.utc),
        description=description,
        transaction_type=transaction_type,
        last_4_digits=last_4_digits,
        category=category,
        confidence=confidence,
        raw_data=raw_data,
    )
