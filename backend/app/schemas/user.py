from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.user import UserRoleEnum


class UserOut(BaseModel):
    id: UUID
    phone: str
    role: UserRoleEnum
    preferred_language: str
    is_verified: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FarmerProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    village: Optional[str] = None
    district: str = Field(..., min_length=2, max_length=128)
    state: str = Field(..., min_length=2, max_length=128)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    payout_upi_id: Optional[str] = None


class FarmerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    payout_upi_id: Optional[str] = None
    preferred_language: Optional[str] = None


class FarmerProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    village: Optional[str] = None
    district: str
    state: str
    latitude: float
    longitude: float
    payout_upi_id: Optional[str] = None
    reputation_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FarmerUpcomingPickupOut(BaseModel):
    id: str
    order_id: str
    crop: str
    crop_hi: Optional[str] = None
    quantity_kg: float
    date: str
    status: str


class FarmerDashboardOut(BaseModel):
    earnings: float
    pending: float
    active_listings: int
    new_orders: int
    upcoming_pickup: Optional[FarmerUpcomingPickupOut] = None


class FarmerEarningOut(BaseModel):
    id: str
    order_id: str
    crop: str
    crop_hi: Optional[str] = None
    gross: float
    deductions: float
    net: float
    mandi_equivalent: float
    date: str
    status: str


class FarmerPickupOut(BaseModel):
    id: str
    order_id: str
    crop: str
    crop_hi: Optional[str] = None
    quantity_kg: float
    date: str
    time_window: str
    driver: str
    vehicle: str
    farm_address: str
    status: str


class BuyerProfileCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=256)
    buyer_type: str = Field(..., min_length=2, max_length=64)
    gstin: Optional[str] = None
    delivery_address: str
    delivery_latitude: float = Field(..., ge=-90.0, le=90.0)
    delivery_longitude: float = Field(..., ge=-180.0, le=180.0)


class BuyerProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    buyer_type: Optional[str] = None
    gstin: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    delivery_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)


class BuyerProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    business_name: str
    buyer_type: str
    gstin: Optional[str] = None
    delivery_address: str
    delivery_latitude: float
    delivery_longitude: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LogisticsProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    transporter_name: str
    vehicle_registration_number: str
    vehicle_type: str
    capacity_kg: float
    base_latitude: float
    base_longitude: float
    is_available: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OnboardingParseContext(BaseModel):
    """What the client already knows when it asks Gemini to read one answer."""
    state: Optional[str] = None
    district: Optional[str] = None
    candidates: List[str] = Field(default_factory=list, max_length=400)
    expected: Optional[str] = None


class OnboardingParseRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    field: Literal["name", "state", "district", "village", "locality", "farm_size", "crops", "confirm"]
    language: Optional[str] = "hi"
    context: Optional[OnboardingParseContext] = None


class OnboardingParseResponse(BaseModel):
    value: Optional[str] = None
    value_hi: Optional[str] = None
    farm_size_acres: Optional[float] = None
    crops: List[str] = Field(default_factory=list)
    confirmed: Optional[bool] = None
    unknown: bool = False
    confidence: Literal["high", "medium", "low"] = "low"
    ai_used: bool = False
    warning: Optional[str] = None
