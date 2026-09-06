import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.routing_service import routing_service


def test_or_tools_vrp_solver():
    stops = [
        {"id": "depot", "name": "Sonipat Central Hub", "lat": 28.9931, "lon": 77.0151, "demand_kg": 0, "type": "DEPOT"},
        {"id": "farm_1", "name": "Farm A", "lat": 29.0120, "lon": 77.0310, "demand_kg": 400, "type": "PICKUP"},
        {"id": "farm_2", "name": "Farm B", "lat": 29.0250, "lon": 77.0420, "demand_kg": 600, "type": "PICKUP"},
        {"id": "buyer", "name": "Main Delivery Hub", "lat": 28.6139, "lon": 77.2090, "demand_kg": 0, "type": "DELIVERY"},
    ]

    res = routing_service.solve_vrp_route(stops, vehicle_capacity_kg=1500.0)

    assert "sequence" in res
    assert len(res["sequence"]) == len(stops)
    assert res["total_distance_km"] > 0
    assert res["estimated_duration_minutes"] > 0
    assert res["utilization_pct"] == 66.7
    assert res["trips_reduced"] == 1


def test_or_tools_vrp_solver_empty_and_single_stop():
    """Edge cases: no stops, and a single depot-only stop should not error or hang."""
    assert routing_service.solve_vrp_route([], vehicle_capacity_kg=1500.0)["total_distance_km"] == 0.0

    single = [{"id": "depot", "name": "Hub", "lat": 28.9931, "lon": 77.0151, "demand_kg": 0, "type": "DEPOT"}]
    res = routing_service.solve_vrp_route(single, vehicle_capacity_kg=1500.0)
    assert res["total_distance_km"] == 0.0
    assert res["trips_reduced"] == 0


def test_or_tools_vrp_solver_capacity_edge_case():
    """Demand exactly at vehicle capacity should still solve without raising."""
    stops = [
        {"id": "depot", "name": "Hub", "lat": 28.9931, "lon": 77.0151, "demand_kg": 0, "type": "DEPOT"},
        {"id": "farm_1", "name": "Farm A", "lat": 29.0120, "lon": 77.0310, "demand_kg": 1500, "type": "PICKUP"},
        {"id": "buyer", "name": "Hub Delivery", "lat": 28.6139, "lon": 77.2090, "demand_kg": 0, "type": "DELIVERY"},
    ]
    res = routing_service.solve_vrp_route(stops, vehicle_capacity_kg=1500.0)
    assert res["utilization_pct"] == 100.0


@pytest.mark.asyncio
async def test_get_shipments_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/logistics/shipments")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_optimize_route_against_real_order(client: AsyncClient, farmer_token: str, buyer_token: str):
    """
    End-to-end: a real cluster-backed order (with a real FarmerProfile allocation)
    must optimize successfully. Regression test for a prior AttributeError where the
    route builder read a non-existent `FarmerProfile.farm_name` instead of `full_name`.
    """
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 300.0,
            "max_price_per_kg": 30.0,
            "acceptable_grades": ["GRADE_A"],
            "delivery_deadline": "2026-09-10T18:00:00Z",
            "delivery_latitude": 28.6315,
            "delivery_longitude": 77.2167,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    match_res = await client.post(
        f"/api/v1/requirements/{req_id}/generate-matches",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    cluster_id = match_res.json()["cluster_id"]

    order_res = await client.post(
        f"/api/v1/orders/from-cluster/{cluster_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    order_id = order_res.json()["id"]

    optimize_res = await client.post(
        "/api/v1/logistics/routes/optimize",
        json={"order_ids": [order_id], "vehicle_capacity_kg": 1500.0},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert optimize_res.status_code == 200
    data = optimize_res.json()
    assert data["order_id"] == order_id
    assert len(data["waypoints"]) >= 2
    assert any(w["waypoint_type"] == "PICKUP" for w in data["waypoints"])
