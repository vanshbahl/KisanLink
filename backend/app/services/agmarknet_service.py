"""
Live mandi benchmark from AGMARKNET via data.gov.in.

Resource: "Current Daily Price of Various Commodities from Various Markets (Mandi)".
Prices arrive in ₹/quintal; everything leaving this module is ₹/kg. The API key never
leaves the server — the frontend only ever sees the normalized benchmark below.

Selection ladder (most specific wins, newest date first, median across ties):
    market  ->  district  ->  state  ->  national  ->  seed (only if live data is unavailable)

Every benchmark carries `source`, `match_level`, `arrival_date`, `market/district/state`,
`min/max`, `stale` and `record_count`, so a stale or fallback figure is always distinguishable.
"""
from __future__ import annotations

import asyncio
import logging
import re
import statistics
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import httpx

from app.core.config import settings
from app.services.pricing_engine import SEED_MANDI_PER_KG

logger = logging.getLogger(__name__)

QUINTAL_TO_KG = 100.0
MIN_VALID_PER_KG = 1.0
MAX_VALID_PER_KG = 5000.0
STALE_AFTER_DAYS = 7

# KisanLink crop key -> (AGMARKNET commodity, default variety hint)
COMMODITY_MAP: Dict[str, Tuple[str, Optional[str]]] = {
    "tomato": ("Tomato", None),
    "potato": ("Potato", None),
    "onion": ("Onion", None),
    "spinach": ("Spinach", None),
    "wheat": ("Wheat", None),
    "carrot": ("Carrot", None),
    "capsicum": ("Capsicum", None),
    "cauliflower": ("Cauliflower", None),
    "cucumber": ("Cucumbar(Kheera)", None),
    "apple": ("Apple", None),
    "rice": ("Rice", None),
    "mustard": ("Mustard", None),
    "sugarcane": ("Sugarcane", None),
    "maize": ("Maize", None),
    "bajra": ("Bajra(Pearl Millet/Cumbu)", None),
    "chilli": ("Green Chilli", None),
    "brinjal": ("Brinjal", None),
    "okra": ("Bhindi(Ladies Finger)", None),
    "cabbage": ("Cabbage", None),
    "peas": ("Green Peas", None),
    "bottle gourd": ("Bottle gourd", None),
    "pumpkin": ("Pumpkin", None),
    "garlic": ("Garlic", None),
    "ginger": ("Ginger(Green)", None),
    "coriander": ("Coriander(Leaves)", None),
    "mango": ("Mango", None),
    "banana": ("Banana", None),
    "guava": ("Guava", None),
    "gram": ("Bengal Gram(Gram)(Whole)", None),
    "lentils": ("Lentil (Masur)(Whole)", None),
}

# Anything a farmer, a seed row or a listing title may call the crop -> canonical key.
ALIASES: Dict[str, str] = {
    "tomatoes": "tomato", "tamatar": "tomato", "टमाटर": "tomato",
    "potatoes": "potato", "aloo": "potato", "alu": "potato", "आलू": "potato",
    "onions": "onion", "pyaz": "onion", "pyaaz": "onion", "प्याज़": "onion", "प्याज": "onion",
    "palak": "spinach", "पालक": "spinach",
    "gehu": "wheat", "gehun": "wheat", "गेहूं": "wheat", "गेहूँ": "wheat",
    "carrots": "carrot", "gajar": "carrot", "गाजर": "carrot",
    "shimla mirch": "capsicum", "शिमला मिर्च": "capsicum",
    "gobi": "cauliflower", "gobhi": "cauliflower", "phool gobi": "cauliflower", "फूलगोभी": "cauliflower",
    "cucumbers": "cucumber", "kheera": "cucumber", "khira": "cucumber", "खीरा": "cucumber", "cucumbar": "cucumber",
    "apples": "apple", "seb": "apple", "सेब": "apple",
    "chawal": "rice", "paddy": "rice", "dhan": "rice", "चावल": "rice",
    "sarson": "mustard", "sarso": "mustard", "सरसों": "mustard",
    "ganna": "sugarcane", "गन्ना": "sugarcane",
    "corn": "maize", "makka": "maize", "मक्का": "maize",
    "millet": "bajra", "बाजरा": "bajra",
    "chili": "chilli", "chillies": "chilli", "green chilli": "chilli", "mirch": "chilli", "हरी मिर्च": "chilli",
    "eggplant": "brinjal", "baingan": "brinjal", "बैंगन": "brinjal",
    "ladyfinger": "okra", "lady finger": "okra", "bhindi": "okra", "भिंडी": "okra",
    "patta gobi": "cabbage", "पत्ता गोभी": "cabbage",
    "pea": "peas", "matar": "peas", "मटर": "peas",
    "lauki": "bottle gourd", "ghiya": "bottle gourd", "लौकी": "bottle gourd",
    "kaddu": "pumpkin", "कद्दू": "pumpkin",
    "lahsun": "garlic", "लहसुन": "garlic",
    "adrak": "ginger", "अदरक": "ginger",
    "dhaniya": "coriander", "dhania": "coriander", "धनिया": "coriander",
    "mangoes": "mango", "aam": "mango", "आम": "mango",
    "bananas": "banana", "kela": "banana", "केला": "banana",
    "amrood": "guava", "अमरूद": "guava",
    "chana": "gram", "chickpea": "gram", "चना": "gram",
    "lentil": "lentils", "dal": "lentils", "daal": "lentils", "दाल": "lentils",
}

# Marketing adjectives that KisanLink listing titles carry; some are also variety hints.
DESCRIPTORS = {
    "fresh", "new", "baby", "sweet", "green", "snow", "crisp", "yellow", "red", "organic",
    "sharbati", "basmati", "himachali", "desi", "hybrid", "grade", "a", "a+", "premium",
}
VARIETY_HINTS = {"sharbati": "Sharbati", "basmati": "Basmati", "red": "Red", "himachali": "Shimla"}


def normalize_commodity(name: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    'Fresh Tomatoes' -> ('tomato', 'Tomato', None); 'Sharbati Wheat' -> ('wheat', 'Wheat', 'Sharbati').
    Returns (crop_key, agmarknet_commodity, variety_hint); crop_key is None when unknown.
    """
    raw = (name or "").strip().lower()
    if not raw:
        return None, None, None
    raw = re.sub(r"[\(\)\-_/,]", " ", raw)
    words = [w for w in raw.split() if w]
    hint: Optional[str] = None
    for w in words:
        if w in VARIETY_HINTS:
            hint = VARIETY_HINTS[w]
    for candidate in (" ".join(words), *[" ".join(words[i:]) for i in range(1, len(words))]):
        key = ALIASES.get(candidate, candidate)
        if key in COMMODITY_MAP:
            return key, COMMODITY_MAP[key][0], hint or COMMODITY_MAP[key][1]
    stripped = [w for w in words if w not in DESCRIPTORS]
    for w in stripped + words:
        key = ALIASES.get(w, w)
        if key in COMMODITY_MAP:
            return key, COMMODITY_MAP[key][0], hint or COMMODITY_MAP[key][1]
        singular = w[:-1] if w.endswith("s") else w
        key = ALIASES.get(singular, singular)
        if key in COMMODITY_MAP:
            return key, COMMODITY_MAP[key][0], hint or COMMODITY_MAP[key][1]
    return None, None, hint


def parse_arrival_date(value: Any) -> Optional[date]:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def quintal_to_kg(value: Any) -> Optional[float]:
    try:
        number = float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):  # NaN / inf
        return None
    per_kg = round(number / QUINTAL_TO_KG, 2)
    return per_kg


@dataclass
class MandiRecord:
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    grade: str
    arrival_date: Optional[date]
    min_per_kg: Optional[float]
    max_per_kg: Optional[float]
    modal_per_kg: float


def normalize_record(raw: Dict[str, Any]) -> Optional[MandiRecord]:
    """Convert a data.gov.in row to ₹/kg; None when the government price is unusable."""
    modal = quintal_to_kg(raw.get("modal_price"))
    if modal is None or not (MIN_VALID_PER_KG <= modal <= MAX_VALID_PER_KG):
        return None
    low = quintal_to_kg(raw.get("min_price"))
    high = quintal_to_kg(raw.get("max_price"))
    if low is not None and low <= 0:
        low = None
    if high is not None and high <= 0:
        high = None
    if low is not None and high is not None and low > high:
        low, high = None, None
    if low is not None and modal < low:
        return None
    if high is not None and modal > high:
        return None
    return MandiRecord(
        state=str(raw.get("state") or "").strip(),
        district=str(raw.get("district") or "").strip(),
        market=str(raw.get("market") or "").strip(),
        commodity=str(raw.get("commodity") or "").strip(),
        variety=str(raw.get("variety") or "").strip(),
        grade=str(raw.get("grade") or "").strip(),
        arrival_date=parse_arrival_date(raw.get("arrival_date")),
        min_per_kg=low,
        max_per_kg=high,
        modal_per_kg=modal,
    )


@dataclass
class MandiBenchmark:
    crop_key: str
    commodity: str
    variety: Optional[str]
    market: Optional[str]
    district: Optional[str]
    state: Optional[str]
    modal_per_kg: float
    min_per_kg: Optional[float]
    max_per_kg: Optional[float]
    arrival_date: Optional[str]
    source: str            # "agmarknet" | "seed"
    match_level: str       # "market" | "district" | "state" | "national" | "seed"
    record_count: int
    stale: bool
    fetched_at: str

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _same(a: Optional[str], b: Optional[str]) -> bool:
    return bool(a) and bool(b) and a.strip().lower() == b.strip().lower()


def _contains(haystack: Optional[str], needle: Optional[str]) -> bool:
    return bool(haystack) and bool(needle) and needle.strip().lower() in haystack.strip().lower()


def _newest(records: Sequence[MandiRecord]) -> List[MandiRecord]:
    dated = [r for r in records if r.arrival_date]
    if not dated:
        return list(records)
    top = max(r.arrival_date for r in dated)  # type: ignore[type-var]
    return [r for r in dated if r.arrival_date == top]


def _summarize(records: Sequence[MandiRecord], crop_key: str, level: str, today: date) -> MandiBenchmark:
    latest = _newest(records)
    modal = round(statistics.median(r.modal_per_kg for r in latest), 2)
    mins = [r.min_per_kg for r in latest if r.min_per_kg is not None]
    maxs = [r.max_per_kg for r in latest if r.max_per_kg is not None]
    # The record whose modal is closest to the median names the market shown in the UI.
    anchor = min(latest, key=lambda r: abs(r.modal_per_kg - modal))
    arrival = anchor.arrival_date
    states = {r.state for r in latest}
    districts = {r.district for r in latest}
    return MandiBenchmark(
        crop_key=crop_key,
        commodity=anchor.commodity,
        variety=anchor.variety or None,
        market=anchor.market if len(latest) == 1 or level == "market" else None,
        district=anchor.district if len(districts) == 1 else None,
        state=anchor.state if len(states) == 1 else None,
        modal_per_kg=modal,
        min_per_kg=min(mins) if mins else None,
        max_per_kg=max(maxs) if maxs else None,
        arrival_date=arrival.isoformat() if arrival else None,
        source="agmarknet",
        match_level=level,
        record_count=len(latest),
        stale=bool(arrival and (today - arrival).days > STALE_AFTER_DAYS),
        fetched_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
    )


def select_benchmark(
    records: Iterable[MandiRecord],
    crop_key: str,
    *,
    state: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    variety_hint: Optional[str] = None,
    today: Optional[date] = None,
) -> Optional[MandiBenchmark]:
    """Pure selection over already-fetched records. None when nothing valid remains."""
    today = today or date.today()
    pool = [r for r in records if r is not None]
    if not pool:
        return None

    # Prefer the requested variety when the market actually quotes it; never require it.
    if variety_hint:
        matched = [r for r in pool if _contains(r.variety, variety_hint)]
        if matched:
            pool = matched

    tiers: List[Tuple[str, List[MandiRecord]]] = []
    if market:
        tiers.append(("market", [r for r in pool if _same(r.market, market) or _contains(r.market, market)]))
    if district:
        tiers.append(("district", [r for r in pool if _same(r.district, district) or _contains(r.district, district)]))
    if state:
        tiers.append(("state", [r for r in pool if _same(r.state, state)]))
    tiers.append(("national", pool))

    for level, subset in tiers:
        if subset:
            return _summarize(subset, crop_key, level, today)
    return None


def seed_benchmark(crop_key: str) -> Optional[MandiBenchmark]:
    value = SEED_MANDI_PER_KG.get(crop_key)
    if value is None:
        return None
    return MandiBenchmark(
        crop_key=crop_key,
        commodity=COMMODITY_MAP.get(crop_key, (crop_key.title(), None))[0],
        variety=None, market=None, district=None, state=None,
        modal_per_kg=value, min_per_kg=None, max_per_kg=None, arrival_date=None,
        source="seed", match_level="seed", record_count=0, stale=True,
        fetched_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
    )


class AgmarknetClient:
    """Thin cached client. One instance per process (see `agmarknet`)."""

    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[float, List[MandiRecord]]] = {}
        self._last_good: Dict[str, List[MandiRecord]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    @property
    def configured(self) -> bool:
        return bool(settings.DATA_GOV_API_KEY)

    def _lock(self, key: str) -> asyncio.Lock:
        lock = self._locks.get(key)
        if lock is None:
            lock = self._locks[key] = asyncio.Lock()
        return lock

    async def fetch_records(self, commodity: str, state: Optional[str] = None, limit: int = 600) -> Tuple[List[MandiRecord], bool]:
        """
        Records for a commodity (optionally one state). Returns (records, served_stale).
        Network or API failures fall back to the last good payload for the same key.
        """
        if not self.configured:
            return [], False
        key = f"{commodity}|{state or '*'}"
        now = time.monotonic()
        cached = self._cache.get(key)
        if cached and now - cached[0] < settings.AGMARKNET_CACHE_TTL_SECONDS:
            return cached[1], False

        async with self._lock(key):
            cached = self._cache.get(key)
            if cached and time.monotonic() - cached[0] < settings.AGMARKNET_CACHE_TTL_SECONDS:
                return cached[1], False
            params: Dict[str, Any] = {
                "api-key": settings.DATA_GOV_API_KEY,
                "format": "json",
                "limit": limit,
                "filters[commodity]": commodity,
            }
            if state:
                params["filters[state]"] = state
            url = f"{settings.DATA_GOV_BASE_URL}/{settings.DATA_GOV_MANDI_RESOURCE_ID}"
            try:
                # data.gov.in stalls requests carrying httpx's default User-Agent; any explicit UA is served.
                headers = {"User-Agent": "KisanLink/1.0 (+mandi-benchmark)", "Accept": "application/json"}
                async with httpx.AsyncClient(timeout=settings.AGMARKNET_TIMEOUT_SECONDS, headers=headers) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    payload = response.json()
                rows = payload.get("records") or []
                records = [r for r in (normalize_record(row) for row in rows) if r]
                self._cache[key] = (time.monotonic(), records)
                if records:
                    self._last_good[key] = records
                return records, False
            except (httpx.HTTPError, ValueError) as exc:
                logger.warning("agmarknet fetch failed for %s: %s", key, exc)
                previous = self._last_good.get(key)
                if previous:
                    return previous, True
                # Cache the miss briefly so a dead upstream does not stall every page load.
                self._cache[key] = (time.monotonic() - settings.AGMARKNET_CACHE_TTL_SECONDS + 120, [])
                return [], False

    async def benchmark_for(
        self,
        crop_name: str,
        *,
        state: Optional[str] = None,
        district: Optional[str] = None,
        market: Optional[str] = None,
    ) -> Optional[MandiBenchmark]:
        """Live benchmark for a KisanLink crop name, or the seed row when live data is unavailable."""
        crop_key, commodity, hint = normalize_commodity(crop_name)
        if not crop_key or not commodity:
            return None
        state = state or settings.AGMARKNET_DEFAULT_STATE
        district = district or settings.AGMARKNET_DEFAULT_DISTRICT

        served_stale = False
        records, served_stale = await self.fetch_records(commodity, state)
        result = select_benchmark(records, crop_key, state=state, district=district, market=market, variety_hint=hint)
        if result is None:
            national, stale_nat = await self.fetch_records(commodity, None, limit=1000)
            served_stale = served_stale or stale_nat
            result = select_benchmark(national, crop_key, state=state, district=district, market=market, variety_hint=hint)
        if result is None:
            return seed_benchmark(crop_key)
        if served_stale:
            result.stale = True
        return result

    def clear(self) -> None:
        self._cache.clear()
        self._last_good.clear()


agmarknet = AgmarknetClient()
