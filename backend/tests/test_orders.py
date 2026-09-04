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


@pytest.mark.asyncio
async def test_direct_consumer_order_and_farmer_dashboard(
    client: AsyncClient, buyer_token: str, farmer_token: str
):
    # 1. Create a listing for the farmer
    listing_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Spinach",
            "quantity_kg": 100.0,
            "expected_price_per_kg": 40.0,
            "quality_grade": "GRADE_A",
            "harvest_date": "2026-09-06",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert listing_res.status_code == 201
    listing_data = listing_res.json()
    listing_id = listing_data["id"]

    # 2. Buyer places a direct B2C cart order for 25kg
    direct_res = await client.post(
        "/api/v1/orders/direct",
        json={
            "items": [{"listing_id": listing_id, "quantity_kg": 25.0}],
            "delivery_address": "Sector 62, Noida",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert direct_res.status_code == 201
    orders = direct_res.json()
    assert len(orders) == 1
    order = orders[0]
    assert order["status"] == "CONFIRMED"
    assert order["total_quantity_kg"] == 25.0
    assert order["gross_amount_rupees"] == 1000.0
    order_id = order["id"]

    # 3. Verify listing stock deducted to 75kg
    fetch_listing = await client.get(f"/api/v1/listings/{listing_id}")
    assert fetch_listing.status_code == 200
    assert fetch_listing.json()["available_quantity_kg"] == 75.0

    # 4. Update order status to DELIVERED
    status_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "DELIVERED"
    assert status_res.json()["allocations"][0]["is_picked_up"] is True

    # 5. Farmer views dashboard metrics
    dash_res = await client.get(
        "/api/v1/farmers/dashboard",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["active_listings"] >= 1
    assert "earnings" in dash_data
    assert "pending" in dash_data

    # 6. Farmer views earnings
    earn_res = await client.get(
        "/api/v1/farmers/earnings",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert earn_res.status_code == 200
    earnings = earn_res.json()
    assert len(earnings) > 0
    assert earnings[0]["net"] > 0

    # 7. Farmer views pickups
    pickup_res = await client.get(
        "/api/v1/farmers/pickups",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert pickup_res.status_code == 200
    pickups = pickup_res.json()
    assert len(pickups) > 0
