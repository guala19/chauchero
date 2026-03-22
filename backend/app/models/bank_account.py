from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
from ..core.database import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_rut = Column(String(12), ForeignKey("users.rut", ondelete="CASCADE"), nullable=False)
    bank_name = Column(String(100), nullable=False)
    last_4_digits = Column(String(4), nullable=True)
    account_type = Column(String(50), nullable=True)
    currency = Column(String(3), default="CLP", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="bank_accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BankAccount {self.bank_name} ****{self.last_4_digits}>"
