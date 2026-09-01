# KisanLink — REST API & WebSocket Specifications

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.0.0  
**Status:** Approved API Contract Specification  
**Framework:** FastAPI (Python 3.11+) + Pydantic v2 + OpenAPI 3.1 Standards  
**Last Updated:** September 2026  

---

## Table of Contents

1. [API Architecture & Design Standards](#1-api-architecture--design-standards)
2. [Global Headers, Authentication & Error Envelope](#2-global-headers-authentication--error-envelope)
3. [Authentication Router (`/api/v1/auth`)](#3-authentication-router-apiv1auth)
4. [User & Profile Routers (`/api/v1/users`, `/api/v1/farmers`, `/api/v1/buyers`, `/api/v1/logistics-providers`)](#4-user--profile-routers)
5. [Farmer Crop Listings Router (`/api/v1/listings`)](#5-farmer-crop-listings-router-apiv1listings)
6. [Buyer Requirements Router (`/api/v1/requirements`)](#6-buyer-requirements-router-apiv1requirements)
7. [Matching & Dynamic Clustering Router (`/api/v1/matches`, `/api/v1/clusters`)](#7-matching--dynamic-clustering-router)
8. [Offers & Negotiation Router (`/api/v1/offers`)](#8-offers--negotiation-router-apiv1offers)
9. [Order Lifecycle Router (`/api/v1/orders`)](#9-order-lifecycle-router-apiv1orders)
10. [Logistics, Shipments & Routes Router (`/api/v1/shipments`, `/api/v1/routes`)](#10-logistics-shipments--routes-router)
11. [Payments & Escrow Settlement Router (`/api/v1/payments`)](#11-payments--escrow-settlement-router-apiv1payments)
12. [Fair Pricing & Mandi Benchmark Router (`/api/v1/pricing`)](#12-fair-pricing--mandi-benchmark-router-apiv1pricing)
13. [Demand & Supply Forecasting Router (`/api/v1/forecasts`)](#13-demand--supply-forecasting-router-apiv1forecasts)
14. [Digital Twin Map Router (`/api/v1/maps`)](#14-digital-twin-map-router-apiv1maps)
15. [Voice & Speech Processing Router (`/api/v1/voice`)](#15-voice--speech-processing-router-apiv1voice)
16. [Wastage Rescue Router (`/api/v1/rescue`)](#16-wastage-rescue-router-apiv1rescue)
17. [Reviews & Reputation Router (`/api/v1/reviews`)](#17-reviews--reputation-router-apiv1reviews)
18. [Notifications Router (`/api/v1/notifications`)](#18-notifications-router-apiv1notifications)
19. [Assisted Call-Center Operator Router (`/api/v1/assisted`)](#19-assisted-call-center-operator-router-apiv1assisted)
20. [Media Uploads Router (`/api/v1/uploads`)](#20-media-uploads-router-apiv1uploads)
21. [Demo State Management Router (`/api/v1/demo`)](#21-demo-state-management-router-apiv1demo)

---

## 1. API Architecture & Design Standards

- **Base URL:** `https://api.kisanlink.in/api/v1` (or `http://localhost:8000/api/v1` in local dev).
- **Transport:** HTTPS / TLS 1.3 mandatory in staging and production.
- **Protocol Format:** JSON (`application/json`) for standard payloads; `multipart/form-data` for audio/image uploads.
- **Domain Action Pattern:** Instead of exposing low-level relational tables, the API exposes rich domain intent endpoints (e.g., `POST /requirements/{id}/generate-matches`, `POST /orders/{id}/lock-escrow`).

---

## 2. Global Headers, Authentication & Error Envelope

### 2.1 Request Headers
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept-Language: hi-IN, en-US
X-Request-ID: req_uuid_v4
```

### 2.2 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CLUSTER_SUPPLY",
    "message": "Nearby farm candidate pool cannot fulfill target volume of 5000 kg.",
    "details": {
      "requested_kg": 5000,
      "available_kg": 3200,
      "search_radius_km": 100
    }
  },
  "request_id": "req_8f1d2e"
}
```

---

## 3. Authentication Router (`/api/v1/auth`)

### 3.1 `POST /api/v1/auth/request-otp`
- **Purpose:** Request 6-digit SMS OTP for passwordless onboarding.
- **Auth:** Public.
- **Request:**
  ```json
  {
    "phone": "+919812345678"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to registered phone number.",
    "expires_in_seconds": 300
  }
  ```

### 3.2 `POST /api/v1/auth/verify-otp`
- **Purpose:** Verify OTP and return signed JWT token with user role and profile status.
- **Auth:** Public.
- **Request:**
  ```json
  {
    "phone": "+919812345678",
    "otp": "123456",
    "preferred_role": "FARMER"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "token_type": "bearer",
      "expires_in": 86400,
      "user": {
        "id": "usr_98a72b1c",
        "phone": "+919812345678",
        "role": "FARMER",
        "name": "Ramesh Sharma",
        "language": "hi",
        "is_profile_complete": true
      }
    }
  }
  ```

---

## 4. User & Profile Routers

### 4.1 `GET /api/v1/users/me`
- **Purpose:** Get authenticated user profile, active listings/orders count.
- **Auth:** Bearer Token (All Roles).

### 4.2 `PUT /api/v1/farmers/profile`
- **Purpose:** Update farm location, primary crops, payment UPI ID.
- **Auth:** Bearer Token (`FARMER`).
- **Request:**
  ```json
  {
    "name": "Ramesh Sharma",
    "village": "Murthal",
    "district": "Sonipat",
    "state": "Haryana",
    "latitude": 28.9912,
    "longitude": 77.0125,
    "payout_upi_id": "ramesh@upi",
    "language": "hi"
  }
  ```

---

## 5. Farmer Crop Listings Router (`/api/v1/listings`)

### 5.1 `POST /api/v1/listings`
- **Purpose:** Create an active or pre-harvest crop listing.
- **Auth:** Bearer Token (`FARMER` or `CALL_CENTER_OPERATOR`).
- **Request:**
  ```json
  {
    "crop_name": "Tomato",
    "variety": "Desi",
    "quantity_kg": 1200.0,
    "expected_price_per_kg": 25.0,
    "quality_grade": "GRADE_A",
    "is_pre_harvest": true,
    "harvest_date": "2026-09-08",
    "latitude": 28.9912,
    "longitude": 77.0125,
    "photos": ["https://storage.kisanlink.in/crops/tomato_01.jpg"]
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "lst_1092a",
      "crop_name": "Tomato",
      "quantity_kg": 1200.0,
      "status": "ACTIVE",
      "fair_price_band": {
        "min": 23.50,
        "max": 26.00,
        "current_mandi_modal": 19.00
      },
      "created_at": "2026-09-01T10:00:00Z"
    }
  }
  ```

### 5.2 `GET /api/v1/listings`
- **Purpose:** Spatial search for crop listings by distance, crop, grade, and harvest date.
- **Query Params:** `crop`, `lat`, `lon`, `radius_km`, `min_grade`, `is_pre_harvest`.

---

## 6. Buyer Requirements Router (`/api/v1/requirements`)

### 6.1 `POST /api/v1/requirements`
- **Purpose:** Bulk buyer publishes a procurement demand (Reverse Marketplace).
- **Auth:** Bearer Token (`BUYER`).
- **Request:**
  ```json
  {
    "crop_name": "Tomato",
    "target_quantity_kg": 5000.0,
    "max_price_per_kg": 28.00,
    "acceptable_grades": ["GRADE_A"],
    "delivery_deadline": "2026-09-10T18:00:00Z",
    "delivery_latitude": 28.6315,
    "delivery_longitude": 77.2167,
    "delivery_address": "The Imperial Hotel, Janpath, Connaught Place, New Delhi"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "req_881a",
      "status": "MATCHING_PENDING",
      "candidate_matches_count": 4
    }
  }
  ```

---

## 7. Matching & Dynamic Clustering Router

### 7.1 `POST /api/v1/requirements/{id}/generate-matches`
- **Purpose:** Solves the MILP supply pooling optimization to create a **Dynamic Farmer Cluster**.
- **Auth:** Bearer Token (`BUYER`).
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "cluster_id": "cls_tc104",
      "requirement_id": "req_881a",
      "crop_name": "Tomato",
      "total_quantity_kg": 5000.0,
      "fulfillment_percentage": 100.0,
      "average_farm_price_per_kg": 25.00,
      "estimated_freight_per_kg": 2.20,
      "total_delivered_price_per_kg": 27.20,
      "traditional_wholesale_benchmark": 32.00,
      "buyer_savings_percentage": 15.0,
      "farmers": [
        {
          "farmer_id": "fm_01",
          "name": "Ramesh Sharma",
          "location": "Sonipat",
          "distance_km": 42.1,
          "allocated_kg": 1200.0,
          "unit_price": 25.00,
          "payout_rupees": 30000.00
        },
        {
          "farmer_id": "fm_02",
          "name": "Suresh Kumar",
          "location": "Sonipat",
          "distance_km": 44.5,
          "allocated_kg": 800.0,
          "unit_price": 25.00,
          "payout_rupees": 20000.00
        },
        {
          "farmer_id": "fm_03",
          "name": "Balbir Singh",
          "location": "Panipat",
          "distance_km": 82.0,
          "allocated_kg": 1700.0,
          "unit_price": 25.00,
          "payout_rupees": 42500.00
        },
        {
          "farmer_id": "fm_04",
          "name": "Jaipal Malik",
          "location": "Panipat",
          "distance_km": 79.3,
          "allocated_kg": 1300.0,
          "unit_price": 25.00,
          "payout_rupees": 32500.00
        }
      ],
      "explanation": [
        "100% Grade A certified pre-harvest yield",
        "Geographic compactness: All farms within 30km corridor along NH-44",
        "Single-truck pickup routing saves ₹4,800 vs separate dispatches"
      ]
    }
  }
  ```

---

## 8. Offers & Negotiation Router (`/api/v1/offers`)

### 8.1 `POST /api/v1/offers/{id}/accept`
- **Purpose:** Farmer accepts cluster procurement allocation.
- **Auth:** Bearer Token (`FARMER`).

---

## 9. Order Lifecycle Router (`/api/v1/orders`)

### 9.1 `POST /api/v1/orders/from-cluster/{cluster_id}`
- **Purpose:** Buyer converts dynamic cluster sourcing plan into a confirmed order.
- **Auth:** Bearer Token (`BUYER`).

### 9.2 `POST /api/v1/orders/{id}/lock-escrow`
- **Purpose:** Secures 100% buyer funds in simulated platform escrow custody.
- **Auth:** Bearer Token (`BUYER`).
- **Request:**
  ```json
  {
    "payment_method": "SIMULATED_UPI",
    "amount_rupees": 137500.00
  }
  ```

### 9.3 `POST /api/v1/orders/{id}/confirm-delivery`
- **Purpose:** Buyer verifies consignment and inputs 4-digit Delivery OTP to execute split settlements.
- **Auth:** Bearer Token (`BUYER`).
- **Request:**
  ```json
  {
    "delivery_otp": "8421",
    "quality_rating": 5,
    "fulfillment_verified": true
  }
  ```

---

## 10. Logistics, Shipments & Routes Router

### 10.1 `POST /api/v1/routes/optimize`
- **Purpose:** Google OR-Tools CVRP solver generating optimal multi-stop pickup sequence.
- **Auth:** Bearer Token (`LOGISTICS` or System Internal).
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "total_distance_km": 112.4,
      "estimated_duration_minutes": 195,
      "waypoints_order": [
        { "stop_number": 1, "type": "DEPOT", "name": "Murthal Carrier Hub" },
        { "stop_number": 2, "type": "PICKUP", "farmer_id": "fm_03", "name": "Balbir Singh (Panipat)", "load_kg": 1700.0 },
        { "stop_number": 3, "type": "PICKUP", "farmer_id": "fm_04", "name": "Jaipal Malik (Panipat)", "load_kg": 1300.0 },
        { "stop_number": 4, "type": "PICKUP", "farmer_id": "fm_02", "name": "Suresh Kumar (Sonipat)", "load_kg": 800.0 },
        { "stop_number": 5, "type": "PICKUP", "farmer_id": "fm_01", "name": "Ramesh Sharma (Sonipat)", "load_kg": 1200.0 },
        { "stop_number": 6, "type": "DROP_OFF", "buyer_id": "by_01", "name": "The Imperial Hotel (New Delhi)", "unload_kg": 5000.0 }
      ]
    }
  }
  ```

---

## 11. Payments & Escrow Settlement Router (`/api/v1/payments`)

### 11.1 `GET /api/v1/payments/ledger/{order_id}`
- **Purpose:** Returns the transparent multi-split settlement reconciliation.

---

## 12. Fair Pricing & Mandi Benchmark Router (`/api/v1/pricing`)

### 12.1 `GET /api/v1/pricing/guidance`
- **Purpose:** Calculate fair-price band for a given crop and district.
- **Query Params:** `crop_name`, `district`, `quantity_kg`.
- **Response (`200 OK`):**
  ```json
  {
    "crop_name": "Tomato",
    "district": "Sonipat",
    "recommended_fair_min": 23.50,
    "recommended_fair_max": 26.00,
    "mandi_modal_benchmark": 19.00,
    "buyer_wholesale_benchmark": 32.00,
    "estimated_farmer_gain_pct": 31.5
  }
  ```

---

## 13. Demand & Supply Forecasting Router (`/api/v1/forecasts`)

### 13.1 `GET /api/v1/forecasts/regional`
- **Query Params:** `crop_name`, `region`.
- **Response (`200 OK`):**
  ```json
  {
    "crop_name": "Tomato",
    "region": "Delhi NCR",
    "status": "HIGH_DEMAND",
    "farmer_summary": "Tomato demand near Delhi is expected to increase over the next 3 weeks.",
    "projected_growth_pct": 18.2,
    "projected_deficit_tonnes": 40.0
  }
  ```

---

## 14. Digital Twin Map Router (`/api/v1/maps`)

### 14.1 `GET /api/v1/maps/supply-demand-hotspots`
- **Purpose:** Returns GeoJSON FeatureCollection of regional crop surplus and buyer demand centroids for MapLibre rendering.

---

## 15. Voice & Speech Processing Router (`/api/v1/voice`)

### 15.1 `POST /api/v1/voice/parse-audio`
- **Purpose:** Receives audio stream; transcribes via BHASHINI abstraction and extracts structured listing entities.
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "transcribed_text": "मेरे पास 800 किलो टमाटर है, अगले हफ्ते तैयार होगा",
      "entities": {
        "crop_name": "Tomato",
        "quantity_kg": 800.0,
        "harvest_window": "NEXT_WEEK"
      },
      "missing_fields": ["expected_price_per_kg"]
    }
  }
  ```

---

## 16. Wastage Rescue Router (`/api/v1/rescue`)

### 16.1 `POST /api/v1/rescue/tag-urgent/{listing_id}`
- **Purpose:** Tags listing as urgent distress sale with dynamic rescue discount price.

---

## 17. Reviews & Reputation Router (`/api/v1/reviews`)

### 17.1 `POST /api/v1/reviews`
- **Purpose:** Bidirectional rating submission between farmer and buyer.

---

## 18. Notifications Router (`/api/v1/notifications`)

### 18.1 `GET /api/v1/notifications`
- **Purpose:** Poll active unread notifications for authenticated user.

---

## 19. Assisted Call-Center Operator Router (`/api/v1/assisted`)

### 19.1 `POST /api/v1/assisted/verify-proxy`
- **Purpose:** Operator validates farmer verbal OTP to unlock proxy session.

### 19.2 `POST /api/v1/assisted/proxy-listing`
- **Purpose:** Operator creates listing on farmer's behalf; records immutable operator audit token.

---

## 20. Media Uploads Router (`/api/v1/uploads`)

### 20.1 `POST /api/v1/uploads/image`
- **Purpose:** Uploads compressed JPEG/WebP crop photo to Supabase object store; returns public CDN URI.

---

## 21. Demo State Management Router (`/api/v1/demo`)

### 21.1 `POST /api/v1/demo/reset`
- **Purpose:** Restores database to deterministic SIH Golden Path baseline seed in under 1 second for seamless back-to-back judge presentations.
- **Auth:** Open in Demo/Development environment.

---
*End of KisanLink REST API & WebSocket Specifications*
