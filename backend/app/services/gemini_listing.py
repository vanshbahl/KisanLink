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


# ---------------------------------------------------------------------------
# Farmer onboarding: one spoken answer -> one profile field.
#
# Every completed voice answer in onboarding comes through here, so the profile
# stores what the farmer meant ("Daulatabad") rather than what they said
# ("मेरा खेत पड़ता है जी दौलताबाद में"). The client supplies the field being asked,
# the language, the state/district already known, and the canonical candidates
# where a closed list exists (states, a state's districts, the crop catalogue);
# Gemini returns one structured answer. Same client, key, model and logging as
# the listing parser above; the client keeps its own deterministic parse for
# when this is unreachable.
# ---------------------------------------------------------------------------
ONBOARDING_FIELDS = ("name", "state", "district", "village", "locality", "farm_size", "crops", "confirm")

ONBOARDING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "value": {"type": ["string", "null"]},
        "value_hi": {"type": ["string", "null"]},
        "farm_size_acres": {"type": ["number", "null"]},
        "crops": {"type": "array", "items": {"type": "string"}},
        "confirmed": {"type": ["boolean", "null"]},
        "unknown": {"type": "boolean"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    },
    "required": ["value", "value_hi", "farm_size_acres", "crops", "confirmed", "unknown", "confidence"],
}

_ONBOARDING_PROMPTS = {
    "name": (
        "The farmer was asked for their full name. Extract only the name.\n"
        "- `value`: the name in Latin script, title case. Transliterate Hindi names "
        "(for example 'रमेश यादव' becomes 'Ramesh Yadav').\n"
        "- `value_hi`: the same name in Devanagari script.\n"
        "- Drop filler such as 'mera naam', 'मेरा नाम ... है', 'my name is', 'ji', 'sahab'."
    ),
    "state": (
        "The farmer was asked which Indian state or union territory they farm in.\n"
        "- `value`: the canonical English name from the candidate list when the answer refers to one of them, "
        "in any spelling, script or nickname ('Dilli', 'NCT Delhi', 'Delhi NCR' are all 'Delhi'; 'UP' and "
        "'उत्तर प्रदेश' are 'Uttar Pradesh'; 'हरयाणा' is 'Haryana').\n"
        "- If it matches no candidate, return the cleaned place name in Latin script and confidence 'low'.\n"
        "- `value_hi`: the Hindi name of that state."
    ),
    "district": (
        "The farmer was asked which district they farm in.\n"
        "- `value`: the canonical English district name from the candidate list when the answer refers to one "
        "of them, including old names and nicknames ('Gurgaon' is 'Gurugram', 'Allahabad' is 'Prayagraj', "
        "'west delhi' is 'West Delhi').\n"
        "- If it matches no candidate, return the cleaned district name in Latin script and confidence 'low'.\n"
        "- `value_hi`: the Hindi name of that district."
    ),
    "village": (
        "The farmer was asked which village their farm is in.\n"
        "- `value`: only the village name, transliterated to Latin script, title case "
        "('मेरा खेत पड़ता है जी दौलताबाद में' becomes 'Daulatabad'; 'दौलताबाद है जी' becomes 'Daulatabad').\n"
        "- Drop 'gaon', 'village', 'mein', 'padta hai', 'ji' and every other filler.\n"
        "- `value_hi`: the village name in Devanagari."
    ),
    "locality": (
        "The farmer was asked which area, mohalla or locality of the village their farm is in.\n"
        "- `value`: only the locality name, transliterated to Latin script, title case.\n"
        "- Drop 'ilaka', 'mohalla', 'area', 'mein', 'ji' and every other filler.\n"
        "- `value_hi`: the locality name in Devanagari."
    ),
    "farm_size": (
        "The farmer was asked how much land they farm. Return `farm_size_acres` as a number of acres.\n"
        "- Convert units: 1 bigha = 0.25 acre, 1 hectare = 2.47 acres, 1 kanal = 0.125 acre.\n"
        "- Understand Hindi number words: dedh/डेढ़ = 1.5, dhai/ढाई = 2.5, saadhe teen/साढ़े तीन = 3.5, "
        "chaar/चार = 4, paanch/पांच = 5, das/दस = 10.\n"
        "- 'karib', 'lagbhag', 'about' mean approximately; keep the number as spoken.\n"
        "- If a range is spoken ('do teen acre'), return the lower number.\n"
        "- Leave `value` and `value_hi` null."
    ),
    "crops": (
        "The farmer was asked which crops they sell. Return `crops` as a list of English crop names, "
        "singular, title case, using the candidate spelling whenever the crop is in the candidate list.\n"
        "- Translate Hindi names: tamatar/टमाटर = Tomato, pyaz/प्याज़ = Onion, palak/पालक = Spinach, "
        "aloo/आलू = Potato, gehu/गेहूं = Wheat, gajar/गाजर = Carrot, gobhi = Cauliflower, "
        "kheera = Cucumber, chawal/dhan = Rice, sarson = Mustard, ganna = Sugarcane, makka = Maize.\n"
        "- Ignore filler such as 'bechta hoon', 'ugata hoon', 'aur'.\n"
        "- Leave `value` and `value_hi` null."
    ),
    "confirm": (
        "The farmer was asked a yes/no question about the expected value given below.\n"
        "- `confirmed`: true if they agree ('haan', 'ji', 'sahi hai', 'yes', 'correct', or they repeat the same "
        "value), false if they disagree ('nahi', 'no', 'galat', or they name a different value), null if unclear.\n"
        "- If they name a different value instead, also return it as `value` (canonical candidate when possible).\n"
        "- Leave `crops` empty and `farm_size_acres` null."
    ),
}


def _empty_onboarding(warning: str | None) -> dict[str, Any]:
    return {
        "value": None,
        "value_hi": None,
        "farm_size_acres": None,
        "crops": [],
        "confirmed": None,
        "unknown": False,
        "confidence": "low",
        "ai_used": False,
        "warning": warning,
    }


def extract_onboarding_field(
    transcript: str,
    field: str,
    language: str = "hi",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Structured Gemini extraction for a single onboarding answer. Never raises: a missing
    key or an upstream failure returns an empty payload with `ai_used=False`, and the
    client keeps whatever it parsed on its own.
    """
    if field not in ONBOARDING_FIELDS:
        raise ValueError(f"Unknown onboarding field: {field}")

    context = context or {}
    logger.info(f'[OnboardingParse] field={field} transcript="{transcript}" context={context}')

    if not settings.GEMINI_API_KEY:
        logger.info("[OnboardingParse] GEMINI_API_KEY not configured")
        return _empty_onboarding("Gemini is not configured. The spoken answer was kept as heard.")

    known = []
    if context.get("state"):
        known.append(f"state = {context['state']}")
    if context.get("district"):
        known.append(f"district = {context['district']}")
    candidates = [str(item) for item in context.get("candidates") or [] if str(item).strip()]
    expected = context.get("expected")

    prompt_parts = [
        "You are helping a farmer sign up for KisanLink. They answered one question out loud; the speech "
        "is conversational Hindi, Hinglish or Indian English with filler words ('ji', 'padta hai', 'shayad', "
        "'hai ji', 'mera', 'wahi'). Extract the MEANING for the field asked, never the transcript wording.",
        "If the farmer says they do not know or wants to skip ('nahi pata', 'pata nahi', 'नहीं पता', "
        "'मालूम नहीं', 'not sure', 'don't know', 'skip', 'chhod do'), set unknown=true and value=null.",
        "`confidence` is 'high' when the answer is clear, 'medium' when hedged ('shayad', 'lagta hai'), "
        "'low' when you are guessing.",
        _ONBOARDING_PROMPTS[field],
    ]
    if known:
        prompt_parts.append("Already known: " + "; ".join(known) + ".")
    if candidates:
        prompt_parts.append("Candidate values: " + ", ".join(candidates) + ".")
    if expected:
        prompt_parts.append(f"Expected value being confirmed: {expected}.")
    prompt_parts.append(f"Language hint: {language}.")
    prompt_parts.append(f"Transcript: {transcript}")
    prompt = "\n".join(prompt_parts)

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=ONBOARDING_SCHEMA,
                temperature=0.1,
            ),
        )
        parsed = json.loads(response.text or "{}")
        confidence = parsed.get("confidence")
        result = {
            "value": (parsed.get("value") or "").strip() or None,
            "value_hi": (parsed.get("value_hi") or "").strip() or None,
            "farm_size_acres": parsed.get("farm_size_acres"),
            "crops": [str(item).strip() for item in parsed.get("crops") or [] if str(item).strip()],
            "confirmed": parsed.get("confirmed") if isinstance(parsed.get("confirmed"), bool) else None,
            "unknown": bool(parsed.get("unknown")),
            "confidence": confidence if confidence in ("high", "medium", "low") else "medium",
            "ai_used": True,
            "warning": None,
        }
        logger.info(f"[OnboardingParse] normalized={result}")
        return result
    except Exception as exc:
        logger.error(f"[OnboardingParse] ERROR {type(exc).__name__}: {exc}")
        return _empty_onboarding("AI service could not be reached. The spoken answer was kept as heard.")
