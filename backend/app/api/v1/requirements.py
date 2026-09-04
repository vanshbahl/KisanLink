from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_buyer, get_current_user
from app.models import User, CropType, BuyerRequirement, BuyerProfile, RequirementStatusEnum
from app.schemas.requirement import BuyerRequirementCreate, BuyerRequirementUpdate, BuyerRequirementOut

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("", response_model=BuyerRequirementOut, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    payload: BuyerRequirementCreate,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Create a new bulk procurement demand requirement (Buyer owned)."""
    if not current_user.buyer_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buyer profile required before creating requirements.",
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

    req = BuyerRequirement(
        buyer_id=current_user.buyer_profile.id,
        crop_type_id=crop_type.id,
        target_quantity_kg=payload.target_quantity_kg,
        max_price_per_kg=payload.max_price_per_kg,
        acceptable_grades=payload.acceptable_grades,
        delivery_deadline=payload.delivery_deadline,
        delivery_location=WKTElement(
            f"POINT({payload.delivery_longitude} {payload.delivery_latitude})", srid=4326
        ),
        status=RequirementStatusEnum.OPEN,
    )
    db.add(req)
    await db.commit()

    return BuyerRequirementOut(
        id=req.id,
        buyer_id=req.buyer_id,
        buyer_name=current_user.buyer_profile.business_name,
        crop_type_id=crop_type.id,
        crop_name=crop_type.name_en,
        target_quantity_kg=float(req.target_quantity_kg),
        max_price_per_kg=float(req.max_price_per_kg),
        acceptable_grades=req.acceptable_grades,
        delivery_deadline=req.delivery_deadline,
        delivery_latitude=payload.delivery_latitude,
        delivery_longitude=payload.delivery_longitude,
        status=req.status,
        created_at=req.created_at,
    )


@router.get("", response_model=List[BuyerRequirementOut])
async def list_requirements(
    crop: Optional[str] = Query(None),
    status: Optional[RequirementStatusEnum] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List procurement requirements."""
    stmt = (
        select(
            BuyerRequirement,
            CropType.name_en.label("crop_name"),
            BuyerProfile.business_name.label("buyer_name"),
            func.ST_X(BuyerRequirement.delivery_location.cast(Geometry)).label("lon"),
            func.ST_Y(BuyerRequirement.delivery_location.cast(Geometry)).label("lat"),
        )
        .join(CropType, BuyerRequirement.crop_type_id == CropType.id)
        .join(BuyerProfile, BuyerRequirement.buyer_id == BuyerProfile.id)
    )

    if status:
        stmt = stmt.where(BuyerRequirement.status == status)
    if crop:
        stmt = stmt.where(CropType.name_en.ilike(f"%{crop}%"))

    stmt = stmt.order_by(BuyerRequirement.created_at.desc())
    res = await db.execute(stmt)
    rows = res.all()

    output = []
    for req, crop_name, b_name, item_lon, item_lat in rows:
        output.append(
            BuyerRequirementOut(
                id=req.id,
                buyer_id=req.buyer_id,
                buyer_name=b_name,
                crop_type_id=req.crop_type_id,
                crop_name=crop_name,
                target_quantity_kg=float(req.target_quantity_kg),
                max_price_per_kg=float(req.max_price_per_kg),
                acceptable_grades=req.acceptable_grades,
                delivery_deadline=req.delivery_deadline,
                delivery_latitude=float(item_lat),
                delivery_longitude=float(item_lon),
                status=req.status,
                created_at=req.created_at,
            )
        )

    return output


@router.get("/{id}", response_model=BuyerRequirementOut)
async def get_requirement(id: UUID, db: AsyncSession = Depends(get_db)):
    """Get single requirement details."""
    stmt = (
        select(
            BuyerRequirement,
            CropType.name_en.label("crop_name"),
            BuyerProfile.business_name.label("buyer_name"),
            func.ST_X(BuyerRequirement.delivery_location.cast(Geometry)).label("lon"),
            func.ST_Y(BuyerRequirement.delivery_location.cast(Geometry)).label("lat"),
        )
        .join(CropType, BuyerRequirement.crop_type_id == CropType.id)
        .join(BuyerProfile, BuyerRequirement.buyer_id == BuyerProfile.id)
        .where(BuyerRequirement.id == id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found.")

    req, crop_name, b_name, item_lon, item_lat = row
    return BuyerRequirementOut(
        id=req.id,
        buyer_id=req.buyer_id,
        buyer_name=b_name,
        crop_type_id=req.crop_type_id,
        crop_name=crop_name,
        target_quantity_kg=float(req.target_quantity_kg),
        max_price_per_kg=float(req.max_price_per_kg),
        acceptable_grades=req.acceptable_grades,
        delivery_deadline=req.delivery_deadline,
        delivery_latitude=float(item_lat),
        delivery_longitude=float(item_lon),
        status=req.status,
        created_at=req.created_at,
    )


@router.put("/{id}", response_model=BuyerRequirementOut)
async def update_requirement(
    id: UUID,
    payload: BuyerRequirementUpdate,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Update a buyer requirement (Strict ownership check)."""
    if not current_user.buyer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer profile required.")

    stmt = select(BuyerRequirement).where(BuyerRequirement.id == id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found.")

    if req.buyer_id != current_user.buyer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this requirement.",
        )

    if payload.target_quantity_kg is not None:
        req.target_quantity_kg = payload.target_quantity_kg
    if payload.max_price_per_kg is not None:
        req.max_price_per_kg = payload.max_price_per_kg
    if payload.acceptable_grades is not None:
        req.acceptable_grades = payload.acceptable_grades
    if payload.delivery_deadline is not None:
        req.delivery_deadline = payload.delivery_deadline
    if payload.status is not None:
        req.status = payload.status

    await db.commit()
    return await get_requirement(id=req.id, db=db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    id: UUID,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """Cancel/deactivate a buyer requirement (Strict ownership check)."""
    if not current_user.buyer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer profile required.")

    stmt = select(BuyerRequirement).where(BuyerRequirement.id == id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found.")

    if req.buyer_id != current_user.buyer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this requirement.",
        )

    req.status = RequirementStatusEnum.EXPIRED
    await db.commit()
