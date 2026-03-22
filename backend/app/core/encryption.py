"""
Transparent field-level encryption for sensitive database columns.

Uses Fernet (AES-128-CBC + HMAC-SHA256) from the cryptography library.
Key is loaded from ENCRYPTION_KEY env var (must be a valid Fernet key).

Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import structlog
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import TypeDecorator, Text
from .config import settings

logger = structlog.get_logger(__name__)

_fernet = None
_checked = False


def _get_fernet():
    """Returns Fernet instance or None if no key configured."""
    global _fernet, _checked
    if not _checked:
        _checked = True
        if settings.ENCRYPTION_KEY:
            _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
            logger.info("encryption_enabled")
        else:
            logger.warning("encryption_disabled", hint="Set ENCRYPTION_KEY to encrypt sensitive fields")
    return _fernet


class EncryptedText(TypeDecorator):
    """
    SQLAlchemy type that transparently encrypts/decrypts text fields.

    In Python: plain text string (or None).
    In DB: Fernet-encrypted bytes stored as text (or NULL).

    If ENCRYPTION_KEY is not set, stores plain text (for development/testing).
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before saving to DB."""
        if value is None:
            return None
        f = _get_fernet()
        if f is None:
            return value  # No encryption key — store plain
        return f.encrypt(value.encode("utf-8")).decode("utf-8")

    def process_result_value(self, value, dialect):
        """Decrypt after reading from DB."""
        if value is None:
            return None
        f = _get_fernet()
        if f is None:
            return value  # No encryption key — return as-is
        try:
            return f.decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            # Might be a pre-encryption plain text value — return as-is
            logger.warning("encryption_decrypt_fallback", hint="value may be unencrypted")
            return value
