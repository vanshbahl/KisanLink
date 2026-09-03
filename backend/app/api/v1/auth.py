from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, verify_otp
from app.database import get_db
from app.models import User, UserRoleEnum, FarmerProfile, BuyerProfile, LogisticsProfile
from app.schemas.auth import OTPRequest, OTPResponse, OTPVerifyRequest, TokenResponse, TokenData, UserOutMinimal

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-otp", response_model=OTPResponse)
async def request_otp(payload: OTPRequest):
    """Request 6-digit SMS OTP for passwordless onboarding. Supports demo OTP '123456'."""
    # In production, send SMS via provider. For dev/demo, 123456 is supported.
    return OTPResponse(
        success=True,
        message="OTP sent successfully to registered phone number.",
        expires_in_seconds=300,
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(payload: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify 6-digit OTP, provision user if new, and return signed JWT access token."""
    if not verify_otp(payload.phone, payload.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please use demo OTP 123456.",
        )

    stmt = (
        select(User)
        .where(User.phone == payload.phone)
        .options(
            selectinload(User.farmer_profile),
            selectinload(User.buyer_profile),
            selectinload(User.logistics_profile),
        )
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    role = payload.preferred_role or UserRoleEnum.FARMER

    if not user:
        # Provision new user
        user = User(
            phone=payload.phone,
            role=role,
            preferred_language="hi",
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        await db.flush()

    token = create_access_token(subject=str(user.id), role=user.role.value)

    # Resolve user name and completeness
    name = None
    is_complete = False
    if user.farmer_profile:
        name = user.farmer_profile.full_name
        is_complete = True
    elif user.buyer_profile:
        name = user.buyer_profile.business_name
        is_complete = True
    elif user.logistics_profile:
        name = user.logistics_profile.transporter_name
        is_complete = True

    await db.commit()

    return TokenResponse(
        success=True,
        data=TokenData(
            access_token=token,
            token_type="bearer",
            expires_in=86400,
            user=UserOutMinimal(
                id=user.id,
                phone=user.phone,
                role=user.role,
                name=name,
                language=user.preferred_language,
                is_profile_complete=is_complete,
            ),
        ),
    )
