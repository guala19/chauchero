from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    last_sync_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
