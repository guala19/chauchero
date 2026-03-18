import logging
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login(db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    auth_url, state = auth_service.get_authorization_url()
    return {"auth_url": auth_url, "state": state}


@router.get("/google/callback")
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


@router.get("/me", response_model=TokenResponse)
def get_me(current_user=Depends(get_current_user)):
    """Return current user info. The token is re-read from the Authorization header by get_current_user."""
    # We return the same token that was sent — the client already has it
    # If they need a fresh one, they should call /auth/refresh
    from ..core.security import create_access_token
    token = create_access_token(data={"sub": str(current_user.id)})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Refresh the JWT token. Extends the session without requiring a new Google OAuth flow.
    The current token must be valid (not expired). For expired tokens within the grace
    period, use POST /auth/refresh-expired.
    """
    new_token = create_access_token(data={"sub": str(current_user.id)})
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post("/refresh-expired", response_model=TokenResponse)
def refresh_expired_token(
    authorization: str = Header(..., description="Bearer <expired_token>"),
    db: Session = Depends(get_db),
):
    """
    Refresh a recently expired token (within 24h grace period).
    Use this when the normal /refresh fails with 401 due to expiry.
    """
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
