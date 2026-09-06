import pytest
from uuid import UUID
from httpx import AsyncClient
from sqlalchemy import delete
from app.models import CropListing
from app.services.distress_pricing import calculate_distress_price


@pytest.mark.asyncio
async def test_calculate_distress_price_formula():
    """Unit test for distress sale pricing formula."""
    normal_price = 25.0
    rescue_price, discount_pct = calculate_distress_price(
        normal_price_per_kg=normal_price,
        shelf_life_days=7,
        is_harvest_imminent_or_past=True,
        urgency_level="HIGH",
    )
    assert rescue_price > 0
    assert rescue_price < normal_price
    assert discount_pct > 0
    assert discount_pct <= 40.0
    assert round(((normal_price - rescue_price) / normal_price) * 100, 2) == discount_pct


@pytest.mark.asyncio
async def test_tag_urgent_rescue_authorized(
    client: AsyncClient,
    farmer_token: str,
    db_session,
):
    """Verify authorized farmer can tag their listing as urgent rescue."""
    create_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Tomato",
            "quantity_kg": 200.0,
            "expected_price_per_kg": 30.0,
            "harvest_date": "2026-09-06",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    try:
        # Tag as urgent rescue
        response = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {farmer_token}"},
            json={"listing_id": listing_id, "urgency_level": "HIGH"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["listing_id"] == listing_id
        assert data["is_urgent_rescue"] is True
        assert data["status"] == "RESCUE_ACTIVE"
        assert data["normal_price_per_kg"] == 30.0
        assert data["rescue_price_per_kg"] < 30.0
        assert data["rescue_price_per_kg"] > 0
        assert data["discount_percentage"] > 0

        # Retrieve listing to verify state
        get_res = await client.get(f"/api/v1/listings/{listing_id}")
        assert get_res.status_code == 200
        listing_data = get_res.json()
        assert listing_data["is_urgent_rescue"] is True
        assert listing_data["status"] == "RESCUE_ACTIVE"
        assert listing_data["rescue_discount_price_per_kg"] == data["rescue_price_per_kg"]
    finally:
        await db_session.execute(delete(CropListing).where(CropListing.id == UUID(listing_id)))
        await db_session.commit()


@pytest.mark.asyncio
async def test_tag_urgent_rescue_unauthorized_farmer(
    client: AsyncClient,
    farmer_token: str,
    buyer_token: str,
    second_farmer_token: str,
    db_session,
):
    """Verify unauthorized user or non-owner cannot tag another farmer's listing."""
    create_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Spinach",
            "quantity_kg": 150.0,
            "expected_price_per_kg": 25.0,
            "harvest_date": "2026-09-06",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    try:
        # Attempt to tag using buyer auth token (not owner)
        buyer_res = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"listing_id": listing_id},
        )
        assert buyer_res.status_code == 403

        # Attempt to tag using second farmer auth token (not owner)
        second_farmer_res = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {second_farmer_token}"},
            json={"listing_id": listing_id},
        )
        assert second_farmer_res.status_code == 403
    finally:
        await db_session.execute(delete(CropListing).where(CropListing.id == UUID(listing_id)))
        await db_session.commit()


@pytest.mark.asyncio
async def test_tag_urgent_rescue_idempotency(
    client: AsyncClient,
    farmer_token: str,
    db_session,
):
    """Verify repeated tagging is idempotent and does not corrupt listing state."""
    create_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Potato",
            "quantity_kg": 400.0,
            "expected_price_per_kg": 40.0,
            "harvest_date": "2026-09-06",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    try:
        # First call
        res1 = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {farmer_token}"},
            json={"listing_id": listing_id, "urgency_level": "HIGH"},
        )
        assert res1.status_code == 200
        data1 = res1.json()

        # Second call (repeat)
        res2 = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {farmer_token}"},
            json={"listing_id": listing_id, "urgency_level": "HIGH"},
        )
        assert res2.status_code == 200
        data2 = res2.json()

        assert data1["rescue_price_per_kg"] == data2["rescue_price_per_kg"]
        assert data1["discount_percentage"] == data2["discount_percentage"]
        assert data2["status"] == "RESCUE_ACTIVE"
        assert data2["is_urgent_rescue"] is True
    finally:
        await db_session.execute(delete(CropListing).where(CropListing.id == UUID(listing_id)))
        await db_session.commit()

