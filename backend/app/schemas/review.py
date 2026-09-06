from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    """
    The reviewer never names an arbitrary target user directly (that FK belongs to
    `users.id` and a client-supplied value cannot be trusted to be the correct
    counterparty). Identity is resolved server-side from the order:
      - a farmer reviewing always targets the order's buyer.
      - a buyer reviewing an order with more than one farmer allocation must say
        which farmer (by `farmer_profiles.id`, i.e. the id shown on the order's
        allocations) they mean; with exactly one farmer it can be omitted.
    """
    order_id: UUID
    target_farmer_id: Optional[UUID] = None
    rating_score: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    author_id: UUID
    target_id: UUID
    rating_score: int
    feedback_text: Optional[str] = None
    created_at: datetime
