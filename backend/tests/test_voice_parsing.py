import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_parse_voice_english(client: AsyncClient, farmer_token: str):
    """Test parsing a clean English voice transcript."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I have 500 kg tomatoes at 25 rupees per kg", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Tomato"
    assert data["quantity_kg"] == 500.0
    assert data["price_per_kg"] == 25.0
    assert "harvest_date" in data


@pytest.mark.asyncio
async def test_parse_voice_hindi(client: AsyncClient, farmer_token: str):
    """Test parsing a clean Hindi voice transcript."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "मुझे 500 किलो टमाटर 25 रुपये किलो में बेचना है", "language": "hi"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] in ["Tomato", "टमाटर"]
    assert data["quantity_kg"] == 500.0
    assert data["price_per_kg"] == 25.0


@pytest.mark.asyncio
async def test_parse_voice_hinglish(client: AsyncClient, farmer_token: str):
    """Test parsing a mixed Hinglish voice transcript."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "300 kg aloo price 20 rs per kg", "language": "hi"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Potato"
    assert data["quantity_kg"] == 300.0
    assert data["price_per_kg"] == 20.0


@pytest.mark.asyncio
async def test_parse_voice_missing_crop(client: AsyncClient, farmer_token: str):
    """Test validation when no crop name can be identified."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I want to sell 500 kg at 25 rupees per kg", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 422
    assert "Could not identify crop name" in response.json()["detail"]


@pytest.mark.asyncio
async def test_parse_voice_missing_quantity(client: AsyncClient, farmer_token: str):
    """Test validation when quantity is missing."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I want to sell fresh tomatoes at 25 rupees per kg", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 422
    assert "Could not identify quantity" in response.json()["detail"]


@pytest.mark.asyncio
async def test_parse_voice_missing_price(client: AsyncClient, farmer_token: str):
    """Test validation when price is missing."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I have 500 kg tomatoes for sale", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 422
    assert "Could not identify price" in response.json()["detail"]


@pytest.mark.asyncio
async def test_parse_voice_empty_input(client: AsyncClient, farmer_token: str):
    """Test validation for empty or whitespace transcript."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "    ", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 400
    assert "Empty or invalid speech transcript" in response.json()["detail"]
