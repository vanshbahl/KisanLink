from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, JSON, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ProduceInspection(Base, TimestampMixin):
    """Image evidence and provider metadata, independent of any one listing."""

    __tablename__ = "produce_inspections"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    crop_listing_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("crop_listings.id", ondelete="SET NULL"),
        nullable=True,
    )
    sample_assignment_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("inspection_sample_assignments.id", ondelete="SET NULL"),
        nullable=True,
    )
    container_number: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_by_user_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    checkpoint: Mapped[str] = mapped_column(String(32), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_status: Mapped[str] = mapped_column(String(24), nullable=False)
    predicted_class: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    local_model_confidence: Mapped[Optional[float]] = mapped_column(
        Numeric(6, 5), nullable=True
    )
    model_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="local_cv")
    provider_output: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "checkpoint IN ('FARMER_GATE', 'LOGISTICS_PICKUP', "
            "'LOGISTICS_DROPOFF', 'WAREHOUSE_ENTRY', 'WAREHOUSE_EXIT')",
            name="ck_produce_inspections_checkpoint",
        ),
        CheckConstraint(
            "analysis_status IN ('COMPLETED', 'FAILED')",
            name="ck_produce_inspections_analysis_status",
        ),
        CheckConstraint(
            "predicted_class IS NULL OR predicted_class IN ('fresh', 'not_fresh')",
            name="ck_produce_inspections_predicted_class",
        ),
        CheckConstraint(
            "local_model_confidence IS NULL OR "
            "(local_model_confidence >= 0 AND local_model_confidence <= 1)",
            name="ck_produce_inspections_model_confidence",
        ),
        Index("ix_produce_inspections_listing", "crop_listing_id"),
        Index("ix_produce_inspections_checkpoint_created", "checkpoint", "created_at"),
        Index("ix_produce_inspections_sample_assignment", "sample_assignment_id"),
    )
