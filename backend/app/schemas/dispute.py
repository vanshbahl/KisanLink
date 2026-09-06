from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DisputeCreate(BaseModel):
    order_id: UUID
    dispute_reason: str = Field(..., min_length=3, max_length=64)
    withheld_amount_rupees: float = Field(..., ge=0.0)


class DisputeResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=3)
    settlement_action: str = Field("REFUND", pattern="^(REFUND|FARMER_PAYOUT)$")


class DisputeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    raised_by: UUID
    dispute_reason: str
    withheld_amount_rupees: float
    is_resolved: bool
    resolution_notes: Optional[str] = None
    created_at: datetime
