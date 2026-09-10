"""Image-evidence upload and local binary CV analysis endpoint."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_inspection_actor_or_local_demo
from app.core.config import settings
from app.models import ProduceInspection, User
from app.schemas.inspection import InspectionCheckpoint, LocalCVAnalysisOut
from app.services.freshness_service import (
    InspectionInferenceError,
    InspectionProviderUnavailable,
    InvalidInspectionImage,
    decode_inspection_image,
    local_freshness_provider,
    save_inspection_image,
)

router = APIRouter(prefix="/freshness", tags=["Image inspection"])

ALLOWED_DECLARED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "/analyze",
    response_model=LocalCVAnalysisOut,
    response_model_exclude_none=True,
    summary="Store image evidence and run the local binary CV provider",
)
async def analyze_inspection_image(
    sample: UploadFile = File(..., description="JPEG, PNG, or WebP evidence image"),
    checkpoint: InspectionCheckpoint = Form(InspectionCheckpoint.FARMER_GATE),
    crop_listing_id: Optional[UUID] = Form(
        None, description="Lot this evidence belongs to, if known."
    ),
    sample_assignment_id: Optional[UUID] = Form(
        None, description="Random sample assignment this capture fulfils, if any."
    ),
    container_number: Optional[int] = Form(
        None, description="Which sampled container/crate this photo documents, if any."
    ),
    current_user: User | None = Depends(require_inspection_actor_or_local_demo),
    db: AsyncSession = Depends(get_db),
) -> LocalCVAnalysisOut:
    """Return an AI signal, not a produce grade or real-world freshness metric."""
    if sample.content_type not in ALLOWED_DECLARED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use a JPEG, PNG, or WebP image.",
        )

    try:
        image_bytes = await sample.read(settings.INSPECTION_MAX_UPLOAD_BYTES + 1)
    finally:
        await sample.close()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="The inspection image is empty.")
    if len(image_bytes) > settings.INSPECTION_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "Inspection image exceeds the configured "
                f"{settings.INSPECTION_MAX_UPLOAD_BYTES}-byte limit."
            ),
        )

    try:
        decoded = await run_in_threadpool(decode_inspection_image, image_bytes)
    except InvalidInspectionImage as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InspectionProviderUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        sample_image_url = await run_in_threadpool(
            save_inspection_image,
            image_bytes,
            decoded.suffix,
            Path(settings.INSPECTION_UPLOAD_DIR),
        )
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Inspection image could not be stored.",
        ) from exc

    analyzed_at = datetime.now(timezone.utc)
    actor_id = current_user.id if current_user else None

    try:
        prediction = await run_in_threadpool(
            local_freshness_provider.predict,
            decoded.image,
        )
    except (InspectionProviderUnavailable, InspectionInferenceError) as exc:
        record = ProduceInspection(
            crop_listing_id=crop_listing_id,
            sample_assignment_id=sample_assignment_id,
            container_number=container_number,
            created_by_user_id=actor_id,
            checkpoint=checkpoint.value,
            image_url=sample_image_url,
            analysis_status="FAILED",
            provider="local_cv",
            error_code=(
                "provider_unavailable"
                if isinstance(exc, InspectionProviderUnavailable)
                else "inference_failed"
            ),
            error_message=str(exc),
        )
        db.add(record)
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail={
                "code": record.error_code,
                "message": str(exc),
                "inspection_id": str(record.id),
                "sample_image_url": sample_image_url,
                "image_saved": True,
            },
        ) from exc

    persisted_confidence = round(prediction.confidence, 5)
    record = ProduceInspection(
        crop_listing_id=crop_listing_id,
        sample_assignment_id=sample_assignment_id,
        container_number=container_number,
        created_by_user_id=actor_id,
        checkpoint=checkpoint.value,
        image_url=sample_image_url,
        analysis_status="COMPLETED",
        predicted_class=prediction.predicted_class,
        local_model_confidence=persisted_confidence,
        model_name=prediction.model,
        provider=prediction.source,
        provider_output={"probabilities": dict(prediction.probabilities)},
    )
    db.add(record)
    await db.commit()

    return LocalCVAnalysisOut(
        inspection_id=record.id,
        checkpoint=checkpoint,
        predicted_class=prediction.predicted_class,
        confidence=persisted_confidence,
        model=prediction.model,
        source=prediction.source,
        sample_image_url=sample_image_url,
        analyzed_at=analyzed_at,
        crop_listing_id=crop_listing_id,
        sample_assignment_id=sample_assignment_id,
        container_number=container_number,
    )
