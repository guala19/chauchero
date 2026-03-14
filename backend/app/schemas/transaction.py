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
    
    class Config:
        from_attributes = True


class SyncResponse(BaseModel):
    success: bool
    message: str
    stats: dict
