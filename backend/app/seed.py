from copy import deepcopy
from datetime import date, datetime, timedelta


def _day(offset: int) -> str:
    return (date.today() + timedelta(days=offset)).isoformat()


SEED_STATE = {
    "listings": [
        {"id": "listing_001", "crop": "Fresh Tomatoes", "cropHi": "ताज़े टमाटर", "category": "Vegetables", "imageSrc": "/assets/produce/tomato.webp", "visual": "tomato", "quantityKg": 720, "remainingKg": 420, "allocatedKg": 300, "unit": "kg", "grade": "Grade A+", "harvestDate": _day(-1), "availableFrom": _day(0), "farmingMethod": "Natural farming", "notes": "Firm, hand-sorted tomatoes.", "pricePerKg": 31, "mandiPricePerKg": 24, "farm": "Green Field Farm", "pickupDate": _day(1), "pickupWindow": "Morning · 7–10 AM", "fulfillment": "pickup", "status": "active", "assisted": False, "views": 126, "inquiries": 9, "createdAt": _day(-5)},
        {"id": "listing_011", "crop": "Baby Spinach", "cropHi": "बेबी पालक", "category": "Vegetables", "imageSrc": "/assets/produce/spinach.webp", "visual": "leafy", "quantityKg": 140, "remainingKg": 140, "allocatedKg": 0, "unit": "kg", "grade": "Grade A+", "harvestDate": _day(0), "availableFrom": _day(0), "farmingMethod": "Organic", "notes": "Washed and bundled.", "pricePerKg": 42, "mandiPricePerKg": 35, "farm": "Green Field Farm", "pickupDate": _day(2), "pickupWindow": "Morning · 7–10 AM", "fulfillment": "pickup", "status": "active", "assisted": True, "views": 83, "inquiries": 5, "createdAt": _day(-2)},
        {"id": "listing_draft_1", "crop": "Sharbati Wheat", "cropHi": "शरबती गेहूं", "category": "Grains", "imageSrc": "/assets/produce/wheat.webp", "visual": "grain", "quantityKg": 900, "remainingKg": 900, "allocatedKg": 0, "unit": "kg", "grade": "Grade A", "harvestDate": _day(-8), "availableFrom": _day(3), "farmingMethod": "Conventional", "notes": "", "pricePerKg": 36, "mandiPricePerKg": 31, "farm": "Green Field Farm", "pickupDate": _day(4), "pickupWindow": "Afternoon · 1–4 PM", "fulfillment": "pickup", "status": "draft", "assisted": False, "views": 0, "inquiries": 0, "createdAt": _day(-1)},
    ],
    "orders": [
        {"id": "KL-ORD-1042", "buyerName": "FreshKart Purchase Team", "buyerType": "Bulk Buyer", "crop": "Fresh Tomatoes", "cropHi": "ताज़े टमाटर", "listingId": "listing_001", "quantityKg": 300, "ratePerKg": 31, "total": 9300, "farmerPayout": 8370, "platformFee": 279, "logisticsFee": 651, "orderedAt": _day(0), "status": "new", "paymentStatus": "processing"},
        {"id": "KL-ORD-1037", "buyerName": "Ananya Sharma", "buyerType": "Consumer", "crop": "Baby Spinach", "cropHi": "बेबी पालक", "listingId": "listing_011", "quantityKg": 8, "ratePerKg": 42, "total": 336, "farmerPayout": 302, "platformFee": 10, "logisticsFee": 24, "orderedAt": _day(-1), "status": "accepted", "paymentStatus": "paid", "pickupId": "PK-2048"},
    ],
    "pickups": [{"id": "PK-2048", "orderId": "KL-ORD-1037", "crop": "Baby Spinach", "cropHi": "बेबी पालक", "quantityKg": 8, "date": _day(1), "timeWindow": "Morning · 7–10 AM", "driver": "Suresh Kumar", "vehicle": "HR 10 AK 4821 · Mini truck", "farmAddress": "Green Field Farm, Sonipat, Haryana", "status": "driver_assigned"}],
    "earnings": [
        {"id": "TX-914", "orderId": "KL-ORD-1037", "crop": "Baby Spinach", "cropHi": "बेबी पालक", "gross": 336, "deductions": 34, "net": 302, "mandiEquivalent": 280, "date": _day(-1), "status": "paid"},
        {"id": "TX-921", "orderId": "KL-ORD-1042", "crop": "Fresh Tomatoes", "cropHi": "ताज़े टमाटर", "gross": 9300, "deductions": 930, "net": 8370, "mandiEquivalent": 7200, "date": _day(0), "status": "pending"},
    ],
    "notifications": [
        {"id": "note_1", "role": "farmer", "title": "New bulk order received", "titleHi": "नया थोक ऑर्डर मिला", "body": "FreshKart requested 300 kg tomatoes.", "bodyHi": "FreshKart ने 300 किलो टमाटर मांगे हैं।", "timestamp": datetime.now().isoformat(), "read": False, "href": "/farmer/orders/KL-ORD-1042"},
        {"id": "note_2", "role": "farmer", "title": "Driver assigned", "titleHi": "ड्राइवर तय हुआ", "body": "Suresh will arrive tomorrow morning.", "bodyHi": "सुरेश कल सुबह पहुंचेंगे।", "timestamp": datetime.now().isoformat(), "read": False, "href": "/farmer/pickups"},
    ],
    "profile": {"name": "Ramesh Kumar", "phone": "9876543210", "language": "en", "farmName": "Green Field Farm", "village": "Murthal", "district": "Sonipat", "state": "Haryana", "farmSizeAcres": 7.5, "mainCrops": "Tomato, spinach, wheat", "pickupLocation": "Gate 1, Green Field Farm, Murthal", "payoutMethod": "UPI", "payoutMasked": "ramesh•••@upi", "farmerVerified": True, "farmVerified": True, "identityStatus": "Verified"},
}


def fresh_seed() -> dict:
    return deepcopy(SEED_STATE)
