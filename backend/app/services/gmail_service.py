from typing import List, Optional
from datetime import datetime, timezone
import base64
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FutureTimeoutError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ..parsers.base import EmailData
from ..core.config import settings

logger = logging.getLogger(__name__)

# Hard cap: a single sync request cannot run longer than this
GMAIL_FETCH_TIMEOUT_SECONDS = 45
# Timeout per individual message fetch
GMAIL_MESSAGE_TIMEOUT_SECONDS = 10


class GmailAuthError(Exception):
    """Raised when Gmail API returns 401 — token expired or revoked."""
    pass


class GmailService:
    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

    BANK_SENDERS = [
        "enviodigital@bancochile.cl",
        "serviciodetransferencias@bancochile.cl",
    ]

    def __init__(self, credentials: Credentials):
        self.credentials = credentials
        self.service = build('gmail', 'v1', credentials=credentials)

    # ── Public ────────────────────────────────────────────────────────────

    def fetch_bank_emails(
        self,
        after_date: Optional[datetime] = None,
        max_results: int = 500,
    ) -> List[EmailData]:
        query = self.build_search_query(after_date)
        logger.info("Gmail query: %s", query)

        message_ids = self._list_all_message_ids(query, max_results)
        if not message_ids:
            logger.info("No messages found")
            return []

        logger.info(
            "%d messages found — fetching bodies with %d workers",
            len(message_ids), settings.GMAIL_FETCH_WORKERS,
        )

        emails = self._fetch_messages_parallel(message_ids)
        logger.info("%d/%d fetched successfully", len(emails), len(message_ids))
        return emails

    @staticmethod
    def build_search_query(after_date: Optional[datetime] = None) -> str:
        senders = GmailService.BANK_SENDERS
        query = "(" + " OR ".join(f"from:{s}" for s in senders) + ")"
        if after_date:
            query += f" after:{after_date.strftime('%Y/%m/%d')}"
        return query

    # ── Internals ─────────────────────────────────────────────────────────

    def _list_all_message_ids(self, query: str, max_results: int) -> List[str]:
        ids: List[str] = []
        page_token = None

        while True:
            remaining = max_results - len(ids)
            if remaining <= 0:
                break

            page_size = min(remaining, 500)
            kwargs = dict(userId='me', q=query, maxResults=page_size)
            if page_token:
                kwargs['pageToken'] = page_token

            try:
                response = self.service.users().messages().list(**kwargs).execute()
            except HttpError as e:
                if e.resp.status in (401, 403):
                    raise GmailAuthError(
                        "Tu token de Gmail expiró o fue revocado. Vuelve a iniciar sesión con Google."
                    ) from e
                if e.resp.status == 429:
                    logger.warning("Gmail API rate limit (429) listing messages — returning %d ids so far", len(ids))
                    break
                raise
            page_ids = [m['id'] for m in response.get('messages', [])]
            ids.extend(page_ids)

            page_token = response.get('nextPageToken')
            if not page_token or len(page_ids) == 0:
                break

        return ids

    def _fetch_messages_parallel(self, message_ids: List[str]) -> List[EmailData]:
        results: List[EmailData] = []
        workers = min(settings.GMAIL_FETCH_WORKERS, 10)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(self._fetch_one, mid): mid for mid in message_ids}
            try:
                for future in as_completed(futures, timeout=GMAIL_FETCH_TIMEOUT_SECONDS):
                    try:
                        email = future.result(timeout=GMAIL_MESSAGE_TIMEOUT_SECONDS)
                        if email is not None:
                            results.append(email)
                    except GmailAuthError:
                        # Token revoked/expired mid-fetch — propagate immediately
                        raise
                    except FutureTimeoutError:
                        mid = futures[future]
                        logger.warning("Timeout fetching message %s — skipping", mid)
                    except Exception as e:
                        mid = futures[future]
                        logger.warning("Error fetching message %s: %s — skipping", mid, e)
            except GmailAuthError:
                raise
            except FutureTimeoutError:
                logger.warning(
                    "Gmail fetch hit global timeout (%ds) — returning %d/%d messages fetched so far",
                    GMAIL_FETCH_TIMEOUT_SECONDS, len(results), len(message_ids),
                )

        return results

    def _fetch_one(self, message_id: str) -> Optional[EmailData]:
        try:
            msg = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full',
                fields='id,internalDate,payload(headers,mimeType,body(data),parts(mimeType,body(data),parts(mimeType,body(data))))',
            ).execute()
            return self._to_email_data(msg)
        except HttpError as e:
            if e.resp.status in (401, 403):
                raise GmailAuthError(
                    "Tu token de Gmail expiró o fue revocado. Vuelve a iniciar sesión con Google."
                ) from e
            if e.resp.status == 429:
                logger.warning("Gmail API rate limit (429) fetching message %s — skipping", message_id)
                return None
            logger.warning("fetch %s: %s", message_id, e)
            return None
        except Exception as e:
            logger.warning("fetch %s: %s", message_id, e)
            return None

    def _to_email_data(self, msg: dict) -> Optional[EmailData]:
        try:
            headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
            text_body, html_body = self._extract_body(msg['payload'])
            ts = int(msg.get('internalDate', 0))
            date = datetime.fromtimestamp(ts / 1000, tz=timezone.utc) if ts else datetime.now(timezone.utc)
            return EmailData(
                message_id=msg['id'],
                sender=headers.get('From', ''),
                subject=headers.get('Subject', ''),
                body=text_body,
                html_body=html_body,
                date=date,
            )
        except Exception as e:
            logger.warning("parse %s: %s", msg.get('id'), e)
            return None

    def _extract_body(self, payload: dict) -> tuple:
        text, html = '', None

        def walk(part):
            nonlocal text, html
            mime = part.get('mimeType', '')
            data = part.get('body', {}).get('data')
            if data:
                decoded = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                if mime == 'text/plain' and not text:
                    text = decoded
                elif mime == 'text/html':
                    html = decoded
            for sub in part.get('parts', []):
                walk(sub)

        walk(payload)
        return text, html
