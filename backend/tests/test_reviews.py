import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_reviews_full_flow(client: AsyncClient, farmer_token: str, buyer_token: str, second_farmer_token: str):
    # 1. Buyer creates requirement
    req_res = await client.post(
        "/api/v1/requirements",
        json={
            "crop_name": "Tomato",
            "target_quantity_kg": 500.0,
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

    # Identity is resolved server-side from the order, not taken from the client.
    farmer_profile_res = await client.get(
        "/api/v1/farmers/profile",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    expected_target_user_id = farmer_profile_res.json()["user_id"]

    # 2. Buyer submits a valid review. This order has exactly one farmer, so
    # target_farmer_id may be omitted.
    review_res = await client.post(
        "/api/v1/reviews",
        json={
            "order_id": order_id,
            "rating_score": 5,
            "feedback_text": "Excellent quality tomatoes and prompt pickup!",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert review_res.status_code == 201
    rev_data = review_res.json()
    assert rev_data["rating_score"] == 5
    assert rev_data["feedback_text"] == "Excellent quality tomatoes and prompt pickup!"
    # The backend resolved the target to the real farmer user id, not a client-supplied value.
    assert rev_data["target_id"] == expected_target_user_id

    # 3. Duplicate review attempt fails
    dup_res = await client.post(
        "/api/v1/reviews",
        json={
            "order_id": order_id,
            "rating_score": 4,
            "feedback_text": "Another review",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert dup_res.status_code == 400

    # 4. Invalid rating score (<1 or >5) fails Pydantic validation
    invalid_res = await client.post(
        "/api/v1/reviews",
        json={
            "order_id": order_id,
            "rating_score": 6,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert invalid_res.status_code == 422

    # 5. Unauthorized user (unrelated farmer) cannot review
    unauth_res = await client.post(
        "/api/v1/reviews",
        json={
            "order_id": order_id,
            "rating_score": 3,
        },
        headers={"Authorization": f"Bearer {second_farmer_token}"},
    )
    assert unauth_res.status_code == 403

    # 6. A bogus target_farmer_id that isn't allocated on this order is rejected.
    import uuid
    bogus_res = await client.post(
        "/api/v1/reviews",
        json={
            "order_id": order_id,
            "target_farmer_id": str(uuid.uuid4()),
            "rating_score": 3,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert bogus_res.status_code == 400

    # 7. Fetch user reviews
    get_revs = await client.get(
        f"/api/v1/reviews/user/{expected_target_user_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert get_revs.status_code == 200
    reviews_list = get_revs.json()
    assert len(reviews_list) >= 1
    assert reviews_list[0]["target_id"] == expected_target_user_id
