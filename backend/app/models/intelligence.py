from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.crop import CropType


class PriceObservation(Base):
    __tablename__ = "price_observations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    crop_type_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_types.id"), nullable=False
    )
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    modal_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    min_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    max_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    arrival_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="APMC_AGMARKNET")

    crop_type: Mapped["CropType"] = relationship("CropType")


class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    crop_type_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("crop_types.id"), nullable=False
    )
    region: Mapped[str] = mapped_column(String(128), nullable=False)
    forecast_status: Mapped[str] = mapped_column(String(32), nullable=False)
    projected_demand_index: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    projected_deficit_tonnes: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    forecast_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    crop_type: Mapped["CropType"] = relationship("CropType")


class ImpactMetric(Base):
    __tablename__ = "impact_metrics"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    period_date: Mapped[date] = mapped_column(Date, nullable=False)
    farmer_net_gain_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.00
    )
    buyer_savings_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.00
    )
    total_distance_saved_km: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0.00
    )
    wastage_prevented_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0.00
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
