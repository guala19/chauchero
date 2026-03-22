import structlog
from typing import Optional
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from ..models import User
from ..core.config import settings
from ..core.security import verify_token
from ..db.queries.users import get_user_by_rut, get_user_by_email, update_user_tokens

logger = structlog.get_logger(__name__)


class AuthService:
    """Service for authentication and Gmail OAuth linking."""

    GMAIL_SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
    ]

    def __init__(self, db: Session):
        self.db = db

    # ── Gmail OAuth (link account, NOT login) ────────────────────────────────

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

    def link_gmail_account(self, code: str, state: str, user: User) -> User:
        """
        Complete the OAuth flow and link Gmail tokens to an existing user.
        This is NOT for login — the user must already be authenticated.
        """
        flow = self.create_oauth_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials

        logger.info(
            "gmail_link",
            rut=user.rut,
            email=user.email,
            refresh_token_present=credentials.refresh_token is not None,
        )

        if not credentials.refresh_token:
            logger.warning(
                "Google did not return refresh_token for %s — user may need to revoke and re-auth",
                user.email,
            )

        update_user_tokens(
            self.db,
            user,
            refresh_token=credentials.refresh_token,
            token_expires_at=credentials.expiry,
        )

        return user

    # ── JWT verification ─────────────────────────────────────────────────────

    def get_current_user(self, token: str) -> Optional[User]:
        payload = verify_token(token)
        if not payload:
            return None
        rut = payload.get("sub")
        if not rut:
            return None
        return get_user_by_rut(self.db, rut)

    def _get_user_info(self, credentials: Credentials) -> dict:
        from googleapiclient.discovery import build
        service = build('oauth2', 'v2', credentials=credentials)
        return service.userinfo().get().execute()
