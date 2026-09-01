# KisanLink — Deployment & Infrastructure Guide

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.0.0  
**Status:** Approved Deployment & DevOps Specification  
**Hosting Architecture:** Cloudflare (React PWA) + Railway (FastAPI Monolith) + Supabase (PostgreSQL 16 / PostGIS / Storage)  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Deployment Philosophy & Infrastructure Principles](#1-deployment-philosophy--infrastructure-principles)
2. [High-Level Hosting Topology](#2-high-level-hosting-topology)
3. [Environment Architecture (Dev / Demo / Prod)](#3-environment-architecture)
4. [Local Development Setup (Docker Compose)](#4-local-development-setup-docker-compose)
5. [Frontend Deployment (Cloudflare Pages)](#5-frontend-deployment-cloudflare-pages)
6. [Backend Deployment (Railway Managed Python Host)](#6-backend-deployment-railway-managed-python-host)
7. [Database & Storage Infrastructure (Supabase PostGIS)](#7-database--storage-infrastructure-supabase-postgis)
8. [Environment Variables & Secrets Matrix](#8-environment-variables--secrets-matrix)
9. [Database Migration Strategy (Alembic)](#9-database-migration-strategy-alembic)
10. [Health Checks, Liveness & Readiness Probes](#10-health-checks-liveness--readiness-probes)
11. [Structured Logging & Error Telemetry](#11-structured-logging--error-telemetry)
12. [CORS & Security Headers Configuration](#12-cors--security-headers-configuration)
13. [Demo Reliability & Instant Reset Strategy](#13-demo-reliability--instant-reset-strategy)
14. [External Service Outage Fallback Operations](#14-external-service-outage-fallback-operations)
15. [Disaster Recovery & Backup Protocols](#15-disaster-recovery--backup-protocols)

---

## 1. Deployment Philosophy & Infrastructure Principles

- **Zero Unnecessary Enterprise Overhead:** No Kubernetes clusters, no multi-region distributed microservices.
- **Single-Command Developer Boot:** `docker-compose up --build` launches the full stack locally with PostGIS and seed data.
- **Serverless Frontend Edge:** React 18 + Vite PWA deployed globally via Cloudflare Pages for sub-50ms static asset delivery.
- **Managed Backend Simplicity:** FastAPI modular monolith deployed on Railway with automated TLS and environment isolation.

---

## 2. High-Level Hosting Topology

```mermaid
graph TD
    classDef edge fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef compute fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    classDef db fill:#fbe9e7,stroke:#d84315,stroke-width:2px;
    classDef ext fill:#fff3e0,stroke:#e65100,stroke-width:2px;

    Client[Web & Mobile Browsers] -->|HTTPS Edge Anycast| CF[Cloudflare Pages\n(React 18 + Vite PWA Assets)]:::edge
    Client -->|REST API over TLS| Railway[Railway FastAPI Monolith\n(Uvicorn / Python 3.11)]:::compute

    Railway --> SupabaseDB[("Supabase PostgreSQL 16\n(+ PostGIS Spatial Engine)")]:::db
    Railway --> SupabaseStorage[("Supabase Storage\n(Crop Images & Signatures)")]:::db

    Railway --> BhashiniAPI["BHASHINI API\n(Speech & Translation)"]:::ext
    Railway --> OSRM["OSRM Routing Server\n(Road Distance Matrices)"]:::ext
```

---

## 3. Environment Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    ENVIRONMENT SPECIFICATIONS                                      |
+--------------------+-----------------------------+-------------------------------------------------+
| ENVIRONMENT        | FRONTEND TARGET             | BACKEND TARGET & DATABASE                       |
+--------------------+-----------------------------+-------------------------------------------------+
| **Local Dev**      | `http://localhost:5173`     | `http://localhost:8000` (Local PostGIS Docker)  |
| **SIH Demo**       | `https://demo.kisanlink.in` | `https://api-demo.kisanlink.in` (Supabase Demo) |
| **Production**     | `https://app.kisanlink.in`  | `https://api.kisanlink.in` (Supabase Prod)      |
+--------------------+-----------------------------+-------------------------------------------------+
```

---

## 4. Local Development Setup (Docker Compose)

The repository provides a single `docker-compose.yml` for zero-configuration local development:

```yaml
version: '3.8'

services:
  kisanlink-db:
    image: postgis/postgis:16-3.4
    container_name: kisanlink-db
    environment:
      POSTGRES_USER: kisanlink_user
      POSTGRES_PASSWORD: kisanlink_secure_password
      POSTGRES_DB: kisanlink_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kisanlink_user -d kisanlink_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  kisanlink-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kisanlink-backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://kisanlink_user:kisanlink_secure_password@kisanlink-db:5432/kisanlink_db
      - ENVIRONMENT=development
      - JWT_SECRET_KEY=local_insecure_dev_secret_key_12345
    depends_on:
      kisanlink-db:
        condition: service_healthy

  kisanlink-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: kisanlink-frontend
    command: npm run dev -- --host 0.0.0.0 --port 5173
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api/v1
    depends_on:
      - kisanlink-backend

volumes:
  pgdata:
```

---

## 5. Frontend Deployment (Cloudflare Pages)

1. **Build Configuration:**
   - Framework Preset: `Vite`.
   - Root Directory: `frontend`.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
2. **SPA Routing Rule:** Single `_redirects` file in `public/`:
   ```
   /*    /index.html   200
   ```
3. **Caching Headers:** Service worker and HTML non-cached; hashed JS/CSS cached for 1 year (`Cache-Control: public, max-age=31536000, immutable`).

---

## 6. Backend Deployment (Railway Managed Python Host)

1. **Build Command:** `pip install -r requirements.txt`.
2. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`.
3. **Railway Environment:** Python 3.11 runtime with auto-healing container restarts.

---

## 7. Database & Storage Infrastructure (Supabase PostGIS)

1. **PostgreSQL 16 Extensions Enabled:**
   - `postgis` (v3.4+ geodetic types).
   - `uuid-ossp` (UUID primary keys).
2. **Connection Pooling:** Supabase Transaction Mode pooler on port `6543` for async SQLAlchemy engine connections.
3. **Storage Buckets:** `crop-images` (public read, authenticated write) and `pod-signatures` (private signed URLs).

---

## 8. Environment Variables & Secrets Matrix

### Backend `.env.example`
```env
# Application
ENVIRONMENT=development
PORT=8000
ALLOWED_CORS_ORIGINS=http://localhost:5173,https://demo.kisanlink.in

# Database (PostgreSQL + PostGIS)
DATABASE_URL=postgresql+asyncpg://kisanlink_user:password@localhost:5432/kisanlink_db

# Security & JWT
JWT_SECRET_KEY=generate_with_openssl_rand_hex_32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# External Integration Credentials
BHASHINI_API_KEY=bhashini_sandbox_key
BHASHINI_USER_ID=bhashini_user_id
BHASHINI_PIPELINE_ID=bhashini_pipeline_id
OSRM_TABLE_URL=https://router.project-osrm.org/table/v1/driving/
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=supabase_secret_key
```

### Frontend `.env.example`
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEFAULT_LANGUAGE=hi
VITE_MAP_TILE_URL=https://demotiles.maplibre.org/style.json
```

---

## 9. Database Migration Strategy (Alembic)

1. Generate new migration script:
   ```bash
   alembic revision --autogenerate -m "create_initial_postgis_schema"
   ```
2. Execute migrations against database:
   ```bash
   alembic upgrade head
   ```
3. Rollback single migration:
   ```bash
   alembic downgrade -1
   ```

---

## 10. Health Checks, Liveness & Readiness Probes

- **Liveness Probe (`GET /healthz`):** Returns `{"status": "ok"}` when the FastAPI process is responsive.
- **Readiness Probe (`GET /readyz`):** Executes `SELECT 1` on PostgreSQL and verifies PostGIS extension status.

---

## 11. Structured Logging & Error Telemetry

- Python `structlog` emitting standardized JSON logs:
  ```json
  {
    "timestamp": "2026-09-01T10:15:30.124Z",
    "level": "INFO",
    "request_id": "req-9821a",
    "path": "/api/v1/matching/cluster",
    "status_code": 200,
    "duration_ms": 41.2
  }
  ```

---

## 12. CORS & Security Headers Configuration

- Strict origin filtering limiting API access to authorized frontend domains.
- Standard security headers injected via FastAPI middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 13. Demo Reliability & Instant Reset Strategy

To ensure zero downtime or state corruption during back-to-back SIH judging rounds:
- **Instant Reset Endpoint (`POST /api/v1/demo/reset`):**
  - Truncates all active orders, clusters, and temporary test listings.
  - Re-seeds the baseline Delhi NCR corridor dataset in $< 1.0\text{ second}$.
  - Resets simulated escrow balances and driver locations.

---

## 14. External Service Outage Fallback Operations

- **BHASHINI Speech API Outage:** Backend falls back to internal Web Speech API transcription / structured touch form wizard.
- **OSRM Routing Outage:** Backend falls back to local Euclidean distance matrix with $1.3\times$ road factor.
- **Payment Sandbox Outage:** Backend simulates instantaneous ledger commitments locally.

---

## 15. Disaster Recovery & Backup Protocols

- Automated daily logical backups on Supabase PostgreSQL with 7-day Point-in-Time Recovery (PITR).
- Deterministic seed script (`scripts/seed_demo_data.py`) can reconstruct a fully functional demo database from scratch in 5 seconds.

---
*End of KisanLink Deployment & Infrastructure Guide*
