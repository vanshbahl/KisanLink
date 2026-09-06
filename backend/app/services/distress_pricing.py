"""
Deterministic and Explainable Dynamic Distress Sale Pricing Service for KisanLink.
Calculates transparent rescue discounts for agricultural listings at risk of wastage.
"""
from typing import Tuple


def calculate_distress_price(
    normal_price_per_kg: float,
    shelf_life_days: int = 7,
    is_harvest_imminent_or_past: bool = False,
    urgency_level: str = "HIGH",
) -> Tuple[float, float]:
    """
    Calculates dynamic rescue sale price per kg and discount percentage.

    Formula:
      1. Base Discount based on urgency level:
         - HIGH: 25% base discount
         - MEDIUM: 18% base discount
         - LOW: 12% base discount
      2. Modifiers:
         - Short shelf-life (<= 7 days): +5% discount modifier
         - Imminent / past harvest: +5% discount modifier
      3. Cap total discount ratio at 40% maximum to protect minimum farmer cost recovery.
      4. Price Floor: ensure rescue_price >= max(1.0, normal_price * 0.50).
      5. Strict Guarantee: rescue_price < normal_price_per_kg and rescue_price > 0.

    Returns:
      Tuple[rescue_price_per_kg: float, discount_percentage: float]
    """
    if normal_price_per_kg <= 0:
        return 0.0, 0.0

    level_clean = (urgency_level or "HIGH").upper()
    if level_clean == "HIGH":
        base_discount = 0.25
    elif level_clean == "MEDIUM":
        base_discount = 0.18
    else:
        base_discount = 0.12

    modifier = 0.0
    if shelf_life_days <= 7:
        modifier += 0.05
    if is_harvest_imminent_or_past:
        modifier += 0.05

    total_discount_ratio = min(0.40, base_discount + modifier)

    raw_rescue_price = normal_price_per_kg * (1.0 - total_discount_ratio)

    # Minimum price floor protection
    price_floor = max(1.0, round(normal_price_per_kg * 0.50, 2))
    rescue_price = max(price_floor, round(raw_rescue_price, 2))

    # Ensure rescue price is strictly below normal price
    if rescue_price >= normal_price_per_kg:
        rescue_price = round(normal_price_per_kg * 0.90, 2)

    discount_percentage = round(((normal_price_per_kg - rescue_price) / normal_price_per_kg) * 100.0, 2)

    return rescue_price, discount_percentage
