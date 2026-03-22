from typing import Literal, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Security ──────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Google OAuth ──────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # ── Application ───────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # ── Gmail sync ────────────────────────────────────────────────────────
    GMAIL_FETCH_WORKERS: int = 20
    GMAIL_MAX_RESULTS: int = 500
    SYNC_MAX_EMAILS: int = 2000
    SYNC_COOLDOWN_MINUTES: int = 5

    # ── Email (Resend) ─────────────────────────────────────────────────────
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "Chauchero <noreply@chauchero.app>"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # ── Observability (optional) ──────────────────────────────────────────
    SENTRY_DSN: Optional[str] = None

    # ── Validators ────────────────────────────────────────────────────────

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: openssl rand -hex 32"
            )
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("DATABASE_URL cannot be empty")
        return v

    @field_validator("GOOGLE_CLIENT_ID")
    @classmethod
    def google_client_id_format(cls, v: str) -> str:
        if not v.endswith(".apps.googleusercontent.com"):
            raise ValueError(
                "GOOGLE_CLIENT_ID must end with '.apps.googleusercontent.com'"
            )
        return v


settings = Settings()
