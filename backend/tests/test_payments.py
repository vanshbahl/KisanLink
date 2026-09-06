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


@pytest.mark.asyncio
async def test_multi_split_escrow_settlement_and_idempotency(client: AsyncClient, buyer_token: str):
    # 1. Buyer creates requirement & places order
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 600.0,
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
    order_data = order_res.json()
    order_id = order_data["id"]
    gross_amount = order_data["gross_amount_rupees"]

    # 2. Lock Escrow
    await client.post(
        f"/api/v1/orders/{order_id}/lock-escrow",
        json={"payment_method": "SIMULATED_UPI", "amount_rupees": gross_amount},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )

    # 3. Transition order status to DELIVERED
    status_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "DELIVERED"

    # 4. View Ledger for multi-split settlement entries
    ledger_res = await client.get(
        f"/api/v1/payments/ledger/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert ledger_res.status_code == 200
    entries = ledger_res.json()
    entry_types = [e["entry_type"] for e in entries]

    assert "ESCROW_LOCK" in entry_types
    assert "FARMER_PAYOUT" in entry_types
    assert "TRANSPORTER_FREIGHT" in entry_types
    assert "PLATFORM_FEE" in entry_types

    # Verify Total Reconciliation: sum of split payouts == gross escrow amount
    split_total = sum(e["amount_rupees"] for e in entries if e["entry_type"] != "ESCROW_LOCK")
    assert round(split_total, 2) == round(gross_amount, 2)

    # 5. Idempotency test: Repeat DELIVERED status transition call
    repeat_res = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert repeat_res.status_code == 200

    ledger_repeat_res = await client.get(
        f"/api/v1/payments/ledger/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    repeat_entries = ledger_repeat_res.json()
    # Confirm duplicate settlement entries were NOT created
    assert len(repeat_entries) == len(entries)

