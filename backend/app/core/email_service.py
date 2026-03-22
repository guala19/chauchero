"""
Email service for transactional emails (verification, password reset).

Uses Resend in production. Falls back to console logging in development
when RESEND_API_KEY is not set.
"""

import structlog
from datetime import timedelta
from typing import Optional
from .config import settings
from .security import create_access_token

logger = structlog.get_logger(__name__)


# ── Token helpers ────────────────────────────────────────────────────────────

def create_verification_token(rut: str) -> str:
    return create_access_token(
        data={"sub": rut, "purpose": "email_verify"},
        expires_delta=timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
    )


def create_reset_token(rut: str) -> str:
    return create_access_token(
        data={"sub": rut, "purpose": "password_reset"},
        expires_delta=timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
    )


# ── Email sending ───────────────────────────────────────────────────────────

def _send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend. Falls back to console in development."""
    if not settings.RESEND_API_KEY:
        logger.info("email_console_fallback", to=to, subject=subject)
        logger.info("email_body", html=html)
        return True

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("email_sent", to=to, subject=subject)
        return True
    except Exception as e:
        logger.error("email_send_failed", to=to, error=str(e))
        return False


def send_verification_email(email: str, first_name: str, token: str) -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1C0F0A; margin-bottom: 8px;">Hola {first_name},</h2>
        <p style="color: #6B5C54; font-size: 14px; line-height: 1.6;">
            Bienvenido a Chauchero. Confirma tu email para activar tu cuenta:
        </p>
        <a href="{verify_url}"
           style="display: inline-block; background: #C4522A; color: white; padding: 12px 32px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;
                  margin: 24px 0;">
            Verificar email
        </a>
        <p style="color: #9E8E86; font-size: 12px; margin-top: 32px;">
            Si no creaste esta cuenta, ignora este email.<br>
            Este link expira en {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} horas.
        </p>
    </div>
    """
    return _send_email(email, "Confirma tu email — Chauchero", html)


def send_password_reset_email(email: str, first_name: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1C0F0A; margin-bottom: 8px;">Hola {first_name},</h2>
        <p style="color: #6B5C54; font-size: 14px; line-height: 1.6;">
            Recibimos una solicitud para restablecer tu contraseña:
        </p>
        <a href="{reset_url}"
           style="display: inline-block; background: #C4522A; color: white; padding: 12px 32px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;
                  margin: 24px 0;">
            Restablecer contraseña
        </a>
        <p style="color: #9E8E86; font-size: 12px; margin-top: 32px;">
            Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.<br>
            Este link expira en {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos.
        </p>
    </div>
    """
    return _send_email(email, "Restablecer contraseña — Chauchero", html)
