"""
Rate limiting and account lockout for Chauchero.

Rate limiting: slowapi (in-memory) keyed by client IP.
Account lockout: DB-backed failed login counter with auto-reset.
"""

import structlog
from datetime import datetime, timezone, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from ..models import User

logger = structlog.get_logger(__name__)

# ── Rate limiter (IP-based, in-memory) ───────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── Account lockout constants ────────────────────────────────────────────────

MAX_FAILED_ATTEMPTS = 10
LOCKOUT_DURATION_MINUTES = 15


def record_failed_login(db: Session, user: User) -> None:
    """Increment failed login counter."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    user.last_failed_login_at = datetime.now(timezone.utc)
    db.commit()
    logger.warning(
        "failed_login",
        rut=user.rut,
        attempts=user.failed_login_attempts,
    )


def reset_failed_logins(db: Session, user: User) -> None:
    """Reset counter after successful login."""
    if user.failed_login_attempts:
        user.failed_login_attempts = 0
        user.last_failed_login_at = None
        db.commit()


def is_account_locked(user: User) -> bool:
    """Check if account is locked due to too many failed attempts."""
    if not user.failed_login_attempts or user.failed_login_attempts < MAX_FAILED_ATTEMPTS:
        return False

    if not user.last_failed_login_at:
        return False

    lockout_expires = user.last_failed_login_at + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    return datetime.now(timezone.utc) < lockout_expires
