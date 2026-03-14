from typing import List, Optional
from datetime import datetime
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ..parsers.base import EmailData


class GmailService:
    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
    FETCH_WORKERS = 20  # parallel message fetches

    def __init__(self, credentials: Credentials):
        self.credentials = credentials
        self.service = build('gmail', 'v1', credentials=credentials)

    # ── Public ────────────────────────────────────────────────────────────────

    def fetch_bank_emails(
        self,
        after_date: Optional[datetime] = None,
        max_results: int = 500,
    ) -> List[EmailData]:
        """
        Fetch ALL matching emails using pagination, then fetch bodies in parallel.
        """
        query = self._build_search_query(after_date)
        print(f"🔍 Gmail query: {query}")

        # Step 1: collect ALL message IDs (paginated, respects max_results)
        message_ids = self._list_all_message_ids(query, max_results)
        if not message_ids:
            print("📭 No messages found")
            return []

        print(f"📬 {len(message_ids)} messages found — fetching bodies with {self.FETCH_WORKERS} workers…")

        # Step 2: fetch bodies in parallel (flat pool, no nesting)
        emails = self._fetch_messages_parallel(message_ids)
        print(f"✅ {len(emails)}/{len(message_ids)} fetched successfully")
        return emails

    # ── Internals ─────────────────────────────────────────────────────────────

    def _list_all_message_ids(self, query: str, max_results: int) -> List[str]:
        """Follow nextPageToken until we have all IDs (up to max_results)."""
        ids: List[str] = []
        page_token = None

        while True:
            remaining = max_results - len(ids)
            if remaining <= 0:
                break

            page_size = min(remaining, 500)  # Gmail API hard cap per page
            kwargs = dict(userId='me', q=query, maxResults=page_size)
            if page_token:
                kwargs['pageToken'] = page_token

            response = self.service.users().messages().list(**kwargs).execute()
            page_ids = [m['id'] for m in response.get('messages', [])]
            ids.extend(page_ids)

            page_token = response.get('nextPageToken')
            if not page_token or len(page_ids) == 0:
                break

        return ids

    def _fetch_messages_parallel(self, message_ids: List[str]) -> List[EmailData]:
        """Fetch message bodies in a flat thread pool."""
        results: List[EmailData] = []

        with ThreadPoolExecutor(max_workers=self.FETCH_WORKERS) as pool:
            futures = {pool.submit(self._fetch_one, mid): mid for mid in message_ids}
            for future in as_completed(futures):
                email = future.result()
                if email is not None:
                    results.append(email)

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
        except Exception as e:
            print(f"❌ fetch {message_id}: {e}")
            return None

    def _to_email_data(self, msg: dict) -> Optional[EmailData]:
        try:
            headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
            text_body, html_body = self._extract_body(msg['payload'])
            ts = int(msg.get('internalDate', 0))
            date = datetime.fromtimestamp(ts / 1000) if ts else datetime.utcnow()
            return EmailData(
                message_id=msg['id'],
                sender=headers.get('From', ''),
                subject=headers.get('Subject', ''),
                body=text_body,
                html_body=html_body,
                date=date,
            )
        except Exception as e:
            print(f"❌ parse {msg.get('id')}: {e}")
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

    def _build_search_query(self, after_date: Optional[datetime] = None) -> str:
        senders = [
            "enviodigital@bancochile.cl",
            "serviciodetransferencias@bancochile.cl",
        ]
        query = "(" + " OR ".join(f"from:{s}" for s in senders) + ")"
        if after_date:
            query += f" after:{after_date.strftime('%Y/%m/%d')}"
        return query
