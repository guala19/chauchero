import email as email_lib
from datetime import datetime
from decimal import Decimal
from email.utils import parsedate_to_datetime
from pathlib import Path

import pytest

from app.parsers.banco_chile import BancoChileParser
from app.parsers.base import EmailData

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "emails"


def load_eml(filename: str) -> EmailData:
    filepath = FIXTURES_DIR / filename
    with open(filepath, "rb") as f:
        msg = email_lib.message_from_binary_file(f)

    subject = msg.get("Subject", "")
    sender = msg.get("From", "")
    date_str = msg.get("Date", "")
    try:
        date = parsedate_to_datetime(date_str).replace(tzinfo=None)
    except Exception:
        date = datetime.now()

    body = ""
    html_body = ""
    for part in msg.walk():
        ct = part.get_content_type()
        if ct == "text/plain" and not body:
            payload = part.get_payload(decode=True)
            if payload:
                body = payload.decode("utf-8", errors="replace")
        elif ct == "text/html" and not html_body:
            payload = part.get_payload(decode=True)
            if payload:
                html_body = payload.decode("utf-8", errors="replace")

    return EmailData(
        message_id=msg.get("Message-ID", "test"),
        sender=sender,
        subject=subject,
        body=body,
        date=date,
        html_body=html_body,
    )


@pytest.fixture
def parser():
    return BancoChileParser()


# ── fixture-based parser tests ───────────────────────────────────────────────

def test_cargo_cuenta(parser):
    email_data = load_eml("banco_chile_cargo_cuenta_0.eml")
    result = parser.parse(email_data)

    assert result is not None
    assert result.amount == Decimal("9480")
    assert result.description == "DL RAPPI CHILE RA"
    assert result.last_4_digits == "1064"
    assert result.transaction_type == "debit"
    assert result.transaction_date.day == 27
    assert result.transaction_date.month == 2
    assert result.transaction_date.year == 2026


def test_comprobante_pago(parser):
    email_data = load_eml("banco_chile_comprobante_pago_1.eml")
    result = parser.parse(email_data)

    assert result is not None
    assert result.amount == Decimal("2300")
    assert result.description == "PASAJEBUS"
    assert result.last_4_digits == "8560"
    assert result.transaction_type == "debit"
    assert result.transaction_date.day == 4
    assert result.transaction_date.month == 12
    assert result.transaction_date.year == 2025


def test_transferencia_salida(parser):
    email_data = load_eml("banco_chile_transferencia_salida_0.eml")
    result = parser.parse(email_data)

    assert result is not None
    assert result.amount == Decimal("230000")
    assert result.description == "Pedro González Muñoz"
    assert result.transaction_type == "transfer_debit"
    assert result.transaction_date.day == 10
    assert result.transaction_date.month == 3
    assert result.transaction_date.year == 2026


def test_transferencia_entrada(parser):
    email_data = load_eml("banco_chile_transferencia_entrada_1.eml")
    result = parser.parse(email_data)

    assert result is not None
    assert result.amount == Decimal("5000")
    assert result.description == "Juan Carlos Pérez"
    assert result.transaction_type == "transfer_credit"
    assert result.transaction_date.day == 4
    assert result.transaction_date.month == 2
    assert result.transaction_date.year == 2026


# ── matches_email ─────────────────────────────────────────────────────────────

def test_matches_banco_chile_email(parser):
    email_data = load_eml("banco_chile_cargo_cuenta_0.eml")
    assert parser.matches_email(email_data) is True


def test_rejects_other_bank(parser):
    other = EmailData(
        message_id="x",
        sender="santander@santander.cl",
        subject="Compra con tarjeta",
        body="Compra realizada",
        date=datetime.now(),
    )
    assert parser.matches_email(other) is False


# ── utility tests ─────────────────────────────────────────────────────────────

def test_clean_amount(parser):
    assert parser.clean_amount("9.480") == Decimal("9480")
    assert parser.clean_amount("$1.234.567") == Decimal("1234567")
    assert parser.clean_amount("$ 5.000") == Decimal("5000")
    assert parser.clean_amount("230.000") == Decimal("230000")


def test_parse_date(parser):
    date = parser.parse_date("04/12/2025")
    assert date.day == 4
    assert date.month == 12
    assert date.year == 2025
