from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RoleOut(BaseModel):
    id: int
    name: str
    permissions: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=3)
    role_id: int = 2

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=3)
    role_id: Optional[int] = None
    status: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role_id: int
    role: Optional[RoleOut] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
