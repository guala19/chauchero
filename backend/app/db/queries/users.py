from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ...models import User


def get_user_by_rut(db: Session, rut: str) -> Optional[User]:
    return db.query(User).filter(User.rut == rut).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    *,
    rut: str,
    email: str,
    password_hash: str,
    first_name: str,
    last_name: str,
    gmail_refresh_token: Optional[str] = None,
    gmail_token_expires_at: Optional[datetime] = None,
) -> User:
    user = User(
        rut=rut,
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        gmail_refresh_token=gmail_refresh_token,
        gmail_token_expires_at=gmail_token_expires_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_tokens(
    db: Session,
    user: User,
    *,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[datetime] = None,
) -> User:
    if refresh_token:
        user.gmail_refresh_token = refresh_token
    if token_expires_at:
        user.gmail_token_expires_at = token_expires_at
    db.commit()
    db.refresh(user)
    return user


def update_last_sync(db: Session, user: User, sync_time: datetime) -> None:
    user.last_sync_at = sync_time
    db.commit()


def acquire_sync_lock(db: Session, user: User) -> bool:
    """
    Try to acquire the sync lock for the user.
    Returns True if the lock was acquired, False if already locked.
    Auto-resets stale locks older than 10 minutes.

    Uses a single atomic UPDATE to avoid TOCTOU races and ORM cache issues.
    """
    from datetime import timedelta
    from sqlalchemy import text

    now = datetime.now(timezone.utc)
    stale_threshold = now - timedelta(minutes=10)

    result = db.execute(
        text(
            "UPDATE users "
            "SET is_syncing = true, sync_started_at = :now "
            "WHERE rut = :rut "
            "  AND (is_syncing = false "
            "       OR sync_started_at IS NULL "
            "       OR sync_started_at < :stale) "
            "RETURNING rut"
        ),
        {"rut": user.rut, "now": now, "stale": stale_threshold},
    )
    db.commit()
    acquired = result.fetchone() is not None
    if acquired:
        user.is_syncing = True
        user.sync_started_at = now
    return acquired


def release_sync_lock(db: Session, user: User) -> None:
    """Release the sync lock. Always called in a finally block."""
    from sqlalchemy import text
    db.execute(
        text("UPDATE users SET is_syncing = false, sync_started_at = NULL WHERE rut = :rut"),
        {"rut": user.rut},
    )
    db.commit()
    user.is_syncing = False
    user.sync_started_at = None


def clear_gmail_token(db: Session, user: User) -> None:
    """Clear Gmail tokens when they are revoked or expired."""
    user.gmail_refresh_token = None
    user.gmail_token_expires_at = None
    db.commit()
