"""Tests for base parser utilities: clean_amount, parse_date, ParserRegistry."""

import pytest
from decimal import Decimal
from datetime import datetime

from app.parsers.base import BankParser, ParsedTransaction, EmailData, ParserRegistry
from tests.factories import make_email_data


# ── clean_amount ─────────────────────────────────────────────────────────────


class ConcreteParser(BankParser):
    bank_name = "Test Bank"
    email_domains = ["test@bank.cl"]

    def parse(self, email):
        return None


@pytest.fixture
def base_parser():
    return ConcreteParser()


class TestCleanAmount:
    def test_chilean_format_dots_as_thousands(self, base_parser):
        assert base_parser.clean_amount("9.480") == Decimal("9480")

    def test_dollar_sign_stripped(self, base_parser):
        assert base_parser.clean_amount("$1.234.567") == Decimal("1234567")

    def test_dollar_sign_with_space(self, base_parser):
        assert base_parser.clean_amount("$ 5.000") == Decimal("5000")

    def test_simple_number(self, base_parser):
        assert base_parser.clean_amount("230000") == Decimal("230000")

    def test_comma_as_decimal(self, base_parser):
        assert base_parser.clean_amount("1.234,56") == Decimal("1234.56")

    def test_empty_string_raises(self, base_parser):
        with pytest.raises(ValueError, match="Cannot parse amount"):
            base_parser.clean_amount("")

    def test_only_symbols_raises(self, base_parser):
        with pytest.raises(ValueError, match="Cannot parse amount"):
            base_parser.clean_amount("$  ")

    def test_only_dots_raises(self, base_parser):
        with pytest.raises(ValueError, match="Cannot parse amount"):
            base_parser.clean_amount(".")

    def test_negative_amount(self, base_parser):
        assert base_parser.clean_amount("-5.000") == Decimal("-5000")


# ── parse_date ───────────────────────────────────────────────────────────────


class TestParseDate:
    def test_standard_format(self, base_parser):
        dt = base_parser.parse_date("04/12/2025")
        assert dt == datetime(2025, 12, 4)

    def test_custom_format(self, base_parser):
        dt = base_parser.parse_date("2025-12-04", "%Y-%m-%d")
        assert dt == datetime(2025, 12, 4)

    def test_invalid_date_raises(self, base_parser):
        with pytest.raises(ValueError):
            base_parser.parse_date("99/99/9999")

    def test_whitespace_stripped(self, base_parser):
        dt = base_parser.parse_date("  04/12/2025  ")
        assert dt == datetime(2025, 12, 4)


# ── extract_clean_text ───────────────────────────────────────────────────────


class TestExtractCleanText:
    def test_strips_html(self, base_parser):
        assert base_parser._extract_clean_text("<b>Hello</b> world") == "Hello world"

    def test_decodes_entities(self, base_parser):
        assert base_parser._extract_clean_text("&amp; &lt;") == "& <"

    def test_collapses_whitespace(self, base_parser):
        assert base_parser._extract_clean_text("  a   b  ") == "a b"

    def test_empty_input(self, base_parser):
        assert base_parser._extract_clean_text("") == ""

    def test_none_input(self, base_parser):
        assert base_parser._extract_clean_text(None) == ""


# ── matches_email ────────────────────────────────────────────────────────────


class TestMatchesEmail:
    def test_matches_domain(self, base_parser):
        email = make_email_data(sender="test@bank.cl", subject="cargo compra")
        assert base_parser.matches_email(email) is True

    def test_rejects_wrong_domain(self, base_parser):
        email = make_email_data(sender="other@other.cl", subject="cargo")
        assert base_parser.matches_email(email) is False

    def test_case_insensitive_sender(self, base_parser):
        email = make_email_data(sender="Test@Bank.CL", subject="any subject")
        # No subject_keywords on ConcreteParser, so domain match only
        assert base_parser.matches_email(email) is True


# ── ParserRegistry ───────────────────────────────────────────────────────────


class TestParserRegistry:
    def test_register_and_find(self):
        registry = ParserRegistry()

        class FakeParser(BankParser):
            bank_name = "Fake Bank"
            email_domains = ["fake@bank.cl"]
            subject_keywords = []

            def parse(self, email):
                return None

        registry.register(FakeParser)
        email = make_email_data(sender="fake@bank.cl")
        parser = registry.get_parser_for_email(email)
        assert parser is not None
        assert parser.bank_name == "Fake Bank"

    def test_no_match_returns_none(self):
        registry = ParserRegistry()
        email = make_email_data(sender="unknown@unknown.cl")
        assert registry.get_parser_for_email(email) is None

    def test_list_supported_banks(self):
        registry = ParserRegistry()

        class P1(BankParser):
            bank_name = "Bank A"
            email_domains = []
            def parse(self, email): return None

        class P2(BankParser):
            bank_name = "Bank B"
            email_domains = []
            def parse(self, email): return None

        registry.register(P1)
        registry.register(P2)
        assert registry.list_supported_banks() == ["Bank A", "Bank B"]
