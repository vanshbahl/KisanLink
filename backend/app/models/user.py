import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.crop import CropListing
    from app.models.requirement import BuyerRequirement
    from app.models.order import Order
    from app.models.logistics import Shipment


class UserRoleEnum(str, enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"
    LOGISTICS_PROVIDER = "LOGISTICS_PROVIDER"
    OPERATOR_PROXY = "OPERATOR_PROXY"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    phone: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    role: Mapped[UserRoleEnum] = mapped_column(
        Enum(UserRoleEnum, name="user_role_enum"), nullable=False
    )
    preferred_language: Mapped[str] = mapped_column(String(8), default="hi")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    farmer_profile: Mapped[Optional["FarmerProfile"]] = relationship(
        "FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    buyer_profile: Mapped[Optional["BuyerProfile"]] = relationship(
        "BuyerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    logistics_profile: Mapped[Optional["LogisticsProfile"]] = relationship(
        "LogisticsProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    village: Mapped[Optional[str]] = mapped_column(String(128))
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(128), nullable=False)
    location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    payout_upi_id: Mapped[Optional[str]] = mapped_column(String(128))
    reputation_score: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="farmer_profile")
    crop_listings: Mapped[List["CropListing"]] = relationship(
        "CropListing", back_populates="farmer", cascade="all, delete-orphan"
    )


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    business_name: Mapped[str] = mapped_column(String(256), nullable=False)
    buyer_type: Mapped[str] = mapped_column(String(64), nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(32))
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="buyer_profile")
    buyer_requirements: Mapped[List["BuyerRequirement"]] = relationship(
        "BuyerRequirement", back_populates="buyer", cascade="all, delete-orphan"
    )
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="buyer")


class LogisticsProfile(Base):
    __tablename__ = "logistics_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    transporter_name: Mapped[str] = mapped_column(String(128), nullable=False)
    vehicle_registration_number: Mapped[str] = mapped_column(String(32), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(64), nullable=False)
    capacity_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("capacity_kg > 0"), nullable=False
    )
    base_location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="logistics_profile")
    shipments: Mapped[List["Shipment"]] = relationship("Shipment", back_populates="transporter")
