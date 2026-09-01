# KisanLink (किसान लिंक)

> **Direct Farm-to-Buyer Operating System & Agricultural Supply Orchestration Network**  
> *Smart India Hackathon 2026 — Problem Statement 26033*  
> **Ministry:** Ministry of Consumer Affairs, Food & Public Distribution | Department of Consumer Affairs (DoCA)  
> **Theme:** Agriculture, FoodTech & Rural Development  
> **Team:** Team Aeris (SIH26033)  

---

## 🌾 Problem Statement & Solution Overview

### The Problem
In the traditional Indian agricultural supply chain, produce changes hands between 4 to 8 intermediaries (village aggregators, commission agents, wholesalers, retailers). This leads to:
- **Severe Price Degradation for Farmers:** Farmers capture only 20%–35% of the consumer retail price.
- **High Buyer Procurement Costs:** Bulk buyers (hotels, restaurants, processors, retail chains) pay stacked markups.
- **Post-Harvest Spoilage:** 15%–30% perishable crop loss due to delayed, unorganized transit.
- **Smallholder Fragmentation:** 86% of Indian farmers produce small batch yields (< 2 tonnes) that cannot satisfy institutional bulk demand (5–20 tonnes).

### The KisanLink Operating System
**KisanLink** is not merely an e-commerce marketplace—it is an **intelligent farm-to-buyer operating system** that:
1. **Aggregates Fragmented Supply:** Uses mathematical optimization to combine multiple nearby smallholder farmers into **Dynamic Farmer Clusters (Supply Pools)** to fulfill large bulk procurement orders without formal cooperative overhead.
2. **Reverse Marketplace:** Enables commercial buyers to publish forward procurement requirements rather than passively browsing listings.
3. **Shared Multi-Stop Logistics:** Employs **Google OR-Tools** to optimize multi-farm pickup routes and pool vehicle payloads, slashing freight costs and transit spoilage.
4. **Levels Information Asymmetry:** Delivers regional demand forecasting and indicative fair-price guidance anchored to APMC mandi benchmarks.
5. **Ensures Radical Rural Accessibility:** Provides an ultra-simple 6-card mobile interface in **Hindi and English**, spoken voice-to-listing NLP input via **BHASHINI**, and 1-tap **Call Support** (`हमसे बात करें`) with assisted operator proxy workflows.

---

## 🛠️ Technology Stack

```
+-------------------+--------------------------------------------------------------------------------+
| LAYER             | TECHNOLOGY SELECTION                                                           |
+-------------------+--------------------------------------------------------------------------------+
| **Frontend**      | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, MapLibre GL JS, i18next   |
| **PWA & Mobile**  | vite-plugin-pwa (Offline Shell, IndexedDB Drafts, Service Worker Caching)       |
| **Backend**       | Python 3.11+, FastAPI (Modular Monolith), Pydantic v2, SQLAlchemy 2 (Asyncpg)  |
| **Database**      | PostgreSQL 16 with PostGIS Extension (Native Geodetic Point Spatial Indexing)  |
| **Optimization**  | Google OR-Tools (CVRP Multi-Stop Routing) + SciPy / PuLP (MILP Supply Pooling) |
| **Machine Learn** | LightGBM / XGBoost Regressor (Regional APMC Demand Forecasting)                |
| **Speech & NLP**  | BHASHINI / AI4Bharat Speech-to-Text & Translation Abstraction                  |
| **Computer Vision**| MobileNetV3 Lightweight CNN (Indicative Produce Quality Grading)              |
| **Hosting & Cloud**| Cloudflare Pages (Frontend) + Railway (FastAPI) + Supabase (PostgreSQL/Storage)|
+-------------------+--------------------------------------------------------------------------------+
```

---

## 📚 Master Documentation Hub

The [`DOCS/`](./DOCS) directory contains the complete architectural, technical, design, and operational specifications for the platform:

| Document | Purpose & Description | Status |
|---|---|---|
| [**DOCS/PRD.md**](./DOCS/PRD.md) | **Product Requirements Document:** Problem statement, stakeholder personas, value propositions, feature modules, scope boundaries, and SIH success KPIs. | ✅ **Complete (v1.0)** |
| [**DOCS/IMPLEMENTATION_PLAN.md**](./DOCS/IMPLEMENTATION_PLAN.md) | **Implementation Plan & Roadmap:** 12 phased engineering timelines (Phase 0–11), schemas, OR-Tools integration, and demo runbook. | ✅ **Complete (v1.0)** |
| [**DOCS/TRD.md**](./DOCS/TRD.md) | **Technical Requirements Document:** System topology, modular monolith architecture, PostGIS geodetic queries, failure fallbacks, and security. | ✅ **Complete (v1.0)** |
| [**DOCS/FLOWS.md**](./DOCS/FLOWS.md) | **End-to-End System Flows:** Finite State Machines (FSMs), sequence diagrams, happy/failure paths, and assisted call-center proxy flows. | ✅ **Complete (v1.0)** |
| [**DOCS/UI_UX_DESIGN.md**](./DOCS/UI_UX_DESIGN.md) | **UI/UX Design System:** 6-card farmer UI wireframes, B2B procurement workspace, design tokens, color palette (`#236747`, `#F7F4EB`), and typography. | ✅ **Complete (v1.0)** |
| [**DOCS/API_DESIGN.md**](./DOCS/API_DESIGN.md) | **REST API & WebSocket Specs:** OpenAPI 3.1 contracts across 21 domain routers, request/response models, and demo state reset endpoint. | ✅ **Complete (v1.0)** |
| [**DOCS/DATABASE_DESIGN.md**](./DOCS/DATABASE_DESIGN.md) | **Database Schema & PostGIS DDL:** Normalized PostgreSQL DDLs, spatial GiST indexes, foreign key cascading, and Mermaid ERD. | ✅ **Complete (v1.0)** |
| [**DOCS/AI_SYSTEMS.md**](./DOCS/AI_SYSTEMS.md) | **AI, ML & Optimization Specs:** Mathematical models for demand forecasting, MILP clustering, OR-Tools routing, voice NLP, and fallback safeguards. | ✅ **Complete (v1.0)** |
| [**DOCS/DEPLOYMENT.md**](./DOCS/DEPLOYMENT.md) | **Deployment & Infrastructure Guide:** Cloudflare + Railway + Supabase topology, Docker Compose local setup, env vars, and health probes. | ✅ **Complete (v1.0)** |
| [**DOCS/FUTURE_ROADMAP.md**](./DOCS/FUTURE_ROADMAP.md) | **Future Roadmap (Post-MVP):** Formal FPO cooperative management, back-office operations CRM, cloud telephony IVR, and IoT cold-chain telemetry. | ✅ **Complete (v1.0)** |

---

## 🎯 Target SIH 2026 Golden Path Demo Scenario

The entire system is optimized to demonstrate a single complete agricultural transaction across the **Delhi NCR – Sonipat – Panipat corridor**:

```
                                  SIH DEMO GOLDEN PATH
                                  
   [STEP 1: Farmer Pre-Harvest]     ➔   Ramesh (Sonipat) lists 1.2T tomatoes ready in 3 days @ ₹25/kg.
                                         (Demonstrating Hindi voice input & Fair Price Guidance).
                                         
   [STEP 2: Supply Aggregation]     ➔   System already contains Farmers B (0.8T), C (1.7T), D (1.3T).
   
   [STEP 3: Buyer Requirement]      ➔   Delhi Hotel Chain posts need for 5.0 Tonnes Tomatoes @ max ₹28/kg.
   
   [STEP 4: AI Cluster & Match]     ➔   MILP Solver clusters Farmers A+B+C+D into Dynamic Pool #TC-104 (5.0T).
   
   [STEP 5: Order & Escrow Lock]    ➔   Buyer accepts; ₹1,37,500 locked in simulated escrow custody.
   
   [STEP 6: Route Optimization]     ➔   Google OR-Tools generates multi-stop pickup route for 1 truck:
                                         Depot ➔ Farm C ➔ Farm A ➔ Farm D ➔ Farm B ➔ Delhi Hotel.
                                         
   [STEP 7: Delivery & Split Pay]   ➔   Driver delivers; Buyer enters OTP; Escrow instantly splits:
                                         Farmer A: ₹30,000 | Farmer B: ₹20,000 | Farmer C: ₹42,500 | 
                                         Farmer D: ₹32,500 | Transporter: ₹12,500.
                                         
   [STEP 8: Live Impact Metrics]    ➔   Dashboard shows real-time impact:
                                         Farmer Net Gain: +32.4% | Buyer Savings: 18.1% | 
                                         Distance Saved: 68 km | Wastage Prevented: 600 kg.
```

---

## 💻 Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

### Quick Start (Single-Command Docker Boot)
```bash
# Clone the repository
git clone https://github.com/vanshbahl/KisanLink.git
cd KisanLink

# Launch local PostgreSQL (with PostGIS), FastAPI backend, and React/Vite frontend
docker-compose up --build
```

- **Frontend App:** `http://localhost:5173`
- **FastAPI Backend & Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/v1/healthz`

---

## 👥 Team & Attribution

**Smart India Hackathon 2026** - *Problem Statement 26033*  
**Team Aeris**  
*Maintained for the Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution.*
