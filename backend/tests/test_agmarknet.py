"""AGMARKNET service: normalization, validation, selection ladder and failure handling (no network)."""
from datetime import date

import httpx
import pytest

from app.core.config import settings
from app.services import agmarknet_service as svc
from app.services.agmarknet_service import (
    AgmarknetClient,
    normalize_commodity,
    normalize_record,
    quintal_to_kg,
    select_benchmark,
)

TODAY = date(2026, 9, 14)


def row(**overrides):
    base = {
        "state": "Haryana", "district": "Sonipat", "market": "Ganaur APMC", "commodity": "Tomato",
        "variety": "Tomato", "grade": "FAQ", "arrival_date": "14/09/2026",
        "min_price": 2500, "max_price": 3200, "modal_price": 2850,
    }
    if "modal_price" in overrides and "min_price" not in overrides and "max_price" not in overrides:
        modal = overrides["modal_price"]
        if isinstance(modal, (int, float)) and modal > 300:
            overrides = {**overrides, "min_price": modal - 300, "max_price": modal + 300}
    base.update(overrides)
    return base


# ---- commodity normalization ----------------------------------------------------------------
@pytest.mark.parametrize("name,key,commodity,hint", [
    ("Fresh Tomatoes", "tomato", "Tomato", None),
    ("टमाटर", "tomato", "Tomato", None),
    ("New Potatoes", "potato", "Potato", None),
    ("Red Onions", "onion", "Onion", "Red"),
    ("Baby Spinach", "spinach", "Spinach", None),
    ("Sharbati Wheat", "wheat", "Wheat", "Sharbati"),
    ("Sweet Carrots", "carrot", "Carrot", None),
    ("Green Capsicum", "capsicum", "Capsicum", None),
    ("Snow Cauliflower", "cauliflower", "Cauliflower", None),
    ("Crisp Cucumbers", "cucumber", "Cucumbar(Kheera)", None),
    ("Himachali Apples", "apple", "Apple", "Shimla"),
    ("Basmati Rice", "rice", "Rice", "Basmati"),
    ("Yellow Mustard", "mustard", "Mustard", None),
    ("Bottle gourd", "bottle gourd", "Bottle gourd", None),
    ("Lentils", "lentils", "Lentil (Masur)(Whole)", None),
])
def test_normalize_commodity(name, key, commodity, hint):
    assert normalize_commodity(name) == (key, commodity, hint)


def test_unknown_commodity_is_none():
    assert normalize_commodity("Unknownium")[0] is None
    assert normalize_commodity("")[0] is None


# ---- unit normalization & validation ----------------------------------------------------------
def test_quintal_to_kg():
    assert quintal_to_kg(2850) == 28.5
    assert quintal_to_kg("2,771.55") == 27.72
    assert quintal_to_kg("abc") is None
    assert quintal_to_kg(None) is None


def test_normalize_record_converts_units_and_parses_date():
    rec = normalize_record(row())
    assert rec is not None
    assert (rec.min_per_kg, rec.modal_per_kg, rec.max_per_kg) == (25.0, 28.5, 32.0)
    assert rec.arrival_date == TODAY


@pytest.mark.parametrize("bad", [
    {"modal_price": 0}, {"modal_price": -100}, {"modal_price": "n/a"}, {"modal_price": None},
    {"modal_price": 10},          # ₹0.10/kg — an obvious data-entry error (seen live for Spinach)
    {"modal_price": 10_000_000},  # ₹100,000/kg
    {"modal_price": 4000, "min_price": 2500, "max_price": 3200},  # modal outside [min, max]
    {"modal_price": 2000, "min_price": 2500, "max_price": 3200},
])
def test_invalid_government_price_is_rejected(bad):
    assert normalize_record(row(**bad)) is None


def test_missing_min_max_is_tolerated():
    rec = normalize_record(row(min_price=0, max_price=None))
    assert rec is not None and rec.min_per_kg is None and rec.max_per_kg is None


# ---- selection ladder -------------------------------------------------------------------------
def records(*rows):
    return [normalize_record(r) for r in rows]


def test_exact_market_wins():
    pool = records(
        row(market="Ganaur APMC", modal_price=2850),
        row(market="Kharkhoda APMC", modal_price=2400),
        row(district="Karnal", market="Karnal APMC", modal_price=2000),
    )
    b = select_benchmark(pool, "tomato", state="Haryana", district="Sonipat", market="Kharkhoda APMC", today=TODAY)
    assert b.match_level == "market" and b.modal_per_kg == 24.0 and b.market == "Kharkhoda APMC"
    assert b.source == "agmarknet" and b.stale is False


def test_district_median_when_market_missing():
    pool = records(
        row(market="Ganaur APMC", modal_price=2850),
        row(market="Kharkhoda APMC", modal_price=2400),
        row(district="Karnal", market="Karnal APMC", modal_price=2000),
    )
    b = select_benchmark(pool, "tomato", state="Haryana", district="Sonipat", market="Nowhere APMC", today=TODAY)
    assert b.match_level == "district" and b.modal_per_kg == 26.25 and b.record_count == 2
    assert b.min_per_kg == 21.0 and b.max_per_kg == 31.5  # min of mins / max of maxes across the district


def test_state_median_when_district_missing():
    pool = records(
        row(district="Karnal", market="Karnal APMC", modal_price=2000),
        row(district="Kaithal", market="Dhand APMC", modal_price=2200),
        row(district="Panchkula", market="Barwala APMC", modal_price=1750),
    )
    b = select_benchmark(pool, "tomato", state="Haryana", district="Sonipat", today=TODAY)
    assert b.match_level == "state" and b.modal_per_kg == 20.0 and b.district is None and b.state == "Haryana"


def test_national_median_when_state_missing():
    pool = records(
        row(state="Uttar Pradesh", district="Agra", market="Agra APMC", commodity="Wheat", variety="Other", modal_price=2425),
        row(state="Madhya Pradesh", district="Indore", market="Indore APMC", commodity="Wheat", variety="Sharbati", modal_price=2870),
    )
    b = select_benchmark(pool, "wheat", state="Haryana", district="Sonipat", today=TODAY)
    assert b.match_level == "national" and b.state is None


def test_variety_preferred_when_quoted():
    pool = records(
        row(state="Uttar Pradesh", district="Agra", market="Agra APMC", commodity="Wheat", variety="Other", modal_price=2425),
        row(state="Madhya Pradesh", district="Indore", market="Indore APMC", commodity="Wheat", variety="Sharbati", modal_price=2870),
    )
    b = select_benchmark(pool, "wheat", state="Haryana", district="Sonipat", variety_hint="Sharbati", today=TODAY)
    assert b.modal_per_kg == 28.7 and b.variety == "Sharbati"
    # An unquoted variety never blocks a benchmark.
    b2 = select_benchmark(pool, "wheat", variety_hint="Lokwan", today=TODAY)
    assert b2 is not None


def test_newest_date_preferred_and_stale_flagged():
    pool = records(
        row(arrival_date="01/09/2026", modal_price=2000),
        row(arrival_date="12/09/2026", modal_price=2600),
    )
    b = select_benchmark(pool, "tomato", state="Haryana", district="Sonipat", today=TODAY)
    assert b.modal_per_kg == 26.0 and b.arrival_date == "2026-09-12" and b.stale is False
    old = select_benchmark(records(row(arrival_date="01/09/2026")), "tomato", today=TODAY)
    assert old.stale is True


def test_no_valid_records_returns_none():
    assert select_benchmark([], "tomato", today=TODAY) is None
    assert select_benchmark(records(row(modal_price=0)), "tomato", today=TODAY) is None


# ---- client: cache, unavailable API, seed fallback -----------------------------------------------
class FakeTransport(httpx.AsyncBaseTransport):
    def __init__(self, handler):
        self.handler = handler
        self.calls = 0

    async def handle_async_request(self, request):
        self.calls += 1
        return self.handler(request)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "DATA_GOV_API_KEY", "test-key")
    monkeypatch.setattr(settings, "AGMARKNET_CACHE_TTL_SECONDS", 1800)
    return AgmarknetClient()


def patch_transport(monkeypatch, handler):
    transport = FakeTransport(handler)
    real = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = transport
        return real(*args, **kwargs)

    monkeypatch.setattr(svc.httpx, "AsyncClient", factory)
    return transport


async def test_live_benchmark_and_cache(client, monkeypatch):
    def handler(request):
        assert "api-key=test-key" in str(request.url)
        assert request.headers["user-agent"] != ""
        return httpx.Response(200, json={"records": [row(), row(market="Kharkhoda APMC", modal_price=2400)]})

    transport = patch_transport(monkeypatch, handler)
    b = await client.benchmark_for("Fresh Tomatoes")
    assert b.source == "agmarknet" and b.match_level == "district" and b.modal_per_kg == 26.25
    await client.benchmark_for("Tomatoes")
    assert transport.calls == 1, "second lookup for the same commodity must hit the cache"


async def test_api_unavailable_falls_back_to_seed(client, monkeypatch):
    def handler(request):
        raise httpx.ConnectTimeout("boom")

    patch_transport(monkeypatch, handler)
    b = await client.benchmark_for("Fresh Tomatoes")
    assert b.source == "seed" and b.match_level == "seed" and b.stale is True
    assert b.modal_per_kg == svc.SEED_MANDI_PER_KG["tomato"]


async def test_http_error_serves_last_good_as_stale(client, monkeypatch):
    state = {"fail": False}

    def handler(request):
        if state["fail"]:
            return httpx.Response(503, text="down")
        return httpx.Response(200, json={"records": [row()]})

    patch_transport(monkeypatch, handler)
    first = await client.benchmark_for("Fresh Tomatoes")
    assert first.source == "agmarknet"
    client._cache.clear()  # expire the TTL cache but keep the last-good copy
    state["fail"] = True
    second = await client.benchmark_for("Fresh Tomatoes")
    assert second.source == "agmarknet" and second.stale is True and second.modal_per_kg == first.modal_per_kg


async def test_state_empty_then_national_then_seed(client, monkeypatch):
    def handler(request):
        url = str(request.url)
        if "Wheat" in url and "filters%5Bstate%5D" in url:
            return httpx.Response(200, json={"records": []})
        if "Wheat" in url:
            return httpx.Response(200, json={"records": [row(state="Madhya Pradesh", district="Indore", market="Indore APMC", commodity="Wheat", variety="Sharbati", modal_price=2870)]})
        return httpx.Response(200, json={"records": []})

    transport = patch_transport(monkeypatch, handler)
    wheat = await client.benchmark_for("Sharbati Wheat")
    assert wheat.source == "agmarknet" and wheat.match_level == "national" and wheat.modal_per_kg == 28.7
    assert transport.calls == 2
    rice = await client.benchmark_for("Basmati Rice")  # no records anywhere -> seed
    assert rice.source == "seed"


async def test_missing_commodity_returns_none(client):
    assert await client.benchmark_for("Unknownium") is None


async def test_unconfigured_key_uses_seed(monkeypatch):
    monkeypatch.setattr(settings, "DATA_GOV_API_KEY", "")
    b = await AgmarknetClient().benchmark_for("Fresh Tomatoes")
    assert b.source == "seed"
