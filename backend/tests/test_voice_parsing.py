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
    """Missing values remain editable instead of blocking the draft."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I want to sell 500 kg at 25 rupees per kg", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    assert "crop" in response.json()["missing_fields"]


@pytest.mark.asyncio
async def test_parse_voice_missing_quantity(client: AsyncClient, farmer_token: str):
    """Test validation when quantity is missing."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I want to sell fresh tomatoes at 25 rupees per kg", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    assert "quantity" in response.json()["missing_fields"]


@pytest.mark.asyncio
async def test_parse_voice_missing_price(client: AsyncClient, farmer_token: str):
    """Test validation when price is missing."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={"transcript": "I have 500 kg tomatoes for sale", "language": "en"},
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    assert "price" in response.json()["missing_fields"]


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


@pytest.mark.asyncio
async def test_parse_voice_conversational_filler(client: AsyncClient, farmer_token: str):
    """Test resilience against conversational filler and Hindi speech syntax."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={
            "transcript": "hello hello mere ko 100 kg tamatar Sonipat Mein Bechne Aaya ₹25 per kilo mein",
            "language": "hi",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Tomato"
    assert data["quantity_kg"] == 100.0
    assert data["unit"] == "kg"
    assert data["price_per_kg"] == 25.0
    assert data["pickup_location"] == "Sonipat"


@pytest.mark.asyncio
async def test_parse_voice_quintal_conversion(client: AsyncClient, farmer_token: str):
    """Test quintal quantity normalization and per-quintal price to per-kg price."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={
            "transcript": "mere paas 5 quintal pyaz hai 2200 rupaye quintal",
            "language": "hi",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Onion"
    assert data["quantity_kg"] == 500.0
    assert data["unit"] == "kg"
    assert data["price_per_kg"] == 22.0


@pytest.mark.asyncio
async def test_parse_voice_compact_hinglish(client: AsyncClient, farmer_token: str):
    """Test compact Hinglish utterance."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={
            "transcript": "200 kilo aloo 18 rs kg",
            "language": "hi",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Potato"
    assert data["quantity_kg"] == 200.0
    assert data["price_per_kg"] == 18.0


@pytest.mark.asyncio
async def test_parse_voice_without_gemini_key(client: AsyncClient, farmer_token: str, monkeypatch):
    """Test that missing Gemini API key never returns HTTP 500 and still parses correctly."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={
            "transcript": "hello hello mere ko 100 kg tamatar Sonipat Mein Bechne Aaya ₹25 per kilo mein",
            "language": "hi",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Tomato"
    assert data["quantity_kg"] == 100.0
    assert data["price_per_kg"] == 25.0
    assert data["ai_used"] is False


@pytest.mark.asyncio
async def test_parse_voice_exact_user_utterance(client: AsyncClient, farmer_token: str):
    """Test the exact utterance from user testing with date and farm pickup semantics."""
    response = await client.post(
        "/api/v1/listings/parse-voice",
        json={
            "transcript": "Mujhe 725 kilo tamatar ₹2 per kilo mein bechne hain aur ise mere khet se 18 September ko uthana",
            "language": "hi",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["crop_name"] == "Tomato"
    assert data["quantity_kg"] == 725.0
    assert data["price_per_kg"] == 2.0
    assert data["pickup_date"] == "2026-09-18"
    assert data["fulfillment"] == "pickup"
    assert data["pickup_location"] == "Green Field Farm"
    assert "Farm pickup" in (data["notes"] or "")


