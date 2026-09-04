import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import BuyerRequirement, CropListing, FarmerProfile
from app.services.matching_service import MatchingEngine


@pytest.mark.asyncio
async def test_matching_engine_candidate_search(client: AsyncClient, buyer_token: str, db_session):
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

    stmt_req = select(BuyerRequirement).where(BuyerRequirement.id == req_id)
    res_req = await db_session.execute(stmt_req)
    req = res_req.scalar_one()

    candidates = await MatchingEngine.find_candidate_listings(db_session, req)
    assert len(candidates) > 0
    for listing, farmer, c_name, item_lat, item_lon, dist_km in candidates:
        assert listing.status == "ACTIVE"
        assert float(listing.expected_price_per_kg) <= float(req.max_price_per_kg)
        assert dist_km >= 0.0


@pytest.mark.asyncio
async def test_matching_score_determinism(client: AsyncClient, buyer_token: str, db_session):
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
    req_id = req_res.json()["id"]

    stmt_req = select(BuyerRequirement).where(BuyerRequirement.id == req_id)
    res_req = await db_session.execute(stmt_req)
    req = res_req.scalar_one()

    candidates = await MatchingEngine.find_candidate_listings(db_session, req)
    assert len(candidates) > 0
    listing, farmer, c_name, lat, lon, dist = candidates[0]

    score1 = MatchingEngine.calculate_match_score(listing, farmer, dist, req, 24.0, 28.0)
    score2 = MatchingEngine.calculate_match_score(listing, farmer, dist, req, 24.0, 28.0)
    assert score1 == score2
    assert 0.0 <= score1 <= 1.0
