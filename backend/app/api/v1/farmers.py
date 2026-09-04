from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_farmer
from app.models import (
    User,
    FarmerProfile,
    CropListing,
    ListingStatusEnum,
    Order,
    OrderStatusEnum,
    OrderFarmerAllocation,
    CropType,
)
from app.schemas.user import (
    FarmerProfileCreate,
    FarmerProfileUpdate,
    FarmerProfileOut,
    FarmerDashboardOut,
    FarmerUpcomingPickupOut,
    FarmerEarningOut,
    FarmerPickupOut,
)

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


@router.get("/dashboard", response_model=FarmerDashboardOut)
async def get_farmer_dashboard(
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve summarized operational and financial dashboard for authenticated farmer."""
    if not current_user.farmer_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    farmer_id = current_user.farmer_profile.id

    # 1. Active listings count
    stmt_listings = (
        select(func.count(CropListing.id))
        .where(CropListing.farmer_id == farmer_id, CropListing.status == ListingStatusEnum.ACTIVE)
    )
    active_listings = (await db.execute(stmt_listings)).scalar() or 0

    # 2. Allocations
    stmt_allocs = (
        select(OrderFarmerAllocation)
        .options(
            selectinload(OrderFarmerAllocation.order),
            selectinload(OrderFarmerAllocation.listing).selectinload(CropListing.crop_type),
        )
        .where(OrderFarmerAllocation.farmer_id == farmer_id)
    )
    alloc_res = await db.execute(stmt_allocs)
    allocs = alloc_res.scalars().all()

    earnings = 0.0
    pending = 0.0
    new_orders = 0
    upcoming_pickup = None

    for alloc in allocs:
        payout = float(alloc.farmer_payout_amount_rupees)
        if alloc.is_settled:
            earnings += payout
        else:
            pending += payout

        if alloc.order and alloc.order.status == OrderStatusEnum.CONFIRMED:
            new_orders += 1

        if not alloc.is_picked_up and not upcoming_pickup:
            crop_name = alloc.listing.crop_type.name_en if alloc.listing and alloc.listing.crop_type else "Produce"
            crop_name_hi = alloc.listing.crop_type.name_hi if alloc.listing and alloc.listing.crop_type else None
            upcoming_pickup = FarmerUpcomingPickupOut(
                id=f"PK-{alloc.pickup_verification_otp}",
                order_id=alloc.order.order_code if alloc.order else str(alloc.order_id),
                crop=crop_name,
                crop_hi=crop_name_hi,
                quantity_kg=float(alloc.allocated_kg),
                date=str(date.today()),
                status="scheduled",
            )

    return FarmerDashboardOut(
        earnings=round(earnings, 2),
        pending=round(pending, 2),
        active_listings=active_listings,
        new_orders=new_orders,
        upcoming_pickup=upcoming_pickup,
    )


@router.get("/earnings", response_model=List[FarmerEarningOut])
async def get_farmer_earnings(
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve transparent ledger of all payouts, pending escrow settlements, and value-gain."""
    if not current_user.farmer_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    farmer_id = current_user.farmer_profile.id

    stmt = (
        select(OrderFarmerAllocation)
        .options(
            selectinload(OrderFarmerAllocation.order),
            selectinload(OrderFarmerAllocation.listing).selectinload(CropListing.crop_type),
        )
        .where(OrderFarmerAllocation.farmer_id == farmer_id)
        .order_by(OrderFarmerAllocation.id.desc())
    )
    res = await db.execute(stmt)
    allocs = res.scalars().all()

    output = []
    for alloc in allocs:
        payout = float(alloc.farmer_payout_amount_rupees)
        crop_en = alloc.listing.crop_type.name_en if alloc.listing and alloc.listing.crop_type else "Produce"
        crop_hi = alloc.listing.crop_type.name_hi if alloc.listing and alloc.listing.crop_type else None
        rate = float(alloc.listing.expected_price_per_kg) if alloc.listing else 30.0
        gross = round(float(alloc.allocated_kg) * rate, 2)
        deductions = round(gross - payout, 2)
        mandi_eq = round(gross * 0.8, 2)
        order_code = alloc.order.order_code if alloc.order else str(alloc.order_id)
        dt_str = alloc.order.created_at.strftime("%Y-%m-%d") if alloc.order and alloc.order.created_at else str(date.today())

        output.append(
            FarmerEarningOut(
                id=f"TX-{alloc.id.hex[:8].upper()}",
                order_id=order_code,
                crop=crop_en,
                crop_hi=crop_hi,
                gross=gross,
                deductions=deductions,
                net=payout,
                mandi_equivalent=mandi_eq,
                date=dt_str,
                status="paid" if alloc.is_settled else "pending",
            )
        )
    return output


@router.get("/pickups", response_model=List[FarmerPickupOut])
async def get_farmer_pickups(
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve upcoming and historical farmgate produce pickup schedules."""
    if not current_user.farmer_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    farmer_id = current_user.farmer_profile.id
    profile = current_user.farmer_profile

    stmt = (
        select(OrderFarmerAllocation)
        .options(
            selectinload(OrderFarmerAllocation.order),
            selectinload(OrderFarmerAllocation.listing).selectinload(CropListing.crop_type),
        )
        .where(OrderFarmerAllocation.farmer_id == farmer_id)
        .order_by(OrderFarmerAllocation.id.desc())
    )
    res = await db.execute(stmt)
    allocs = res.scalars().all()

    output = []
    for alloc in allocs:
        crop_en = alloc.listing.crop_type.name_en if alloc.listing and alloc.listing.crop_type else "Produce"
        crop_hi = alloc.listing.crop_type.name_hi if alloc.listing and alloc.listing.crop_type else None
        order_code = alloc.order.order_code if alloc.order else str(alloc.order_id)
        dt_str = alloc.order.created_at.strftime("%Y-%m-%d") if alloc.order and alloc.order.created_at else str(date.today())
        address = f"{profile.village or 'Farm'}, {profile.district}, {profile.state}"

        status_str = "completed" if alloc.is_picked_up else "scheduled"
        if alloc.order and alloc.order.status == OrderStatusEnum.IN_TRANSIT:
            status_str = "in_transit"

        output.append(
            FarmerPickupOut(
                id=f"PK-{alloc.pickup_verification_otp}",
                order_id=order_code,
                crop=crop_en,
                crop_hi=crop_hi,
                quantity_kg=float(alloc.allocated_kg),
                date=dt_str,
                time_window="Morning · 7–10 AM",
                driver="KisanLink Logistics",
                vehicle="Mini Truck (1.5T)",
                farm_address=address,
                status=status_str,
            )
        )
    return output
