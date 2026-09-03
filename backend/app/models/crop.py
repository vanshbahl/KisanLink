import enum
from datetime import date
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import ARRAY, Boolean, CheckConstraint, Date, Enum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import FarmerProfile


class QualityGradeEnum(str, enum.Enum):
    GRADE_A = "GRADE_A"
    GRADE_B = "GRADE_B"
    PROCESSING_GRADE = "PROCESSING_GRADE"


class ListingStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESERVED = "RESERVED"
    HARVESTED = "HARVESTED"
    RESCUE_ACTIVE = "RESCUE_ACTIVE"
    SOLD = "SOLD"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class CropType(Base):
    __tablename__ = "crop_types"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name_en: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name_hi: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    shelf_life_days: Mapped[int] = mapped_column(nullable=False)
    standard_mandi_unit: Mapped[str] = mapped_column(String(16), default="kg")

    crop_listings: Mapped[List["CropListing"]] = relationship(
        "CropListing", back_populates="crop_type"
    )


class CropListing(Base, TimestampMixin):
    __tablename__ = "crop_listings"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    farmer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    crop_type_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_types.id"), nullable=False
    )
    variety: Mapped[Optional[str]] = mapped_column(String(64))
    quantity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("quantity_kg > 0"), nullable=False
    )
    available_quantity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("available_quantity_kg >= 0"), nullable=False
    )
    expected_price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("expected_price_per_kg > 0"), nullable=False
    )
    quality_grade: Mapped[QualityGradeEnum] = mapped_column(
        Enum(QualityGradeEnum, name="quality_grade_enum"), default=QualityGradeEnum.GRADE_A
    )
    is_pre_harvest: Mapped[bool] = mapped_column(Boolean, default=False)
    harvest_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[ListingStatusEnum] = mapped_column(
        Enum(ListingStatusEnum, name="listing_status_enum"), default=ListingStatusEnum.ACTIVE
    )
    location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    photos: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    is_urgent_rescue: Mapped[bool] = mapped_column(Boolean, default=False)
    rescue_discount_price_per_kg: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))

    farmer: Mapped["FarmerProfile"] = relationship("FarmerProfile", back_populates="crop_listings")
    crop_type: Mapped["CropType"] = relationship("CropType", back_populates="crop_listings")

    __table_args__ = (
        Index("idx_listings_composite_search", "crop_type_id", "status", "is_pre_harvest", "harvest_date"),
    )
