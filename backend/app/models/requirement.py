import enum
from datetime import datetime
from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlalchemy import ARRAY, CheckConstraint, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base
from app.models.crop import QualityGradeEnum

if TYPE_CHECKING:
    from app.models.user import BuyerProfile
    from app.models.crop import CropType


class RequirementStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    MATCHED = "MATCHED"
    ORDER_CREATED = "ORDER_CREATED"
    FULFILLED = "FULFILLED"
    EXPIRED = "EXPIRED"


class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    buyer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("buyer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    crop_type_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_types.id"), nullable=False
    )
    target_quantity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("target_quantity_kg > 0"), nullable=False
    )
    max_price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("max_price_per_kg > 0"), nullable=False
    )
    acceptable_grades: Mapped[List[QualityGradeEnum]] = mapped_column(
        ARRAY(Enum(QualityGradeEnum, name="quality_grade_enum")), nullable=False
    )
    delivery_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivery_location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    status: Mapped[RequirementStatusEnum] = mapped_column(
        Enum(RequirementStatusEnum, name="requirement_status_enum"), default=RequirementStatusEnum.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    buyer: Mapped["BuyerProfile"] = relationship("BuyerProfile", back_populates="buyer_requirements")
    crop_type: Mapped["CropType"] = relationship("CropType")
