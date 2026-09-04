from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.cluster import ClusterStatusEnum


class FarmerMatchItem(BaseModel):
    farmer_id: UUID
    name: str
    location: str
    distance_km: float
    listing_id: UUID
    crop_name: str
    quality_grade: str
    available_kg: float
    allocated_kg: float
    unit_price: float
    payout_rupees: float
    match_score: float


class DynamicClusterOut(BaseModel):
    cluster_id: UUID
    requirement_id: UUID
    crop_name: str
    total_quantity_kg: float
    fulfillment_percentage: float
    average_farm_price_per_kg: float
    estimated_freight_rupees: float
    total_delivered_price_per_kg: float
    traditional_wholesale_benchmark: float
    buyer_savings_percentage: float
    status: ClusterStatusEnum
    farmers: List[FarmerMatchItem]
    explanation: List[str]
    created_at: datetime
