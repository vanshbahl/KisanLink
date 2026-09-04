import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.user import User


class LedgerEntryTypeEnum(str, enum.Enum):
    ESCROW_LOCK = "ESCROW_LOCK"
    FARMER_PAYOUT = "FARMER_PAYOUT"
    TRANSPORTER_FREIGHT = "TRANSPORTER_FREIGHT"
    PLATFORM_FEE = "PLATFORM_FEE"
    REFUND = "REFUND"


class PaymentsLedger(Base):
    __tablename__ = "payments_ledger"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    beneficiary_user_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    entry_type: Mapped[LedgerEntryTypeEnum] = mapped_column(
        Enum(LedgerEntryTypeEnum, name="ledger_entry_type_enum"), nullable=False
    )
    amount_rupees: Mapped[float] = mapped_column(
        Numeric(10, 2), CheckConstraint("amount_rupees > 0"), nullable=False
    )
    gateway_reference_id: Mapped[Optional[str]] = mapped_column(String(128))
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship("Order")
    beneficiary_user: Mapped[Optional["User"]] = relationship("User")
