from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from ..models import User
from ..core.config import settings
from ..core.security import create_access_token


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
        """Create Google OAuth flow"""
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
        """
        Get OAuth authorization URL.
        
        Returns:
            Tuple of (auth_url, state)
        """
        flow = self.create_oauth_flow()
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return auth_url, state
    
    def handle_oauth_callback(self, code: str, state: str) -> dict:
        """
        Handle OAuth callback and create/update user.
        
        Returns:
            Dict with access_token and user info
        """
        flow = self.create_oauth_flow(state=state)
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        user_info = self._get_user_info(credentials)
        email = user_info['email']
        
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(
                email=email,
                gmail_refresh_token=credentials.refresh_token,
                gmail_token_expires_at=credentials.expiry
            )
            self.db.add(user)
        else:
            if credentials.refresh_token:
                user.gmail_refresh_token = credentials.refresh_token
            user.gmail_token_expires_at = credentials.expiry
            user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
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
    
    def _get_user_info(self, credentials: Credentials) -> dict:
        """Get user info from Google"""
        from googleapiclient.discovery import build
        
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        
        return user_info
    
    def get_current_user(self, token: str) -> Optional[User]:
        """Get user from JWT token"""
        from ..core.security import verify_token
        
        payload = verify_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        return self.db.query(User).filter(User.id == user_id).first()
