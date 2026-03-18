"""
Comprehensive tests for BancoChileParser.

Covers all 4 transaction types + edge cases + confidence scoring.
Existing .eml fixture tests are in test_banco_chile_parser.py — these
test synthetic inputs for finer-grained control.
"""

import pytest
from datetime import datetime
from decimal import Decimal

from app.parsers.banco_chile import BancoChileParser
from tests.factories import make_email_data


@pytest.fixture
def parser():
    return BancoChileParser()


# ── Cargo en Cuenta ──────────────────────────────────────────────────────────


class TestCargoCuenta:
    def test_parses_standard_body(self, parser):
        body = "Se ha realizado una compra por $9.480 con cargo a Cuenta ****1064 en DL RAPPI CHILE RA el 27/02/2026 14:30"
        email = make_email_data(subject="Cargo en Cuenta", body=body)
        result = parser.parse(email)

        assert result is not None
        assert result.amount == Decimal("9480")
        assert result.description == "DL RAPPI CHILE RA"
        assert result.last_4_digits == "1064"
        assert result.transaction_type == "debit"
        assert result.transaction_date == datetime(2026, 2, 27, 14, 30)

    def test_missing_pattern_returns_none(self, parser):
        email = make_email_data(subject="Cargo en Cuenta", body="No match here")
        assert parser.parse(email) is None

    def test_case_insensitive_subject(self, parser):
        body = "compra por $5.000 con cargo a Cuenta ****9999 en UBER el 01/01/2026 10:00"
        email = make_email_data(subject="CARGO EN CUENTA", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.amount == Decimal("5000")

    def test_large_amount(self, parser):
        body = "compra por $1.234.567 con cargo a Cuenta ****0001 en APPLE el 15/06/2026 09:00"
        email = make_email_data(subject="Cargo en Cuenta", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.amount == Decimal("1234567")

    def test_confidence_has_all_fields(self, parser):
        body = "compra por $100 con cargo a Cuenta ****0001 en SHOP el 01/01/2026 10:00"
        email = make_email_data(subject="Cargo en Cuenta", body=body)
        result = parser.parse(email)
        # has_amount=True(50), has_date=True(20), has_description=True(30) = 100
        assert result.confidence == 100


# ── Comprobante de Pago ──────────────────────────────────────────────────────


class TestComprobantePago:
    def test_parses_table_format(self, parser):
        body = "Comercio PASAJEBUS Monto $2.300 Fecha y Hora 04/12/2025 ID xxx ****8560"
        email = make_email_data(subject="Comprobante de Pago", body=body)
        result = parser.parse(email)

        assert result is not None
        assert result.amount == Decimal("2300")
        assert result.description == "PASAJEBUS"
        assert result.last_4_digits == "8560"
        assert result.transaction_type == "debit"

    def test_no_amount_returns_none(self, parser):
        body = "Comercio SHOP Fecha y Hora 04/12/2025"
        email = make_email_data(subject="Comprobante de Pago", body=body)
        assert parser.parse(email) is None

    def test_missing_merchant_uses_subject(self, parser):
        body = "Total $5.000 ****1111"
        email = make_email_data(subject="Comprobante de Pago", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.description == "Comprobante de Pago"

    def test_missing_date_uses_email_date(self, parser):
        email_date = datetime(2026, 3, 1, 12, 0)
        body = "Comercio TEST Monto $1.000"
        email = make_email_data(subject="Comprobante de Pago", body=body, date=email_date)
        result = parser.parse(email)
        assert result is not None
        assert result.transaction_date == email_date

    def test_confidence_without_date_or_merchant(self, parser):
        body = "Total $5.000"
        email = make_email_data(subject="Comprobante de Pago", body=body)
        result = parser.parse(email)
        # has_amount=True(50), has_date=False(0), has_description=False(0) = 50
        assert result.confidence == 50


# ── Transferencia Salida ─────────────────────────────────────────────────────


class TestTransferenciaSalida:
    def test_parses_outgoing_transfer(self, parser):
        body = (
            "Destino Nombre y Apellido Juan Perez Rut 12345678-9 "
            "Monto $230.000 "
            "Fecha y Hora: Lunes 10 de marzo de 2026 14:00"
        )
        email = make_email_data(subject="Transferencia a Terceros", body=body)
        result = parser.parse(email)

        assert result is not None
        assert result.amount == Decimal("230000")
        assert result.description == "Juan Perez"
        assert result.transaction_type == "transfer_debit"
        assert result.transaction_date.month == 3
        assert result.transaction_date.day == 10

    def test_no_amount_returns_none(self, parser):
        body = "Destino Nombre y Apellido Juan Perez Rut 12345678-9"
        email = make_email_data(subject="Transferencia a Terceros", body=body)
        assert parser.parse(email) is None

    def test_missing_recipient_uses_subject(self, parser):
        body = "Monto $50.000"
        email = make_email_data(subject="Transferencia a Terceros", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.description == "Transferencia a Terceros"

    def test_last_4_digits_always_none(self, parser):
        body = "Monto $10.000 ****9999"
        email = make_email_data(subject="Transferencia a Terceros", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.last_4_digits is None


# ── Transferencia Entrada ────────────────────────────────────────────────────


class TestTransferenciaEntrada:
    def test_parses_incoming_transfer(self, parser):
        body = (
            "El cliente Diego Alejandro Guala ha efectuado una transferencia "
            "Monto $5.000 "
            "Fecha y Hora: Martes 4 de febrero de 2026 09:30"
        )
        email = make_email_data(
            sender="serviciodetransferencias@bancochile.cl",
            subject="Aviso de transferencia de fondos",
            body=body,
        )
        result = parser.parse(email)

        assert result is not None
        assert result.amount == Decimal("5000")
        assert result.description == "Diego Alejandro Guala"
        assert result.transaction_type == "transfer_credit"

    def test_no_amount_returns_none(self, parser):
        body = "El cliente Fulano ha efectuado una transferencia"
        email = make_email_data(subject="Aviso de transferencia de fondos", body=body)
        assert parser.parse(email) is None

    def test_missing_sender_uses_subject(self, parser):
        body = "Monto $100.000"
        email = make_email_data(subject="Aviso de transferencia de fondos", body=body)
        result = parser.parse(email)
        assert result is not None
        assert result.description == "Aviso de transferencia de fondos"


# ── Unrecognized subjects ────────────────────────────────────────────────────


class TestUnrecognizedSubjects:
    def test_unknown_subject_returns_none(self, parser):
        email = make_email_data(subject="Newsletter semanal", body="irrelevant")
        assert parser.parse(email) is None

    def test_empty_subject_returns_none(self, parser):
        email = make_email_data(subject="", body="irrelevant")
        assert parser.parse(email) is None


# ── Spanish datetime parsing ─────────────────────────────────────────────────


class TestSpanishDatetime:
    def test_all_months(self, parser):
        months = {
            "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
            "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
            "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
        }
        for name, num in months.items():
            text = f"Fecha y Hora: Lunes 15 de {name} de 2026 10:00"
            dt = parser._parse_spanish_datetime(text)
            assert dt is not None, f"Failed for {name}"
            assert dt.month == num

    def test_invalid_month_returns_none(self, parser):
        text = "Fecha y Hora: Lunes 15 de invalid de 2026 10:00"
        assert parser._parse_spanish_datetime(text) is None

    def test_no_match_returns_none(self, parser):
        assert parser._parse_spanish_datetime("no date here") is None


# ── Confidence scoring ───────────────────────────────────────────────────────


class TestConfidenceScoring:
    def test_all_true(self, parser):
        assert parser._calculate_confidence(True, True, True, True, True) == 100

    def test_capped_at_100(self, parser):
        assert parser._calculate_confidence(True, True, True, True, True) <= 100

    def test_amount_only(self, parser):
        assert parser._calculate_confidence(True, False, False) == 50

    def test_nothing(self, parser):
        assert parser._calculate_confidence(False, False, False) == 0

    def test_amount_and_date(self, parser):
        assert parser._calculate_confidence(True, True, False) == 70
