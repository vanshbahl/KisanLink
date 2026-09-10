"""Random sample assignment + lot-level chain-of-custody trail for bulk-lot inspections."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_inspection_actor_or_local_demo
from app.models import CropListing, CropType, ProduceInspection
from app.models.sampling import InspectionSampleAssignment
from app.schemas.inspection import InspectionCheckpoint
from app.schemas.sampling import (
    LotTrailOut,
    SampleAssignmentCreate,
    SampleAssignmentOut,
    TrailCheckpointStage,
    TrailInspectionItem,
)
from app.services.sampling_service import build_instructions, generate_sample

router = APIRouter(prefix="/inspections", tags=["Inspections"])

CHECKPOINT_ORDER = [c.value for c in InspectionCheckpoint]


async def _find_assignment(
    db: AsyncSession, crop_listing_id: UUID, checkpoint: str
) -> InspectionSampleAssignment | None:
    stmt = select(InspectionSampleAssignment).where(
        InspectionSampleAssignment.crop_listing_id == crop_listing_id,
        InspectionSampleAssignment.checkpoint == checkpoint,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.post(
    "/sample-assignment",
    response_model=SampleAssignmentOut,
    summary="Server-generated random sample selection for a lot + checkpoint (idempotent)",
)
async def create_or_get_sample_assignment(
    payload: SampleAssignmentCreate,
    current_user=Depends(require_inspection_actor_or_local_demo),
    db: AsyncSession = Depends(get_db),
) -> InspectionSampleAssignment:
    """
    Random sample selection, not statistical quality certification. Returns the
    existing assignment if one was already drawn for this (lot, checkpoint) pair —
    refreshing the inspection screen must never produce a new draw.
    """
    listing = await db.get(CropListing, payload.crop_listing_id)
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop listing not found.")
    if not listing.container_count or listing.container_count < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This lot has no packaging/container information, so a random sample cannot be drawn.",
        )

    existing = await _find_assignment(db, payload.crop_listing_id, payload.checkpoint.value)
    if existing:
        return existing

    sample_size, selected = generate_sample(listing.container_count)
    assignment = InspectionSampleAssignment(
        crop_listing_id=listing.id,
        checkpoint=payload.checkpoint.value,
        container_count=listing.container_count,
        sample_size=sample_size,
        selected_containers=selected,
        instructions=build_instructions(selected),
        method="server_random_v1",
    )
    db.add(assignment)
    try:
        await db.commit()
    except IntegrityError:
        # Concurrent request already created one for this (lot, checkpoint) - use it.
        await db.rollback()
        existing = await _find_assignment(db, payload.crop_listing_id, payload.checkpoint.value)
        if existing:
            return existing
        raise
    await db.refresh(assignment)
    return assignment


@router.get(
    "/sample-assignment",
    response_model=SampleAssignmentOut,
    summary="Fetch a previously drawn sample assignment",
)
async def get_sample_assignment(
    crop_listing_id: UUID = Query(...),
    checkpoint: InspectionCheckpoint = Query(...),
    db: AsyncSession = Depends(get_db),
) -> InspectionSampleAssignment:
    existing = await _find_assignment(db, crop_listing_id, checkpoint.value)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sample assignment yet for this lot at this checkpoint.",
        )
    return existing


def _derive_stage_status(checkpoint: str, items: list[ProduceInspection]) -> str:
    """
    Conservative, transparent aggregation — never a fabricated numeric score:
      - FARMER_GATE photos are a declaration, not an independent verdict.
      - No completed analyses -> "unable to assess" (or "pending" if nothing captured yet).
      - Any concern but not all -> "needs review".
      - Every sampled container flagged -> "quality concern".
      - No concerns at all -> "fresh".
    """
    if not items:
        return "pending"
    if checkpoint == InspectionCheckpoint.FARMER_GATE.value:
        return "declared"

    completed = [i for i in items if i.analysis_status == "COMPLETED"]
    if not completed:
        return "unable_to_assess"
    concern = sum(1 for i in completed if i.predicted_class == "not_fresh")
    if concern == 0:
        return "fresh"
    if concern == len(completed):
        return "quality_concern"
    return "needs_review"


@router.get(
    "/trail",
    response_model=LotTrailOut,
    summary="Assembled visual chain-of-custody trail for one lot",
)
async def get_lot_trail(
    crop_listing_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> LotTrailOut:
    stmt = (
        select(CropListing, CropType.name_en)
        .join(CropType, CropListing.crop_type_id == CropType.id)
        .where(CropListing.id == crop_listing_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop listing not found.")
    listing, crop_name = row

    insp_stmt = (
        select(ProduceInspection)
        .where(ProduceInspection.crop_listing_id == crop_listing_id)
        .order_by(ProduceInspection.created_at.asc())
    )
    inspections = list((await db.execute(insp_stmt)).scalars().all())

    assign_stmt = select(InspectionSampleAssignment).where(
        InspectionSampleAssignment.crop_listing_id == crop_listing_id
    )
    assignments = {a.checkpoint: a for a in (await db.execute(assign_stmt)).scalars().all()}

    by_checkpoint: dict[str, list[ProduceInspection]] = {}
    for insp in inspections:
        by_checkpoint.setdefault(insp.checkpoint, []).append(insp)

    stages: list[TrailCheckpointStage] = []
    for checkpoint in CHECKPOINT_ORDER:
        items = by_checkpoint.get(checkpoint, [])
        assignment = assignments.get(checkpoint)
        if not items and not assignment:
            continue

        stages.append(
            TrailCheckpointStage(
                checkpoint=InspectionCheckpoint(checkpoint),
                status=_derive_stage_status(checkpoint, items),
                photo_count=len(items),
                sampled_containers=assignment.sample_size if assignment else None,
                total_containers=assignment.container_count if assignment else None,
                selected_containers=assignment.selected_containers if assignment else None,
                first_captured_at=items[0].created_at if items else None,
                last_captured_at=items[-1].created_at if items else None,
                inspections=[
                    TrailInspectionItem(
                        inspection_id=i.id,
                        container_number=i.container_number,
                        analysis_status=i.analysis_status,
                        predicted_class=i.predicted_class,
                        image_url=i.image_url,
                        created_at=i.created_at,
                    )
                    for i in items
                ],
            )
        )

    return LotTrailOut(
        crop_listing_id=listing.id,
        lot_code=listing.lot_code,
        crop_name=crop_name,
        quantity_kg=float(listing.quantity_kg),
        packaging_type=listing.packaging_type,
        container_count=listing.container_count,
        unit_weight_kg=float(listing.unit_weight_kg) if listing.unit_weight_kg is not None else None,
        declared_at=listing.created_at,
        stages=stages,
    )
