"""Tests for field-level encryption."""

import pytest
from unittest.mock import patch
from cryptography.fernet import Fernet

from app.core.encryption import EncryptedText


@pytest.fixture
def fernet_key():
    return Fernet.generate_key().decode()


@pytest.fixture
def encrypted_type(fernet_key):
    """EncryptedText with a real Fernet key."""
    import app.core.encryption as enc
    # Reset cached fernet
    enc._fernet = None
    enc._checked = False
    with patch.object(enc.settings, "ENCRYPTION_KEY", fernet_key):
        enc._fernet = None
        enc._checked = False
        yield EncryptedText()
    enc._fernet = None
    enc._checked = False


class TestEncryptedText:
    def test_encrypt_and_decrypt_roundtrip(self, encrypted_type):
        """Value is encrypted on bind, decrypted on result."""
        original = "my-secret-refresh-token-12345"
        encrypted = encrypted_type.process_bind_param(original, None)
        assert encrypted != original  # Must not be plain text
        assert encrypted is not None

        decrypted = encrypted_type.process_result_value(encrypted, None)
        assert decrypted == original

    def test_none_passes_through(self, encrypted_type):
        """NULL values are not encrypted."""
        assert encrypted_type.process_bind_param(None, None) is None
        assert encrypted_type.process_result_value(None, None) is None

    def test_without_key_stores_plain(self):
        """Without ENCRYPTION_KEY, values pass through unencrypted."""
        import app.core.encryption as enc
        enc._fernet = None
        enc._checked = False
        with patch.object(enc.settings, "ENCRYPTION_KEY", None):
            enc._fernet = None
            enc._checked = False
            et = EncryptedText()
            value = "plain-token"
            assert et.process_bind_param(value, None) == value
            assert et.process_result_value(value, None) == value
        enc._fernet = None
        enc._checked = False

    def test_decrypt_fallback_for_unencrypted_value(self, encrypted_type):
        """If a value can't be decrypted (pre-encryption data), return as-is."""
        plain = "old-unencrypted-token"
        result = encrypted_type.process_result_value(plain, None)
        assert result == plain  # Should fallback gracefully
