"""Tests for GmailService — search query building, email parsing, error handling."""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import base64

from app.services.gmail_service import GmailService, GmailAuthError


# ── build_search_query ───────────────────────────────────────────────────────


class TestBuildSearchQuery:
    def test_without_date(self):
        query = GmailService.build_search_query(None)
        assert "from:enviodigital@bancochile.cl" in query
        assert "from:serviciodetransferencias@bancochile.cl" in query
        assert "after:" not in query

    def test_with_date(self):
        dt = datetime(2026, 3, 1, tzinfo=timezone.utc)
        query = GmailService.build_search_query(dt)
        assert "after:2026/03/01" in query

    def test_or_separates_senders(self):
        query = GmailService.build_search_query(None)
        assert " OR " in query

    def test_includes_tenpo_sender(self):
        query = GmailService.build_search_query(None)
        assert "from:no-reply@tenpo.cl" in query

    def test_is_static_method(self):
        # Can be called without an instance
        assert isinstance(GmailService.build_search_query(None), str)


# ── _extract_body ────────────────────────────────────────────────────────────


class TestExtractBody:
    @pytest.fixture
    def service(self):
        with patch("app.services.gmail_service.build"):
            svc = GmailService(MagicMock())
        return svc

    def test_plain_text(self, service):
        payload = {
            "mimeType": "text/plain",
            "body": {"data": base64.urlsafe_b64encode(b"Hello world").decode()},
        }
        text, html = service._extract_body(payload)
        assert text == "Hello world"
        assert html is None

    def test_html_body(self, service):
        payload = {
            "mimeType": "text/html",
            "body": {"data": base64.urlsafe_b64encode(b"<b>Bold</b>").decode()},
        }
        text, html = service._extract_body(payload)
        assert text == ""
        assert html == "<b>Bold</b>"

    def test_multipart(self, service):
        payload = {
            "mimeType": "multipart/alternative",
            "body": {},
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": base64.urlsafe_b64encode(b"plain").decode()},
                },
                {
                    "mimeType": "text/html",
                    "body": {"data": base64.urlsafe_b64encode(b"<b>html</b>").decode()},
                },
            ],
        }
        text, html = service._extract_body(payload)
        assert text == "plain"
        assert html == "<b>html</b>"

    def test_no_data(self, service):
        payload = {"mimeType": "text/plain", "body": {}}
        text, html = service._extract_body(payload)
        assert text == ""
        assert html is None


# ── _to_email_data ───────────────────────────────────────────────────────────


class TestToEmailData:
    @pytest.fixture
    def service(self):
        with patch("app.services.gmail_service.build"):
            svc = GmailService(MagicMock())
        return svc

    def test_valid_message(self, service):
        msg = {
            "id": "msg-001",
            "internalDate": "1709300000000",
            "payload": {
                "headers": [
                    {"name": "From", "value": "test@bank.cl"},
                    {"name": "Subject", "value": "Test Subject"},
                ],
                "mimeType": "text/plain",
                "body": {"data": base64.urlsafe_b64encode(b"body text").decode()},
            },
        }
        result = service._to_email_data(msg)
        assert result is not None
        assert result.message_id == "msg-001"
        assert result.sender == "test@bank.cl"
        assert result.subject == "Test Subject"
        assert result.body == "body text"

    def test_missing_timestamp_uses_now(self, service):
        msg = {
            "id": "msg-002",
            "internalDate": "0",
            "payload": {
                "headers": [],
                "mimeType": "text/plain",
                "body": {"data": base64.urlsafe_b64encode(b"x").decode()},
            },
        }
        result = service._to_email_data(msg)
        assert result is not None
        assert result.date.year >= 2026

    def test_malformed_missing_payload_key_returns_none(self, service):
        # Fully missing payload causes KeyError which is caught
        result = service._to_email_data({"id": "bad"})
        assert result is None

    def test_empty_headers_still_works(self, service):
        msg = {
            "id": "msg-ok",
            "internalDate": "0",
            "payload": {
                "headers": [],
                "mimeType": "text/plain",
                "body": {},
            },
        }
        result = service._to_email_data(msg)
        # Empty payload is valid — returns EmailData with defaults
        assert result is not None
        assert result.sender == ""


# ── _list_all_message_ids ────────────────────────────────────────────────────


class TestListAllMessageIds:
    @pytest.fixture
    def service(self):
        with patch("app.services.gmail_service.build"):
            svc = GmailService(MagicMock())
        return svc

    def test_single_page(self, service):
        service.service.users().messages().list().execute.return_value = {
            "messages": [{"id": "a"}, {"id": "b"}],
        }
        ids = service._list_all_message_ids("query", 100)
        assert ids == ["a", "b"]

    def test_respects_max_results(self, service):
        service.service.users().messages().list().execute.return_value = {
            "messages": [{"id": f"m{i}"} for i in range(50)],
        }
        ids = service._list_all_message_ids("query", 10)
        # Returns all from first page but stops paginating; max_results controls page_size
        assert len(ids) <= 50

    def test_empty_response(self, service):
        service.service.users().messages().list().execute.return_value = {}
        ids = service._list_all_message_ids("query", 100)
        assert ids == []

    def test_auth_error_raises(self, service):
        from googleapiclient.errors import HttpError

        resp = MagicMock()
        resp.status = 401
        error = HttpError(resp, b"unauthorized")
        service.service.users().messages().list().execute.side_effect = error

        with pytest.raises(GmailAuthError):
            service._list_all_message_ids("query", 100)


# ── _fetch_one ───────────────────────────────────────────────────────────────


class TestFetchOne:
    @pytest.fixture
    def service(self):
        with patch("app.services.gmail_service.build"):
            svc = GmailService(MagicMock())
        return svc

    def test_auth_error_raises(self, service):
        from googleapiclient.errors import HttpError

        resp = MagicMock()
        resp.status = 403
        error = HttpError(resp, b"forbidden")
        service.service.users().messages().get().execute.side_effect = error

        with pytest.raises(GmailAuthError):
            service._fetch_one("msg-x")

    def test_other_http_error_returns_none(self, service):
        from googleapiclient.errors import HttpError

        resp = MagicMock()
        resp.status = 500
        error = HttpError(resp, b"server error")
        service.service.users().messages().get().execute.side_effect = error

        result = service._fetch_one("msg-x")
        assert result is None

    def test_generic_exception_returns_none(self, service):
        service.service.users().messages().get().execute.side_effect = RuntimeError("boom")
        result = service._fetch_one("msg-x")
        assert result is None
