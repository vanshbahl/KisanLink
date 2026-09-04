from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_farmer
from app.models import User, CropType, CropListing, FarmerProfile, QualityGradeEnum, ListingStatusEnum
from app.schemas.crop import CropListingCreate, CropListingUpdate, CropListingOut

router = APIRouter(prefix="/listings", tags=["Listings"])


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
        variety=listing.variety,
        quantity_kg=float(listing.quantity_kg),
        available_quantity_kg=float(listing.available_quantity_kg),
        expected_price_per_kg=float(listing.expected_price_per_kg),
        quality_grade=listing.quality_grade,
        is_pre_harvest=listing.is_pre_harvest,
        harvest_date=listing.harvest_date,
        status=listing.status,
        latitude=lat,
        longitude=lon,
        distance_km=0.0,
        photos=listing.photos,
        is_urgent_rescue=listing.is_urgent_rescue,
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
            listing, crop_name, f_name, f_village, f_district, item_lon, item_lat, dist_km = row
        else:
            listing, crop_name, f_name, f_village, f_district, item_lon, item_lat = row[0:7]
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
                variety=listing.variety,
                quantity_kg=float(listing.quantity_kg),
                available_quantity_kg=float(listing.available_quantity_kg),
                expected_price_per_kg=float(listing.expected_price_per_kg),
                quality_grade=listing.quality_grade,
                is_pre_harvest=listing.is_pre_harvest,
                harvest_date=listing.harvest_date,
                status=listing.status,
                latitude=float(item_lat),
                longitude=float(item_lon),
                distance_km=round(float(dist_km), 2) if dist_km is not None else None,
                photos=listing.photos,
                is_urgent_rescue=listing.is_urgent_rescue,
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

    listing, crop_name, f_name, f_village, f_district, item_lon, item_lat = row
    return CropListingOut(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farmer_name=f_name,
        farmer_village=f_village,
        farmer_district=f_district,
        crop_type_id=listing.crop_type_id,
        crop_name=crop_name,
        variety=listing.variety,
        quantity_kg=float(listing.quantity_kg),
        available_quantity_kg=float(listing.available_quantity_kg),
        expected_price_per_kg=float(listing.expected_price_per_kg),
        quality_grade=listing.quality_grade,
        is_pre_harvest=listing.is_pre_harvest,
        harvest_date=listing.harvest_date,
        status=listing.status,
        latitude=float(item_lat),
        longitude=float(item_lon),
        photos=listing.photos,
        is_urgent_rescue=listing.is_urgent_rescue,
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
