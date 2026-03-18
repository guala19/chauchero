"""Tests for core.security — JWT creation, verification, token refresh grace period."""

import pytest
from datetime import timedelta
from jose import jwt

from app.core.security import create_access_token, verify_token
from app.core.config import settings


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token({"sub": "user-123"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_payload_contains_sub(self):
        token = create_access_token({"sub": "user-123", "email": "a@b.com"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user-123"
        assert payload["email"] == "a@b.com"

    def test_contains_exp(self):
        token = create_access_token({"sub": "x"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_custom_expiry(self):
        token = create_access_token({"sub": "x"}, expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_does_not_mutate_input(self):
        data = {"sub": "x"}
        create_access_token(data)
        assert "exp" not in data


class TestVerifyToken:
    def test_valid_token(self):
        token = create_access_token({"sub": "user-123"})
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"

    def test_invalid_token_returns_none(self):
        assert verify_token("not.a.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "x"})
        tampered = token[:-5] + "XXXXX"
        assert verify_token(tampered) is None

    def test_expired_token_returns_none(self):
        token = create_access_token({"sub": "x"}, expires_delta=timedelta(seconds=-1))
        assert verify_token(token) is None

    def test_empty_string_returns_none(self):
        assert verify_token("") is None


class TestVerifyTokenGracePeriod:
    def test_expired_token_rejected_in_normal_mode(self):
        token = create_access_token({"sub": "x"}, expires_delta=timedelta(hours=-1))
        assert verify_token(token) is None

    def test_recently_expired_accepted_with_allow_expired(self):
        token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(hours=-1))
        payload = verify_token(token, allow_expired=True)
        assert payload is not None
        assert payload["sub"] == "user-123"

    def test_very_old_token_rejected_even_with_allow_expired(self):
        # Expired more than 24h ago — outside grace period
        token = create_access_token({"sub": "x"}, expires_delta=timedelta(hours=-25))
        assert verify_token(token, allow_expired=True) is None

    def test_valid_token_works_with_allow_expired_true(self):
        # allow_expired=True should also accept still-valid tokens
        token = create_access_token({"sub": "user-456"})
        payload = verify_token(token, allow_expired=True)
        assert payload is not None
        assert payload["sub"] == "user-456"
