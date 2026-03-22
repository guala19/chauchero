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
from ..schemas import TokenResponse, RegisterRequest, LoginRequest
from ..schemas.user import UserResponse
from ..db.queries.users import get_user_by_rut, get_user_by_email, create_user
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
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Check account lockout
    if is_account_locked(user):
        logger.warning("login_blocked_locked_account", rut=user.rut)
        raise HTTPException(
            status_code=423,
            detail="Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta en 15 minutos.",
        )

    if not verify_password(body.password, user.password_hash):
        record_failed_login(db, user)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Successful login — reset failed attempts
    reset_failed_logins(db, user)
    logger.info("user_login", email=user.email, rut=user.rut)

    token = create_access_token(data={"sub": user.rut, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


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
    code: str = Query(...),
    state: str = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        auth_service = AuthService(db)
        auth_service.link_gmail_account(code, state, current_user)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/settings?gmail=linked"
        )
    except Exception as e:
        logger.error("Gmail link error: %s", e, exc_info=True)
        if settings.ENVIRONMENT == "development":
            detail = f"Gmail link error: {e}"
        else:
            detail = "Error al vincular Gmail. Intenta nuevamente."
        raise HTTPException(status_code=400, detail=detail)
