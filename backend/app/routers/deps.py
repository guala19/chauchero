from typing import Optional
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..db.queries.users import get_user_by_id
from ..core.security import verify_token
from ..models import User


def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer <token>"),
    db: Session = Depends(get_db),
) -> User:
    """Shared auth dependency — extracts and validates JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    token = authorization.removeprefix("Bearer ")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
