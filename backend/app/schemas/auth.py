from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.user import UserRoleEnum


class OTPRequest(BaseModel):
    phone: str = Field(..., example="+919812345678")


class OTPResponse(BaseModel):
    success: bool = True
    message: str = "OTP sent successfully"
    expires_in_seconds: int = 300


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., example="+919812345678")
    otp: str = Field(..., example="123456")
    preferred_role: Optional[UserRoleEnum] = Field(default=UserRoleEnum.FARMER)


class UserOutMinimal(BaseModel):
    id: UUID
    phone: str
    role: UserRoleEnum
    name: Optional[str] = None
    language: str = "hi"
    is_profile_complete: bool = False

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400
    user: UserOutMinimal


class TokenResponse(BaseModel):
    success: bool = True
    data: TokenData
