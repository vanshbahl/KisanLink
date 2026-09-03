from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_farmer
from app.models import User, FarmerProfile
from app.schemas.user import FarmerProfileCreate, FarmerProfileUpdate, FarmerProfileOut

router = APIRouter(prefix="/farmers", tags=["Farmers"])


@router.get("/profile", response_model=FarmerProfileOut)
async def get_farmer_profile(
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve authenticated farmer's profile."""
    stmt = (
        select(
            FarmerProfile,
            func.ST_X(FarmerProfile.location.cast(Geometry)).label("lon"),
            func.ST_Y(FarmerProfile.location.cast(Geometry)).label("lat"),
        )
        .where(FarmerProfile.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found. Please create your profile first.",
        )

    profile, lon, lat = row
    return FarmerProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        latitude=float(lat),
        longitude=float(lon),
        payout_upi_id=profile.payout_upi_id,
        reputation_score=float(profile.reputation_score),
        created_at=profile.created_at,
    )


@router.put("/profile", response_model=FarmerProfileOut)
async def update_farmer_profile(
    payload: FarmerProfileUpdate,
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Create or update authenticated farmer's profile."""
    stmt = select(FarmerProfile).where(FarmerProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        if not payload.full_name or not payload.district or not payload.state or payload.latitude is None or payload.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="full_name, district, state, latitude, and longitude are required to create profile.",
            )
        profile = FarmerProfile(
            user_id=current_user.id,
            full_name=payload.full_name,
            village=payload.village,
            district=payload.district,
            state=payload.state,
            location=WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326),
            payout_upi_id=payload.payout_upi_id,
        )
        db.add(profile)
    else:
        if payload.full_name is not None:
            profile.full_name = payload.full_name
        if payload.village is not None:
            profile.village = payload.village
        if payload.district is not None:
            profile.district = payload.district
        if payload.state is not None:
            profile.state = payload.state
        if payload.latitude is not None and payload.longitude is not None:
            profile.location = WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326)
        if payload.payout_upi_id is not None:
            profile.payout_upi_id = payload.payout_upi_id

    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language

    await db.commit()

    stmt_out = (
        select(
            FarmerProfile,
            func.ST_X(FarmerProfile.location.cast(Geometry)).label("lon"),
            func.ST_Y(FarmerProfile.location.cast(Geometry)).label("lat"),
        )
        .where(FarmerProfile.id == profile.id)
    )
    res_out = await db.execute(stmt_out)
    profile_updated, lon, lat = res_out.first()

    return FarmerProfileOut(
        id=profile_updated.id,
        user_id=profile_updated.user_id,
        full_name=profile_updated.full_name,
        village=profile_updated.village,
        district=profile_updated.district,
        state=profile_updated.state,
        latitude=float(lat),
        longitude=float(lon),
        payout_upi_id=profile_updated.payout_upi_id,
        reputation_score=float(profile_updated.reputation_score),
        created_at=profile_updated.created_at,
    )
