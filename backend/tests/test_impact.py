import pytest
from httpx import ASGITransport, AsyncClient
from uuid import UUID
from sqlalchemy import delete
from app.main import app
from app.models import CropListing
from app.services.impact_service import ImpactService


@pytest.mark.asyncio
async def test_impact_summary_unauthenticated():
    """Verify impact summary requires authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/intelligence/impact-summary")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_impact_summary_authenticated_structure(client: AsyncClient, farmer_token: str):
    """Verify response structure and non-negative bounds."""
    res = await client.get(
        "/api/v1/intelligence/impact-summary",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["farmer_net_gain_percentage"] >= 0.0
    assert data["buyer_savings_percentage"] >= 0.0
    assert data["total_distance_saved_km"] >= 0.0
    assert data["wastage_prevented_kg"] >= 0.0


@pytest.mark.asyncio
async def test_impact_rescue_listings_contribution(
    client: AsyncClient,
    farmer_token: str,
    db_session,
):
    """Verify urgent rescue listings directly contribute to wastage_prevented_kg metric."""
    create_res = await client.post(
        "/api/v1/listings",
        json={
            "crop_name": "Cabbage",
            "quantity_kg": 750.0,
            "expected_price_per_kg": 15.0,
            "harvest_date": "2026-09-06",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    try:
        # Tag as urgent rescue
        tag_res = await client.post(
            "/api/v1/rescue/tag-urgent",
            headers={"Authorization": f"Bearer {farmer_token}"},
            json={"listing_id": listing_id, "urgency_level": "HIGH"},
        )
        assert tag_res.status_code == 200

        # Retrieve impact summary
        impact_res = await client.get(
            "/api/v1/intelligence/impact-summary",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert impact_res.status_code == 200
        impact_data = impact_res.json()
        assert impact_data["wastage_prevented_kg"] >= 750.0

    finally:
        await db_session.execute(delete(CropListing).where(CropListing.id == UUID(listing_id)))
        await db_session.commit()


@pytest.mark.asyncio
async def test_impact_service_direct_call(db_session):
    """Verify direct service invocation handles db session gracefully."""
    impact = await ImpactService.calculate_live_impact(db_session)
    assert impact.farmer_net_gain_percentage >= 0.0
    assert impact.buyer_savings_percentage >= 0.0
    assert impact.total_distance_saved_km >= 0.0
    assert impact.wastage_prevented_kg >= 0.0
