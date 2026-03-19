import re
from typing import Optional
from decimal import Decimal
from datetime import datetime
from .base import BankParser, ParsedTransaction, EmailData, parser_registry

# Pre-compiled patterns for plain-text body parsing
_RE_MONTO = re.compile(
    r'Monto\s+(?:transacci[oó]n|transferencia):\s*\n?\s*\$?\s*([\d.]+)',
    re.IGNORECASE,
)
_RE_COMERCIO = re.compile(
    r'Comercio:\s*\n?\s*(.+)',
    re.IGNORECASE,
)
_RE_ORIGEN = re.compile(
    r'Origen\s+transferencia:\s*\n?\s*(.+)',
    re.IGNORECASE,
)
_RE_DESTINATARIO = re.compile(
    r'Nombre\s+del\s+destinatario:\s*\n?\s*(.+)',
    re.IGNORECASE,
)
_RE_FECHA = re.compile(
    r'Fecha:\s*\n?\s*(\d{2}-\d{2}-\d{4})',
    re.IGNORECASE,
)
_RE_HORA = re.compile(
    r'Hora:\s*\n?\s*(\d{2}:\d{2}:\d{2})',
    re.IGNORECASE,
)


class TenpoParser(BankParser):
    """Parser for Tenpo transaction notification emails."""

    bank_name = "Tenpo"
    email_domains = ["no-reply@tenpo.cl"]
    subject_keywords = ["comprobante", "transferencia"]

    def parse(self, email_data: EmailData) -> Optional[ParsedTransaction]:
        text = email_data.body or self._extract_clean_text(email_data.html_body or "")
        subject = email_data.subject.lower()

        if "comprobante de compra" in subject:
            return self._parse_compra_credito(email_data, text)
        elif "transferencia exitoso" in subject:
            return self._parse_transferencia_salida(email_data, text)
        elif "comprobante de transferencia" in subject or "transferencia" in subject:
            return self._parse_transferencia_entrada(email_data, text)
        return None

    # ── handlers ──────────────────────────────────────────────────────────────

    def _parse_compra_credito(
        self, email_data: EmailData, text: str
    ) -> Optional[ParsedTransaction]:
        """Credit card purchase — 'La compra por $X con tu tarjeta de crédito Tenpo'"""
        amount = self._extract_amount(text)
        if amount is None:
            return None

        comercio_m = _RE_COMERCIO.search(text)
        description = comercio_m.group(1).strip() if comercio_m else email_data.subject
        transaction_date = self._extract_datetime(text) or email_data.date

        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="debit",
            confidence=self._calculate_confidence(True, bool(transaction_date), bool(comercio_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    def _parse_transferencia_entrada(
        self, email_data: EmailData, text: str
    ) -> Optional[ParsedTransaction]:
        """Incoming transfer — 'La transferencia de [name] por X a tu cuenta Tenpo'"""
        amount = self._extract_amount(text)
        if amount is None:
            return None

        origen_m = _RE_ORIGEN.search(text)
        description = origen_m.group(1).strip() if origen_m else email_data.subject
        transaction_date = self._extract_datetime(text) or email_data.date

        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="transfer_credit",
            confidence=self._calculate_confidence(True, bool(transaction_date), bool(origen_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    def _parse_transferencia_salida(
        self, email_data: EmailData, text: str
    ) -> Optional[ParsedTransaction]:
        """Outgoing transfer — 'Has realizado una transferencia por $X desde tu cuenta Tenpo'"""
        amount = self._extract_amount(text)
        if amount is None:
            return None

        dest_m = _RE_DESTINATARIO.search(text)
        description = dest_m.group(1).strip() if dest_m else email_data.subject
        transaction_date = self._extract_datetime(text) or email_data.date

        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="transfer_debit",
            confidence=self._calculate_confidence(True, bool(transaction_date), bool(dest_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    def _extract_amount(self, text: str) -> Optional[Decimal]:
        m = _RE_MONTO.search(text)
        if not m:
            return None
        try:
            return self.clean_amount(m.group(1))
        except Exception:
            return None

    def _extract_datetime(self, text: str) -> Optional[datetime]:
        fecha_m = _RE_FECHA.search(text)
        hora_m = _RE_HORA.search(text)
        if fecha_m:
            try:
                date_str = fecha_m.group(1)
                if hora_m:
                    return datetime.strptime(
                        f"{date_str} {hora_m.group(1)}", "%d-%m-%Y %H:%M:%S"
                    )
                return datetime.strptime(date_str, "%d-%m-%Y")
            except ValueError:
                pass
        return None

    def _calculate_confidence(
        self,
        has_amount: bool,
        has_date: bool,
        has_description: bool,
    ) -> int:
        score = 0
        if has_amount:
            score += 50
        if has_description:
            score += 30
        if has_date:
            score += 20
        return min(score, 100)


parser_registry.register(TenpoParser)
