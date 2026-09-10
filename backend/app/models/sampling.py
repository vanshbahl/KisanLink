from typing import Any, List
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, JSON, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class InspectionSampleAssignment(Base, TimestampMixin):
    """
    A server-generated random sample selection for one lot at one checkpoint.

    Anti-fraud rule: the farmer must not choose which containers get inspected, so
    selection happens once, server-side, at inspection time, and is persisted here —
    reloading the pickup/receipt screen must return the same containers, never a
    fresh draw. This is a prototype-safe minimum-sampling heuristic (see
    app/services/sampling_service.py), not a formal AQL/statistical certification.
    """

    __tablename__ = "inspection_sample_assignments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
    )
    crop_listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("crop_listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    checkpoint: Mapped[str] = mapped_column(String(32), nullable=False)
    container_count: Mapped[int] = mapped_column(nullable=False)
    sample_size: Mapped[int] = mapped_column(nullable=False)
    selected_containers: Mapped[List[int]] = mapped_column(JSON, nullable=False)
    instructions: Mapped[List[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False, default="server_random_v1")

    __table_args__ = (
        UniqueConstraint(
            "crop_listing_id", "checkpoint", name="uq_sample_assignment_listing_checkpoint"
        ),
        CheckConstraint(
            "checkpoint IN ('FARMER_GATE', 'LOGISTICS_PICKUP', "
            "'LOGISTICS_DROPOFF', 'WAREHOUSE_ENTRY', 'WAREHOUSE_EXIT')",
            name="ck_sample_assignments_checkpoint",
        ),
        CheckConstraint("container_count > 0", name="ck_sample_assignments_container_count"),
        CheckConstraint(
            "sample_size > 0 AND sample_size <= container_count",
            name="ck_sample_assignments_sample_size",
        ),
        Index("ix_sample_assignments_listing", "crop_listing_id"),
    )
