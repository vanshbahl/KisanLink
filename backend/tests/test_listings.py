import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_listing(client: AsyncClient, farmer_token: str):
    payload = {
        "crop_name": "Cauliflower",
        "variety": "Hybrid",
        "quantity_kg": 500.0,
        "expected_price_per_kg": 18.5,
        "quality_grade": "GRADE_A",
        "is_pre_harvest": False,
        "harvest_date": "2026-09-02",
        "latitude": 28.9912,
        "longitude": 77.0125,
    }
    response = await client.post(
        "/api/v1/listings",
        json=payload,
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["crop_name"] == "Cauliflower"
    assert data["quantity_kg"] == 500.0
    listing_id = data["id"]

    # Retrieve listing by ID
    get_res = await client.get(f"/api/v1/listings/{listing_id}")
    assert get_res.status_code == 200
    assert get_res.json()["variety"] == "Hybrid"


@pytest.mark.asyncio
async def test_spatial_listing_search_with_postgis(client: AsyncClient):
    # Query listings within 50km of Imperial Hotel, New Delhi (lat=28.6315, lon=77.2167)
    response = await client.get(
        "/api/v1/listings?lat=28.6315&lon=77.2167&radius_km=50&crop=Tomato"
    )
    assert response.status_code == 200
    listings = response.json()
    assert len(listings) >= 2
    # Verify distance calculations returned by PostGIS ST_Distance
    for item in listings:
        assert item["distance_km"] is not None
        assert item["distance_km"] <= 50.0
        assert "farmer_name" in item


@pytest.mark.asyncio
async def test_listing_ownership_protection(
    client: AsyncClient, farmer_token: str, second_farmer_token: str, buyer_token: str
):
    # Create listing with first farmer
    create_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Onion",
            "quantity_kg": 1000.0,
            "expected_price_per_kg": 20.0,
            "harvest_date": "2026-09-10",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    # First farmer can update own listing
    update_res = await client.put(
        f"/api/v1/listings/{listing_id}",
        json={"expected_price_per_kg": 22.0},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["expected_price_per_kg"] == 22.0

    # Second farmer CANNOT update first farmer's listing
    unauth_update = await client.put(
        f"/api/v1/listings/{listing_id}",
        json={"expected_price_per_kg": 10.0},
        headers={"Authorization": f"Bearer {second_farmer_token}"},
    )
    assert unauth_update.status_code == 403

    # Buyer CANNOT update farmer's listing
    buyer_update = await client.put(
        f"/api/v1/listings/{listing_id}",
        json={"expected_price_per_kg": 10.0},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert buyer_update.status_code == 403
