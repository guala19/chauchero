from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    rut = Column(String(12), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gmail_refresh_token = Column(Text, nullable=True)
    gmail_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_sync_at = Column(DateTime, nullable=True)

    # Sync lock — prevents simultaneous syncs for the same user
    is_syncing = Column(Boolean, default=False, nullable=False)
    sync_started_at = Column(DateTime, nullable=True)

    # Email verification
    email_verified = Column(Boolean, default=False, nullable=False)

    # Account lockout — brute force protection
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    last_failed_login_at = Column(DateTime, nullable=True)

    bank_accounts = relationship("BankAccount", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.rut} ({self.email})>"
