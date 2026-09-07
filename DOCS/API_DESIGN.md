# KisanLink — REST API Specifications

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.1.0  
**Status:** Canonical API Specification (Synchronized with Codebase)  
**Framework:** FastAPI (Python 3.11+) + Pydantic v2 + OpenAPI 3.1 Standards  
**Last Updated:** September 2026  

---

## Table of Contents

1. [API Architecture & Design Standards](#1-api-architecture--design-standards)
2. [Global Headers, Authentication & Error Envelope](#2-global-headers-authentication--error-envelope)
3. [Canonical v1 API Routers (`/api/v1`)](#3-canonical-v1-api-routers-apiv1)
   - 3.1 [Authentication Router (`/api/v1/auth`)](#31-authentication-router-apiv1auth)
   - 3.2 [Users & Profiles (`/api/v1/users`, `/api/v1/farmers`, `/api/v1/buyers`)](#32-users--profiles)
   - 3.3 [Farmer Produce Listings & Gemini Voice Parsing (`/api/v1/listings`)](#33-farmer-produce-listings--gemini-voice-parsing)
   - 3.4 [Buyer Requirements & Matching (`/api/v1/requirements`, `/api/v1/matches`)](#34-buyer-requirements--matching)
   - 3.5 [Dynamic Supply Clusters (`/api/v1/clusters`)](#35-dynamic-supply-clusters-apiv1clusters)
   - 3.6 [Orders & Direct Checkout (`/api/v1/orders`)](#36-orders--direct-checkout-apiv1orders)
   - 3.7 [Escrow & Payments Ledger (`/api/v1/payments`)](#37-escrow--payments-ledger-apiv1payments)
   - 3.8 [Wastage Rescue Listings (`/api/v1/rescue`)](#38-wastage-rescue-listings-apiv1rescue)
   - 3.9 [Logistics, Shipments & Routing (`/api/v1/logistics`)](#39-logistics-shipments--routing-apiv1logistics)
   - 3.10 [Price Intelligence & Impact Summary (`/api/v1/intelligence`)](#310-price-intelligence--impact-summary-apiv1intelligence)
   - 3.11 [Reviews & Reputation (`/api/v1/reviews`)](#311-reviews--reputation-apiv1reviews)
   - 3.12 [Dispute Mediation (`/api/v1/disputes`)](#312-dispute-mediation-apiv1disputes)
   - 3.13 [Operator Proxy Audit Logging (`/api/v1/audit`)](#313-operator-proxy-audit-logging-apiv1audit)
4. [Legacy Logistics & Prototype State Boundary (`/api/state`, `/api/reset`)](#4-legacy-logistics--prototype-state-boundary)
5. [Implementation Status Matrix](#5-implementation-status-matrix)

---

## 1. API Architecture & Design Standards

- **Base URL:** `http://localhost:8000/api/v1` (Local Development) / `https://api.kisanlink.in/api/v1` (Production).
- **Interactive Documentation:** Automatic Swagger UI at `http://localhost:8000/docs` and ReDoc at `http://localhost:8000/redoc`.
- **Data Coercion:** Powered by strict Pydantic v2 schemas ensuring complete type safety.
- **Architectural Separation:** 
  - Canonical transactional operations (listings, orders, escrow, matching) reside under `/api/v1/*` backed by PostgreSQL 16+ with PostGIS.
  - Cross-role prototype synchronization and Market Maker corridor state reside under `/api/state` backed by an encapsulated SQLite store (`legacy_logistics.py`).

---

## 2. Global Headers, Authentication & Error Envelope

### 2.1 Request Headers
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

### 2.2 Error Envelope
FastAPI standard HTTP exception envelope:
```json
{
  "detail": "Descriptive error message explaining validation or business logic issue"
}
```

---

## 3. Canonical v1 API Routers (`/api/v1`)

### 3.1 Authentication Router (`/api/v1/auth`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/request-otp` | Public | Initiates 6-digit OTP request for phone number | ✅ Real Backend |
| `POST` | `/api/v1/auth/verify-otp` | Public | Verifies OTP and returns signed JWT access token | ✅ Real Backend |
| `GET` | `/api/v1/auth/me` | Bearer | Returns current authenticated user and profile state | ✅ Real Backend |

#### Sample: `POST /api/v1/auth/verify-otp`
**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "preferred_role": "FARMER"
}
```
**Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "role": "FARMER"
  }
}
```

---

### 3.2 Users & Profiles

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/users/me` | Bearer | Current user record | ✅ Real Backend |
| `GET` | `/api/v1/farmers/profile` | Bearer | Farmer profile (village, district, acreage, crops) | ✅ Real Backend |
| `PUT` | `/api/v1/farmers/profile` | Bearer | Update farmer profile | ✅ Real Backend |
| `GET` | `/api/v1/farmers/dashboard` | Bearer | Aggregated earnings, pending payouts, active listings | ✅ Real Backend |
| `GET` | `/api/v1/farmers/earnings` | Bearer | Payout transaction ledger with mandi comparisons | ✅ Real Backend |
| `GET` | `/api/v1/farmers/pickups` | Bearer | Pickup schedule, assigned vehicle, and OTP tokens | ✅ Real Backend |
| `GET` | `/api/v1/buyers/profile` | Bearer | Buyer profile (company, GST, delivery locations) | ✅ Real Backend |
| `PUT` | `/api/v1/buyers/profile` | Bearer | Update buyer profile | ✅ Real Backend |

---

### 3.3 Farmer Produce Listings & Gemini Voice Parsing

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/listings/parse-voice` | Public | Gemini AI speech intent parser with regex fallback | ✅ AI Backend |
| `POST` | `/api/v1/listings` | Bearer | Create produce listing (PostGIS geocoded) | ✅ Real Backend |
| `GET` | `/api/v1/listings` | Public | Spatial search with distance calculation & radius filter | ✅ Real Backend |
| `GET` | `/api/v1/listings/{id}` | Public | Listing detail with farmer origin and mandi benchmark | ✅ Real Backend |
| `PUT` | `/api/v1/listings/{id}` | Bearer | Update listing quantity, price, or harvest date | ✅ Real Backend |
| `DELETE` | `/api/v1/listings/{id}` | Bearer | Cancel / delete listing | ✅ Real Backend |
| `GET` | `/api/v1/listings/my` | Bearer | List crops owned by authenticated farmer | ✅ Real Backend |

#### Sample: `POST /api/v1/listings/parse-voice`
**Request:**
```json
{
  "transcript": "Mujhe 725 kilo tamatar 28 rupaye per kilo mein bechne hain",
  "language": "hi"
}
```
**Response (`200 OK`):**
```json
{
  "crop_name": "Tomato",
  "crop_name_hi": "टमाटर",
  "category": "Vegetables",
  "quantity_kg": 725,
  "unit": "kg",
  "price_per_kg": 28,
  "confidence_score": 0.95,
  "ai_used": true
}
```

---

### 3.4 Buyer Requirements & Matching

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/requirements` | Bearer | Post bulk procurement RFQ (Reverse Marketplace) | ✅ Real Backend |
| `GET` | `/api/v1/requirements` | Bearer | List active procurement requirements | ✅ Real Backend |
| `GET` | `/api/v1/requirements/{id}` | Bearer | Requirement details and matching status | ✅ Real Backend |
| `POST` | `/api/v1/requirements/{id}/generate-matches` | Bearer | Runs 5-factor scoring engine to create supply cluster | ✅ Real Backend |
| `GET` | `/api/v1/matches/preview` | Bearer | Previews candidate farm matches for a requirement | ✅ Real Backend |

---

### 3.5 Dynamic Supply Clusters (`/api/v1/clusters`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/clusters/{id}` | Bearer | Inspect dynamic cluster formulation and allocations | ✅ Real Backend |
| `POST` | `/api/v1/clusters/{id}/confirm` | Bearer | Confirms cluster allocations for order creation | ✅ Real Backend |

---

### 3.6 Orders & Direct Checkout (`/api/v1/orders`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/orders/direct` | Bearer | Direct B2C cart checkout with row-level stock locks | ✅ Real Backend |
| `POST` | `/api/v1/orders/from-cluster/{cluster_id}` | Bearer | Converts pooled supply cluster into confirmed Order | ✅ Real Backend |
| `POST` | `/api/v1/orders/{id}/lock-escrow` | Bearer | Locks buyer funds into simulated escrow custody | ✅ Real Backend |
| `GET` | `/api/v1/orders/my-orders` | Bearer | Returns role-scoped orders (Farmer, Buyer, Bulk) | ✅ Real Backend |
| `GET` | `/api/v1/orders/{id}` | Bearer | Order detail with allocation breakdown and OTPs | ✅ Real Backend |
| `PATCH` | `/api/v1/orders/{id}/status` | Bearer | Updates order FSM state | ✅ Real Backend |

---

### 3.7 Escrow & Payments Ledger (`/api/v1/payments`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/payments/ledger/{order_id}` | Bearer | Returns transparent ledger entries (ESCROW_LOCK, FARMER_PAYOUT, FREIGHT) | ✅ Real Backend |

---

### 3.8 Wastage Rescue Listings (`/api/v1/rescue`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/rescue/listings` | Public | Lists active urgency/rescue crops with discounted pricing | ✅ Real Backend |

---

### 3.9 Logistics, Shipments & Routing (`/api/v1/logistics`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/logistics/shipments` | Bearer | Overview of canonical shipments | ✅ Real Backend |
| `GET` | `/api/v1/logistics/shipments/{id}` | Bearer | Single shipment detail with origin/dest coordinates | ✅ Real Backend |
| `PATCH` | `/api/v1/logistics/shipments/{id}/status` | Bearer | Update shipment status (`ASSIGNED`, `IN_TRANSIT`, etc.) | ✅ Real Backend |
| `POST` | `/api/v1/logistics/routes/optimize` | Bearer | Solves multi-stop waypoint pickup sequence | ✅ Real Backend |
| `POST` | `/api/v1/logistics/pickups/verify-otp` | Bearer | Verifies farm-gate pickup OTP token | ✅ Real Backend |
| `POST` | `/api/v1/logistics/deliveries/verify-otp` | Bearer | Verifies buyer delivery OTP token & triggers settlement | ✅ Real Backend |

---

### 3.10 Price Intelligence & Impact Summary (`/api/v1/intelligence`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/intelligence/prices` | Public | Historical mandi price observations | ✅ Real Backend |
| `GET` | `/api/v1/intelligence/forecast/{crop_name}` | Public | Regional demand forecast indicator | ✅ Real Backend |
| `POST` | `/api/v1/intelligence/recommend-price` | Public | Fair price range recommendation based on mandi rates | ✅ Real Backend |
| `GET` | `/api/v1/intelligence/impact-summary` | Public | Macroeconomic impact metrics (Farmer delta, savings) | ✅ Real Backend |

---

### 3.11 Reviews & Reputation (`/api/v1/reviews`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/reviews` | Bearer | Create star rating and feedback text for an order | ✅ Real Backend |
| `GET` | `/api/v1/reviews/user/{user_id}` | Public | Retrieve feedback score and ratings for a user | ✅ Real Backend |

---

### 3.12 Dispute Mediation (`/api/v1/disputes`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/disputes` | Bearer | Raise quality/quantity dispute with withheld escrow | ✅ Real Backend |
| `PUT` | `/api/v1/disputes/{id}/resolve` | Bearer | Resolve dispute with settlement action | ✅ Real Backend |

---

### 3.13 Operator Proxy Audit Logging (`/api/v1/audit`)

| Method | Path | Auth | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/audit/operator-logs` | Bearer | Records tele-support operator proxy action | ✅ Real Backend |
| `GET` | `/api/v1/audit/operator-logs` | Bearer | Fetches operator audit log trail | ✅ Real Backend |

---

## 4. Legacy Logistics & Prototype State Boundary

To allow zero-latency cross-module prototype updates during SIH live demonstrations without contaminating the production PostgreSQL schema, `backend/app/api/legacy_logistics.py` provides the prototype state bridge:

| Method | Path | Description | Scope |
|---|---|---|---|
| `GET` | `/api/state` | Retrieves full prototype state envelope (including `markets` array) | Shared Prototype |
| `PUT` | `/api/state` | Atomically replaces prototype state envelope | Shared Prototype |
| `POST` | `/api/reset` | Resets state envelope to fresh seed fixtures | Demo Reset |
| `GET` | `/api/logistics/pickups` | Fast prototype access to logistics pickups | Logistics Console |
| `GET` | `/api/logistics/deliveries`| Fast prototype access to consignments | Logistics Console |
| `GET` | `/api/logistics/routes` | Fast prototype access to pooled routes | Logistics Console |
| `GET` | `/api/logistics/vehicles` | Fast prototype access to fleet vehicles | Logistics Console |

---

## 5. Implementation Status Matrix

| Subsystem | Endpoints | Implementation Status | Data Store |
|---|---|---|---|
| **Authentication** | `/api/v1/auth/*` | ✅ Real Backend | PostgreSQL 16 |
| **Produce Listings** | `/api/v1/listings/*` | ✅ Real Backend | PostgreSQL + PostGIS |
| **Voice Parsing** | `/api/v1/listings/parse-voice` | ✅ AI Backend (Gemini) | Google Gemini API + Regex |
| **Requirements & RFQs**| `/api/v1/requirements/*` | ✅ Real Backend | PostgreSQL 16 |
| **Dynamic Clusters** | `/api/v1/clusters/*` | ✅ Real Backend | PostgreSQL 16 |
| **Orders & Checkout** | `/api/v1/orders/*` | ✅ Real Backend | PostgreSQL 16 |
| **Escrow Ledger** | `/api/v1/payments/*` | ✅ Real Backend | PostgreSQL 16 |
| **Canonical Logistics**| `/api/v1/logistics/*` | ✅ Real Backend | PostgreSQL + PostGIS |
| **Price Intelligence** | `/api/v1/intelligence/*` | ✅ Real Backend | PostgreSQL 16 |
| **Reviews & Disputes** | `/api/v1/reviews/*`, `/api/v1/disputes/*` | ✅ Real Backend | PostgreSQL 16 |
| **Audit Logs** | `/api/v1/audit/*` | ✅ Real Backend | PostgreSQL 16 |
| **Market Maker** | Deterministic Engine | ✅ Closed-Form Engine | `marketMakerEngine.ts` |
| **Prototype State** | `/api/state`, `/api/reset` | ✅ Encapsulated Prototype Store | SQLite `kisanlink.db` |

---
*End of KisanLink REST API Specifications*
