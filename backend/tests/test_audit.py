import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_operator_audit_logs_flow(client: AsyncClient, farmer_token: str, buyer_token: str):
    # Retrieve farmer user_id
    farmer_profile_res = await client.get(
        "/api/v1/farmers/profile",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    farmer_user_id = farmer_profile_res.json()["user_id"]
    target_entity_id = str(uuid.uuid4())

    # 1. Non-operator user (Buyer or Farmer) CANNOT create operator audit log -> 403 Forbidden
    unauth_res = await client.post(
        "/api/v1/audit/operator-logs",
        json={
            "farmer_user_id": farmer_user_id,
            "action_type": "ASSISTED_LISTING_CREATE",
            "entity_id": target_entity_id,
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert unauth_res.status_code == 403

    buyer_unauth_res = await client.post(
        "/api/v1/audit/operator-logs",
        json={
            "farmer_user_id": farmer_user_id,
            "action_type": "ASSISTED_LISTING_CREATE",
            "entity_id": target_entity_id,
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert buyer_unauth_res.status_code == 403
