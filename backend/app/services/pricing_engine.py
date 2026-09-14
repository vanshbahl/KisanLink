"""
KisanLink centralized pricing engine.

ONE set of rules for every price the product shows, derived from ONE anchor: the live
AGMARKNET mandi modal price (₹/kg). The anchor is never altered; only KisanLink's own demo /
platform values are derived around it.

    Farmer side   :  mandi  <  kisanlink_normal  <  market_maker_farmer
    Consumer side :  market_maker_consumer  <  kisanlink_normal_consumer  <  local_reference

`kisanlink_normal_per_kg` is the single listing price the app already uses on both sides
(the farmer's ask on a normal listing; the per-kg price on a consumer card, before delivery).
The consumer's *delivered* comparison uses `kisanlink_normal_consumer_per_kg` (normal price
plus un-pooled last-mile logistics), which is what a pooled Market Maker delivery beats.

The TypeScript mirror lives at frontend/src/services/pricingEngine.ts and both are pinned to
the same fixture (frontend/src/__tests__/fixtures/pricingLadder.vectors.json).
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

# ---- Tunables (keep in sync with pricingEngine.ts) ------------------------------------------
FARMER_NORMAL_UPLIFT_MIN = 0.08          # normal listing price over mandi
FARMER_NORMAL_UPLIFT_SPAN = 0.04         # + deterministic per-commodity jitter (0..span)
FARMER_MM_UPLIFT_MIN = 0.04              # Market Maker farmer price over the normal price
FARMER_MM_UPLIFT_SPAN = 0.03
POOLED_PLATFORM_PCT = 0.02               # Market Maker platform fee, billed to the buyer
POOLED_FREIGHT_FLOOR = 6.0               # ₹/kg allowance for a shared truck at break-even
POOLED_FREIGHT_PCT = 0.06
UNPOOLED_LOGISTICS_FLOOR = 9.0           # ₹/kg a single-household delivery costs today
UNPOOLED_LOGISTICS_PCT = 0.12
LOCAL_REFERENCE_MULTIPLE = 1.55          # local shop / retail reference over mandi
MIN_GAP = 1.0                            # visible ₹/kg gap between adjacent levels
REGULAR_ORDER_PLATFORM_PCT = 0.03        # existing normal-order platform share (farmer bears)
RESCUE_DISCOUNT = 0.75                   # rescue sale = 75% of the normal price (distress base discount 25%)

# Values (₹/kg) used ONLY when live government data is unavailable. Labelled source="seed".
SEED_MANDI_PER_KG: Dict[str, float] = {
    "tomato": 24.0, "potato": 21.0, "onion": 18.0, "spinach": 35.0, "wheat": 31.0,
    "carrot": 29.0, "capsicum": 44.0, "cauliflower": 28.0, "cucumber": 22.0, "apple": 95.0,
    "rice": 62.0, "mustard": 55.0, "sugarcane": 3.5, "maize": 20.0, "bajra": 24.0,
    "chilli": 40.0, "brinjal": 22.0, "okra": 30.0, "cabbage": 14.0, "peas": 45.0,
    "bottle gourd": 12.0, "pumpkin": 11.0, "garlic": 110.0, "ginger": 70.0, "coriander": 50.0,
    "mango": 60.0, "banana": 22.0, "guava": 35.0, "gram": 62.0, "lentils": 85.0,
}


def round_money(value: float, decimals: int = 0) -> float:
    """Half-up rounding (Python's round() is banker's; JS Math.round is half-up)."""
    factor = 10 ** decimals
    result = math.floor(value * factor + 0.5) / factor
    return float(result) if decimals else float(int(result))


def stable_unit(key: str) -> float:
    """Deterministic [0, 1) from a string — FNV-1a 32-bit, identical in the TS mirror."""
    h = 0x811C9DC5
    for ch in key.lower().strip():
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h / 0x100000000


@dataclass
class PriceLadder:
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

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


def derive_price_ladder(mandi_per_kg: float, seed_key: str = "") -> PriceLadder:
    """Build every KisanLink price tier from the mandi anchor. Pure and deterministic."""
    if not isinstance(mandi_per_kg, (int, float)) or not math.isfinite(mandi_per_kg) or mandi_per_kg <= 0:
        raise ValueError("mandi_per_kg must be a positive finite number")

    mandi = round_money(float(mandi_per_kg), 2)
    j1 = stable_unit(f"{seed_key}|normal")
    j2 = stable_unit(f"{seed_key}|mm")

    normal = max(
        math.ceil(mandi) + MIN_GAP,
        round_money(mandi * (1 + FARMER_NORMAL_UPLIFT_MIN + FARMER_NORMAL_UPLIFT_SPAN * j1)),
    )
    mm_farmer = max(
        normal + MIN_GAP,
        round_money(normal * (1 + FARMER_MM_UPLIFT_MIN + FARMER_MM_UPLIFT_SPAN * j2)),
    )

    pooled_fee = round_money(mm_farmer * POOLED_PLATFORM_PCT, 2)
    pooled_freight = round_money(max(POOLED_FREIGHT_FLOOR, mm_farmer * POOLED_FREIGHT_PCT), 2)
    mm_consumer = round_money(mm_farmer + pooled_fee + pooled_freight, 2)

    unpooled = round_money(max(UNPOOLED_LOGISTICS_FLOOR, normal * UNPOOLED_LOGISTICS_PCT), 2)
    normal_consumer = max(round_money(normal + unpooled), math.ceil(mm_consumer) + MIN_GAP)

    local_reference = max(round_money(mandi * LOCAL_REFERENCE_MULTIPLE), normal_consumer + 2 * MIN_GAP)

    return PriceLadder(
        mandi_per_kg=mandi,
        kisanlink_normal_per_kg=float(normal),
        market_maker_farmer_per_kg=float(mm_farmer),
        market_maker_consumer_per_kg=mm_consumer,
        kisanlink_normal_consumer_per_kg=float(normal_consumer),
        local_reference_per_kg=float(local_reference),
        farmer_premium_per_kg=round_money(mm_farmer - mandi, 2),
        farmer_premium_pct=round_money((mm_farmer - mandi) / mandi * 100, 1),
        normal_over_mandi_per_kg=round_money(normal - mandi, 2),
        consumer_saving_per_kg=round_money(local_reference - mm_consumer, 2),
        consumer_saving_pct=round_money((local_reference - mm_consumer) / local_reference * 100, 1),
        pooled_platform_fee_per_kg=pooled_fee,
        pooled_freight_allowance_per_kg=pooled_freight,
        unpooled_logistics_per_kg=unpooled,
    )


def local_reference_from_normal(normal_per_kg: float) -> float:
    """Local-market reference when only a listing price is known (legacy rows)."""
    approx_mandi = normal_per_kg / (1 + FARMER_NORMAL_UPLIFT_MIN + FARMER_NORMAL_UPLIFT_SPAN / 2)
    return derive_price_ladder(max(1.0, approx_mandi)).local_reference_per_kg


def rescue_price(normal_per_kg: float) -> float:
    return round_money(normal_per_kg * RESCUE_DISCOUNT)


def farmer_price_options(ladder: PriceLadder, grade: str = "Grade A", demand_index: float = 65.0) -> List[Dict[str, Any]]:
    """The three anchors on the price advisor: normal (fast), Market Maker (balanced), stretch."""
    fast = ladder.kisanlink_normal_per_kg
    balanced = ladder.market_maker_farmer_per_kg
    high = max(balanced + MIN_GAP, round_money(balanced * 1.06))
    grade_bonus = 4 if grade == "Grade A+" else 0

    def chance(price: float) -> int:
        value = 84 - (price - balanced) * 6 + (demand_index - 70) * 0.3 + grade_bonus
        return int(max(30, min(97, round_money(value))))

    return [
        {"id": "fast", "price": fast, "label_key": "fastSale", "hint_key": "lowerEarnings", "sale_chance_pct": min(97, chance(fast) + 6)},
        {"id": "balanced", "price": balanced, "label_key": "bestBalance", "hint_key": "bestBalanceHint", "sale_chance_pct": chance(balanced)},
        {"id": "high", "price": high, "label_key": "higherEarnings", "hint_key": "lowerSaleProbability", "sale_chance_pct": chance(high)},
    ]


def indicative_series(mandi_per_kg: float) -> Dict[str, List[float]]:
    """
    Deterministic 7-day trend + 3-day projection scaled so the LAST historical point is the
    live benchmark. AGMARKNET's current-daily resource has no history, so this is an
    illustrative demo shape, never presented as government data.
    """
    hist_shape = [0.93, 0.95, 0.96, 0.98, 0.97, 0.99, 1.00]
    fc_shape = [1.01, 1.02, 1.02]
    return {
        "historical": [round_money(mandi_per_kg * f, 1) for f in hist_shape],
        "forecast": [round_money(mandi_per_kg * f, 1) for f in fc_shape],
    }


def farmer_ai_context(ladder: PriceLadder, benchmark: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Numbers an AI/insight layer must reason from. Text may embellish; these are authoritative."""
    return {
        "mandi_price": ladder.mandi_per_kg,
        "kisanlink_normal_price": ladder.kisanlink_normal_per_kg,
        "market_maker_farmer_price": ladder.market_maker_farmer_per_kg,
        "difference": ladder.farmer_premium_per_kg,
        "percentage_premium": ladder.farmer_premium_pct,
        "source": (benchmark or {}).get("source", "seed"),
        "date": (benchmark or {}).get("arrival_date"),
        "market": (benchmark or {}).get("market"),
    }


def consumer_ai_context(ladder: PriceLadder) -> Dict[str, Any]:
    return {
        "market_maker_consumer_price": ladder.market_maker_consumer_per_kg,
        "kisanlink_normal_price": ladder.kisanlink_normal_consumer_per_kg,
        "local_market_reference": ladder.local_reference_per_kg,
        "savings": ladder.consumer_saving_per_kg,
        "percentage_savings": ladder.consumer_saving_pct,
    }


def check_invariants(ladder: PriceLadder) -> List[str]:
    """Empty list when the ladder is sound; otherwise the broken rule names."""
    problems: List[str] = []
    if not ladder.mandi_per_kg < ladder.kisanlink_normal_per_kg:
        problems.append("mandi < normal")
    if not ladder.kisanlink_normal_per_kg + MIN_GAP <= ladder.market_maker_farmer_per_kg:
        problems.append("normal + 1 <= market_maker_farmer")
    if not ladder.market_maker_farmer_per_kg < ladder.market_maker_consumer_per_kg:
        problems.append("market_maker_farmer < market_maker_consumer")
    if not ladder.market_maker_consumer_per_kg + MIN_GAP <= ladder.kisanlink_normal_consumer_per_kg:
        problems.append("market_maker_consumer + 1 <= normal_consumer")
    if not ladder.kisanlink_normal_consumer_per_kg + MIN_GAP <= ladder.local_reference_per_kg:
        problems.append("normal_consumer + 1 <= local_reference")
    return problems
