import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_request_otp(client: AsyncClient):
    response = await client.post("/api/v1/auth/request-otp", json={"phone": "+919876543210"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "OTP sent" in data["message"]


@pytest.mark.asyncio
async def test_verify_otp_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "+919876543210", "otp": "123456", "preferred_role": "FARMER"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["phone"] == "+919876543210"
    assert data["data"]["user"]["role"] == "FARMER"


@pytest.mark.asyncio
async def test_verify_otp_invalid(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "+919876543210", "otp": "000000", "preferred_role": "FARMER"},
    )
    assert response.status_code == 400
    assert "Invalid or expired OTP" in response.json()["detail"]


@pytest.mark.asyncio
async def test_protected_route_missing_token(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer invalid_token_123"}
    )
    assert response.status_code == 401
