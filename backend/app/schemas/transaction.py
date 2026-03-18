from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID


class TransactionBase(BaseModel):
    amount: Decimal
    transaction_date: datetime
    description: str
    transaction_type: str
    category: Optional[str] = None


class TransactionCreate(TransactionBase):
    account_id: UUID
    email_id: str
    parser_confidence: int = 100


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    is_validated: Optional[bool] = None


class TransactionResponse(TransactionBase):
    id: UUID
    account_id: UUID
    email_subject: Optional[str] = None
    parser_confidence: int
    is_validated: bool
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncStats(BaseModel):
    emails_fetched: int
    transactions_created: int
    transactions_skipped: int
    parsing_errors: int
    unsupported_banks: int


class SyncResponse(BaseModel):
    success: bool
    message: str
    stats: SyncStats


class DebugGmailQueryResponse(BaseModel):
    last_sync_at: Optional[datetime] = None
    query_incremental: str
    query_full_resync: str


class DebugEmailResult(BaseModel):
    message_id: str
    sender: str
    subject: str
    date: str
    has_html_body: bool
    parser_found: Optional[str] = None
    parse_result: Optional[dict] = None
    parse_error: Optional[str] = None


class DebugGmailScanResponse(BaseModel):
    gmail_query: str
    emails_found: int
    last_sync_at: Optional[datetime] = None
    results: list[DebugEmailResult]
