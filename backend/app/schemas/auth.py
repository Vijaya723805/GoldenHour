from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum

EMAIL_REGEX = r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$"

class LanguagePreference(str, Enum):
    ENGLISH = "en"
    TELUGU = "te"
    HINDI = "hi"


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    phone_number: str
    bank_name: str
    preferred_language: LanguagePreference = LanguagePreference.ENGLISH
    created_at: datetime
    updated_at: datetime
    email_notifications: bool = True
    sms_notifications: bool = True


class UserRegisterRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., pattern=r"^\+?[0-9]{10,13}$")
    bank_name: str = Field(..., min_length=2, max_length=100)
    preferred_language: LanguagePreference = LanguagePreference.ENGLISH


class UserLoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=6)


class UserAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,13}$")
    bank_name: Optional[str] = Field(None, min_length=2, max_length=100)
    preferred_language: Optional[LanguagePreference] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
