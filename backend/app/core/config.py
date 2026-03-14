from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"
    
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
