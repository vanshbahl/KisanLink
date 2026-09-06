import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.pricing_service import pricing_service


def test_pricing_trend_forecasting():
    hist = [25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0]
    hist_out, forecast_out = pricing_service.compute_forecast_series(hist)

    assert len(hist_out) == 7
    assert len(forecast_out) == 3
    assert forecast_out[0] > hist_out[-1]


def test_generate_price_options():
    options = pricing_service.generate_price_options("Fresh Tomatoes", 24.0, "Grade A")

    assert len(options) == 3
    ids = [o["id"] for o in options]
    assert ids == ["fast", "balanced", "high"]
    assert options[0]["price"] < options[1]["price"] < options[2]["price"]


@pytest.mark.asyncio
async def test_get_price_observations_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/intelligence/prices")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_crop_forecast_authenticated(client: AsyncClient, farmer_token: str):
    res = await client.get(
        "/api/v1/intelligence/forecast/Tomatoes",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["crop"] == "Tomatoes"
    assert len(data["historical"]) == 7
    assert len(data["forecast"]) == 3
    assert data["mandi"] > 0
    assert data["direct"] > 0


@pytest.mark.asyncio
async def test_recommend_price_authenticated(client: AsyncClient, farmer_token: str):
    payload = {
        "crop_name": "Fresh Tomatoes",
        "quantity_kg": 150.0,
        "grade": "Grade A",
        "mandi_price_per_kg": 24.0,
    }
    res = await client.post(
        "/api/v1/intelligence/recommend-price",
        json=payload,
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["crop_name"] == "Fresh Tomatoes"
    assert data["mandi_benchmark_price"] == 24.0
    assert len(data["options"]) == 3
    ids = [o["id"] for o in data["options"]]
    assert ids == ["fast", "balanced", "high"]


@pytest.mark.asyncio
async def test_impact_summary_authenticated(client: AsyncClient, farmer_token: str):
    res = await client.get(
        "/api/v1/intelligence/impact-summary",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "farmer_net_gain_percentage" in data
    assert "buyer_savings_percentage" in data
    assert "total_distance_saved_km" in data
    assert "wastage_prevented_kg" in data

