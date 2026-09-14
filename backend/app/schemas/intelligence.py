from datetime import date, datetime
from typing import Any, Dict, List, Optional
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


class MandiBenchmarkOut(BaseModel):
    """Live AGMARKNET benchmark (₹/kg) with enough metadata to tell live from fallback."""
    crop_key: str
    commodity: str
    variety: Optional[str] = None
    market: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    modal_per_kg: float
    min_per_kg: Optional[float] = None
    max_per_kg: Optional[float] = None
    arrival_date: Optional[str] = None
    source: str
    match_level: str
    record_count: int
    stale: bool
    fetched_at: str


class PriceLadderOut(BaseModel):
    mandi_per_kg: float
    kisanlink_normal_per_kg: float
    market_maker_farmer_per_kg: float
    market_maker_consumer_per_kg: float
    kisanlink_normal_consumer_per_kg: float
    local_reference_per_kg: float
    farmer_premium_per_kg: float
    farmer_premium_pct: float
    normal_over_mandi_per_kg: float
    consumer_saving_per_kg: float
    consumer_saving_pct: float
    pooled_platform_fee_per_kg: float
    pooled_freight_allowance_per_kg: float
    unpooled_logistics_per_kg: float


class MandiPricingOut(BaseModel):
    crop: str
    benchmark: MandiBenchmarkOut
    ladder: PriceLadderOut
    farmer_ai_context: Dict[str, Any]
    consumer_ai_context: Dict[str, Any]


class MandiPricingBatchOut(BaseModel):
    fetched_at: str
    state: str
    district: str
    live_available: bool
    items: Dict[str, MandiPricingOut]
    unresolved: List[str] = []


class PriceRecommendationOut(BaseModel):
    crop_name: str
    mandi_benchmark_price: float
    recommended_min: float
    recommended_max: float
    recommended_price: float
    options: List[PriceOptionOut]
    benchmark: Optional[MandiBenchmarkOut] = None
    ladder: Optional[PriceLadderOut] = None


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
    benchmark: Optional[MandiBenchmarkOut] = None
    ladder: Optional[PriceLadderOut] = None
    # The daily AGMARKNET resource has no history; the series is an indicative demo shape.
    series_note: str = "indicative"


class ImpactSummaryOut(BaseModel):
    farmer_net_gain_percentage: float
    buyer_savings_percentage: float
    total_distance_saved_km: float
    wastage_prevented_kg: float
