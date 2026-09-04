import enum
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import BuyerProfile, FarmerProfile
    from app.models.cluster import DynamicCluster
    from app.models.crop import CropType, CropListing


class OrderStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    ESCROW_LOCKED = "ESCROW_LOCKED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    SETTLED = "SETTLED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    buyer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("buyer_profiles.id"), nullable=False
    )
    cluster_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("dynamic_clusters.id")
    )
    crop_type_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_types.id"), nullable=False
    )
    total_quantity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("total_quantity_kg > 0"), nullable=False
    )
    gross_amount_rupees: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("gross_amount_rupees > 0"), nullable=False
    )
    status: Mapped[OrderStatusEnum] = mapped_column(
        Enum(OrderStatusEnum, name="order_status_enum"), default=OrderStatusEnum.DRAFT
    )
    delivery_otp: Mapped[str] = mapped_column(String(8), nullable=False)

    buyer: Mapped["BuyerProfile"] = relationship("BuyerProfile", back_populates="orders")
    cluster: Mapped[Optional["DynamicCluster"]] = relationship("DynamicCluster")
    crop_type: Mapped["CropType"] = relationship("CropType")
    allocations: Mapped[List["OrderFarmerAllocation"]] = relationship(
        "OrderFarmerAllocation", back_populates="order", cascade="all, delete-orphan"
    )


class OrderFarmerAllocation(Base):
    __tablename__ = "order_farmer_allocations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    farmer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farmer_profiles.id"), nullable=False
    )
    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_listings.id"), nullable=False
    )
    allocated_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    farmer_payout_amount_rupees: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    pickup_verification_otp: Mapped[str] = mapped_column(String(8), nullable=False)
    is_picked_up: Mapped[bool] = mapped_column(Boolean, default=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)

    order: Mapped["Order"] = relationship("Order", back_populates="allocations")
    farmer: Mapped["FarmerProfile"] = relationship("FarmerProfile")
    listing: Mapped["CropListing"] = relationship("CropListing")
