from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.payment import LedgerEntryTypeEnum


class PaymentsLedgerOut(BaseModel):
    id: UUID
    order_id: UUID
    beneficiary_user_id: Optional[UUID] = None
    entry_type: LedgerEntryTypeEnum
    amount_rupees: float
    gateway_reference_id: Optional[str] = None
    is_settled: bool
    settled_at: Optional[datetime] = None
    created_at: datetime
