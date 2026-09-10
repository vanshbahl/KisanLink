# KisanLink Backend Architecture & Developer Guide

## 1. Canonical Architecture Overview

The canonical KisanLink backend is built with:
- **Framework**: FastAPI (Python 3.10+) with `/api/v1` routing
- **Primary Database**: PostgreSQL 17 + PostGIS (spatial geospatial indexing & querying)
- **ORM & Driver**: SQLAlchemy 2.0 Async (`asyncpg`) with synchronous migration support (`psycopg2`)
- **Schema Validation**: Pydantic v2 with strict typing
- **Database Migrations**: Alembic
- **Logging & Security**: `structlog` structured JSON logging and JWT bearer authentication (`python-jose`, `passlib`)
- **Testing**: `pytest` + `pytest-asyncio` + `httpx`

---

## 2. Implemented Domains (PostgreSQL Source of Truth)

All active business domains use PostgreSQL/PostGIS as the canonical source of truth:

### 1. Farmer Domain
- **Profile**: `GET /api/v1/farmers/profile`, `PUT /api/v1/farmers/profile`
- **Produce Listings**:
  - `POST /api/v1/listings`: Create crop listing (variety, available kg, expected price, grade, harvest date, location coordinates).
  - `GET /api/v1/listings`: Spatial search with PostGIS distance calculation, radius filtering, crop/grade filters.
  - `GET /api/v1/listings/{id}`: Single listing detail.
  - `PUT /api/v1/listings/{id}`: Update listing with strict farmer ownership verification.
  - `DELETE /api/v1/listings/{id}`: Deactivate/cancel listing.
  - `POST /api/v1/listings/parse-voice`: Gemini NLP voice listing extraction with regex fallback for Hindi/English input.
- **Dashboard & Operations**:
  - `GET /api/v1/farmers/dashboard`: Aggregated earnings, pending payouts, active listing count, new order count, and upcoming pickup preview.
  - `GET /api/v1/farmers/earnings`: Transparent payout ledger, deductions, net amounts, and mandi benchmark gain.
  - `GET /api/v1/farmers/pickups`: Farmgate pickup schedule, assigned vehicles, and OTP verification codes.

### 2. Consumer Marketplace Domain
- **Produce Discovery**: Real-time listings queried from PostgreSQL via `GET /api/v1/listings`.
- **Direct B2C Cart Checkout**:
  - `POST /api/v1/orders/direct`: Atomic transaction with row-level locks (`with_for_update`) on `CropListing`, stock deduction, automatic `Order` and `OrderFarmerAllocation` creation, and simulated escrow ledger tracking.

### 3. Bulk Buyer & Procurement Domain
- **Demand Requirements**:
  - `POST /api/v1/requirements`: Create bulk procurement RFQ with target quantity, max price, acceptable grades, deadline, and delivery coordinates.
  - `GET /api/v1/requirements`: List procurement requirements.
- **Dynamic Multi-Criteria Matching & Clustering**:
  - `POST /api/v1/requirements/{id}/generate-matches`: Executes `MatchingEngine` applying 5-factor scoring (Distance, Farmgate Price, Reputation Score, Harvest Window/Freshness, Urgency/Rescue) to generate a `DynamicCluster` with optimized farmer allocations.
- **Atomic Order Conversion & Escrow**:
  - `POST /api/v1/orders/from-cluster/{cluster_id}`: Converts supply cluster into confirmed Order with row-level locks on listings to prevent concurrency double-allocation.
  - `POST /api/v1/orders/{id}/lock-escrow`: Locks buyer procurement funds in simulated escrow custody and logs entries to `payments_ledger`.

### 4. Canonical Logistics Domain (`/api/v1/logistics`)
- **Shipments**: `GET /api/v1/logistics/shipments` (Full shipment overview with loaded order allocations and transporter details).
- **OTP Verification**:
  - `POST /api/v1/logistics/verify-pickup-otp`: Two-factor pickup verification with farmer.
  - `POST /api/v1/logistics/verify-delivery-otp`: Delivery verification with buyer.
- **Route Optimization**:
  - `POST /api/v1/logistics/optimize-route`: Geospatial routing with distance, duration, and waypoints via `routing_service.py`.
- **Status Updates**: `PATCH /api/v1/logistics/shipments/{id}/status`.

### 5. Additional Canonical V1 Domains
- **Intelligence**: `GET /api/v1/intelligence/price-trends/{crop_type_id}`, `GET /api/v1/intelligence/demand-forecast`
- **Rescue**: `GET /api/v1/rescue/listings` (Wastage rescue / distress-sale listings with dynamic discounting)
- **Disputes**: `POST /api/v1/disputes`, `GET /api/v1/disputes/{id}`, `PATCH /api/v1/disputes/{id}/resolve`
- **Reviews**: `POST /api/v1/reviews`, `GET /api/v1/reviews/target/{target_id}`
- **Audit**: `GET /api/v1/audit/logs`

---

## 3. Temporary Logistics & Demo State Boundary

To support the frontend prototype workflows, demo resetting, and cross-domain Market Maker corridor materialization, an isolated state store is maintained:

- **Boundary Router**: `backend/app/api/legacy_logistics.py`
- **Endpoints**:
  - `GET /api/state` / `PUT /api/state`: Full demo state sync including `pickups`, `deliveries`, `routes`, `vehicles`, and `markets` (active Market Maker corridors).
  - `POST /api/reset`: Reset state back to initial seed data.
  - `GET /api/logistics/pickups`
  - `GET /api/logistics/deliveries`
  - `GET /api/logistics/routes`
  - `GET /api/logistics/vehicles`
- **Data Store**: In-memory / SQLite demo state fixture.
- **Market Maker Cross-Domain State**: Materializes new corridors into both frontend local caches and `/api/state` (`markets` array), bridging farmer pickups, bulk orders, and logistics route dispatching.

---

## 4. Code Conventions & Project Layout

```text
backend/
├── alembic/                      # Database migration scripts
│   └── versions/                 # Revision scripts (UUID & PostGIS enabled)
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection (get_db, require_role, auth)
│   │   ├── legacy_logistics.py   # Temporary isolated prototype boundary for Logistics
│   │   └── v1/                   # Canonical API routers
│   │       ├── auth.py           # OTP & JWT token endpoints
│   │       ├── buyers.py         # Buyer profile endpoints
│   │       ├── clusters.py       # Dynamic supply cluster inspection
│   │       ├── farmers.py        # Farmer profile, dashboard, earnings, pickups
│   │       ├── listings.py       # Spatial PostGIS produce listings CRUD
│   │       ├── matches.py        # Multi-criteria matching engine execution
│   │       ├── orders.py         # Direct B2C and bulk cluster orders
│   │       ├── payments.py       # Escrow release and settlement
│   │       └── requirements.py   # Buyer demand requirements
│   ├── core/
│   │   ├── config.py             # Pydantic Settings & environment variables
│   │   ├── logging.py            # Structlog configuration
│   │   └── security.py           # Passwordless OTP & JWT creation/verification
│   ├── models/                   # SQLAlchemy declarative models
│   │   ├── base.py               # Base and TimestampMixin
│   │   ├── cluster.py            # DynamicCluster, ClusterItem
│   │   ├── crop.py               # CropType, CropListing
│   │   ├── intelligence.py       # PriceObservation, DemandForecast
│   │   ├── logistics.py          # Shipment model
│   │   ├── order.py              # Order, OrderFarmerAllocation
│   │   ├── payment.py            # PaymentsLedger
│   │   ├── requirement.py        # BuyerRequirement
│   │   └── user.py               # User, FarmerProfile, BuyerProfile, LogisticsProfile
│   ├── schemas/                  # Pydantic v2 schemas
│   ├── services/                 # Core domain services
│   │   ├── matching_service.py   # 5-factor scoring & dynamic clustering engine
│   │   ├── settlement_service.py # Two-phase escrow settlement engine
│   │   └── pricing_service.py    # Mandi price discovery & benchmark calculations
│   ├── database.py               # Async engine and session factory
│   └── main.py                   # FastAPI application initialization & lifespan
├── requirements.txt              # Cleaned backend dependencies
├── seed_demo_data.py             # Deterministic PostgreSQL demo seeder
└── tests/                        # Pytest async test suite
```

### Conventions
1. **Models**: Place in `app/models/<domain>.py`. Use `UUID` primary keys with `gen_random_uuid()` server default and include `TimestampMixin`.
2. **Schemas**: Place in `app/schemas/<domain>.py`. Use Pydantic v2 with `ConfigDict(from_attributes=True)`.
3. **Routers**: Group in `app/api/v1/<domain>.py`. Inject dependencies via `Depends(get_db)` and `Depends(require_<role>)`. Mount routers inside `app/api/v1/__init__.py`.
4. **Services**: Business logic belongs in `app/services/`, not inside route handlers.
5. **Migrations**:
   - Generate migration: `alembic revision --autogenerate -m "describe_change"`
   - Apply migration: `alembic upgrade head`
6. **Authentication**: Passwordless phone OTP. The demo code `123456` works only when `DEMO_AUTH_ENABLED=true` and `ENVIRONMENT` is `development`, `demo`, or `test`; production always fails closed. Header format: `Authorization: Bearer <token>`.
7. **Frontend Adapter**: Centralized in `frontend/src/services/apiClient.ts` which handles JWT tokens, camelCase to snake_case field mapping, and unified error handling.

---

## 5. Local Setup & Run Instructions

### 1. Database Setup (PostgreSQL + PostGIS)
Ensure PostgreSQL 15+ is installed with the PostGIS extension:
```bash
# Example PostgreSQL commands
psql -U postgres
CREATE USER kisanlink_user WITH PASSWORD 'kisanlink_secure_password';
CREATE DATABASE kisanlink_db OWNER kisanlink_user;
\c kisanlink_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
\q
```

### 2. Environment Variables
Create `backend/.env` (or copy from `backend/.env.example`):
```env
DATABASE_URL=postgresql+asyncpg://kisanlink_user:kisanlink_secure_password@localhost:5432/kisanlink_db
SYNC_DATABASE_URL=postgresql+psycopg2://kisanlink_user:kisanlink_secure_password@localhost:5432/kisanlink_db
JWT_SECRET_KEY=kisanlink_dev_super_secret_jwt_key_2026_change_in_prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
DEMO_AUTH_ENABLED=false
ALLOWED_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]
```

### 3. Install Dependencies & Migrate
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python seed_demo_data.py
```

To run the optional local EfficientNet-B2 provider, install the isolated CV
dependencies instead:

```bash
pip install -r requirements-cv.txt
```

`torch`, `torchvision`, and `timm` are kept out of the normal backend dependency
set because their platform wheels are large and materially increase deploy and
cold-start cost. Pillow stays in the normal set because the API must safely
decode and validate evidence images even when local inference is unavailable.

### Local image inspection foundation

The checkpoint and its explicit class/preprocessing metadata live in
`backend/models/`:

- `best_freshness_model.pth` — `timm` EfficientNet-B2 checkpoint
- `model_config.json` — RGB input, aspect-ratio-preserving resize, center crop,
  and ImageNet normalization
- `class_names.json` — binary `fresh` / `not_fresh` mapping

`POST /api/v1/freshness/analyze` accepts a multipart `sample` image and optional
`checkpoint` (`FARMER_GATE`, `LOGISTICS_PICKUP`, `LOGISTICS_DROPOFF`,
`WAREHOUSE_ENTRY`, or `WAREHOUSE_EXIT`). It validates the bounded upload and
actual decoded image, saves the original evidence under `uploads/freshness/`,
then runs the lazy singleton local provider. The response contains
`predicted_class`, `confidence`, `model`, and `source`.

`confidence` is the softmax confidence of the predicted binary class, stored as
`local_model_confidence` on `produce_inspections`. It is not a freshness
percentage, rot percentage, grade, shelf-life estimate, or whole-lot quality
measurement. The API never blocks a crop listing because of this signal.
Provider probabilities remain in the internal `provider_output` JSON for later
auditing and decision logic.

The migration creates a reusable `produce_inspections` evidence table rather
than putting model semantics directly on `crop_listings`:

```bash
cd backend
alembic upgrade head
```

The current endpoint leaves `crop_listing_id` nullable. A later custody phase can
link inspections to lots/containers while retaining checkpoint history without
redesigning the inference provider. Local images are publicly mounted at
`/uploads/freshness` only in development/demo/test when
`SERVE_LOCAL_INSPECTION_UPLOADS=true`. Local disk is acceptable for the SIH demo
but is ephemeral and publicly guessable by URL; production should use private
object storage, signed access, retention rules, and malware scanning.

If the model or CV dependencies are unavailable, the decoded original image is
still saved and a failed inspection record is retained; the API returns `503`
with the evidence URL and inspection ID. Restart the backend after repairing a
model-load failure because that process caches the failed lazy-load state.

### 4. Run Backend API Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Run Frontend Development Server
```bash
cd ../frontend
npm install
npm run dev
```

### 6. Run Test Suite
```bash
cd backend
.venv/bin/pytest tests/
```

---

## 6. Architecture Status & Logistics Migration Roadmap

The canonical Logistics backend router has been implemented at `backend/app/api/v1/logistics.py`:
- `GET /api/v1/logistics/shipments`: Full shipment overview linked to PostgreSQL `Shipment` and `Order` models.
- `POST /api/v1/logistics/verify-pickup-otp`: Two-factor cryptographic OTP pickup validation.
- `POST /api/v1/logistics/verify-delivery-otp`: Two-factor buyer delivery completion.
- `POST /api/v1/logistics/optimize-route`: Geospatial route waypoint sequencing via `routing_service.py`.

### Remaining Frontend Transition Steps
1. **Frontend Service Adapter**: Update `frontend/src/services/logisticsService.ts` to consume `/api/v1/logistics/*` endpoints via `apiClient.ts` as primary, while preserving `/api/state` for demo reset controls.
2. **Corridor Materialization**: When Market Maker corridors are created, emit both local state updates and persist canonical PostgreSQL records (`Shipment`, `Order`, `OrderFarmerAllocation`).
3. **Legacy Deprecation**: Retire `backend/app/api/legacy_logistics.py` once all frontend role dashboards fully migrate to `/api/v1` PostGIS spatial queries.
