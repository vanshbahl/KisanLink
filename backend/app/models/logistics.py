import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.user import LogisticsProfile, FarmerProfile


class ShipmentStatusEnum(str, enum.Enum):
    UNASSIGNED = "UNASSIGNED"
    ASSIGNED = "ASSIGNED"
    PICKUP_IN_PROGRESS = "PICKUP_IN_PROGRESS"
    LOADED = "LOADED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    transporter_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("logistics_profiles.id")
    )
    total_distance_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    freight_payout_rupees: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[ShipmentStatusEnum] = mapped_column(
        Enum(ShipmentStatusEnum, name="shipment_status_enum"), default=ShipmentStatusEnum.UNASSIGNED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship("Order")
    transporter: Mapped[Optional["LogisticsProfile"]] = relationship("LogisticsProfile", back_populates="shipments")
    waypoints: Mapped[List["RouteWaypoint"]] = relationship(
        "RouteWaypoint", back_populates="shipment", cascade="all, delete-orphan"
    )


class RouteWaypoint(Base):
    __tablename__ = "route_waypoints"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    shipment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False
    )
    sequence_index: Mapped[int] = mapped_column(Integer, nullable=False)
    waypoint_type: Mapped[str] = mapped_column(String(16), nullable=False)
    farmer_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farmer_profiles.id")
    )
    location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    stop_name: Mapped[str] = mapped_column(String(128), nullable=False)
    payload_weight_kg: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="waypoints")
    farmer: Mapped[Optional["FarmerProfile"]] = relationship("FarmerProfile")
