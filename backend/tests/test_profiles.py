import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_farmer_profile(client: AsyncClient, farmer_token: str):
    response = await client.get(
        "/api/v1/farmers/profile",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Ramesh Sharma"
    assert data["district"] == "Sonipat"
    assert data["latitude"] == pytest.approx(28.9912, 0.001)
    assert data["longitude"] == pytest.approx(77.0125, 0.001)


@pytest.mark.asyncio
async def test_farmer_profile_role_guard(client: AsyncClient, buyer_token: str):
    response = await client.get(
        "/api/v1/farmers/profile",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_buyer_profile(client: AsyncClient, buyer_token: str):
    response = await client.get(
        "/api/v1/buyers/profile",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["business_name"] == "The Imperial Hotel"
    assert data["delivery_address"] == "Janpath, Connaught Place, New Delhi"
    assert data["delivery_latitude"] == pytest.approx(28.6315, 0.001)


@pytest.mark.asyncio
async def test_buyer_profile_role_guard(client: AsyncClient, farmer_token: str):
    response = await client.get(
        "/api/v1/buyers/profile",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 403
