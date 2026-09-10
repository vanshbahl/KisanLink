import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_request_otp(client: AsyncClient):
    response = await client.post("/api/v1/auth/request-otp", json={"phone": "+919876543210"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "OTP sent" in data["message"]


@pytest.mark.asyncio
async def test_verify_otp_success(client: AsyncClient, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "DEMO_AUTH_ENABLED", True)
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
async def test_verify_otp_provisions_new_user_without_missing_greenlet(
    client: AsyncClient, monkeypatch
):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "DEMO_AUTH_ENABLED", True)
    phone = f"+918{uuid4().int % 10_000_000_000:010d}"
    response = await client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": phone, "otp": "123456", "preferred_role": "FARMER"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["phone"] == phone
    assert response.json()["data"]["user"]["is_profile_complete"] is False


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


def test_production_cannot_use_demo_otp(monkeypatch):
    from app.core.config import settings
    from app.core.security import verify_otp

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DEMO_AUTH_ENABLED", True)
    assert verify_otp("+919876543210", "123456") is False
