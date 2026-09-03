from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.order import OrderStatusEnum


class OrderFarmerAllocationOut(BaseModel):
    id: UUID
    order_id: UUID
    farmer_id: UUID
    farmer_name: Optional[str] = None
    farmer_village: Optional[str] = None
    listing_id: UUID
    allocated_kg: float
    unit_price: Optional[float] = None
    farmer_payout_amount_rupees: float
    pickup_verification_otp: str
    is_picked_up: bool
    is_settled: bool


class OrderOut(BaseModel):
    id: UUID
    order_code: str
    buyer_id: UUID
    buyer_name: Optional[str] = None
    cluster_id: Optional[UUID] = None
    crop_type_id: UUID
    crop_name: str
    total_quantity_kg: float
    gross_amount_rupees: float
    status: OrderStatusEnum
    delivery_otp: str
    created_at: datetime
    updated_at: datetime
    allocations: List[OrderFarmerAllocationOut] = []


class LockEscrowRequest(BaseModel):
    payment_method: str = "SIMULATED_UPI"
    amount_rupees: float
