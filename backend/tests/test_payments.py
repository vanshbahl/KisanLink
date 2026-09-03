import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_lock_escrow_and_view_ledger(client: AsyncClient, buyer_token: str):
    # 1. Buyer creates requirement
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 1500.0,
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

    match_res = await client.post(
        f"/api/v1/requirements/{req_id}/generate-matches",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    cluster_id = match_res.json()["cluster_id"]

    order_res = await client.post(
        f"/api/v1/orders/from-cluster/{cluster_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    order_data = order_res.json()
    order_id = order_data["id"]

    # Lock Escrow
    escrow_res = await client.post(
        f"/api/v1/orders/{order_id}/lock-escrow",
        json={"payment_method": "SIMULATED_UPI", "amount_rupees": order_data["gross_amount_rupees"]},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert escrow_res.status_code == 200
    assert escrow_res.json()["entry_type"] == "ESCROW_LOCK"

    # View Ledger
    ledger_res = await client.get(
        f"/api/v1/payments/ledger/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert ledger_res.status_code == 200
    assert len(ledger_res.json()) >= 1
    assert ledger_res.json()[0]["entry_type"] == "ESCROW_LOCK"
