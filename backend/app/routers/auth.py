import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.config import settings
from ..core.security import create_access_token, verify_token
from ..services.auth_service import AuthService
from ..schemas import TokenResponse
from ..schemas.user import UserResponse
from ..db.queries.users import get_user_by_id
from .deps import get_current_user

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/google/login",
    summary="Iniciar OAuth con Google",
    description="Retorna la URL de autorización de Google. El cliente debe redirigir al usuario a esa URL.",
)
def google_login(db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    auth_url, state = auth_service.get_authorization_url()
    return {"auth_url": auth_url, "state": state}


@router.get(
    "/google/callback",
    summary="Callback OAuth de Google",
    description=(
        "Endpoint al que Google redirige tras la autenticación. "
        "Intercambia el código por tokens, crea o actualiza el usuario en DB, "
        "y redirige al frontend con el JWT en la query string."
    ),
    responses={
        400: {"description": "OAuth falló — código inválido, state incorrecto, o error de Google"},
    },
)
def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        auth_service = AuthService(db)
        result = auth_service.handle_oauth_callback(code, state)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?token={result['access_token']}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OAuth callback error: %s", e, exc_info=True)
        # Never expose internal error details to the client
        if settings.ENVIRONMENT == "development":
            detail = f"OAuth error: {e}"
        else:
            detail = "Authentication failed. Please try again."
        raise HTTPException(status_code=400, detail=detail)


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
    from ..core.security import create_access_token
    token = create_access_token(data={"sub": str(current_user.id)})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renovar JWT (token válido)",
    description=(
        "Extiende la sesión emitiendo un nuevo JWT. "
        "El token actual debe estar vigente. "
        "Si ya expiró pero tiene menos de 24h, usar POST /auth/refresh-expired."
    ),
    responses={
        401: {"description": "Token ausente, inválido o expirado"},
    },
)
def refresh_token(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_token = create_access_token(data={"sub": str(current_user.id)})
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post(
    "/refresh-expired",
    response_model=TokenResponse,
    summary="Renovar JWT (token expirado con grace period)",
    description=(
        "Permite renovar un token expirado dentro de las últimas 24 horas. "
        "Usar cuando POST /auth/refresh falla con 401 por expiración. "
        "Tokens expirados hace más de 24h son rechazados — el usuario debe volver a hacer login."
    ),
    responses={
        401: {"description": "Token inválido o expirado hace más de 24 horas"},
    },
)
def refresh_expired_token(
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

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
