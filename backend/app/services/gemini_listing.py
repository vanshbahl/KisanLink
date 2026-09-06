import json
import logging
import re
from datetime import date, timedelta
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger("VoiceParse")

CROPS = [
    ("Tomato", "टमाटर", "Vegetables", ("tomato", "tomatoes", "tamatar", "tamaatar", "टमाटर")),
    ("Potato", "आलू", "Staples", ("potato", "potatoes", "aloo", "alu", "aaloo", "आलू")),
    ("Onion", "प्याज़", "Vegetables", ("onion", "onions", "pyaz", "pyaaz", "प्याज", "प्याज़")),
    ("Spinach", "पालक", "Vegetables", ("spinach", "palak", "पालक")),
    ("Wheat", "गेहूं", "Grains", ("wheat", "gehu", "gehun", "गेहूं", "गेहु")),
    ("Carrot", "गाजर", "Vegetables", ("carrot", "carrots", "gajar", "गाजर")),
    ("Capsicum", "शिमला मिर्च", "Vegetables", ("capsicum", "shimla mirch", "शिमला मिर्च")),
    ("Cauliflower", "फूलगोभी", "Vegetables", ("cauliflower", "gobi", "gobhi", "phool gobi", "फूलगोभी")),
    ("Cucumber", "खीरा", "Vegetables", ("cucumber", "kheera", "खीरा")),
    ("Apple", "सेब", "Fruits", ("apple", "apples", "seb", "सेब")),
    ("Rice", "चावल", "Grains", ("rice", "chawal", "चावल")),
    ("Mustard", "सरसों", "Staples", ("mustard", "sarson", "सरसों")),
]

MONTHS = {
    "january": 1, "jan": 1, "जनवरी": 1,
    "february": 2, "feb": 2, "फ़रवरी": 2, "फरवरी": 2,
    "march": 3, "mar": 3, "मार्च": 3,
    "april": 4, "apr": 4, "अप्रैल": 4,
    "may": 5, "मई": 5,
    "june": 6, "jun": 6, "जून": 6,
    "july": 7, "jul": 7, "जुलाई": 7,
    "august": 8, "aug": 8, "अगस्त": 8,
    "september": 9, "sep": 9, "sept": 9, "सितंबर": 9, "सितम्बर": 9,
    "october": 10, "oct": 10, "अक्टूबर": 10,
    "november": 11, "nov": 11, "नवंबर": 11, "नवम्बर": 11,
    "december": 12, "dec": 12, "दिसंबर": 12, "दिसम्बर": 12,
}

WEEKDAYS = {
    "monday": 0, "somvaar": 0, "somwar": 0, "सोमवार": 0,
    "tuesday": 1, "mangalvaar": 1, "mangalwar": 1, "मंगलवार": 1,
    "wednesday": 2, "budhvaar": 2, "budhwar": 2, "बुधवार": 2,
    "thursday": 3, "guruvaar": 3, "guruwar": 3, "veervaar": 3, "veerwar": 3, "गुरुवार": 3,
    "friday": 4, "shukravaar": 4, "shukrawar": 4, "शुक्रवार": 4,
    "saturday": 5, "shanivaar": 5, "shaniwar": 5, "शनिवार": 5,
    "sunday": 6, "ravivaar": 6, "raviwar": 6, "itvaar": 6, "itwar": 6, "रविवार": 6,
}

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
        "pickup_date": {"type": ["string", "null"]},
        "pickup_window": {"type": ["string", "null"]},
        "fulfillment": {"type": ["string", "null"]},
        "notes": {"type": ["string", "null"]},
        "confidence_score": {"type": "number"},
        "missing_fields": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "crop_name",
        "crop_name_hi",
        "category",
        "quantity_kg",
        "unit",
        "price_per_kg",
        "pickup_location",
        "availability_date",
        "harvest_date",
        "pickup_date",
        "notes",
        "confidence_score",
        "missing_fields",
    ],
}


def _parse_natural_date(text: str, base_date: date | None = None) -> str | None:
    """
    Parses dates in English, Hindi, and Hinglish relative to today.
    Supports relative terms ('kal', 'parso', 'tomorrow', 'next Monday'),
    explicit calendar dates ('18 September', 'September 18', '18 तारीख'),
    and upcoming month day matching.
    """
    if base_date is None:
        base_date = date.today()
    t = text.lower()

    # 1. Relative phrases
    if re.search(r"\b(parso|parson|day after tomorrow|परसों)\b", t):
        return (base_date + timedelta(days=2)).isoformat()
    if re.search(r"\b(tomorrow|kal|कल)\b", t):
        return (base_date + timedelta(days=1)).isoformat()
    if re.search(r"\b(today|aaj|आज)\b", t):
        return base_date.isoformat()

    # 2. Weekday names: 'next Monday', 'agle somvaar', 'somwar ko'
    dow_pattern = r"(?:next|agle|अगले)?\s*(" + "|".join(WEEKDAYS.keys()) + r")"
    dow_match = re.search(dow_pattern, t)
    if dow_match:
        target_dow = WEEKDAYS[dow_match.group(1)]
        days_ahead = (target_dow - base_date.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        matched_str = dow_match.group(0)
        if "next" in matched_str or "agle" in matched_str or "अगले" in matched_str:
            if days_ahead < 7:
                days_ahead += 7
        return (base_date + timedelta(days=days_ahead)).isoformat()

    # 3. Explicit dates: '18 September', '18 September ko', 'September 18'
    month_names = "|".join(MONTHS.keys())
    m1 = re.search(r"\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(" + month_names + r")\b", t)
    m2 = re.search(r"\b(" + month_names + r")\s*(\d{1,2})\s*(?:st|nd|rd|th)?\b", t)

    if m1:
        day_num = int(m1.group(1))
        month_num = MONTHS[m1.group(2)]
        target_year = base_date.year
        if month_num < base_date.month or (month_num == base_date.month and day_num < base_date.day):
            target_year += 1
        return date(target_year, month_num, day_num).isoformat()

    if m2:
        day_num = int(m2.group(2))
        month_num = MONTHS[m2.group(1)]
        target_year = base_date.year
        if month_num < base_date.month or (month_num == base_date.month and day_num < base_date.day):
            target_year += 1
        return date(target_year, month_num, day_num).isoformat()

    # 4. Spoken day of current/next month: '18 तारीख', '18 tarikh', '25 tareekh'
    m3 = re.search(r"\b(\d{1,2})\s*(?:tarikh|tareekh|तारीख|ko|को)\b", t)
    if m3:
        day_num = int(m3.group(1))
        if 1 <= day_num <= 31:
            month_num = base_date.month
            target_year = base_date.year
            if day_num < base_date.day:
                month_num += 1
                if month_num > 12:
                    month_num = 1
                    target_year += 1
            try:
                return date(target_year, month_num, day_num).isoformat()
            except ValueError:
                pass

    return None


def _deterministic_extract(transcript: str) -> dict[str, Any]:
    """
    Robust deterministic regex extraction for Indian agricultural voice listings.
    Extracts all fields used by the Farmer Sell wizard: crop, quantity, unit, price,
    pickup date, pickup location/farm, fulfillment method, window, and notes.
    """
    text = transcript.lower()

    # 1. Crop detection with word boundaries
    crop_name = None
    crop_name_hi = None
    category = "Vegetables"
    for en, hi, cat, aliases in CROPS:
        for alias in aliases:
            if re.search(r"\b" + re.escape(alias) + r"\b", text):
                crop_name = en
                crop_name_hi = hi
                category = cat
                break
        if crop_name:
            break

    # 2. Quantity & Unit
    qty_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|किलो|quintals?|क्विंटल|tonnes?|tons?|टन)",
        text,
    )
    quantity: float | None = None
    unit_str = "kg"
    if qty_match:
        val = float(qty_match.group(1))
        matched_unit = qty_match.group(2)
        if "quintal" in matched_unit or "क्विंटल" in matched_unit:
            val *= 100.0
            unit_str = "quintal"
        elif matched_unit.startswith("ton") or "टन" in matched_unit:
            val *= 1000.0
            unit_str = "tonne"
        else:
            unit_str = "kg"
        quantity = val

    # 3. Price & Price Unit
    price: float | None = None
    price_unit = "kg"

    p1 = re.search(
        r"₹\s*(\d+(?:\.\d+)?)(?:\s*(?:per|प्रति|\/)?\s*(kg|kilo|किलो|quintals?|क्विंटल|tonnes?|tons?|टन))?",
        text,
    )
    p2 = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?|rupaye|रुपये|रुपया)(?:\s*(?:per|प्रति|\/)?\s*(kg|kilo|किलो|quintals?|क्विंटल|tonnes?|tons?|टन))?",
        text,
    )
    p3 = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:रुपये|रुपया|rs\.?|rupees?|rupaye)?\s*(?:प्रति|\/)\s*(kg|kilo|किलो|quintals?|क्विंटल|tonnes?|tons?|टन)",
        text,
    )
    p4 = re.search(r"(\d+(?:\.\d+)?)\s*(?:रुपये|rupaye)\s*(किलो|kilo)", text)

    matched_p = p1 or p2 or p3 or p4
    if matched_p:
        price_val = float(matched_p.group(1))
        if matched_p.lastindex and matched_p.lastindex >= 2 and matched_p.group(2):
            price_unit = matched_p.group(2)

        # Convert unit price to per-kg if quoted per quintal/ton
        if "quintal" in price_unit or "क्विंटल" in price_unit:
            price_val /= 100.0
        elif price_unit.startswith("ton") or "टन" in price_unit:
            price_val /= 1000.0
        price = price_val

    # 4. Natural-language date parsing
    parsed_date = _parse_natural_date(transcript)
    if not parsed_date:
        # Default to tomorrow for listings without specified date
        parsed_date = (date.today() + timedelta(days=1)).isoformat()

    # 5. Pickup & Location Semantics
    fulfillment = "pickup"
    location: str | None = None
    pickup_window = "Morning · 7–10 AM"
    notes_parts = []

    # Check farm pickup vs self-delivery vs specific city
    is_farm_pickup = bool(
        re.search(
            r"\b(mere khet|apne khet|khet se|khet pe|my farm|farm se|farm pickup|from farm|khet se uthana)\b",
            text,
        )
    )
    is_self_delivery = bool(
        re.search(
            r"\b(mandi mein deliver|deliver kar dunga|self delivery|apne aap pahuncha)\b",
            text,
        )
    )

    if is_farm_pickup:
        location = "Green Field Farm"
        fulfillment = "pickup"
        notes_parts.append("Farm pickup (buyer to collect from farm)")
    elif is_self_delivery:
        fulfillment = "self_delivery"
        notes_parts.append("Farmer self-delivery to mandi/hub")
    else:
        # Check geographic location name (e.g. Sonipat, Karnal)
        city_stop_words = {
            "mein", "bechne", "kilo", "tamatar", "pyaz", "aloo", "rupaye",
            "rupees", "have", "want", "kisan", "mandi", "aaya", "hai", "hain",
            "bhai", "from", "today", "tomorrow", "kal", "parso", "september",
            "october", "november", "uthana", "kar", "lena", "dunga", "karna"
        }
        loc_match = (
            re.search(r"\b([A-Za-z\u0900-\u097f]{3,})\s+(?:se|में|mein|से)\b", transcript, re.IGNORECASE)
            or re.search(r"\b(?:pickup\s+from|in|at)\s+([A-Za-z\u0900-\u097f]{3,})\b", transcript, re.IGNORECASE)
        )
        if loc_match:
            cand = loc_match.group(1).strip()
            if cand.lower() not in city_stop_words:
                location = cand.capitalize()

    # Time of day preference
    if re.search(r"\b(subah|morning|सवेरे|सुबह)\b", text):
        pickup_window = "Morning · 7–10 AM"
        notes_parts.append("Morning pickup preferred")
    elif re.search(r"\b(dopahar|afternoon|दोपहर)\b", text):
        pickup_window = "Afternoon · 1–4 PM"
        notes_parts.append("Afternoon pickup preferred")
    elif re.search(r"\b(shaam|sham|evening|शाम)\b", text):
        pickup_window = "Evening · 4–7 PM"
        notes_parts.append("Evening pickup preferred")

    # Quality / fresh produce remarks
    if re.search(r"\b(fresh|ताज़ा|ताज़े|grade a|a grade|taaza|taaza)\b", text):
        notes_parts.append("Fresh harvest produce")

    # If buyer pickup mentioned explicitly
    if re.search(r"\b(buyer.*pickup|buyer.*le ja sakta)\b", text):
        if "Farm pickup (buyer to collect from farm)" not in notes_parts:
            notes_parts.append("Buyer pickup from farm")

    notes_str = " · ".join(notes_parts) if notes_parts else None

    # Missing core fields check
    missing = []
    if not crop_name:
        missing.append("crop")
    if quantity is None:
        missing.append("quantity")
    if price is None:
        missing.append("price")

    is_complete = len(missing) == 0
    confidence = 0.95 if is_complete else (0.70 if len(missing) == 1 else 0.40)

    return {
        "crop_name": crop_name,
        "crop_name_hi": crop_name_hi,
        "category": category,
        "quantity_kg": quantity,
        "unit": "kg",
        "price_per_kg": price,
        "pickup_location": location or "Green Field Farm",
        "availability_date": parsed_date,
        "harvest_date": parsed_date,
        "pickup_date": parsed_date,
        "pickup_window": pickup_window,
        "fulfillment": fulfillment,
        "notes": notes_str,
        "confidence_score": confidence,
        "missing_fields": missing,
        "ai_used": False,
        "warning": None,
    }


def _basic_extract(transcript: str) -> dict[str, Any]:
    """Legacy alias preserved for backward compatibility."""
    return _deterministic_extract(transcript)


def extract_listing(transcript: str, language: str = "hi") -> dict[str, Any]:
    """
    Hybrid extraction pipeline:
      1. Run deterministic parser first.
      2. If all core fields (crop, quantity, price) are found, return directly with high confidence.
      3. If fields are missing/ambiguous and GEMINI_API_KEY is configured, call Gemini with structured JSON schema.
      4. If Gemini is unavailable or fails, gracefully return deterministic extraction without crashing.
    """
    logger.info(f'[VoiceParse] transcript="{transcript}"')

    # Step 1: Deterministic extraction
    deterministic = _deterministic_extract(transcript)
    logger.info(f"[VoiceParse] deterministic={deterministic}")

    # If completely parsed by deterministic engine, return immediately
    if not deterministic["missing_fields"]:
        logger.info("[VoiceParse] llmFallback=False")
        logger.info(f"[VoiceParse] normalized={deterministic}")
        logger.info("[VoiceParse] success=True")
        return deterministic

    # Step 2: Incomplete or ambiguous — attempt Gemini structured extraction if key configured
    if not settings.GEMINI_API_KEY:
        logger.info("[VoiceParse] GEMINI_API_KEY not configured — using deterministic parser")
        logger.info("[VoiceParse] llmFallback=False")
        deterministic["warning"] = "Gemini is not configured. Basic extraction was used; please review missing fields."
        logger.info(f"[VoiceParse] normalized={deterministic}")
        logger.info("[VoiceParse] success=True")
        return deterministic

    logger.info("[VoiceParse] llmFallback=True")
    prompt = f"""Convert this farmer speech transcript into structured crop listing fields for KisanLink.
The farmer may speak Hindi, English, or Hinglish.
Today's reference date is {date.today().isoformat()}.

Date instructions:
- Resolve relative dates like 'kal' (tomorrow), 'parso' (day after tomorrow), 'agle somvaar' (next Monday), '18 September' into exact YYYY-MM-DD format based on today's date ({date.today().isoformat()}).
- Set availability_date, harvest_date, and pickup_date to this resolved date.

Pickup & Location Semantics:
- If the farmer says 'mere khet se', 'farm se pickup', 'from my farm', set pickup_location to "Green Field Farm" and fulfillment to "pickup".
- If self delivery or mandi delivery is mentioned, set fulfillment to "self_delivery".
- If a specific city or area is mentioned (e.g. Sonipat), set pickup_location to that city.
- Time of day: 'subah'/'morning' -> pickup_window = "Morning · 7–10 AM", 'dopahar'/'afternoon' -> "Afternoon · 1–4 PM", 'shaam'/'evening' -> "Evening · 4–7 PM".

Notes:
- Keep useful leftover details (e.g. 'Fresh produce', 'Buyer pickup from farm', 'Morning pickup preferred') in notes.

Quantity & Price:
- Convert quintals to kg (1 quintal = 100 kg), tonnes to kg (1 tonne = 1000 kg).
- price_per_kg must be the per-kg asking price (if quoted per quintal, divide by 100).

Language hint: {language}.
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

        # Merge with deterministic values if Gemini missed them
        if not parsed.get("crop_name") and deterministic.get("crop_name"):
            parsed["crop_name"] = deterministic["crop_name"]
            parsed["crop_name_hi"] = deterministic["crop_name_hi"]
            parsed["category"] = deterministic["category"]
        if not parsed.get("quantity_kg") and deterministic.get("quantity_kg"):
            parsed["quantity_kg"] = deterministic["quantity_kg"]
            parsed["unit"] = "kg"
        if not parsed.get("price_per_kg") and deterministic.get("price_per_kg"):
            parsed["price_per_kg"] = deterministic["price_per_kg"]
        if not parsed.get("pickup_location") and deterministic.get("pickup_location"):
            parsed["pickup_location"] = deterministic["pickup_location"]
        if not parsed.get("pickup_date") and deterministic.get("pickup_date"):
            parsed["pickup_date"] = deterministic["pickup_date"]
            parsed["availability_date"] = deterministic["availability_date"]
        if not parsed.get("pickup_window") and deterministic.get("pickup_window"):
            parsed["pickup_window"] = deterministic["pickup_window"]
        if not parsed.get("fulfillment") and deterministic.get("fulfillment"):
            parsed["fulfillment"] = deterministic["fulfillment"]
        if not parsed.get("notes") and deterministic.get("notes"):
            parsed["notes"] = deterministic["notes"]

        missing = []
        if not parsed.get("crop_name"):
            missing.append("crop")
        if not parsed.get("quantity_kg"):
            missing.append("quantity")
        if not parsed.get("price_per_kg"):
            missing.append("price")
        parsed["missing_fields"] = missing

        parsed.update({"ai_used": True, "warning": None})
        logger.info(f"[VoiceParse] normalized={parsed}")
        logger.info("[VoiceParse] success=True")
        return parsed
    except Exception as exc:
        logger.error(f"[VoiceParse] ERROR {type(exc).__name__}: {exc}")
        deterministic["warning"] = "AI service could not be reached. Basic extraction was used; review fields before submitting."
        logger.info(f"[VoiceParse] normalized={deterministic}")
        logger.info("[VoiceParse] success=True")
        return deterministic
