from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple


class PricingService:

    @staticmethod
    def compute_forecast_series(historical_prices: List[float]) -> Tuple[List[float], List[float]]:
        """
        Computes 7-day smoothed historical series and 3-day moving-average + linear trend forecast.
        """
        if not historical_prices:
            historical_prices = [27.0, 28.0, 28.0, 30.0, 29.0, 31.0, 32.0]

        # Ensure 7 historical entries
        if len(historical_prices) < 7:
            last = historical_prices[-1] if historical_prices else 30.0
            historical_prices = [last] * (7 - len(historical_prices)) + historical_prices

        hist = [round(float(p), 1) for p in historical_prices[-7:]]

        # Calculate slope over last 3 points
        slope = (hist[-1] - hist[-3]) / 2.0 if len(hist) >= 3 else 0.5
        slope = max(-1.5, min(2.0, slope))

        # Project 3 days
        day1 = round(hist[-1] + (slope * 0.8), 1)
        day2 = round(day1 + (slope * 0.5), 1)
        day3 = round(day2 + (slope * 0.2), 1)

        forecast = [max(1.0, day1), max(1.0, day2), max(1.0, day3)]
        return hist, forecast

    @staticmethod
    def generate_price_options(
        crop_name: str,
        mandi_benchmark: float,
        grade: str = "Grade A"
    ) -> List[Dict[str, Any]]:
        """
        Generates 3 dynamic price anchors (fast, balanced, high) with estimated sale probability %.
        """
        mandi = max(1.0, round(float(mandi_benchmark), 1))
        mid = round(mandi * 1.25, 1)  # ~25% direct sale premium over Mandi
        low = round(mandi * 1.15, 1)  # ~15% premium (fast sale)
        high = round(mandi * 1.35, 1) # ~35% premium (higher earnings)

        grade_bonus = 4 if grade == "Grade A+" else 0

        def calc_chance(price: float) -> int:
            diff = price - mid
            chance = 84 - int(diff * 6) + grade_bonus
            return max(30, min(97, chance))

        return [
            {
                "id": "fast",
                "price": low,
                "label_key": "fastSale",
                "hint_key": "lowerEarnings",
                "sale_chance_pct": calc_chance(low),
            },
            {
                "id": "balanced",
                "price": mid,
                "label_key": "bestBalance",
                "hint_key": "bestBalanceHint",
                "sale_chance_pct": calc_chance(mid),
            },
            {
                "id": "high",
                "price": high,
                "label_key": "higherEarnings",
                "hint_key": "lowerSaleProbability",
                "sale_chance_pct": calc_chance(high),
            },
        ]


pricing_service = PricingService()
