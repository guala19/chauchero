"""
Audit logging service.

Records security-relevant actions to the audit_logs table.
Fire-and-forget — audit failures should never break the main flow.
"""

import structlog
from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from ..models.audit_log import AuditLog

logger = structlog.get_logger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For from reverse proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def log_action(
    db: Session,
    *,
    action: str,
    request: Optional[Request] = None,
    user_rut: Optional[str] = None,
    detail: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Record an action in the audit log. Never raises — logs errors internally.

    Actions:
        login, login_failed, login_locked, register, password_reset_request,
        password_reset_complete, email_verified, gmail_linked, gmail_link_failed,
        sync_started, sync_completed, sync_failed
    """
    try:
        entry = AuditLog(
            user_rut=user_rut,
            action=action,
            detail=detail,
            ip_address=get_client_ip(request) if request else None,
            metadata_json=metadata,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.error("audit_log_failed", action=action, error=str(e))
        try:
            db.rollback()
        except Exception:
            pass
