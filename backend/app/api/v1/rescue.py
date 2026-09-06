from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_farmer
from app.models import User, CropListing, CropType, ListingStatusEnum
from app.schemas.rescue import TagUrgentRescueRequest, TagUrgentRescueResponse
from app.services.distress_pricing import calculate_distress_price

router = APIRouter(prefix="/rescue", tags=["Rescue"])


@router.post("/tag-urgent", response_model=TagUrgentRescueResponse)
async def tag_urgent_rescue(
    payload: TagUrgentRescueRequest,
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """
    Tag a crop listing as an urgent wastage rescue sale with dynamic distress pricing.
    Strictly verifies farmer ownership and status.
    """
    if not current_user.farmer_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer profile required.",
        )

    stmt = (
        select(CropListing, CropType)
        .join(CropType, CropListing.crop_type_id == CropType.id)
        .where(CropListing.id == payload.listing_id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop listing not found.",
        )

    listing, crop_type = row

    if listing.farmer_id != current_user.farmer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this listing.",
        )

    normal_price = float(listing.expected_price_per_kg)
    shelf_life = crop_type.shelf_life_days if crop_type else 7
    is_imminent = listing.harvest_date <= date.today()

    rescue_price, discount_pct = calculate_distress_price(
        normal_price_per_kg=normal_price,
        shelf_life_days=shelf_life,
        is_harvest_imminent_or_past=is_imminent,
        urgency_level=payload.urgency_level or "HIGH",
    )

    listing.is_urgent_rescue = True
    listing.status = ListingStatusEnum.RESCUE_ACTIVE
    listing.rescue_discount_price_per_kg = rescue_price

    await db.commit()

    return TagUrgentRescueResponse(
        listing_id=listing.id,
        is_urgent_rescue=listing.is_urgent_rescue,
        normal_price_per_kg=normal_price,
        rescue_price_per_kg=rescue_price,
        discount_percentage=discount_pct,
        status=listing.status,
    )
