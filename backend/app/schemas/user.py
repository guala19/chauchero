from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    rut: str
    first_name: str
    last_name: str
    email_verified: bool = False
    created_at: datetime
    last_sync_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str
    rut: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

    @field_validator("rut")
    @classmethod
    def validate_rut_format(cls, v: str) -> str:
        import re
        v = v.strip()
        if not re.match(r"^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$", v):
            raise ValueError("RUT debe tener formato XX.XXX.XXX-X")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self
