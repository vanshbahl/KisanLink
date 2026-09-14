import asyncio
from datetime import datetime
from typing import Any, Dict, Optional
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.crop import CropType
from app.models.intelligence import DemandForecast, PriceObservation
from app.models.user import User
from app.schemas.intelligence import (
    CropIntelOut,
    ImpactSummaryOut,
    MandiBenchmarkOut,
    MandiPricingBatchOut,
    MandiPricingOut,
    PriceLadderOut,
    PriceObservationOut,
    PriceOptionOut,
    PriceRecommendationOut,
    PriceRecommendationRequest,
)
from app.services.agmarknet_service import MandiBenchmark, agmarknet, normalize_commodity
from app.services.impact_service import ImpactService
from app.services.pricing_engine import (
    PriceLadder,
    consumer_ai_context,
    derive_price_ladder,
    farmer_ai_context,
    farmer_price_options,
    indicative_series,
)
from app.services.pricing_service import pricing_service

router = APIRouter()

# Non-price demo metadata per crop (Hindi label, demand signal). Prices come from AGMARKNET.
CROP_META: Dict[str, Dict[str, Any]] = {
    "tomato": {"hi": "टमाटर", "demand_index": 82.0},
    "potato": {"hi": "आलू", "demand_index": 58.0},
    "onion": {"hi": "प्याज़", "demand_index": 71.0},
    "spinach": {"hi": "पालक", "demand_index": 64.0},
    "wheat": {"hi": "गेहूं", "demand_index": 41.0},
    "carrot": {"hi": "गाजर", "demand_index": 55.0},
}


async def resolve_pricing(crop_name: str, state: Optional[str] = None, district: Optional[str] = None, market: Optional[str] = None) -> Optional[MandiPricingOut]:
    """Live benchmark (or labelled seed fallback) + the centralized ladder for one crop."""
    benchmark = await agmarknet.benchmark_for(crop_name, state=state, district=district, market=market)
    if benchmark is None:
        return None
    ladder = derive_price_ladder(benchmark.modal_per_kg, benchmark.crop_key)
    return MandiPricingOut(
        crop=crop_name,
        benchmark=MandiBenchmarkOut(**benchmark.as_dict()),
        ladder=PriceLadderOut(**ladder.as_dict()),
        farmer_ai_context=farmer_ai_context(ladder, benchmark.as_dict()),
        consumer_ai_context=consumer_ai_context(ladder),
    )


@router.get("/mandi", response_model=MandiPricingBatchOut)
async def get_mandi_pricing(
    crops: str = Query(..., description="Comma-separated KisanLink crop names, e.g. 'Fresh Tomatoes,New Potatoes'"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
):
    """
    Live AGMARKNET mandi benchmark + KisanLink price ladder for each crop.

    Public read: it carries only government price data and derived demo values. The data.gov.in
    key stays on the server; responses are cached upstream of this handler.
    """
    names = [c.strip() for c in crops.split(",") if c.strip()][:60]
    resolved = await asyncio.gather(*(resolve_pricing(name, state, district, market) for name in names))
    items: Dict[str, MandiPricingOut] = {}
    unresolved: List[str] = []
    for name, item in zip(names, resolved):
        if item is None:
            unresolved.append(name)
        else:
            items[name] = item
    return MandiPricingBatchOut(
        fetched_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
        state=state or settings.AGMARKNET_DEFAULT_STATE,
        district=district or settings.AGMARKNET_DEFAULT_DISTRICT,
        live_available=any(item.benchmark.source == "agmarknet" for item in items.values()),
        items=items,
        unresolved=unresolved,
    )


@router.get("/prices", response_model=List[PriceObservationOut])
async def get_price_observations(
    crop_name: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve historical Mandi price observations."""
    stmt = select(PriceObservation).options(selectinload(PriceObservation.crop_type)).order_by(PriceObservation.observation_date.desc())

    if crop_name:
        stmt = stmt.join(CropType).where(CropType.name_en.ilike(f"%{crop_name}%"))

    if district:
        stmt = stmt.where(PriceObservation.district.ilike(f"%{district}%"))

    res = await db.execute(stmt)
    obs_list = res.scalars().all()

    output = []
    for obs in obs_list:
        c_name = obs.crop_type.name_en if obs.crop_type else "Produce"
        output.append(
            PriceObservationOut(
                id=obs.id,
                crop_type_id=obs.crop_type_id,
                crop_name=c_name,
                district=obs.district,
                modal_price_per_kg=float(obs.modal_price_per_kg),
                min_price_per_kg=float(obs.min_price_per_kg),
                max_price_per_kg=float(obs.max_price_per_kg),
                arrival_tonnes=float(obs.arrival_tonnes),
                observation_date=obs.observation_date,
                source=obs.source,
            )
        )
    return output


@router.get("/forecast/{crop_name}", response_model=CropIntelOut)
async def get_crop_forecast(
    crop_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve 7-day historical prices + 3-day projected demand/price forecast for a crop."""
    crop_key = normalize_commodity(crop_name)[0] or "tomato"
    meta = CROP_META.get(crop_key, {"hi": crop_name, "demand_index": 65.0})

    pricing = await resolve_pricing(crop_name)
    if pricing is None:
        # Unknown commodity: the only honest answer is the seed tomato shape, labelled as such.
        pricing = await resolve_pricing("Tomato")
    assert pricing is not None
    ladder = pricing.ladder
    mandi_price = ladder.mandi_per_kg

    # Recorded observations in our own DB drive the history when present; otherwise an
    # indicative shape anchored so its last point equals today's live benchmark.
    stmt_obs = (
        select(PriceObservation)
        .join(CropType)
        .where(CropType.name_en.ilike(f"%{crop_key}%"))
        .order_by(PriceObservation.observation_date.asc())
    )
    res_obs = await db.execute(stmt_obs)
    db_obs = res_obs.scalars().all()
    if db_obs:
        hist_prices = [float(o.modal_price_per_kg) for o in db_obs] + [mandi_price]
        hist_series, forecast_series = pricing_service.compute_forecast_series(hist_prices)
        series_note = "observations+live"
    else:
        series = indicative_series(mandi_price)
        hist_series, forecast_series = series["historical"], series["forecast"]
        series_note = "indicative"

    # Fetch DB demand forecast if available
    stmt_df = (
        select(DemandForecast)
        .join(CropType)
        .where(CropType.name_en.ilike(f"%{crop_key}%"))
        .order_by(DemandForecast.forecast_period_start.desc())
    )
    res_df = await db.execute(stmt_df)
    db_df = res_df.scalars().first()

    if db_df:
        raw_idx = float(db_df.projected_demand_index)
        demand_index = round(raw_idx * 60.0, 1) if raw_idx <= 2.0 else round(raw_idx, 1)
        demand_index = min(98.0, max(30.0, demand_index))
        volatility = "High" if "SURGE" in db_df.forecast_status or "HIGH" in db_df.forecast_status else "Moderate"
        supply_pressure = "Low" if db_df.projected_deficit_tonnes and float(db_df.projected_deficit_tonnes) > 20 else "Moderate"
    else:
        demand_index = float(meta["demand_index"])
        volatility = "Moderate"
        supply_pressure = "Moderate"

    return CropIntelOut(
        crop=crop_name.capitalize(),
        crop_hi=meta["hi"],
        mandi=mandi_price,
        direct=ladder.market_maker_farmer_per_kg,
        historical=hist_series,
        forecast=forecast_series,
        demand_index=demand_index,
        demand_change_pct=18.5,
        nearby_demand_kg=1800.0,
        buyer_count=34,
        volatility=volatility,
        supply_pressure=supply_pressure,
        confidence=88.0 if pricing.benchmark.source == "agmarknet" and not pricing.benchmark.stale else 62.0,
        recommended_min=ladder.kisanlink_normal_per_kg,
        recommended_max=ladder.market_maker_farmer_per_kg,
        benchmark=pricing.benchmark,
        ladder=ladder,
        series_note=series_note,
    )


@router.post("/recommend-price", response_model=PriceRecommendationOut)
async def recommend_price(
    req: PriceRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate dynamic recommended price bounds and anchor price options for a crop listing."""
    pricing = await resolve_pricing(req.crop_name)
    crop_key = normalize_commodity(req.crop_name)[0] or "tomato"
    if pricing is not None:
        benchmark: Optional[MandiBenchmarkOut] = pricing.benchmark
        ladder = PriceLadder(**pricing.ladder.model_dump())
    else:
        # Unknown commodity and no seed row: the only anchor left is the one the client holds.
        benchmark = None
        ladder = derive_price_ladder(float(req.mandi_price_per_kg or 24.0), crop_key)
    mandi = ladder.mandi_per_kg
    demand_index = float(CROP_META.get(crop_key, {}).get("demand_index", 65.0))
    options_raw = farmer_price_options(ladder, req.grade, demand_index)

    options = [
        PriceOptionOut(
            id=opt["id"],
            price=opt["price"],
            label_key=opt["label_key"],
            hint_key=opt["hint_key"],
            sale_chance_pct=opt["sale_chance_pct"],
        )
        for opt in options_raw
    ]

    balanced = next(o for o in options if o.id == "balanced")

    return PriceRecommendationOut(
        crop_name=req.crop_name,
        mandi_benchmark_price=mandi,
        recommended_min=ladder.kisanlink_normal_per_kg,
        recommended_max=ladder.market_maker_farmer_per_kg,
        recommended_price=balanced.price,
        options=options,
        benchmark=benchmark,
        ladder=PriceLadderOut(**ladder.as_dict()),
    )


@router.get("/impact-summary", response_model=ImpactSummaryOut)
async def get_impact_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve summarized platform ecosystem impact metrics aggregated live from DB."""
    return await ImpactService.calculate_live_impact(db)
