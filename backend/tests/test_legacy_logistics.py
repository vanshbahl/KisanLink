import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_legacy_logistics_endpoints(client: AsyncClient):
    # 1. Test /api/state
    state_res = await client.get("/api/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert "logisticsPickups" in state_data
    assert "deliveries" in state_data
    assert "logisticsRoutes" in state_data
    assert "vehicles" in state_data

    # 2. Test isolated logistics routes
    pickups_res = await client.get("/api/logistics/pickups")
    assert pickups_res.status_code == 200
    assert isinstance(pickups_res.json(), list)

    deliveries_res = await client.get("/api/logistics/deliveries")
    assert deliveries_res.status_code == 200
    assert isinstance(deliveries_res.json(), list)

    routes_res = await client.get("/api/logistics/routes")
    assert routes_res.status_code == 200
    assert isinstance(routes_res.json(), list)

    vehicles_res = await client.get("/api/logistics/vehicles")
    assert vehicles_res.status_code == 200
    assert isinstance(vehicles_res.json(), list)

    # 3. Test /api/reset
    reset_res = await client.post("/api/reset")
    assert reset_res.status_code == 200
    assert "logisticsPickups" in reset_res.json()
