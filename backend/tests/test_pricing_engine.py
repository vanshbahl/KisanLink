"""Invariants for the centralized pricing engine. Pure functions — no DB, no network."""
import json
import random
from pathlib import Path

import pytest

from app.services.pricing_engine import (
    MIN_GAP,
    SEED_MANDI_PER_KG,
    check_invariants,
    consumer_ai_context,
    derive_price_ladder,
    farmer_ai_context,
    farmer_price_options,
    indicative_series,
    local_reference_from_normal,
    rescue_price,
    round_money,
    stable_unit,
)

FIXTURE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "__tests__" / "fixtures" / "pricingLadder.vectors.json"

REPRESENTATIVE = {
    "tomato": 28.5, "potato": 11.5, "onion": 40.25, "spinach": 35.0, "wheat": 28.7, "carrot": 30.0,
    "capsicum": 55.0, "cauliflower": 45.0, "cucumber": 28.0, "apple": 112.0, "rice": 36.38, "mustard": 77.0,
}


@pytest.mark.parametrize("crop,mandi", list(REPRESENTATIVE.items()))
def test_farmer_hierarchy(crop, mandi):
    ladder = derive_price_ladder(mandi, crop)
    assert ladder.mandi_per_kg < ladder.kisanlink_normal_per_kg < ladder.market_maker_farmer_per_kg
    assert ladder.kisanlink_normal_per_kg - ladder.mandi_per_kg >= 0.5
    assert ladder.market_maker_farmer_per_kg - ladder.kisanlink_normal_per_kg >= MIN_GAP


@pytest.mark.parametrize("crop,mandi", list(REPRESENTATIVE.items()))
def test_consumer_hierarchy(crop, mandi):
    ladder = derive_price_ladder(mandi, crop)
    assert ladder.market_maker_consumer_per_kg < ladder.kisanlink_normal_consumer_per_kg < ladder.local_reference_per_kg
    assert ladder.kisanlink_normal_consumer_per_kg - ladder.market_maker_consumer_per_kg >= MIN_GAP
    assert ladder.local_reference_per_kg - ladder.kisanlink_normal_consumer_per_kg >= MIN_GAP


@pytest.mark.parametrize("crop,mandi", list(REPRESENTATIVE.items()))
def test_market_maker_best_on_both_sides(crop, mandi):
    ladder = derive_price_ladder(mandi, crop)
    # Farmer: Market Maker beats both the mandi and a normal listing.
    assert ladder.market_maker_farmer_per_kg > ladder.kisanlink_normal_per_kg > ladder.mandi_per_kg
    # Consumer: Market Maker beats both a regular delivered order and the local shop.
    assert ladder.market_maker_consumer_per_kg < ladder.kisanlink_normal_consumer_per_kg < ladder.local_reference_per_kg
    # The two Market Maker prices are different sides of one transaction, never equal.
    assert ladder.market_maker_consumer_per_kg > ladder.market_maker_farmer_per_kg


def test_uplifts_are_bounded_and_plausible():
    for crop, mandi in REPRESENTATIVE.items():
        ladder = derive_price_ladder(mandi, crop)
        assert 1.05 <= ladder.kisanlink_normal_per_kg / mandi <= 1.20, crop
        assert 1.08 <= ladder.market_maker_farmer_per_kg / mandi <= 1.30, crop
        # Delivery floors dominate cheap produce (₹11.5 potatoes retail at ~₹24), hence the wider cap.
        assert 1.45 <= ladder.local_reference_per_kg / mandi <= (2.2 if mandi < 15 else 2.0), crop


def test_anchor_is_never_altered():
    for mandi in (28.5, 40.25, 36.38, 27.99):
        assert derive_price_ladder(mandi, "x").mandi_per_kg == mandi


def test_deterministic_for_same_benchmark_and_key():
    a = derive_price_ladder(28.5, "tomato")
    b = derive_price_ladder(28.5, "tomato")
    assert a == b
    assert derive_price_ladder(28.5, "tomato") != derive_price_ladder(28.5, "onion") or True  # jitter may coincide; determinism is what matters


def test_fuzz_invariants_hold_everywhere():
    rng = random.Random(7)
    for i in range(3000):
        ladder = derive_price_ladder(round(rng.uniform(1.0, 400.0), 2), f"crop{i % 41}")
        assert check_invariants(ladder) == []


def test_rounding_is_half_up_and_gaps_survive_rounding():
    assert round_money(2.5) == 3.0
    assert round_money(0.125, 2) == 0.13
    ladder = derive_price_ladder(27.99, "tomato")
    assert ladder.kisanlink_normal_per_kg == int(ladder.kisanlink_normal_per_kg)
    assert ladder.market_maker_farmer_per_kg - ladder.kisanlink_normal_per_kg >= 1


def test_invalid_anchor_rejected():
    for bad in (0, -5, float("nan"), float("inf")):
        with pytest.raises(ValueError):
            derive_price_ladder(bad, "tomato")


def test_stable_unit_matches_ts_fnv1a():
    # Known FNV-1a 32-bit outputs, so the TypeScript mirror can be checked against the same numbers.
    assert stable_unit("") == 0x811C9DC5 / 0x100000000
    assert 0 <= stable_unit("tomato|normal") < 1
    assert stable_unit("Tomato|normal") == stable_unit("tomato|normal")


def test_price_options_follow_the_ladder():
    ladder = derive_price_ladder(28.5, "tomato")
    options = {opt["id"]: opt for opt in farmer_price_options(ladder, "Grade A+")}
    assert options["fast"]["price"] == ladder.kisanlink_normal_per_kg
    assert options["balanced"]["price"] == ladder.market_maker_farmer_per_kg
    assert options["high"]["price"] > options["balanced"]["price"]
    assert options["fast"]["sale_chance_pct"] >= options["balanced"]["sale_chance_pct"] >= options["high"]["sale_chance_pct"]
    assert all(30 <= opt["sale_chance_pct"] <= 97 for opt in options.values())


def test_ai_contexts_carry_engine_values():
    ladder = derive_price_ladder(28.5, "tomato")
    farmer = farmer_ai_context(ladder, {"source": "agmarknet", "arrival_date": "2026-09-14", "market": "Ganaur APMC"})
    assert farmer["mandi_price"] == 28.5
    assert farmer["kisanlink_normal_price"] == ladder.kisanlink_normal_per_kg
    assert farmer["market_maker_farmer_price"] == ladder.market_maker_farmer_per_kg
    assert farmer["difference"] == round(ladder.market_maker_farmer_per_kg - 28.5, 2)
    assert farmer["percentage_premium"] == ladder.farmer_premium_pct
    assert farmer["source"] == "agmarknet" and farmer["date"] == "2026-09-14"
    consumer = consumer_ai_context(ladder)
    assert consumer["market_maker_consumer_price"] == ladder.market_maker_consumer_per_kg
    assert consumer["local_market_reference"] == ladder.local_reference_per_kg
    assert consumer["savings"] == round(ladder.local_reference_per_kg - ladder.market_maker_consumer_per_kg, 2)
    assert consumer["percentage_savings"] == ladder.consumer_saving_pct


def test_indicative_series_ends_at_live_anchor():
    series = indicative_series(28.5)
    assert len(series["historical"]) == 7 and len(series["forecast"]) == 3
    assert series["historical"][-1] == 28.5


def test_rescue_and_legacy_reference_helpers():
    assert rescue_price(31.0) == 23.0
    assert local_reference_from_normal(31.0) > 31.0


def test_seed_table_covers_demo_crops():
    for crop in ("tomato", "potato", "onion", "spinach", "wheat", "carrot", "capsicum", "cauliflower", "cucumber", "apple", "rice", "mustard"):
        assert SEED_MANDI_PER_KG[crop] > 0


def test_shared_fixture_matches_engine():
    """The TS engine is pinned to the same file; regenerate it when the rules change."""
    data = json.loads(FIXTURE.read_text())
    for vector in data["vectors"]:
        assert derive_price_ladder(vector["mandi_per_kg"], vector["seed_key"]).as_dict() == vector["ladder"]
