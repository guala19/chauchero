import structlog
from typing import Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from ..models import User
from ..core.config import settings
from ..core.security import create_access_token, verify_token
from ..db.queries.users import get_user_by_id, get_user_by_email, create_user, update_user_tokens

logger = structlog.get_logger(__name__)


class AuthService:
    """Service for authentication and OAuth flows"""

    GMAIL_SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
    ]

    def __init__(self, db: Session):
        self.db = db

    def create_oauth_flow(self, state: Optional[str] = None) -> Flow:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=self.GMAIL_SCOPES,
            state=state
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        return flow

    def get_authorization_url(self) -> tuple[str, str]:
        flow = self.create_oauth_flow()
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return auth_url, state

    def handle_oauth_callback(self, code: str, state: str) -> dict:
        flow = self.create_oauth_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials

        user_info = self._get_user_info(credentials)
        email = user_info['email']

        user = get_user_by_email(self.db, email)

        logger.info(
            "OAuth callback for %s — refresh_token present: %s, user exists: %s",
            email, credentials.refresh_token is not None, user is not None,
        )

        if not user:
            user = create_user(
                self.db,
                email=email,
                gmail_refresh_token=credentials.refresh_token,
                gmail_token_expires_at=credentials.expiry,
            )
        else:
            # Always update tokens — even if refresh_token is None, log it
            if not credentials.refresh_token:
                logger.warning(
                    "Google did not return refresh_token for %s — user may need to revoke and re-auth",
                    email,
                )
            update_user_tokens(
                self.db,
                user,
                refresh_token=credentials.refresh_token,
                token_expires_at=credentials.expiry,
            )

        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email
            }
        }

    def get_current_user(self, token: str) -> Optional[User]:
        payload = verify_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return get_user_by_id(self.db, user_id)

    def _get_user_info(self, credentials: Credentials) -> dict:
        from googleapiclient.discovery import build
        service = build('oauth2', 'v2', credentials=credentials)
        return service.userinfo().get().execute()
