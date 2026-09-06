from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RouteWaypointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    sequence_index: int
    waypoint_type: str
    farmer_id: Optional[UUID] = None
    stop_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    payload_weight_kg: float
    is_completed: bool


class ShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    order_code: Optional[str] = None
    transporter_id: Optional[UUID] = None
    transporter_name: Optional[str] = None
    crop_name: Optional[str] = None
    total_quantity_kg: Optional[float] = None
    total_distance_km: float
    freight_payout_rupees: float
    status: str
    created_at: datetime


class ShipmentDetailOut(ShipmentOut):
    waypoints: List[RouteWaypointOut] = []


class OptimizeRouteRequest(BaseModel):
    cluster_id: Optional[UUID] = None
    order_ids: Optional[List[UUID]] = None
    vehicle_capacity_kg: float = 1500.0


class OptimizeRouteResponse(BaseModel):
    shipment_id: UUID
    order_id: UUID
    total_distance_km: float
    estimated_duration_minutes: int
    trips_reduced: int
    utilization_pct: float
    waypoints: List[RouteWaypointOut]


class VerifyPickupOTPRequest(BaseModel):
    allocation_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    otp: str = Field(..., min_length=4, max_length=8)


class VerifyDeliveryOTPRequest(BaseModel):
    order_id: UUID
    otp: str = Field(..., min_length=4, max_length=8)


class OTPVerificationOut(BaseModel):
    success: bool
    message: str
    status: str
    is_settled: Optional[bool] = None


class ShipmentStatusUpdate(BaseModel):
    status: str
