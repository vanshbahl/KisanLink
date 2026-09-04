from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_buyer
from app.models import User, BuyerProfile
from app.schemas.user import BuyerProfileCreate, BuyerProfileUpdate, BuyerProfileOut

router = APIRouter(prefix="/buyers", tags=["Buyers"])


@router.get("/profile", response_model=BuyerProfileOut)
async def get_buyer_profile(
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve authenticated buyer's profile."""
    stmt = (
        select(
            BuyerProfile,
            func.ST_X(BuyerProfile.delivery_location.cast(Geometry)).label("lon"),
            func.ST_Y(BuyerProfile.delivery_location.cast(Geometry)).label("lat"),
        )
        .where(BuyerProfile.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found. Please create your profile first.",
        )

    profile, lon, lat = row
    return BuyerProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        business_name=profile.business_name,
        buyer_type=profile.buyer_type,
        gstin=profile.gstin,
        delivery_address=profile.delivery_address,
        delivery_latitude=float(lat),
        delivery_longitude=float(lon),
        created_at=profile.created_at,
    )


@router.put("/profile", response_model=BuyerProfileOut)
async def update_buyer_profile(
    payload: BuyerProfileUpdate,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Create or update authenticated buyer's profile."""
    stmt = select(BuyerProfile).where(BuyerProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        if not payload.business_name or not payload.buyer_type or not payload.delivery_address or payload.delivery_latitude is None or payload.delivery_longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="business_name, buyer_type, delivery_address, delivery_latitude, and delivery_longitude are required.",
            )
        profile = BuyerProfile(
            user_id=current_user.id,
            business_name=payload.business_name,
            buyer_type=payload.buyer_type,
            gstin=payload.gstin,
            delivery_address=payload.delivery_address,
            delivery_location=WKTElement(
                f"POINT({payload.delivery_longitude} {payload.delivery_latitude})", srid=4326
            ),
        )
        db.add(profile)
    else:
        if payload.business_name is not None:
            profile.business_name = payload.business_name
        if payload.buyer_type is not None:
            profile.buyer_type = payload.buyer_type
        if payload.gstin is not None:
            profile.gstin = payload.gstin
        if payload.delivery_address is not None:
            profile.delivery_address = payload.delivery_address
        if payload.delivery_latitude is not None and payload.delivery_longitude is not None:
            profile.delivery_location = WKTElement(
                f"POINT({payload.delivery_longitude} {payload.delivery_latitude})", srid=4326
            )

    await db.commit()

    stmt_out = (
        select(
            BuyerProfile,
            func.ST_X(BuyerProfile.delivery_location.cast(Geometry)).label("lon"),
            func.ST_Y(BuyerProfile.delivery_location.cast(Geometry)).label("lat"),
        )
        .where(BuyerProfile.id == profile.id)
    )
    res_out = await db.execute(stmt_out)
    profile_updated, lon, lat = res_out.first()

    return BuyerProfileOut(
        id=profile_updated.id,
        user_id=profile_updated.user_id,
        business_name=profile_updated.business_name,
        buyer_type=profile_updated.buyer_type,
        gstin=profile_updated.gstin,
        delivery_address=profile_updated.delivery_address,
        delivery_latitude=float(lat),
        delivery_longitude=float(lon),
        created_at=profile_updated.created_at,
    )
