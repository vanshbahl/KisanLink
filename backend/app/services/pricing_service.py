from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.services.pricing_engine import derive_price_ladder, farmer_price_options, indicative_series


class PricingService:

    @staticmethod
    def compute_forecast_series(historical_prices: List[float]) -> Tuple[List[float], List[float]]:
        """
        Computes 7-day smoothed historical series and 3-day moving-average + linear trend forecast.
        """
        if not historical_prices:
            historical_prices = indicative_series(24.0)["historical"]

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
        Three price anchors (fast / balanced / high) with a sale-probability estimate.
        Delegates to the centralized pricing engine so the advisor, the Market Maker and the
        consumer surfaces never disagree about what a kilo is worth.
        """
        ladder = derive_price_ladder(max(1.0, float(mandi_benchmark)), crop_name)
        return farmer_price_options(ladder, grade)


pricing_service = PricingService()
