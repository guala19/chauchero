from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..services.auth_service import AuthService
from ..schemas import TokenResponse

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
    db: Session = Depends(get_db)
):
    try:
        auth_service = AuthService(db)
        result = auth_service.handle_oauth_callback(code, state)
        from ..core.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback?token={result['access_token']}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")


@router.get("/me", response_model=TokenResponse)
def get_current_user(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    from ..schemas.user import UserResponse
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }
