"""Tests for TransactionValidator — sanitization, validation, normalization."""

import pytest
from decimal import Decimal
from datetime import datetime, timezone

from app.utils.transaction_validator import TransactionValidator
from tests.factories import make_parsed_transaction


# ── is_valid ─────────────────────────────────────────────────────────────────


class TestIsValid:
    def test_valid_transaction(self):
        tx = make_parsed_transaction()
        assert TransactionValidator.is_valid(tx) is True

    def test_zero_amount_invalid(self):
        tx = make_parsed_transaction(amount=Decimal("0"))
        assert TransactionValidator.is_valid(tx) is False

    def test_negative_amount_invalid(self):
        tx = make_parsed_transaction(amount=Decimal("-100"))
        assert TransactionValidator.is_valid(tx) is False

    def test_none_amount_raises(self):
        # amount=None causes TypeError in the validator's `amount > 0` check
        # which means the validator doesn't guard against None — test documents this behavior
        tx = make_parsed_transaction(amount=None)
        with pytest.raises(TypeError):
            TransactionValidator.is_valid(tx)

    def test_empty_description_invalid(self):
        tx = make_parsed_transaction(description="")
        assert TransactionValidator.is_valid(tx) is False

    def test_none_description_invalid(self):
        tx = make_parsed_transaction(description=None)
        assert TransactionValidator.is_valid(tx) is False


# ── sanitize_description ─────────────────────────────────────────────────────


class TestSanitizeDescription:
    def test_capitalizes_words(self):
        assert TransactionValidator.sanitize_description("rappi chile") == "Rappi Chile"

    def test_preserves_short_acronyms(self):
        assert TransactionValidator.sanitize_description("BCI ATM") == "BCI ATM"

    def test_collapses_whitespace(self):
        assert TransactionValidator.sanitize_description("  hello   world  ") == "Hello World"

    def test_empty_string_returns_fallback(self):
        assert TransactionValidator.sanitize_description("") == "Comercio no identificado"

    def test_none_returns_fallback(self):
        assert TransactionValidator.sanitize_description(None) == "Comercio no identificado"

    def test_truncates_at_200_chars(self):
        long = "A" * 300
        result = TransactionValidator.sanitize_description(long)
        assert len(result) == 200

    def test_mixed_case(self):
        assert TransactionValidator.sanitize_description("mACDONALDS") == "Macdonalds"

    def test_single_word(self):
        assert TransactionValidator.sanitize_description("uber") == "Uber"


# ── sanitize_amount ──────────────────────────────────────────────────────────


class TestSanitizeAmount:
    def test_positive_unchanged(self):
        assert TransactionValidator.sanitize_amount(Decimal("5000")) == Decimal("5000")

    def test_negative_becomes_positive(self):
        assert TransactionValidator.sanitize_amount(Decimal("-5000")) == Decimal("5000")

    def test_rounds_to_two_decimals(self):
        result = TransactionValidator.sanitize_amount(Decimal("1234.5678"))
        assert result == Decimal("1234.57")

    def test_zero_stays_zero(self):
        assert TransactionValidator.sanitize_amount(Decimal("0")) == Decimal("0")

    def test_preserves_decimal_precision(self):
        """Ensure no float conversion occurs — Decimal stays exact."""
        large = Decimal("99999999999.99")
        result = TransactionValidator.sanitize_amount(large)
        assert result == large
        assert isinstance(result, Decimal)

    def test_result_has_two_decimal_places(self):
        result = TransactionValidator.sanitize_amount(Decimal("5000"))
        assert result == Decimal("5000.00")


# ── normalize_transaction_type ───────────────────────────────────────────────


class TestNormalizeTransactionType:
    def test_debit_keywords(self):
        for kw in ["debit", "debito", "cargo", "compra", "purchase"]:
            assert TransactionValidator.normalize_transaction_type(kw) == "debit"

    def test_credit_keywords(self):
        for kw in ["credit", "credito", "abono", "deposito", "deposit"]:
            assert TransactionValidator.normalize_transaction_type(kw) == "credit"

    def test_transfer_debit(self):
        assert TransactionValidator.normalize_transaction_type("transfer_debit") == "transfer_debit"
        assert TransactionValidator.normalize_transaction_type("transferencia cargo") == "transfer_debit"

    def test_transfer_credit(self):
        assert TransactionValidator.normalize_transaction_type("transfer_credit") == "transfer_credit"
        assert TransactionValidator.normalize_transaction_type("transferencia") == "transfer_credit"

    def test_unknown_defaults_to_debit(self):
        assert TransactionValidator.normalize_transaction_type("xyzzy") == "debit"

    def test_case_insensitive(self):
        assert TransactionValidator.normalize_transaction_type("DEBIT") == "debit"
        assert TransactionValidator.normalize_transaction_type("Compra") == "debit"


# ── get_confidence_level / get_confidence_color ──────────────────────────────


class TestConfidenceHelpers:
    def test_high_confidence(self):
        assert TransactionValidator.get_confidence_level(100) == "high"
        assert TransactionValidator.get_confidence_level(80) == "high"
        assert TransactionValidator.get_confidence_color(80) == "green"

    def test_medium_confidence(self):
        assert TransactionValidator.get_confidence_level(79) == "medium"
        assert TransactionValidator.get_confidence_level(50) == "medium"
        assert TransactionValidator.get_confidence_color(50) == "yellow"

    def test_low_confidence(self):
        assert TransactionValidator.get_confidence_level(49) == "low"
        assert TransactionValidator.get_confidence_level(0) == "low"
        assert TransactionValidator.get_confidence_color(0) == "red"


# ── filter_valid_transactions ────────────────────────────────────────────────


class TestFilterValid:
    def test_filters_invalid(self):
        valid = make_parsed_transaction(amount=Decimal("100"))
        invalid = make_parsed_transaction(amount=Decimal("0"))
        result = TransactionValidator.filter_valid_transactions([valid, invalid])
        assert len(result) == 1
        assert result[0].amount == Decimal("100")

    def test_empty_list(self):
        assert TransactionValidator.filter_valid_transactions([]) == []


# ── calculate_statistics ─────────────────────────────────────────────────────


class TestCalculateStatistics:
    def test_empty_list(self):
        stats = TransactionValidator.calculate_statistics([])
        assert stats["total"] == 0
        assert stats["total_amount"] == 0
        assert stats["average_confidence"] == 0

    def test_mixed_confidence(self):
        txs = [
            make_parsed_transaction(amount=Decimal("100"), confidence=90),
            make_parsed_transaction(amount=Decimal("200"), confidence=60),
            make_parsed_transaction(amount=Decimal("300"), confidence=30),
        ]
        stats = TransactionValidator.calculate_statistics(txs)
        assert stats["total"] == 3
        assert stats["valid"] == 3
        assert stats["high_confidence_count"] == 1
        assert stats["medium_confidence_count"] == 1
        assert stats["low_confidence_count"] == 1
        assert stats["total_amount"] == 600.0
        assert stats["average_confidence"] == 60.0

    def test_excludes_invalid_from_stats(self):
        txs = [
            make_parsed_transaction(amount=Decimal("100")),
            make_parsed_transaction(amount=Decimal("0")),  # invalid
        ]
        stats = TransactionValidator.calculate_statistics(txs)
        assert stats["total"] == 2
        assert stats["valid"] == 1
