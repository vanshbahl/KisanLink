import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_order_from_cluster(
    client: AsyncClient, buyer_token: str, farmer_token: str
):
    # 1. Buyer creates requirement
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 2000.0,
            "max_price_per_kg": 28.0,
            "acceptable_grades": ["GRADE_A"],
            "delivery_deadline": "2026-09-10T18:00:00Z",
            "delivery_latitude": 28.6315,
            "delivery_longitude": 77.2167,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # 2. Buyer generates matches
    match_res = await client.post(
        f"/api/v1/requirements/{req_id}/generate-matches",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert match_res.status_code == 200
    cluster_id = match_res.json()["cluster_id"]

    # 3. Buyer creates order from cluster
    order_res = await client.post(
        f"/api/v1/orders/from-cluster/{cluster_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["status"] == "CONFIRMED"
    assert len(order_data["allocations"]) > 0
    order_id = order_data["id"]

    # 4. Buyer fetches my-orders
    buyer_orders = await client.get(
        "/api/v1/orders/my-orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert buyer_orders.status_code == 200
    assert any(o["id"] == order_id for o in buyer_orders.json())

    # 5. Farmer fetches my-orders and sees allocation
    farmer_orders = await client.get(
        "/api/v1/orders/my-orders",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert farmer_orders.status_code == 200
    assert len(farmer_orders.json()) > 0
    assert farmer_orders.json()[0]["allocations"][0]["allocated_kg"] > 0
