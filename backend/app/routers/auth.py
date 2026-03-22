import structlog
from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.config import settings
from ..core.security import create_access_token, verify_token
from ..core.password import hash_password, verify_password
from ..core.rate_limiter import (
    limiter, record_failed_login, reset_failed_logins, is_account_locked,
)
from ..services.auth_service import AuthService
from ..schemas import TokenResponse, RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from ..schemas.user import UserResponse
from ..core.email_service import (
    create_verification_token, create_reset_token,
    send_verification_email, send_password_reset_email,
)
from ..db.queries.users import get_user_by_rut, get_user_by_email, create_user
from ..services.audit_service import log_action
from .deps import get_current_user

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/me",
    response_model=TokenResponse,
    summary="Usuario actual",
    description="Retorna los datos del usuario autenticado y un nuevo JWT con la expiración renovada.",
    responses={
        401: {"description": "Token ausente, inválido o expirado"},
    },
)
def get_me(current_user=Depends(get_current_user)):
    token = create_access_token(data={"sub": current_user.rut, "email": current_user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renovar JWT (token válido)",
    responses={
        401: {"description": "Token ausente, inválido o expirado"},
    },
)
def refresh_token(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_token = create_access_token(data={"sub": current_user.rut, "email": current_user.email})
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post(
    "/refresh-expired",
    response_model=TokenResponse,
    summary="Renovar JWT (token expirado con grace period)",
    description="Permite renovar un token expirado dentro de las últimas 24 horas.",
    responses={
        401: {"description": "Token inválido o expirado hace más de 24 horas"},
    },
)
@limiter.limit("10/hour")
def refresh_expired_token(
    request: Request,
    authorization: str = Header(..., description="Bearer <expired_token>"),
    db: Session = Depends(get_db),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    token = authorization.removeprefix("Bearer ")
    payload = verify_token(token, allow_expired=True)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Token expirado hace más de 24 horas. Por favor, vuelve a iniciar sesión.",
        )

    rut = payload.get("sub")
    if not rut:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_rut(db, rut)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token = create_access_token(data={"sub": user.rut, "email": user.email})
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Registro con email y contraseña",
    responses={
        409: {"description": "El email o RUT ya está registrado"},
        429: {"description": "Demasiados intentos de registro"},
    },
)
@limiter.limit("3/hour")
def register(
    request: Request,
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing = get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Este email ya está registrado")

    existing_rut = get_user_by_rut(db, body.rut)
    if existing_rut:
        raise HTTPException(status_code=409, detail="Este RUT ya está registrado")

    user = create_user(
        db,
        rut=body.rut,
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
    )
    logger.info("user_registered", email=user.email, rut=user.rut)
    log_action(db, action="register", request=request, user_rut=user.rut, detail=user.email)

    # Send verification email (non-blocking — don't fail registration if email fails)
    verification_token = create_verification_token(user.rut)
    send_verification_email(user.email, user.first_name, verification_token)

    token = create_access_token(data={"sub": user.rut, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login con email y contraseña",
    responses={
        401: {"description": "Credenciales incorrectas"},
        423: {"description": "Cuenta bloqueada temporalmente"},
        429: {"description": "Demasiados intentos de login"},
    },
)
@limiter.limit("5/minute")
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, body.email)

    if not user or not user.password_hash:
        # Dummy hash to prevent timing attacks (email enumeration)
        verify_password("dummy", hash_password("dummy"))
        log_action(db, action="login_failed", request=request, detail=body.email)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Check account lockout
    if is_account_locked(user):
        logger.warning("login_blocked_locked_account", rut=user.rut)
        log_action(db, action="login_locked", request=request, user_rut=user.rut)
        raise HTTPException(
            status_code=423,
            detail="Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta en 15 minutos.",
        )

    if not verify_password(body.password, user.password_hash):
        record_failed_login(db, user)
        log_action(db, action="login_failed", request=request, user_rut=user.rut)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Successful login — reset failed attempts
    reset_failed_logins(db, user)
    logger.info("user_login", email=user.email, rut=user.rut)
    log_action(db, action="login", request=request, user_rut=user.rut)

    token = create_access_token(data={"sub": user.rut, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ── Email verification ───────────────────────────────────────────────────────


@router.post(
    "/verify-email",
    summary="Verificar email con token",
    responses={
        400: {"description": "Token inválido o expirado"},
    },
)
@limiter.limit("10/hour")
def verify_email(
    request: Request,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = verify_token(token)
    if not payload or payload.get("purpose") != "email_verify":
        raise HTTPException(status_code=400, detail="Token de verificación inválido o expirado")

    rut = payload.get("sub")
    user = get_user_by_rut(db, rut) if rut else None
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    if user.email_verified:
        return {"message": "Email ya verificado"}

    user.email_verified = True
    db.commit()
    logger.info("email_verified", rut=user.rut, email=user.email)
    log_action(db, action="email_verified", request=request, user_rut=user.rut)
    return {"message": "Email verificado exitosamente"}


@router.post(
    "/resend-verification",
    summary="Reenviar email de verificación",
    responses={
        429: {"description": "Demasiados intentos"},
    },
)
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    current_user=Depends(get_current_user),
):
    if current_user.email_verified:
        return {"message": "Email ya verificado"}

    token = create_verification_token(current_user.rut)
    send_verification_email(current_user.email, current_user.first_name, token)
    return {"message": "Email de verificación enviado"}


# ── Password reset ──────────────────────────────────────────────────────────


@router.post(
    "/forgot-password",
    summary="Solicitar reset de contraseña",
    responses={
        429: {"description": "Demasiados intentos"},
    },
)
@limiter.limit("3/hour")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    # Always return success to prevent email enumeration
    user = get_user_by_email(db, body.email)
    if user:
        token = create_reset_token(user.rut)
        send_password_reset_email(user.email, user.first_name, token)
        logger.info("password_reset_requested", rut=user.rut)
        log_action(db, action="password_reset_request", request=request, user_rut=user.rut)

    return {"message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña."}


@router.post(
    "/reset-password",
    summary="Restablecer contraseña con token",
    responses={
        400: {"description": "Token inválido o expirado"},
    },
)
@limiter.limit("5/hour")
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    payload = verify_token(body.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Token de reset inválido o expirado")

    rut = payload.get("sub")
    user = get_user_by_rut(db, rut) if rut else None
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    user.password_hash = hash_password(body.new_password)
    user.failed_login_attempts = 0
    user.last_failed_login_at = None
    db.commit()

    logger.info("password_reset_completed", rut=user.rut)
    log_action(db, action="password_reset_complete", request=request, user_rut=user.rut)
    return {"message": "Contraseña restablecida exitosamente"}


# ── Gmail linking (OAuth for sync, NOT for login) ───────────────────────────


@router.get(
    "/google/login",
    summary="Iniciar vinculación de Gmail",
    description=(
        "Retorna la URL de autorización de Google para vincular Gmail. "
        "El usuario debe estar autenticado. Esto NO es login — es para "
        "conectar la cuenta de Gmail y habilitar la sincronización de emails."
    ),
)
def google_login(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_url, state = auth_service.get_authorization_url()
    return {"auth_url": auth_url, "state": state}


@router.get(
    "/google/callback",
    summary="Callback de vinculación Gmail",
    description=(
        "Endpoint al que Google redirige tras la autorización. "
        "Vincula los tokens de Gmail al usuario autenticado."
    ),
    responses={
        400: {"description": "OAuth falló"},
    },
)
def google_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        auth_service = AuthService(db)
        auth_service.link_gmail_account(code, state, current_user)
        log_action(db, action="gmail_linked", request=request, user_rut=current_user.rut)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/settings?gmail=linked"
        )
    except Exception as e:
        logger.error("Gmail link error: %s", e, exc_info=True)
        log_action(db, action="gmail_link_failed", request=request, user_rut=current_user.rut, detail=str(e))
        if settings.ENVIRONMENT == "development":
            detail = f"Gmail link error: {e}"
        else:
            detail = "Error al vincular Gmail. Intenta nuevamente."
        raise HTTPException(status_code=400, detail=detail)
