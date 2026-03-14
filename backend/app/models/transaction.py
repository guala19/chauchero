from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Numeric, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from ..core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    transaction_type = Column(String(50), nullable=False)
    category = Column(String(100), nullable=True)
    
    email_id = Column(String(255), unique=True, nullable=False, index=True)
    email_subject = Column(Text, nullable=True)
    parser_confidence = Column(Integer, default=100)
    
    is_validated = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    account = relationship("BankAccount", back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction {self.transaction_date} ${self.amount} - {self.description[:30]}>"
