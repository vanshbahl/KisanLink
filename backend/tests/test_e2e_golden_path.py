import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.core.security import create_access_token
from app.models import User, CropListing


@pytest.mark.asyncio
async def test_kisanlink_sih_golden_path(client: AsyncClient, db_session):
    # Reset available stock for corridor crop listings to initial quantity
    stmt_reset = update(CropListing).values(available_quantity_kg=CropListing.quantity_kg)
    await db_session.execute(stmt_reset)
    await db_session.commit()

    # 1. Load users & tokens
    stmt_buyer = select(User).where(User.phone == "+919899001122")
    res_buyer = await db_session.execute(stmt_buyer)
    buyer_user = res_buyer.scalar_one()
    buyer_token = create_access_token(subject=str(buyer_user.id), role=buyer_user.role.value)

    stmt_farmer1 = select(User).where(User.phone == "+919876543210")
    res_farmer1 = await db_session.execute(stmt_farmer1)
    farmer1_user = res_farmer1.scalar_one()
    farmer1_token = create_access_token(subject=str(farmer1_user.id), role=farmer1_user.role.value)

    # 2. Buyer creates 5,000 kg Tomato requirement @ max ₹28/kg
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 5000.0,
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

    # 3. Buyer generates matches & formulates Dynamic Cluster
    match_res = await client.post(
        f"/api/v1/requirements/{req_id}/generate-matches",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert match_res.status_code == 200
    cluster_data = match_res.json()
    cluster_id = cluster_data["cluster_id"]
    assert cluster_data["total_quantity_kg"] == 5000.0
    assert cluster_data["fulfillment_percentage"] == 100.0
    assert len(cluster_data["farmers"]) >= 4

    # 4. Buyer accepts plan & creates Order
    order_res = await client.post(
        f"/api/v1/orders/from-cluster/{cluster_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]
    assert order_data["total_quantity_kg"] == 5000.0
    assert order_data["status"] == "CONFIRMED"

    # 5. Buyer locks escrow
    escrow_res = await client.post(
        f"/api/v1/orders/{order_id}/lock-escrow",
        json={"payment_method": "SIMULATED_UPI", "amount_rupees": order_data["gross_amount_rupees"]},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert escrow_res.status_code == 200
    assert escrow_res.json()["entry_type"] == "ESCROW_LOCK"

    # 6. Farmer Ramesh logs in and views order allocation
    farmer_orders = await client.get(
        "/api/v1/orders/my-orders",
        headers={"Authorization": f"Bearer {farmer1_token}"},
    )
    assert farmer_orders.status_code == 200
    f_orders = farmer_orders.json()
    assert len(f_orders) > 0
    ramesh_alloc = f_orders[0]["allocations"][0]
    assert ramesh_alloc["allocated_kg"] == 1200.0
    assert ramesh_alloc["farmer_payout_amount_rupees"] == 30000.0
    assert f_orders[0]["status"] == "ESCROW_LOCKED"
