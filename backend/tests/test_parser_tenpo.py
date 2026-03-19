"""
Parser tests for Tenpo using real .eml fixtures from tests/fixtures/emails/.

These tests verify the TenpoParser against actual Tenpo notification emails
(anonymized). If the parser fails on these, it will fail in production on
real user emails.
"""

import email as email_lib
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.parsers.tenpo import TenpoParser
from app.parsers.base import EmailData

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "emails"


# ── Helper ────────────────────────────────────────────────────────────────────

def load_eml(filename: str) -> EmailData:
    """Parse a .eml file into an EmailData object for testing."""
    path = FIXTURES_DIR / filename
    assert path.exists(), f"Fixture not found: {path}"

    with open(path, "rb") as f:
        msg = email_lib.message_from_bytes(f.read())

    subject = msg.get("Subject", "")
    sender = msg.get("From", "")
    date_str = msg.get("Date", "")

    try:
        from email.utils import parsedate_to_datetime
        date = parsedate_to_datetime(date_str).replace(tzinfo=timezone.utc)
    except Exception:
        date = datetime.now(timezone.utc)

    text_body = ""
    html_body = None

    for part in msg.walk():
        content_type = part.get_content_type()
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        charset = part.get_content_charset() or "utf-8"
        decoded = payload.decode(charset, errors="ignore")
        if content_type == "text/plain" and not text_body:
            text_body = decoded
        elif content_type == "text/html":
            html_body = decoded

    return EmailData(
        message_id=f"fixture-{filename}",
        sender=sender,
        subject=subject,
        body=text_body,
        html_body=html_body,
        date=date,
    )


@pytest.fixture
def parser():
    return TenpoParser()


# ── Compra Credito 1: $1.951, PAYU *UBER TRIP ────────────────────────────────

class TestFixtureCompraCredito1:
    def test_parser_matches_email(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_amount_is_1951(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert result.amount == Decimal("1951")

    def test_type_is_debit(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert result.transaction_type == "debit"

    def test_date_is_2025_08_17(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert result.transaction_date.year == 2025
        assert result.transaction_date.month == 8
        assert result.transaction_date.day == 17

    def test_description_contains_uber(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert "UBER" in result.description.upper()

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("tenpo_compra_credito_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Compra Credito 2: $5.000, MERPAGO*JUANCARLOS ─────────────────────────────

class TestFixtureCompraCredito2:
    def test_parser_matches_email(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert result is not None

    def test_amount_is_5000(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert result.amount == Decimal("5000")

    def test_type_is_debit(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert result.transaction_type == "debit"

    def test_date_is_2025_07_05(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert result.transaction_date.year == 2025
        assert result.transaction_date.month == 7
        assert result.transaction_date.day == 5

    def test_description_contains_merpago(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert "MERPAGO" in result.description.upper()

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("tenpo_compra_credito_2.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Entrada 1: $1.000, Juan CarlosPérez ─────────────────────

class TestFixtureTransferenciaEntrada1:
    def test_parser_matches_email(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_amount_is_1000(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.amount == Decimal("1000")

    def test_type_is_transfer_credit(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_credit"

    def test_date_is_2025_08_06(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.transaction_date.year == 2025
        assert result.transaction_date.month == 8
        assert result.transaction_date.day == 6

    def test_description_contains_name(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert "Juan" in result.description or "JUAN" in result.description

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("tenpo_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Entrada 2: $173.000, Juan CarlosPérez ───────────────────

class TestFixtureTransferenciaEntrada2:
    def test_parser_matches_email(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result is not None

    def test_amount_is_173000(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.amount == Decimal("173000")

    def test_type_is_transfer_credit(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_credit"

    def test_date_is_2025_07_16(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.transaction_date.year == 2025
        assert result.transaction_date.month == 7
        assert result.transaction_date.day == 16

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("tenpo_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Salida 1: $36.000, JUAN CARLOS PÉREZ LÓPEZ ─────────────

class TestFixtureTransferenciaSalida1:
    def test_parser_matches_email(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_amount_is_36000(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.amount == Decimal("36000")

    def test_type_is_transfer_debit(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_debit"

    def test_date_is_2025_08_16(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.transaction_date.year == 2025
        assert result.transaction_date.month == 8
        assert result.transaction_date.day == 16

    def test_description_contains_name(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert "JUAN" in result.description.upper()

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("tenpo_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Robustez: inputs malformados ──────────────────────────────────────────────

class TestTenpoParserRobustness:
    def test_empty_body_returns_none(self, parser):
        email = EmailData(
            message_id="empty-001",
            sender="Tenpo <no-reply@tenpo.cl>",
            subject="Comprobante de compra con tu tarjeta de credito",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        result = parser.parse(email)
        assert result is None

    def test_garbage_html_returns_none(self, parser):
        email = EmailData(
            message_id="garbage-001",
            sender="Tenpo <no-reply@tenpo.cl>",
            subject="Comprobante de compra con tu tarjeta de credito",
            body="<html>GARBAGE CONTENT</html>",
            html_body="<html>GARBAGE CONTENT</html>",
            date=datetime.now(timezone.utc),
        )
        result = parser.parse(email)
        assert result is None

    def test_wrong_sender_not_matched(self, parser):
        email = EmailData(
            message_id="other-001",
            sender="noreply@bci.cl",
            subject="Comprobante de compra con tu tarjeta de credito",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        assert not parser.matches_email(email)

    def test_wrong_subject_not_matched(self, parser):
        email = EmailData(
            message_id="other-002",
            sender="Tenpo <no-reply@tenpo.cl>",
            subject="Bienvenido a Tenpo",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        assert not parser.matches_email(email)

    def test_none_body_no_exception(self, parser):
        email = EmailData(
            message_id="nonbody-001",
            sender="Tenpo <no-reply@tenpo.cl>",
            subject="Comprobante de transferencia exitoso - Tenpo",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        try:
            parser.parse(email)
        except Exception as exc:
            pytest.fail(f"Parser raised unexpected exception: {exc}")
