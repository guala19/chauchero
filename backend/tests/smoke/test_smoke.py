"""
Smoke tests — run against the deployed API to verify it's alive and wired correctly.

Usage:
    pytest tests/smoke/ --base-url=https://chauchero-production.up.railway.app
    pytest tests/smoke/                          # uses default Railway URL
    pytest tests/smoke/ --base-url=http://localhost:8000  # local dev
"""

import httpx
import pytest


# ── Core: is the app alive? ─────────────────────────────────────────────────


class TestHealth:

    def test_health_returns_200(self, client: httpx.Client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_db_ok(self, client: httpx.Client):
        data = client.get("/health").json()
        assert data["status"] == "healthy"
        assert data["db"] == "ok"

    def test_health_includes_version(self, client: httpx.Client):
        data = client.get("/health").json()
        assert "version" in data


class TestRoot:

    def test_root_returns_200(self, client: httpx.Client):
        r = client.get("/")
        assert r.status_code == 200

    def test_root_identifies_api(self, client: httpx.Client):
        data = client.get("/").json()
        assert data["message"] == "Chauchero API"


# ── Public endpoints ─────────────────────────────────────────────────────────


class TestBanks:

    def test_supported_banks_returns_list(self, client: httpx.Client):
        r = client.get("/banks/supported")
        assert r.status_code == 200
        banks = r.json()
        assert isinstance(banks, list)
        assert len(banks) > 0

    def test_bank_has_expected_fields(self, client: httpx.Client):
        banks = client.get("/banks/supported").json()
        bank = banks[0]
        assert "name" in bank
        assert "email_domains" in bank


class TestOAuthEntrypoint:

    def test_google_login_returns_auth_url(self, client: httpx.Client):
        r = client.get("/auth/google/login")
        assert r.status_code == 200
        data = r.json()
        assert "auth_url" in data
        assert "accounts.google.com" in data["auth_url"]


# ── Auth wall: endpoints that MUST reject unauthenticated requests ───────────


class TestAuthWall:
    """Verify protected endpoints return 401/422 without a valid token."""

    @pytest.mark.parametrize("path", [
        "/auth/me",
        "/transactions/",
        "/transactions/debug/gmail-query",
    ])
    def test_protected_get_rejects_anonymous(self, client: httpx.Client, path: str):
        r = client.get(path)
        assert r.status_code in (401, 422)

    def test_sync_rejects_anonymous(self, client: httpx.Client):
        r = client.post("/transactions/sync")
        assert r.status_code in (401, 422)

    def test_refresh_rejects_anonymous(self, client: httpx.Client):
        r = client.post("/auth/refresh")
        assert r.status_code in (401, 422)

    def test_refresh_expired_rejects_garbage_token(self, client: httpx.Client):
        r = client.post(
            "/auth/refresh-expired",
            headers={"Authorization": "Bearer invalid.garbage.token"},
        )
        assert r.status_code == 401


# ── Production hardening ─────────────────────────────────────────────────────


class TestProductionConfig:
    """Verify production-specific settings are active."""

    def test_docs_disabled_in_production(self, client: httpx.Client):
        r = client.get("/docs")
        assert r.status_code == 404, "/docs should be disabled in production"

    def test_redoc_disabled_in_production(self, client: httpx.Client):
        r = client.get("/redoc")
        assert r.status_code == 404, "/redoc should be disabled in production"

    def test_cors_blocks_random_origin(self, client: httpx.Client):
        r = client.options(
            "/health",
            headers={
                "Origin": "https://evil-site.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        allowed = r.headers.get("access-control-allow-origin", "")
        assert "evil-site.com" not in allowed
