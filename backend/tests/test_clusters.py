import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_matches_api(client: AsyncClient, buyer_token: str):
    # 1. Create requirement
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

    # 2. Generate matches
    match_res = await client.post(
        f"/api/v1/requirements/{req_id}/generate-matches",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert match_res.status_code == 200
    data = match_res.json()
    assert "cluster_id" in data
    assert data["total_quantity_kg"] > 0
    assert len(data["farmers"]) > 0


@pytest.mark.asyncio
async def test_get_cluster_api(client: AsyncClient, buyer_token: str):
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 3000.0,
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

    get_res = await client.get(
        f"/api/v1/clusters/{cluster_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["cluster_id"] == cluster_id
