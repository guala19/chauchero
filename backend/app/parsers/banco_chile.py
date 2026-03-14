import re
from typing import Optional
from decimal import Decimal
from datetime import datetime
from .base import BankParser, ParsedTransaction, EmailData, parser_registry

# Pre-compiled patterns (compiled once at module load)
_RE_CARGO_MAIN = re.compile(
    r'compra por \$([\d.]+) con cargo a Cuenta \*{4}(\d{4}) en (.+?) el (\d{2}/\d{2}/\d{4} \d{2}:\d{2})',
    re.IGNORECASE,
)
_RE_AMOUNT = re.compile(r'(?:Total|Monto)\s*\$\s*([\d.]+)')
_RE_DATE_SIMPLE = re.compile(r'Fecha y Hora\s+(\d{2}/\d{2}/\d{4})')
_RE_MERCHANT = re.compile(
    r'Comercio\s+([A-Z][A-Z0-9\s]+?)(?=\s+(?:Monto|ID|Detalle|Direcci))',
)
_RE_CARD = re.compile(r'\*{4}(\d{4})')
_RE_DATE_SPANISH = re.compile(
    r'Fecha y Hora:\s+\w+\s+(\d{1,2}) de (\w+) de (\d{4}) (\d{2}:\d{2})',
)
_RE_RECIPIENT = re.compile(
    r'Destino\s+Nombre y Apellido\s+(.+?)\s+Rut',
    re.IGNORECASE,
)
_RE_SENDER = re.compile(r'cliente\s+(.+?)\s+ha efectuado', re.IGNORECASE)

_MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}


class BancoChileParser(BankParser):
    """Parser for Banco de Chile transaction notification emails."""

    bank_name = "Banco de Chile"
    email_domains = [
        "enviodigital@bancochile.cl",
        "serviciodetransferencias@bancochile.cl",
    ]
    subject_keywords = [
        "transacción", "transaccion", "compra", "cargo",
        "abono", "transferencia", "comprobante",
    ]

    def parse(self, email_data: EmailData) -> Optional[ParsedTransaction]:
        text = self._extract_clean_text(email_data.html_body or email_data.body)
        subject = email_data.subject.lower()

        if "cargo en cuenta" in subject:
            return self._parse_cargo_cuenta(email_data, text)
        elif "comprobante de pago" in subject:
            return self._parse_comprobante_pago(email_data, text)
        elif "transferencia a terceros" in subject:
            return self._parse_transferencia_salida(email_data, text)
        elif "aviso de transferencia" in subject:
            return self._parse_transferencia_entrada(email_data, text)
        return None

    # ── handlers ──────────────────────────────────────────────────────────────

    def _parse_cargo_cuenta(self, email_data: EmailData, text: str) -> Optional[ParsedTransaction]:
        """Type 1 — prose: 'compra por $9.480 con cargo a Cuenta ****1064 en ... el ...'"""
        m = _RE_CARGO_MAIN.search(text)
        if not m:
            return None
        amount_raw, card, merchant, date_str = m.groups()
        try:
            amount = self.clean_amount(amount_raw)
            transaction_date = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
        except Exception:
            return None
        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=merchant.strip(),
            transaction_type="debit",
            last_4_digits=card,
            confidence=self._calculate_confidence(True, True, True),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    def _parse_comprobante_pago(self, email_data: EmailData, text: str) -> Optional[ParsedTransaction]:
        """Type 2 — table: Comercio / Monto / Fecha y Hora / card digits."""
        amount_m = _RE_AMOUNT.search(text)
        if not amount_m:
            return None
        try:
            amount = self.clean_amount(amount_m.group(1))
        except Exception:
            return None

        merchant_m = _RE_MERCHANT.search(text)
        date_m = _RE_DATE_SIMPLE.search(text)
        card_m = _RE_CARD.search(text)

        transaction_date = email_data.date
        if date_m:
            try:
                transaction_date = datetime.strptime(date_m.group(1), "%d/%m/%Y")
            except ValueError:
                pass

        description = merchant_m.group(1).strip() if merchant_m else email_data.subject
        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="debit",
            last_4_digits=card_m.group(1) if card_m else None,
            confidence=self._calculate_confidence(True, bool(date_m), bool(merchant_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    def _parse_transferencia_salida(self, email_data: EmailData, text: str) -> Optional[ParsedTransaction]:
        """Type 3 — outgoing transfer."""
        amount_m = _RE_AMOUNT.search(text)
        if not amount_m:
            return None
        try:
            amount = self.clean_amount(amount_m.group(1))
        except Exception:
            return None

        transaction_date = self._parse_spanish_datetime(text) or email_data.date
        recipient_m = _RE_RECIPIENT.search(text)
        description = recipient_m.group(1).strip() if recipient_m else email_data.subject
        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="transfer_debit",
            last_4_digits=None,
            confidence=self._calculate_confidence(True, bool(transaction_date), bool(recipient_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    def _parse_transferencia_entrada(self, email_data: EmailData, text: str) -> Optional[ParsedTransaction]:
        """Type 4 — incoming transfer."""
        amount_m = _RE_AMOUNT.search(text)
        if not amount_m:
            return None
        try:
            amount = self.clean_amount(amount_m.group(1))
        except Exception:
            return None

        transaction_date = self._parse_spanish_datetime(text) or email_data.date
        sender_m = _RE_SENDER.search(text)
        description = sender_m.group(1).strip() if sender_m else email_data.subject
        return ParsedTransaction(
            amount=amount,
            transaction_date=transaction_date,
            description=description,
            transaction_type="transfer_credit",
            last_4_digits=None,
            confidence=self._calculate_confidence(True, bool(transaction_date), bool(sender_m)),
            raw_data={"email_id": email_data.message_id, "subject": email_data.subject},
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    def _parse_spanish_datetime(self, text: str) -> Optional[datetime]:
        m = _RE_DATE_SPANISH.search(text)
        if m:
            day, month_str, year, time = m.groups()
            month = _MESES.get(month_str.lower())
            if month:
                try:
                    return datetime.strptime(
                        f"{int(day):02d}/{month:02d}/{year} {time}", "%d/%m/%Y %H:%M"
                    )
                except ValueError:
                    pass
        return None

    def _calculate_confidence(
        self,
        has_amount: bool,
        has_date: bool,
        has_description: bool,
        has_payment_method: bool = False,
        has_auth_code: bool = False,
    ) -> int:
        score = 0
        if has_amount:
            score += 50
        if has_description:
            score += 30
        if has_date:
            score += 20
        if has_payment_method:
            score += 5
        if has_auth_code:
            score += 5
        return min(score, 100)


parser_registry.register(BancoChileParser)
