from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from .config import settings

# Grace period: expired tokens can still be refreshed within this window
JWT_REFRESH_GRACE_HOURS = 24


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, allow_expired: bool = False) -> Optional[dict]:
    """
    Verify JWT and return payload.

    - allow_expired=False (default): rejects expired tokens → used for normal auth
    - allow_expired=True: accepts expired tokens within the grace period → used for refresh
    """
    try:
        options = {"verify_exp": not allow_expired}
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options=options,
        )
        if allow_expired:
            exp = payload.get("exp")
            if exp is None:
                return None
            expired_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            grace_limit = expired_at + timedelta(hours=JWT_REFRESH_GRACE_HOURS)
            if datetime.now(timezone.utc) > grace_limit:
                return None  # Too old, even grace period has passed
        return payload
    except JWTError:
        return None
