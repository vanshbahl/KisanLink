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
        {"id": "note_3", "role": "consumer", "title": "Fresh produce nearby", "titleHi": "पास में ताज़ी फसल", "body": "Tomatoes from Sonipat are available.", "bodyHi": "सोनीपत के टमाटर उपलब्ध हैं।", "timestamp": datetime.now().isoformat(), "read": False, "href": "/consumer/explore"},
        {"id": "note_4", "role": "bulk", "title": "Supply match found", "titleHi": "सप्लाई मिल गई", "body": "1.8 tonnes of tomatoes matched nearby.", "bodyHi": "पास में 1.8 टन टमाटर मिले हैं।", "timestamp": datetime.now().isoformat(), "read": False, "href": "/bulk/supply"},
        {"id": "note_5", "role": "logistics", "title": "New pickup needs assignment", "titleHi": "नए पिकअप को वाहन चाहिए", "body": "PK-2051 is ready for vehicle assignment.", "bodyHi": "PK-2051 के लिए वाहन तय करना है।", "timestamp": datetime.now().isoformat(), "read": False, "href": "/logistics/pickups/PK-2051"},
    ],
    "profile": {"name": "Ramesh Kumar", "phone": "9876543210", "language": "en", "farmName": "Green Field Farm", "village": "Murthal", "district": "Sonipat", "state": "Haryana", "farmSizeAcres": 7.5, "mainCrops": "Tomato, spinach, wheat", "pickupLocation": "Gate 1, Green Field Farm, Murthal", "payoutMethod": "UPI", "payoutMasked": "ramesh•••@upi", "farmerVerified": True, "farmVerified": True, "identityStatus": "Verified"},
    "consumerOrders": [],
    "rfqs": [],
    "bulkOrders": [],
    "consumerProfile": {"name": "Aarav Mehta", "phone": "9811122233", "language": "en", "defaultLocation": "Dwarka, New Delhi", "addresses": [{"id": "addr_home", "label": "Home", "recipient": "Aarav Mehta", "phone": "9811122233", "line1": "Sector 12, Dwarka", "city": "New Delhi", "pincode": "110078", "isDefault": True}], "notifications": {"orders": True, "freshness": True, "offers": False}},
    "bulkProfile": {"businessName": "FreshKart Foods Pvt. Ltd.", "representative": "Neha Kapoor", "phone": "9899001122", "gst": "07AABCF1234M1Z5 (mock)", "language": "en", "procurementLocations": ["Delhi NCR", "Gurugram"], "deliveryAddresses": ["Okhla Distribution Centre, New Delhi"], "notifications": {"matches": True, "orders": True, "deliveries": True}},
    "logisticsPickups": [
        {"id": "PK-2048", "farmer": "Ramesh Kumar", "farm": "Green Field Farm", "farmLocation": "Murthal, Sonipat, Haryana", "crop": "Baby Spinach", "cropHi": "बेबी पालक", "quantityKg": 8, "pickupWindow": "Tomorrow · 7–10 AM", "orderRefs": ["KL-ORD-1037"], "vehicleId": "VEH-01", "driver": "Suresh Kumar", "status": "assigned", "notes": "Use ventilated crates.", "routeId": "RTE-101", "checklist": {"arrived": False, "quantityVerified": False, "qualityChecked": False, "loadSecured": False, "pickupCompleted": False}, "timeline": [{"label": "Pickup created", "labelHi": "पिकअप बनाया गया", "at": datetime.now().isoformat()}]},
        {"id": "PK-2051", "farmer": "Ramesh Kumar", "farm": "Green Field Farm", "farmLocation": "Murthal, Sonipat, Haryana", "crop": "Fresh Tomatoes", "cropHi": "ताज़े टमाटर", "quantityKg": 300, "pickupWindow": "Today · 2–4 PM", "orderRefs": ["KL-ORD-1042"], "status": "unassigned", "notes": "Grade A+ crates.", "routeId": "RTE-POOL-01", "checklist": {"arrived": False, "quantityVerified": False, "qualityChecked": False, "loadSecured": False, "pickupCompleted": False}, "timeline": [{"label": "Pickup created", "labelHi": "पिकअप बनाया गया", "at": datetime.now().isoformat()}]},
        {"id": "PK-POOL-B", "farmer": "Harpreet Singh", "farm": "Sunehri Khet", "farmLocation": "Karnal, Haryana", "crop": "Tomatoes", "cropHi": "टमाटर", "quantityKg": 500, "pickupWindow": "Today · 4–5 PM", "orderRefs": ["KL-B-DEMO"], "vehicleId": "VEH-02", "driver": "Imran Khan", "status": "en_route", "notes": "Pooled bulk route stop 2.", "routeId": "RTE-POOL-01", "checklist": {"arrived": False, "quantityVerified": False, "qualityChecked": False, "loadSecured": False, "pickupCompleted": False}, "timeline": [{"label": "Vehicle en route", "labelHi": "वाहन रास्ते में है", "at": datetime.now().isoformat()}]},
        {"id": "PK-POOL-C", "farmer": "Rajesh Yadav", "farm": "Yadav Fresh Fields", "farmLocation": "Panipat, Haryana", "crop": "Tomatoes", "cropHi": "टमाटर", "quantityKg": 800, "pickupWindow": "Today · 5–6 PM", "orderRefs": ["KL-B-DEMO"], "vehicleId": "VEH-02", "driver": "Imran Khan", "status": "assigned", "notes": "Pooled bulk route stop 3.", "routeId": "RTE-POOL-01", "checklist": {"arrived": False, "quantityVerified": False, "qualityChecked": False, "loadSecured": False, "pickupCompleted": False}, "timeline": [{"label": "Vehicle assigned", "labelHi": "वाहन तय हुआ", "at": datetime.now().isoformat()}]},
    ],
    "deliveries": [
        {"id": "DLV-301", "origin": "KisanLink Sonipat Hub", "destination": "Sector 12, Dwarka, New Delhi", "buyer": "Aarav Mehta", "buyerType": "Consumer", "shipment": "Fresh crate C-301", "produce": "Baby Spinach", "produceHi": "बेबी पालक", "quantityKg": 8, "eta": _day(1), "vehicleId": "VEH-01", "orderRefs": ["KL-ORD-1037"], "status": "scheduled", "handlingNotes": "Keep shaded and ventilated.", "issues": [], "timeline": [{"label": "Delivery scheduled", "labelHi": "डिलीवरी तय हुई", "at": datetime.now().isoformat()}]},
        {"id": "DLV-302", "origin": "KisanLink Sonipat Hub", "destination": "Okhla Distribution Centre, New Delhi", "buyer": "FreshKart Foods", "buyerType": "Bulk Buyer", "shipment": "Pooled tomato lot B-302", "produce": "Tomatoes", "produceHi": "टमाटर", "quantityKg": 1300, "eta": _day(1), "vehicleId": "VEH-02", "orderRefs": ["KL-B-DEMO"], "status": "in_transit", "handlingNotes": "Do not stack above four crates.", "issues": [], "timeline": [{"label": "In transit", "labelHi": "रास्ते में", "at": datetime.now().isoformat()}]},
    ],
    "logisticsRoutes": [
        {"id": "RTE-POOL-01", "name": "Sonipat–Karnal pooled tomato run", "nameHi": "सोनीपत–करनाल साझा टमाटर रूट", "vehicleId": "VEH-02", "pickups": ["PK-2051", "PK-POOL-B", "PK-POOL-C"], "deliveries": ["DLV-302"], "stops": ["Farm A · Murthal", "Farm B · Karnal", "Farm C · Panipat", "FreshKart Okhla Hub"], "distanceKm": 118, "durationMinutes": 245, "capacityKg": 2000, "loadKg": 1800, "status": "active", "pooled": True},
        {"id": "RTE-101", "name": "Sonipat to Dwarka fresh run", "nameHi": "सोनीपत से द्वारका ताज़ा रूट", "vehicleId": "VEH-01", "pickups": ["PK-2048"], "deliveries": ["DLV-301"], "stops": ["Green Field Farm", "KisanLink Sonipat Hub", "Dwarka Sector 12"], "distanceKm": 72, "durationMinutes": 135, "capacityKg": 750, "loadKg": 360, "status": "planned", "pooled": False},
    ],
    "vehicles": [
        {"id": "VEH-01", "registration": "HR 10 AK 4821", "type": "Refrigerated mini truck", "typeHi": "रेफ्रिजरेटेड मिनी ट्रक", "capacityKg": 750, "driver": "Suresh Kumar", "currentAssignment": "RTE-101", "status": "assigned"},
        {"id": "VEH-02", "registration": "DL 1L AC 9082", "type": "Medium truck", "typeHi": "मध्यम ट्रक", "capacityKg": 2000, "driver": "Imran Khan", "currentAssignment": "RTE-POOL-01", "status": "in_transit"},
        {"id": "VEH-03", "registration": "HR 69 D 3104", "type": "Pickup", "typeHi": "पिकअप", "capacityKg": 900, "driver": "Meena Devi", "status": "available"},
        {"id": "VEH-04", "registration": "UP 17 BT 6610", "type": "Electric cargo van", "typeHi": "इलेक्ट्रिक कार्गो वैन", "capacityKg": 600, "driver": "Amit Pal", "status": "maintenance"},
    ],
    "logisticsProfile": {"name": "Kavita Sharma", "phone": "9877004455", "hub": "KisanLink Sonipat Hub", "shift": "Morning · 6 AM–3 PM", "language": "en", "notifications": {"pickups": True, "deliveries": True, "issues": True, "delays": True}},
    "savedListingIds": ["listing_011"],
    "savedFarmNames": ["Green Field Farm"],
}


def fresh_seed() -> dict:
    return deepcopy(SEED_STATE)
