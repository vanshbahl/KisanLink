import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_requirement(client: AsyncClient, buyer_token: str):
    payload = {
        "crop_name": "Tomato",
        "target_quantity_kg": 5000.0,
        "max_price_per_kg": 28.0,
        "acceptable_grades": ["GRADE_A"],
        "delivery_deadline": "2026-09-10T18:00:00Z",
        "delivery_latitude": 28.6315,
        "delivery_longitude": 77.2167,
    }
    response = await client.post(
        "/api/v1/requirements",
        json=payload,
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["crop_name"] == "Tomato"
    assert data["target_quantity_kg"] == 5000.0
    req_id = data["id"]

    get_res = await client.get(f"/api/v1/requirements/{req_id}")
    assert get_res.status_code == 200
    assert get_res.json()["max_price_per_kg"] == 28.0


@pytest.mark.asyncio
async def test_requirement_ownership_protection(
    client: AsyncClient, buyer_token: str, farmer_token: str
):
    create_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Potato",
            "target_quantity_kg": 2000.0,
            "max_price_per_kg": 20.0,
            "acceptable_grades": ["GRADE_A"],
            "delivery_deadline": "2026-09-15T18:00:00Z",
            "delivery_latitude": 28.6315,
            "delivery_longitude": 77.2167,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert create_res.status_code == 201
    req_id = create_res.json()["id"]

    # Farmer CANNOT update buyer requirement
    unauth_update = await client.put(
        f"/api/v1/requirements/{req_id}",
        json={"max_price_per_kg": 15.0},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert unauth_update.status_code == 403
