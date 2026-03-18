from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    gmail_refresh_token = Column(Text, nullable=True)
    gmail_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_sync_at = Column(DateTime, nullable=True)

    # Sync lock — prevents simultaneous syncs for the same user
    is_syncing = Column(Boolean, default=False, nullable=False)
    sync_started_at = Column(DateTime, nullable=True)

    bank_accounts = relationship("BankAccount", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
