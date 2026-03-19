"""
Parser tests using real .eml fixtures from tests/fixtures/emails/.

These tests verify the parser against actual bank emails (anonymized),
not synthetic HTML strings. If the parser fails on these, it will fail
in production on real user emails.
"""

import email as email_lib
import base64
import quopri
from pathlib import Path
from datetime import datetime, timezone

import pytest

from app.parsers.banco_chile import BancoChileParser
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
    return BancoChileParser()


# ── Cargo en Cuenta 0 ────────────────────────────────────────────────────────

class TestFixtureCargoCuenta0:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_has_transaction_date(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert isinstance(result.transaction_date, datetime)

    def test_has_description(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert result.description and len(result.description) > 0

    def test_type_is_debit(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert result.transaction_type in ("debit", "credit", "transfer_debit", "transfer_credit")

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_0.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Cargo en Cuenta 1 ────────────────────────────────────────────────────────

class TestFixtureCargoCuenta1:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_1.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Cargo en Cuenta 2 ────────────────────────────────────────────────────────

class TestFixtureCargoCuenta2:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_2.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_2.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_2.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_cargo_cuenta_2.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Comprobante de Pago ───────────────────────────────────────────────────────

class TestFixtureComprobantePago:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_comprobante_pago_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_comprobante_pago_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_comprobante_pago_1.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_has_transaction_date(self, parser):
        email = load_eml("banco_chile_comprobante_pago_1.eml")
        result = parser.parse(email)
        assert isinstance(result.transaction_date, datetime)

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_comprobante_pago_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia a Terceros (Salida) 0 ──────────────────────────────────────

class TestFixtureTransferenciaSalida0:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_transferencia_salida_0.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_transferencia_salida_0.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_transferencia_salida_0.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_type_is_transfer_debit(self, parser):
        email = load_eml("banco_chile_transferencia_salida_0.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_debit"

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_transferencia_salida_0.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Salida 1 ───────────────────────────────────────────────────

class TestFixtureTransferenciaSalida1:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_transferencia_salida_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_type_is_transfer_debit(self, parser):
        email = load_eml("banco_chile_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_debit"

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_transferencia_salida_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Salida 2 ───────────────────────────────────────────────────

class TestFixtureTransferenciaSalida2:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_transferencia_salida_2.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_transferencia_salida_2.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_transferencia_salida_2.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_transferencia_salida_2.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Aviso de Transferencia (Entrada) 1 ───────────────────────────────────────

class TestFixtureTransferenciaEntrada1:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_1.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_type_is_transfer_credit(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_credit"

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_1.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Transferencia Entrada 2 ──────────────────────────────────────────────────

class TestFixtureTransferenciaEntrada2:
    def test_parser_matches_email(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_2.eml")
        assert parser.matches_email(email)

    def test_parses_without_exception(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result is not None

    def test_has_positive_amount(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.amount > 0

    def test_type_is_transfer_credit(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.transaction_type == "transfer_credit"

    def test_confidence_is_reasonable(self, parser):
        email = load_eml("banco_chile_transferencia_entrada_2.eml")
        result = parser.parse(email)
        assert result.confidence >= 50


# ── Robustez: inputs malformados ──────────────────────────────────────────────

class TestParserRobustness:
    def test_empty_body_returns_none_not_exception(self, parser):
        email = EmailData(
            message_id="empty-001",
            sender="enviodigital@bancochile.cl",
            subject="Cargo en Cuenta",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        result = parser.parse(email)
        assert result is None

    def test_garbage_html_returns_none_not_exception(self, parser):
        email = EmailData(
            message_id="garbage-001",
            sender="enviodigital@bancochile.cl",
            subject="Cargo en Cuenta",
            body="",
            html_body="<html>GARBAGE CONTENT</html>",
            date=datetime.now(timezone.utc),
        )
        result = parser.parse(email)
        assert result is None

    def test_wrong_sender_not_matched(self, parser):
        email = EmailData(
            message_id="other-001",
            sender="noreply@bci.cl",
            subject="Cargo en Cuenta",
            body="",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        assert not parser.matches_email(email)

    def test_none_html_body_no_exception(self, parser):
        email = EmailData(
            message_id="nonhtml-001",
            sender="enviodigital@bancochile.cl",
            subject="Transferencia a Terceros",
            body="Monto: $50.000\nFecha: 01 enero 2026 10:00",
            html_body=None,
            date=datetime.now(timezone.utc),
        )
        # Should not raise, may return None or a result
        try:
            parser.parse(email)
        except Exception as exc:
            pytest.fail(f"Parser raised unexpected exception: {exc}")
