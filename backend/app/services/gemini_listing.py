import json
import re
from datetime import date, timedelta
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings


CROPS = [
    ("Tomato", "टमाटर", "Vegetables", ("tomato", "tomatoes", "tamatar", "टमाटर")),
    ("Potato", "आलू", "Staples", ("potato", "potatoes", "aloo", "alu", "आलू")),
    ("Onion", "प्याज़", "Vegetables", ("onion", "onions", "pyaz", "प्याज", "प्याज़")),
    ("Spinach", "पालक", "Vegetables", ("spinach", "palak", "पालक")),
    ("Wheat", "गेहूं", "Grains", ("wheat", "gehu", "गेहूं")),
    ("Carrot", "गाजर", "Vegetables", ("carrot", "carrots", "gajar", "गाजर")),
    ("Capsicum", "शिमला मिर्च", "Vegetables", ("capsicum", "shimla mirch", "शिमला मिर्च")),
    ("Cauliflower", "फूलगोभी", "Vegetables", ("cauliflower", "gobi", "फूलगोभी")),
    ("Cucumber", "खीरा", "Vegetables", ("cucumber", "kheera", "खीरा")),
    ("Apple", "सेब", "Fruits", ("apple", "apples", "seb", "सेब")),
    ("Rice", "चावल", "Grains", ("rice", "chawal", "चावल")),
    ("Mustard", "सरसों", "Staples", ("mustard", "sarson", "सरसों")),
]

VOICE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "crop_name": {"type": ["string", "null"]},
        "crop_name_hi": {"type": ["string", "null"]},
        "category": {"type": ["string", "null"]},
        "quantity_kg": {"type": ["number", "null"]},
        "unit": {"type": "string"},
        "price_per_kg": {"type": ["number", "null"]},
        "pickup_location": {"type": ["string", "null"]},
        "availability_date": {"type": ["string", "null"]},
        "harvest_date": {"type": ["string", "null"]},
        "notes": {"type": ["string", "null"]},
        "confidence_score": {"type": "number"},
        "missing_fields": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["crop_name", "crop_name_hi", "category", "quantity_kg", "unit", "price_per_kg", "pickup_location", "availability_date", "harvest_date", "notes", "confidence_score", "missing_fields"],
}


def _basic_extract(transcript: str) -> dict[str, Any]:
    """Small resilient fallback for missing keys/outages; the review form remains authoritative."""
    text = transcript.lower()
    crop = next(((en, hi, category) for en, hi, category, aliases in CROPS if any(alias in text for alias in aliases)), (None, None, "Vegetables"))
    qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|kilos?|किलो|quintal|क्विंटल|tonne|tons?|टन)", text)
    quantity = float(qty_match.group(1)) if qty_match else None
    unit = qty_match.group(2) if qty_match else "kg"
    if quantity and ("quintal" in unit or "क्विंटल" in unit):
        quantity *= 100
    elif quantity and (unit.startswith("ton") or "टन" in unit):
        quantity *= 1000
    price_match = re.search(r"(?:₹\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees?|रुपये|रुपया)(?:\s*(?:per|प्रति)?\s*(?:kg|kilo|किलो))?)", text)
    price = float(price_match.group(1) or price_match.group(2)) if price_match else None
    tomorrow = "tomorrow" in text or "कल" in text
    available = (date.today() + timedelta(days=1 if tomorrow else 0)).isoformat()
    missing = [name for name, value in (("crop", crop[0]), ("quantity", quantity), ("price", price)) if value is None]
    location_match = (
        re.search(r"pickup\s+from\s+([\w ]+?)(?:\s+tomorrow|[,.]|$)", transcript, re.IGNORECASE)
        or re.search(r"([\w\u0900-\u097f ]+?)\s+से\s+पिकअप(?:\s+कल|[।,.]|$)", transcript, re.IGNORECASE)
    )
    return {
        "crop_name": crop[0], "crop_name_hi": crop[1], "category": crop[2],
        "quantity_kg": quantity, "unit": "kg", "price_per_kg": price,
        "pickup_location": location_match.group(1).strip() if location_match else None,
        "availability_date": available, "harvest_date": available, "notes": None,
        "confidence_score": 0.72 if not missing else 0.45, "missing_fields": missing,
        "ai_used": False,
        "warning": "Gemini is unavailable. Basic extraction was used; review every field or type the details manually.",
    }


def extract_listing(transcript: str, language: str) -> dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        return _basic_extract(transcript)

    prompt = f"""Convert this noisy farmer speech transcript into listing fields.
The farmer may speak Hindi, English, or Hinglish. Correct obvious speech-to-text errors.
Today is {date.today().isoformat()}. Resolve relative dates such as today/tomorrow to YYYY-MM-DD.
Convert quintals and tonnes to quantity_kg. price_per_kg must be the per-kg asking price.
Do not invent missing values. Use null and add crop, quantity, price, availability, or pickup_location to missing_fields when absent.
Keep pickup location and useful leftover detail in notes. Language hint: {language}.
Transcript: {transcript}"""
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=VOICE_SCHEMA,
                temperature=0.1,
            ),
        )
        parsed = json.loads(response.text or "{}")
        parsed.update({"ai_used": True, "warning": None})
        return parsed
    except Exception:
        fallback = _basic_extract(transcript)
        fallback["warning"] = "Gemini could not be reached. Basic extraction was used; review every field or type manually."
        return fallback
