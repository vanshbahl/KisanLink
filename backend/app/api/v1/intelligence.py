from typing import Any, Dict, Optional
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.models.crop import CropType
from app.models.intelligence import DemandForecast, PriceObservation
from app.models.user import User
from app.schemas.intelligence import (
    CropIntelOut,
    ImpactSummaryOut,
    PriceObservationOut,
    PriceOptionOut,
    PriceRecommendationOut,
    PriceRecommendationRequest,
)
from app.services.impact_service import ImpactService
from app.services.pricing_service import pricing_service

router = APIRouter()

DEFAULT_CROP_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "tomatoes": {"mandi": 24.0, "direct": 32.0, "hi": "टमाटर", "hist": [27.0, 28.0, 28.0, 30.0, 29.0, 31.0, 32.0]},
    "potatoes": {"mandi": 21.0, "direct": 25.0, "hi": "आलू", "hist": [20.0, 21.0, 21.0, 22.0, 22.0, 24.0, 25.0]},
    "onion": {"mandi": 18.0, "direct": 24.0, "hi": "प्याज़", "hist": [17.0, 18.0, 19.0, 19.0, 21.0, 23.0, 24.0]},
    "spinach": {"mandi": 35.0, "direct": 42.0, "hi": "पालक", "hist": [33.0, 35.0, 36.0, 38.0, 39.0, 40.0, 42.0]},
    "wheat": {"mandi": 31.0, "direct": 37.0, "hi": "गेहूं", "hist": [30.0, 31.0, 31.0, 32.0, 33.0, 34.0, 37.0]},
    "carrots": {"mandi": 29.0, "direct": 36.0, "hi": "गाजर", "hist": [27.0, 28.0, 30.0, 31.0, 33.0, 35.0, 36.0]},
}


def _clean_crop_key(crop_name: str) -> str:
    return (
        crop_name.strip()
        .replace("Fresh ", "")
        .replace("New ", "")
        .replace("Red ", "")
        .replace("Baby ", "")
        .replace("Sharbati ", "")
        .replace("Sweet ", "")
        .lower()
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
    crop_key = _clean_crop_key(crop_name)
    info = DEFAULT_CROP_BENCHMARKS.get(crop_key) or DEFAULT_CROP_BENCHMARKS.get("tomatoes")

    # Fetch DB price observations if available
    stmt_obs = (
        select(PriceObservation)
        .join(CropType)
        .where(CropType.name_en.ilike(f"%{crop_key}%"))
        .order_by(PriceObservation.observation_date.asc())
    )
    res_obs = await db.execute(stmt_obs)
    db_obs = res_obs.scalars().all()

    hist_prices = [float(o.modal_price_per_kg) for o in db_obs] if db_obs else info["hist"]
    hist_series, forecast_series = pricing_service.compute_forecast_series(hist_prices)

    mandi_price = hist_series[-1]
    direct_price = round(mandi_price * 1.25, 1)

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
        demand_index = 82.0 if crop_key == "tomatoes" else 65.0
        volatility = "Moderate"
        supply_pressure = "Moderate"

    return CropIntelOut(
        crop=crop_name.capitalize(),
        crop_hi=info["hi"],
        mandi=mandi_price,
        direct=direct_price,
        historical=hist_series,
        forecast=forecast_series,
        demand_index=demand_index,
        demand_change_pct=18.5,
        nearby_demand_kg=1800.0,
        buyer_count=34,
        volatility=volatility,
        supply_pressure=supply_pressure,
        confidence=88.0,
        recommended_min=round(mandi_price * 1.2, 1),
        recommended_max=round(mandi_price * 1.35, 1),
    )


@router.post("/recommend-price", response_model=PriceRecommendationOut)
async def recommend_price(
    req: PriceRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate dynamic recommended price bounds and anchor price options for a crop listing."""
    crop_key = _clean_crop_key(req.crop_name)
    info = DEFAULT_CROP_BENCHMARKS.get(crop_key) or DEFAULT_CROP_BENCHMARKS.get("tomatoes")

    mandi = req.mandi_price_per_kg or info["mandi"]
    options_raw = pricing_service.generate_price_options(req.crop_name, mandi, req.grade)

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
        recommended_min=round(mandi * 1.2, 1),
        recommended_max=round(mandi * 1.35, 1),
        recommended_price=balanced.price,
        options=options,
    )


@router.get("/impact-summary", response_model=ImpactSummaryOut)
async def get_impact_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve summarized platform ecosystem impact metrics aggregated live from DB."""
    return await ImpactService.calculate_live_impact(db)
