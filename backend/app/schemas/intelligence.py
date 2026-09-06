from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PriceObservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    crop_type_id: UUID
    crop_name: Optional[str] = None
    district: str
    modal_price_per_kg: float
    min_price_per_kg: float
    max_price_per_kg: float
    arrival_tonnes: float
    observation_date: date
    source: str


class DemandForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    crop_type_id: UUID
    crop_name: Optional[str] = None
    region: str
    forecast_status: str
    projected_demand_index: float
    projected_deficit_tonnes: Optional[float] = None
    forecast_period_start: date
    forecast_period_end: date
    created_at: datetime


class PriceRecommendationRequest(BaseModel):
    crop_name: str
    quantity_kg: float = 100.0
    grade: str = "Grade A"
    mandi_price_per_kg: Optional[float] = None


class PriceOptionOut(BaseModel):
    id: str
    price: float
    label_key: str
    hint_key: str
    sale_chance_pct: int


class PriceRecommendationOut(BaseModel):
    crop_name: str
    mandi_benchmark_price: float
    recommended_min: float
    recommended_max: float
    recommended_price: float
    options: List[PriceOptionOut]


class CropIntelOut(BaseModel):
    crop: str
    crop_hi: str
    mandi: float
    direct: float
    historical: List[float]
    forecast: List[float]
    demand_index: float
    demand_change_pct: float
    nearby_demand_kg: float
    buyer_count: int
    volatility: str
    supply_pressure: str
    confidence: float
    recommended_min: float
    recommended_max: float


class ImpactSummaryOut(BaseModel):
    farmer_net_gain_percentage: float
    buyer_savings_percentage: float
    total_distance_saved_km: float
    wastage_prevented_kg: float
