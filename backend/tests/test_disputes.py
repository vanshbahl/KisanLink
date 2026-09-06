import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_disputes_full_flow(client: AsyncClient, farmer_token: str, buyer_token: str, second_farmer_token: str):
    # 1. Buyer creates requirement & places order
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 400.0,
            "max_price_per_kg": 25.0,
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

    # 2. Unauthorized user cannot raise dispute on this order
    unauth_disp = await client.post(
        "/api/v1/disputes",
        json={
            "order_id": order_id,
            "dispute_reason": "Damaged transit crates",
            "withheld_amount_rupees": 200.0,
        },
        headers={"Authorization": f"Bearer {second_farmer_token}"},
    )
    assert unauth_disp.status_code == 403

    # 3. Buyer raises dispute on order
    disp_res = await client.post(
        "/api/v1/disputes",
        json={
            "order_id": order_id,
            "dispute_reason": "Quantity mismatch on delivery",
            "withheld_amount_rupees": 500.0,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert disp_res.status_code == 201
    disp_data = disp_res.json()
    dispute_id = disp_data["id"]
    assert disp_data["is_resolved"] is False
    assert disp_data["withheld_amount_rupees"] == 500.0

    # 4. Resolve dispute with REFUND settlement
    resolve_res = await client.put(
        f"/api/v1/disputes/{dispute_id}/resolve",
        json={
            "resolution_notes": "Partial refund approved for missing crates.",
            "settlement_action": "REFUND",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert resolve_res.status_code == 200
    res_data = resolve_res.json()
    assert res_data["is_resolved"] is True
    assert res_data["resolution_notes"] == "Partial refund approved for missing crates."

    # 5. Check ledger for REFUND entry reconciliation
    ledger_res = await client.get(
        f"/api/v1/payments/ledger/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert ledger_res.status_code == 200
    ledger_entries = ledger_res.json()
    refund_entries = [e for e in ledger_entries if e["entry_type"] == "REFUND"]
    assert len(refund_entries) == 1
    assert refund_entries[0]["amount_rupees"] == 500.0
