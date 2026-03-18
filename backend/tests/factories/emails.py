"""Factory for EmailData objects used in parser tests."""

from datetime import datetime, timezone
from app.parsers.base import EmailData


def make_email_data(
    *,
    message_id="msg-test-001",
    sender="enviodigital@bancochile.cl",
    subject="Cargo en Cuenta",
    body="",
    html_body=None,
    date=None,
):
    return EmailData(
        message_id=message_id,
        sender=sender,
        subject=subject,
        body=body,
        date=date or datetime.now(timezone.utc),
        html_body=html_body,
    )
