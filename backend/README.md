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

---

## 3. Temporary Logistics Prototype Boundary

Arshdeep's backend did not implement the Logistics module. To keep the existing frontend Logistics dashboard and prototype workflows working without disruption, Logistics is strictly isolated:

- **Boundary Router**: `backend/app/api/legacy_logistics.py`
- **Endpoints**:
  - `GET /api/state`
  - `PUT /api/state`
  - `POST /api/reset`
  - `GET /api/logistics/pickups`
  - `GET /api/logistics/deliveries`
  - `GET /api/logistics/routes`
  - `GET /api/logistics/vehicles`
- **Data Store**: SQLite / in-memory demo state (`kisanlink.db` or seed fixture).
- **Scope**: Used **only** by `logisticsService.ts` and legacy demo reset controls. Farmer, Consumer, and Bulk domains **never** write duplicate data to this state.

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
6. **Authentication**: Passwordless phone OTP with demo code `123456`. Header format: `Authorization: Bearer <token>`.
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
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
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

### 4. Run Backend API Server
```bash
uvicorn app.main:app --reload --port 8001
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

## 6. Next Developer Handoff: Real Logistics Backend Migration

The next developer or AI coding agent should migrate the Logistics domain into the canonical architecture following these exact steps:

1. **Models**: Review `app/models/logistics.py` and `app/models/user.py` (`LogisticsProfile`). Add any missing fields for routes, route stops, and inspection checklists.
2. **Schemas**: Add request and response schemas in `app/schemas/logistics.py`.
3. **Router**: Create `app/api/v1/logistics.py` with endpoints:
   - `GET /api/v1/logistics/overview`: Fleet & delivery status summary
   - `GET /api/v1/logistics/pickups`: Pending and active farmer pick-ups linked to `OrderFarmerAllocation`
   - `PATCH /api/v1/logistics/pickups/{id}`: Driver assignment, checklist verification, OTP pickup validation
   - `GET /api/v1/logistics/deliveries`: Consolidator deliveries to buyer destinations
   - `GET /api/v1/logistics/routes`: Spatial vehicle routes using PostGIS line geometries
   - `GET /api/v1/logistics/vehicles`: Fleet management
4. **Mount Router**: Add to `app/api/v1/__init__.py`.
5. **Update Frontend Service**: Point `frontend/src/services/logisticsService.ts` to `apiClient` routes instead of `/api/state`.
6. **Deprecate**: Remove `app/api/legacy_logistics.py` once the PostgreSQL logistics router is active.
