import enum
from datetime import datetime
from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.requirement import BuyerRequirement
    from app.models.crop import CropListing
    from app.models.user import FarmerProfile


class ClusterStatusEnum(str, enum.Enum):
    PROPOSED = "PROPOSED"
    CONFIRMED = "CONFIRMED"
    FULFILLED = "FULFILLED"
    DISSOLVED = "DISSOLVED"


class DynamicCluster(Base):
    __tablename__ = "dynamic_clusters"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    requirement_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("buyer_requirements.id"), nullable=False
    )
    total_quantity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    average_farm_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    estimated_freight_rupees: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_delivered_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cluster_centroid: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    status: Mapped[ClusterStatusEnum] = mapped_column(
        Enum(ClusterStatusEnum, name="cluster_status_enum"), default=ClusterStatusEnum.PROPOSED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requirement: Mapped["BuyerRequirement"] = relationship("BuyerRequirement")
    cluster_items: Mapped[List["ClusterItem"]] = relationship(
        "ClusterItem", back_populates="cluster", cascade="all, delete-orphan"
    )


class ClusterItem(Base):
    __tablename__ = "cluster_items"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    cluster_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("dynamic_clusters.id", ondelete="CASCADE"), nullable=False
    )
    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_listings.id"), nullable=False
    )
    farmer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farmer_profiles.id"), nullable=False
    )
    allocated_quantity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("allocated_quantity_kg > 0"), nullable=False
    )
    agreed_price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("agreed_price_per_kg > 0"), nullable=False
    )
    pickup_order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cluster: Mapped["DynamicCluster"] = relationship("DynamicCluster", back_populates="cluster_items")
    listing: Mapped["CropListing"] = relationship("CropListing")
    farmer: Mapped["FarmerProfile"] = relationship("FarmerProfile")
