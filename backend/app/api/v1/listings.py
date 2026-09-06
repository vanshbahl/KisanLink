import re
from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_farmer
from app.models import User, CropType, CropListing, FarmerProfile, QualityGradeEnum, ListingStatusEnum
from app.schemas.crop import (
    CropListingCreate,
    CropListingUpdate,
    CropListingOut,
    VoiceParseRequest,
    VoiceParseResponse,
)

router = APIRouter(prefix="/listings", tags=["Listings"])

CROP_SYNONYMS = [
    {"en": "Tomato", "hi": "टमाटर", "category": "Vegetables", "aliases": ["tomato", "tomatoes", "tamatar", "टमाटर"]},
    {"en": "Potato", "hi": "आलू", "category": "Staples", "aliases": ["potato", "potatoes", "aloo", "alu", "आलू"]},
    {"en": "Onion", "hi": "प्याज़", "category": "Vegetables", "aliases": ["onion", "onions", "pyaz", "pyaj", "प्याज", "प्याज़"]},
    {"en": "Spinach", "hi": "पालक", "category": "Vegetables", "aliases": ["spinach", "palak", "पालक"]},
    {"en": "Wheat", "hi": "गेहूं", "category": "Grains", "aliases": ["wheat", "gehu", "gehum", "गेहूं"]},
    {"en": "Carrot", "hi": "गाजर", "category": "Vegetables", "aliases": ["carrot", "carrots", "gajar", "गाजर"]},
    {"en": "Capsicum", "hi": "शिमला मिर्च", "category": "Vegetables", "aliases": ["capsicum", "shimla mirch", "शिमला मिर्च"]},
    {"en": "Cauliflower", "hi": "फूलगोभी", "category": "Vegetables", "aliases": ["cauliflower", "gobi", "phoolgobi", "फूलगोभी"]},
    {"en": "Cucumber", "hi": "खीरा", "category": "Vegetables", "aliases": ["cucumber", "kheera", "khira", "खीरा"]},
    {"en": "Apple", "hi": "सेब", "category": "Fruits", "aliases": ["apple", "apples", "seb", "सेब"]},
    {"en": "Rice", "hi": "चावल", "category": "Grains", "aliases": ["rice", "chawal", "चावल"]},
    {"en": "Mustard", "hi": "सरसों", "category": "Staples", "aliases": ["mustard", "sarson", "सरसों"]},
]


@router.post("/parse-voice", response_model=VoiceParseResponse)
async def parse_voice_listing(
    payload: VoiceParseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deterministic Voice NLP parser converting spoken Indic/English text into structured listing fields.
    Extracts crop name, quantity (kg), price per kg, and harvest date.

    Only assists the farmer's listing form: the caller is expected to let the user
    review/edit every field before publishing, never to publish directly from this response.
    """
    raw_text = payload.transcript.strip()
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty or invalid speech transcript.",
        )

    text_lower = raw_text.lower()

    # 1. Resolve Crop Name using Database CropType records first
    stmt_crops = select(CropType)
    res_crops = await db.execute(stmt_crops)
    db_crop_types = res_crops.scalars().all()

    matched_crop_en: Optional[str] = None
    matched_crop_hi: Optional[str] = None
    matched_category: str = "Vegetables"

    for ct in db_crop_types:
        name_en_lower = ct.name_en.lower()
        name_hi_lower = ct.name_hi.lower()
        if (
            name_en_lower in text_lower
            or name_hi_lower in text_lower
            or (name_en_lower + "es") in text_lower
            or (name_en_lower + "s") in text_lower
        ):
            matched_crop_en = ct.name_en
            matched_crop_hi = ct.name_hi
            matched_category = ct.category
            break

    if not matched_crop_en:
        for entry in CROP_SYNONYMS:
            if any(alias in text_lower for alias in entry["aliases"]):
                matched_crop_en = entry["en"]
                matched_crop_hi = entry["hi"]
                matched_category = entry["category"]
                break

    if not matched_crop_en:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not identify crop name from transcript. Please mention a crop (e.g., Tomato, Potato, Onion, Wheat).",
        )

    # 2. Extract Price (Explicit Match First)
    price_match = re.search(
        r"(?:₹\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupee|रुपये|रुपया|की दर|per kg|/kg|पर किलो))",
        text_lower,
    )
    extracted_price: Optional[float] = None
    price_num: Optional[float] = None
    if price_match:
        price_num = float(price_match.group(1) or price_match.group(2))
        extracted_price = price_num

    # 3. Extract Quantity
    qty_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilo|किलो|क्विंटल|quintal|tonne|ton|टन)",
        text_lower,
    )
    extracted_qty: Optional[float] = None
    qty_num: Optional[float] = None
    if qty_match:
        qty_num = float(qty_match.group(1))
        val = qty_num
        unit = qty_match.group(0).lower()
        if "quintal" in unit or "क्विंट" in unit:
            val *= 100.0
        elif "tonne" in unit or "ton" in unit or "टन" in unit:
            val *= 1000.0
        extracted_qty = val
    else:
        # Fallback: select first number that isn't the explicit price number
        all_numbers = [float(n) for n in re.findall(r"\b\d+(?:\.\d+)?\b", text_lower)]
        for n in all_numbers:
            if price_num is None or n != price_num:
                extracted_qty = n
                qty_num = n
                break

    if not extracted_qty or extracted_qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not identify quantity from transcript. Please specify quantity in kg (e.g., 500 kg).",
        )

    # 4. Fallback for Price (if no explicit price unit was specified)
    if extracted_price is None:
        all_numbers = [float(n) for n in re.findall(r"\b\d+(?:\.\d+)?\b", text_lower)]
        for n in all_numbers:
            if (qty_num is None or n != qty_num) and n > 0 and n < 5000:
                extracted_price = n
                break

    if not extracted_price or extracted_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not identify price per kg from transcript. Please specify price in rupees (e.g., 25 rupees per kg).",
        )

    # 5. Extract Harvest Date
    harvest_date_str = date.today().isoformat()
    if "कल" in text_lower or "tomorrow" in text_lower:
        harvest_date_str = (date.today() + timedelta(days=1)).isoformat()

    return VoiceParseResponse(
        crop_name=matched_crop_en,
        crop_name_hi=matched_crop_hi or matched_crop_en,
        category=matched_category,
        quantity_kg=extracted_qty,
        price_per_kg=extracted_price,
        harvest_date=harvest_date_str,
        confidence_score=0.95,
    )


@router.post("", response_model=CropListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: CropListingCreate,
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Create a new active or pre-harvest crop listing (Farmer owned)."""
    if not current_user.farmer_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farmer profile required before creating crop listings.",
        )

    stmt_crop = select(CropType).where(CropType.name_en.ilike(payload.crop_name))
    res_crop = await db.execute(stmt_crop)
    crop_type = res_crop.scalar_one_or_none()

    if not crop_type:
        crop_type = CropType(
            name_en=payload.crop_name.capitalize(),
            name_hi=payload.crop_name,
            category="Vegetable",
            shelf_life_days=7,
        )
        db.add(crop_type)
        await db.flush()

    lat = payload.latitude
    lon = payload.longitude
    if lat is None or lon is None:
        stmt_loc = select(
            func.ST_X(FarmerProfile.location.cast(Geometry)).label("lon"),
            func.ST_Y(FarmerProfile.location.cast(Geometry)).label("lat"),
        ).where(FarmerProfile.id == current_user.farmer_profile.id)
        res_loc = await db.execute(stmt_loc)
        farmer_lon, farmer_lat = res_loc.first()
        lon, lat = float(farmer_lon), float(farmer_lat)

    listing = CropListing(
        farmer_id=current_user.farmer_profile.id,
        crop_type_id=crop_type.id,
        variety=payload.variety,
        quantity_kg=payload.quantity_kg,
        available_quantity_kg=payload.quantity_kg,
        expected_price_per_kg=payload.expected_price_per_kg,
        quality_grade=payload.quality_grade,
        is_pre_harvest=payload.is_pre_harvest,
        harvest_date=payload.harvest_date,
        status=ListingStatusEnum.ACTIVE,
        location=WKTElement(f"POINT({lon} {lat})", srid=4326),
        photos=payload.photos or [],
    )
    db.add(listing)
    await db.commit()

    return CropListingOut(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farmer_name=current_user.farmer_profile.full_name,
        farmer_village=current_user.farmer_profile.village,
        farmer_district=current_user.farmer_profile.district,
        crop_type_id=crop_type.id,
        crop_name=crop_type.name_en,
        crop_name_hi=crop_type.name_hi,
        category=crop_type.category,
        variety=listing.variety,
        quantity_kg=float(listing.quantity_kg),
        available_quantity_kg=float(listing.available_quantity_kg),
        expected_price_per_kg=float(listing.expected_price_per_kg),
        mandi_price_per_kg=round(float(listing.expected_price_per_kg) * 0.8, 2),
        quality_grade=listing.quality_grade,
        is_pre_harvest=listing.is_pre_harvest,
        harvest_date=listing.harvest_date,
        status=listing.status,
        latitude=lat,
        longitude=lon,
        distance_km=0.0,
        photos=listing.photos,
        is_urgent_rescue=listing.is_urgent_rescue,
        rescue_discount_price_per_kg=float(listing.rescue_discount_price_per_kg) if listing.rescue_discount_price_per_kg is not None else None,
        created_at=listing.created_at,
    )


@router.get("", response_model=List[CropListingOut])
async def list_listings(
    crop: Optional[str] = Query(None),
    quality_grade: Optional[QualityGradeEnum] = Query(None),
    is_pre_harvest: Optional[bool] = Query(None),
    status: Optional[ListingStatusEnum] = Query(ListingStatusEnum.ACTIVE),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_km: Optional[float] = Query(None, gt=0),
    db: AsyncSession = Depends(get_db),
):
    """Spatial listing search using PostGIS distance calculation and radius filter."""
    ref_geom = None
    if lat is not None and lon is not None:
        ref_geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)

    stmt = (
        select(
            CropListing,
            CropType.name_en.label("crop_name"),
            CropType.name_hi.label("crop_name_hi"),
            CropType.category.label("category"),
            FarmerProfile.full_name.label("farmer_name"),
            FarmerProfile.village.label("farmer_village"),
            FarmerProfile.district.label("farmer_district"),
            func.ST_X(CropListing.location.cast(Geometry)).label("lon"),
            func.ST_Y(CropListing.location.cast(Geometry)).label("lat"),
            (func.ST_Distance(CropListing.location, ref_geom) / 1000.0).label("dist_km")
            if ref_geom is not None else None,
        )
        .join(CropType, CropListing.crop_type_id == CropType.id)
        .join(FarmerProfile, CropListing.farmer_id == FarmerProfile.id)
    )

    if status:
        if status == ListingStatusEnum.ACTIVE:
            # Rescue-tagged listings are still on sale (at a discount), so an "active"
            # browse should surface them alongside ordinary active listings.
            stmt = stmt.where(CropListing.status.in_([ListingStatusEnum.ACTIVE, ListingStatusEnum.RESCUE_ACTIVE]))
        else:
            stmt = stmt.where(CropListing.status == status)
    if crop:
        stmt = stmt.where(CropType.name_en.ilike(f"%{crop}%"))
    if quality_grade:
        stmt = stmt.where(CropListing.quality_grade == quality_grade)
    if is_pre_harvest is not None:
        stmt = stmt.where(CropListing.is_pre_harvest == is_pre_harvest)

    if ref_geom is not None and radius_km is not None:
        stmt = stmt.where(func.ST_DWithin(CropListing.location, ref_geom, radius_km * 1000.0))

    if ref_geom is not None:
        stmt = stmt.order_by("dist_km")
    else:
        stmt = stmt.order_by(CropListing.created_at.desc())

    res = await db.execute(stmt)
    rows = res.all()

    output = []
    for row in rows:
        if ref_geom is not None:
            listing, crop_name, crop_name_hi, category, f_name, f_village, f_district, item_lon, item_lat, dist_km = row
        else:
            listing, crop_name, crop_name_hi, category, f_name, f_village, f_district, item_lon, item_lat = row[0:9]
            dist_km = None

        output.append(
            CropListingOut(
                id=listing.id,
                farmer_id=listing.farmer_id,
                farmer_name=f_name,
                farmer_village=f_village,
                farmer_district=f_district,
                crop_type_id=listing.crop_type_id,
                crop_name=crop_name,
                crop_name_hi=crop_name_hi,
                category=category,
                variety=listing.variety,
                quantity_kg=float(listing.quantity_kg),
                available_quantity_kg=float(listing.available_quantity_kg),
                expected_price_per_kg=float(listing.expected_price_per_kg),
                mandi_price_per_kg=round(float(listing.expected_price_per_kg) * 0.8, 2),
                quality_grade=listing.quality_grade,
                is_pre_harvest=listing.is_pre_harvest,
                harvest_date=listing.harvest_date,
                status=listing.status,
                latitude=float(item_lat),
                longitude=float(item_lon),
                distance_km=round(float(dist_km), 2) if dist_km is not None else None,
                photos=listing.photos,
                is_urgent_rescue=listing.is_urgent_rescue,
                rescue_discount_price_per_kg=float(listing.rescue_discount_price_per_kg) if listing.rescue_discount_price_per_kg is not None else None,
                created_at=listing.created_at,
            )
        )

    return output


@router.get("/{id}", response_model=CropListingOut)
async def get_listing(id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a single crop listing."""
    stmt = (
        select(
            CropListing,
            CropType.name_en.label("crop_name"),
            CropType.name_hi.label("crop_name_hi"),
            CropType.category.label("category"),
            FarmerProfile.full_name.label("farmer_name"),
            FarmerProfile.village.label("farmer_village"),
            FarmerProfile.district.label("farmer_district"),
            func.ST_X(CropListing.location.cast(Geometry)).label("lon"),
            func.ST_Y(CropListing.location.cast(Geometry)).label("lat"),
        )
        .join(CropType, CropListing.crop_type_id == CropType.id)
        .join(FarmerProfile, CropListing.farmer_id == FarmerProfile.id)
        .where(CropListing.id == id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop listing not found.")

    listing, crop_name, crop_name_hi, category, f_name, f_village, f_district, item_lon, item_lat = row
    return CropListingOut(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farmer_name=f_name,
        farmer_village=f_village,
        farmer_district=f_district,
        crop_type_id=listing.crop_type_id,
        crop_name=crop_name,
        crop_name_hi=crop_name_hi,
        category=category,
        variety=listing.variety,
        quantity_kg=float(listing.quantity_kg),
        available_quantity_kg=float(listing.available_quantity_kg),
        expected_price_per_kg=float(listing.expected_price_per_kg),
        mandi_price_per_kg=round(float(listing.expected_price_per_kg) * 0.8, 2),
        quality_grade=listing.quality_grade,
        is_pre_harvest=listing.is_pre_harvest,
        harvest_date=listing.harvest_date,
        status=listing.status,
        latitude=float(item_lat),
        longitude=float(item_lon),
        photos=listing.photos,
        is_urgent_rescue=listing.is_urgent_rescue,
        rescue_discount_price_per_kg=float(listing.rescue_discount_price_per_kg) if listing.rescue_discount_price_per_kg is not None else None,
        created_at=listing.created_at,
    )


@router.put("/{id}", response_model=CropListingOut)
async def update_listing(
    id: UUID,
    payload: CropListingUpdate,
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Update a crop listing (Strict ownership check)."""
    if not current_user.farmer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Farmer profile required.")

    stmt = select(CropListing).where(CropListing.id == id)
    res = await db.execute(stmt)
    listing = res.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop listing not found.")

    if listing.farmer_id != current_user.farmer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this listing.",
        )

    if payload.variety is not None:
        listing.variety = payload.variety
    if payload.quantity_kg is not None:
        listing.quantity_kg = payload.quantity_kg
    if payload.available_quantity_kg is not None:
        listing.available_quantity_kg = payload.available_quantity_kg
    if payload.expected_price_per_kg is not None:
        listing.expected_price_per_kg = payload.expected_price_per_kg
    if payload.quality_grade is not None:
        listing.quality_grade = payload.quality_grade
    if payload.is_pre_harvest is not None:
        listing.is_pre_harvest = payload.is_pre_harvest
    if payload.harvest_date is not None:
        listing.harvest_date = payload.harvest_date
    if payload.status is not None:
        listing.status = payload.status
    if payload.photos is not None:
        listing.photos = payload.photos

    await db.commit()
    return await get_listing(id=listing.id, db=db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    id: UUID,
    current_user: User = Depends(require_farmer),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete/deactivate a crop listing (Strict ownership check)."""
    if not current_user.farmer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Farmer profile required.")

    stmt = select(CropListing).where(CropListing.id == id)
    res = await db.execute(stmt)
    listing = res.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop listing not found.")

    if listing.farmer_id != current_user.farmer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this listing.",
        )

    listing.status = ListingStatusEnum.CANCELLED
    await db.commit()
