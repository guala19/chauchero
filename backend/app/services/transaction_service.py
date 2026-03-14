from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from ..models import User, BankAccount, Transaction
from ..parsers import parser_registry, EmailData
from .gmail_service import GmailService
from ..utils import TransactionValidator


class TransactionService:
    """Service for managing transactions and syncing from Gmail"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def sync_transactions_for_user(
        self,
        user: User,
        max_emails: int = 100,
        force_full_sync: bool = False
    ) -> dict:
        """
        Sync transactions from user's Gmail.

        Args:
            force_full_sync: If True, ignore last_sync_at and search all emails

        Returns:
            Dict with sync statistics
        """
        if not user.gmail_refresh_token:
            raise ValueError("User has no Gmail token configured")

        credentials = self._get_user_credentials(user)
        gmail_service = GmailService(credentials)

        after_date = None if force_full_sync else user.last_sync_at
        emails = gmail_service.fetch_bank_emails(
            after_date=after_date,
            max_results=max_emails
        )
        
        stats = {
            "emails_fetched": len(emails),
            "transactions_created": 0,
            "transactions_skipped": 0,
            "parsing_errors": 0,
            "unsupported_banks": 0
        }
        
        for email in emails:
            result = self._process_email(user, email, gmail_service)
            
            if result == "created":
                stats["transactions_created"] += 1
            elif result == "skipped":
                stats["transactions_skipped"] += 1
            elif result == "no_parser":
                stats["unsupported_banks"] += 1
            elif result == "error":
                stats["parsing_errors"] += 1
        
        user.last_sync_at = datetime.utcnow()
        self.db.commit()
        
        return stats
    
    def _process_email(
        self,
        user: User,
        email: EmailData,
        gmail_service: GmailService
    ) -> str:
        """
        Process a single email and create transaction if valid.
        
        Returns:
            Status: "created", "skipped", "no_parser", "error"
        """
        existing = self.db.query(Transaction).filter(
            Transaction.email_id == email.message_id
        ).first()
        
        if existing:
            return "skipped"
        
        parser = parser_registry.get_parser_for_email(email)
        if not parser:
            return "no_parser"
        
        try:
            parsed = parser.parse(email)
            if not parsed:
                return "error"
            
            # VALIDATION: Check if transaction is valid
            if not TransactionValidator.is_valid(parsed):
                print(f"⚠️ Invalid transaction data for email {email.message_id}")
                return "error"
            
            # SANITIZATION: Clean and normalize data
            sanitized_description = TransactionValidator.sanitize_description(parsed.description)
            sanitized_amount = TransactionValidator.sanitize_amount(parsed.amount)
            normalized_type = TransactionValidator.normalize_transaction_type(parsed.transaction_type)
            
            account = self._get_or_create_account(
                user=user,
                bank_name=parser.bank_name,
                last_4_digits=parsed.last_4_digits
            )
            
            transaction = Transaction(
                account_id=account.id,
                amount=sanitized_amount,
                transaction_date=parsed.transaction_date,
                description=sanitized_description,
                transaction_type=normalized_type,
                category=parsed.category,
                email_id=email.message_id,
                email_subject=email.subject,
                parser_confidence=parsed.confidence,
                is_validated=parsed.confidence >= 90
            )
            
            self.db.add(transaction)
            self.db.commit()

            print(f"✅ Created transaction: {sanitized_description} - ${sanitized_amount} (confidence: {parsed.confidence}%)")
            
            return "created"
        
        except Exception as e:
            print(f"Error processing email {email.message_id}: {e}")
            self.db.rollback()
            return "error"
    
    def _get_or_create_account(
        self,
        user: User,
        bank_name: str,
        last_4_digits: Optional[str] = None
    ) -> BankAccount:
        """Get existing or create new bank account"""
        query = self.db.query(BankAccount).filter(
            BankAccount.user_id == user.id,
            BankAccount.bank_name == bank_name
        )
        
        if last_4_digits:
            query = query.filter(BankAccount.last_4_digits == last_4_digits)
        
        account = query.first()
        
        if not account:
            account = BankAccount(
                user_id=user.id,
                bank_name=bank_name,
                last_4_digits=last_4_digits,
                currency="CLP"
            )
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)
        
        return account
    
    def _get_user_credentials(self, user: User) -> Credentials:
        """Build Google credentials from user's stored token"""
        from ..core.config import settings
        
        return Credentials(
            token=None,
            refresh_token=user.gmail_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GmailService.SCOPES
        )
    
    def get_user_transactions(
        self,
        user: User,
        account_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Transaction]:
        """Get user's transactions with pagination"""
        query = self.db.query(Transaction).join(BankAccount).filter(
            BankAccount.user_id == user.id
        )
        
        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        
        query = query.order_by(Transaction.transaction_date.desc())
        query = query.limit(limit).offset(offset)
        
        return query.all()
