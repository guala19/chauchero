from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging


class SyncCooldownError(Exception):
    """Raised when a user tries to sync before the cooldown period has elapsed."""
    def __init__(self, minutes_remaining: int):
        self.minutes_remaining = minutes_remaining
        super().__init__(f"Sync cooldown: {minutes_remaining} minutes remaining")


class SyncInProgressError(Exception):
    """Raised when a sync is already running for this user."""
    pass
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from ..models import User, Transaction
from ..parsers import parser_registry, EmailData
from ..db.queries.transactions import (
    get_user_transactions,
    get_user_transaction_by_id,
    upsert_transaction,
    update_transaction,
)
from ..db.queries.bank_accounts import get_or_create_account
from ..db.queries.users import update_last_sync, acquire_sync_lock, release_sync_lock, clear_gmail_token
from .gmail_service import GmailService, GmailAuthError
from ..utils import TransactionValidator
from ..core.config import settings

logger = logging.getLogger(__name__)


class TransactionService:
    """Service for managing transactions and syncing from Gmail"""

    def __init__(self, db: Session):
        self.db = db

    # ── Sync ──────────────────────────────────────────────────────────────

    def check_sync_cooldown(self, user: User) -> Optional[int]:
        """
        Returns minutes remaining in cooldown if the user must wait, or None if sync is allowed.
        """
        if not user.last_sync_at:
            return None
        last = user.last_sync_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        elapsed = datetime.now(timezone.utc) - last
        cooldown = timedelta(minutes=settings.SYNC_COOLDOWN_MINUTES)
        if elapsed < cooldown:
            remaining = int((cooldown - elapsed).total_seconds() / 60) + 1
            return remaining
        return None

    def sync_transactions_for_user(
        self,
        user: User,
        max_emails: int = 100,
        force_full_sync: bool = False,
    ) -> dict:
        if not user.gmail_refresh_token:
            raise ValueError(
                "No hay token de Gmail configurado. "
                "Por favor, vuelve a iniciar sesión con Google."
            )

        # ── Rate limit ────────────────────────────────────────────────────
        minutes_remaining = self.check_sync_cooldown(user)
        if minutes_remaining is not None:
            raise SyncCooldownError(minutes_remaining)

        # ── Concurrency lock ──────────────────────────────────────────────
        if not acquire_sync_lock(self.db, user):
            raise SyncInProgressError()

        try:
            return self._run_sync(user, max_emails, force_full_sync)
        finally:
            release_sync_lock(self.db, user)

    def _run_sync(self, user: User, max_emails: int, force_full_sync: bool) -> dict:
        credentials = self._build_credentials(user)
        gmail_service = GmailService(credentials)

        after_date = None if force_full_sync else user.last_sync_at
        try:
            emails = gmail_service.fetch_bank_emails(
                after_date=after_date,
                max_results=max_emails,
            )
        except GmailAuthError:
            clear_gmail_token(self.db, user)
            raise ValueError(
                "Tu token de Gmail expiró o fue revocado. "
                "Por favor, vuelve a iniciar sesión con Google."
            )

        stats = {
            "emails_fetched": len(emails),
            "transactions_created": 0,
            "transactions_skipped": 0,
            "parsing_errors": 0,
            "unsupported_banks": 0,
        }

        for email in emails:
            result = self._process_email(user, email)

            if result == "created":
                stats["transactions_created"] += 1
            elif result == "skipped":
                stats["transactions_skipped"] += 1
            elif result == "no_parser":
                stats["unsupported_banks"] += 1
            elif result == "error":
                stats["parsing_errors"] += 1

        update_last_sync(self.db, user, datetime.now(timezone.utc))
        return stats

    # ── CRUD ──────────────────────────────────────────────────────────────

    def list_transactions(
        self,
        user: User,
        account_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Transaction]:
        return get_user_transactions(
            self.db, user, account_id=account_id, limit=limit, offset=offset
        )

    def update_transaction(
        self,
        user: User,
        transaction_id,
        fields: dict,
    ) -> Optional[Transaction]:
        transaction = get_user_transaction_by_id(self.db, user, transaction_id)
        if not transaction:
            return None
        return update_transaction(self.db, transaction, **fields)

    # ── Debug ─────────────────────────────────────────────────────────────

    def debug_gmail_query(self, user: User) -> dict:
        return {
            "last_sync_at": user.last_sync_at,
            "query_incremental": GmailService.build_search_query(user.last_sync_at),
            "query_full_resync": GmailService.build_search_query(None),
        }

    def debug_gmail_scan(self, user: User, max_emails: int) -> dict:
        if not user.gmail_refresh_token:
            raise ValueError("No Gmail token — re-autentícate")

        credentials = self._build_credentials(user)
        gmail = GmailService(credentials)
        query = GmailService.build_search_query(None)
        emails = gmail.fetch_bank_emails(after_date=None, max_results=max_emails)

        results = []
        for email in emails:
            parser = parser_registry.get_parser_for_email(email)
            parse_result = parse_error = None
            if parser:
                try:
                    parsed = parser.parse(email)
                    if parsed:
                        parse_result = {
                            "amount": str(parsed.amount),
                            "type": parsed.transaction_type,
                            "description": parsed.description,
                            "confidence": parsed.confidence,
                            "date": str(parsed.transaction_date),
                        }
                    else:
                        parse_error = "parser returned None"
                except Exception as e:
                    parse_error = str(e)

            results.append({
                "message_id": email.message_id,
                "sender": email.sender,
                "subject": email.subject,
                "date": str(email.date),
                "has_html_body": bool(email.html_body),
                "parser_found": parser.bank_name if parser else None,
                "parse_result": parse_result,
                "parse_error": parse_error,
            })

        return {
            "gmail_query": query,
            "emails_found": len(emails),
            "last_sync_at": user.last_sync_at,
            "results": results,
        }

    # ── Private ───────────────────────────────────────────────────────────

    def _process_email(self, user: User, email: EmailData) -> str:
        parser = parser_registry.get_parser_for_email(email)
        if not parser:
            return "no_parser"

        try:
            parsed = parser.parse(email)
            if not parsed:
                return "error"

            if not TransactionValidator.is_valid(parsed):
                logger.warning("Invalid transaction data for email %s", email.message_id)
                return "error"

            sanitized_description = TransactionValidator.sanitize_description(parsed.description)
            sanitized_amount = TransactionValidator.sanitize_amount(parsed.amount)
            normalized_type = TransactionValidator.normalize_transaction_type(parsed.transaction_type)

            account = get_or_create_account(
                self.db,
                user,
                bank_name=parser.bank_name,
                last_4_digits=parsed.last_4_digits,
            )

            inserted = upsert_transaction(
                self.db,
                account_id=account.id,
                amount=sanitized_amount,
                transaction_date=parsed.transaction_date,
                description=sanitized_description,
                transaction_type=normalized_type,
                category=parsed.category,
                email_id=email.message_id,
                email_subject=email.subject,
                parser_confidence=parsed.confidence,
                is_validated=parsed.confidence >= 90,
            )

            if not inserted:
                return "skipped"

            logger.info(
                "Created transaction: %s - $%s (confidence: %d%%)",
                sanitized_description, sanitized_amount, parsed.confidence,
            )
            return "created"

        except Exception as e:
            logger.error("Error processing email %s: %s", email.message_id, e)
            self.db.rollback()
            return "error"

    def _build_credentials(self, user: User) -> Credentials:
        return Credentials(
            token=None,
            refresh_token=user.gmail_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GmailService.SCOPES,
        )
