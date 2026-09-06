from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.models.crop import ListingStatusEnum


class TagUrgentRescueRequest(BaseModel):
    listing_id: UUID
    urgency_level: Optional[str] = Field("HIGH", json_schema_extra={"example": "HIGH"})


class TagUrgentRescueResponse(BaseModel):
    listing_id: UUID
    is_urgent_rescue: bool
    normal_price_per_kg: float
    rescue_price_per_kg: float
    discount_percentage: float
    status: ListingStatusEnum
