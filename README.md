# KisanLink (किसान लिंक)

> **Direct Farm-to-Buyer Operating System & Agricultural Supply Orchestration Network**  
> *Smart India Hackathon 2026 — Problem Statement 26033*  
> **Ministry:** Ministry of Consumer Affairs, Food & Public Distribution | Department of Consumer Affairs (DoCA)  
> **Theme:** Agriculture, FoodTech & Rural Development  
> **Team:** Team Aeris (SIH26033)  

---

## Problem Statement & Solution Overview

### The Problem
In the traditional Indian agricultural supply chain, produce changes hands between 4 to 8 intermediaries (village aggregators, commission agents, wholesalers, retailers). This leads to:
- **Severe Price Degradation for Farmers:** Farmers capture only 20%–35% of the consumer retail price.
- **High Buyer Procurement Costs:** Bulk buyers (hotels, restaurants, processors, retail chains) and consumers pay stacked markups.
- **Post-Harvest Spoilage:** 15%–30% perishable crop loss due to delayed, unorganized transit.
- **Smallholder Fragmentation:** 86% of Indian farmers produce small batch yields (< 2 tonnes) that cannot justify dedicated direct logistics without excessive freight-per-kg penalty.

### The KisanLink Operating System
**KisanLink** is not merely an e-commerce catalog—it is an **intelligent farm-to-buyer operating system** that bridges smallholder farms directly with institutional buyers and consumers through five core innovations:

1. **Market Maker (Flagship Feasibility Engine):** A deterministic, closed-form mathematical engine that pools fragmented supply lots and fragmented buyer demand against live vehicle fleet availability. It computes the exact break-even threshold volume where fixed transport costs pay for themselves while keeping the farmer's floor price 100% protected and buyer delivered prices strictly below traditional retail.
2. **Reverse Marketplace & Supply Pooling:** Commercial bulk buyers publish procurement requirements with target prices and delivery windows; KisanLink automatically clusters nearby farm yields to fulfill orders without formal cooperative overhead.
3. **Shared Multi-Stop Logistics:** Optimizes multi-farm pickup routes and pooled vehicle payloads, slashing empty miles (deadhead runs) and transit spoilage.
4. **Unified Consumer Direct Marketplace:** Integrates instant search, category filtering, sort controls, and transparent price breakdown directly on the Consumer Home dashboard, showing farm-direct savings against local retail benchmarks.
5. **Radical Rural Accessibility:** Delivers an ultra-simple mobile-first interface in **Hindi and English**, spoken voice-to-listing parsing backed by **Google Gemini** with structured regex fallback, and 1-tap **Call Support** (`1800 123 4567`) with operator proxy auditability.

---

## Technology Stack

```
+-------------------+--------------------------------------------------------------------------------+
| LAYER             | IMPLEMENTED TECHNOLOGY SELECTION                                               |
+-------------------+--------------------------------------------------------------------------------+
| **Frontend**      | React 18, TypeScript, Vite, Custom Vanilla CSS Design System, MapLibre GL JS   |
| **Icons & Audio** | Lucide React, Web Speech API (with browser permission & error recovery)        |
| **State & Engine**| Custom Async Data Hooks, Shared Prototype State Engine, Market Maker Calculator|
| **Backend**       | Python 3.11+, FastAPI (Modular Monolith), Pydantic v2, SQLAlchemy 2 (Asyncpg)  |
| **Databases**     | PostgreSQL 16+ / PostGIS (Canonical Core) + SQLite (Logistics Prototype Store) |
| **AI & NLP**      | Gemini AI NLP Listing Parser (`/api/v1/listings/parse-voice`) + Regex Fallback |
| **Routing / Maps**| MapLibre GL JS + CartoCDN Positron Vector Basemap (with Schematic Fallback UI) |
| **Hosting & Cloud**| Cloudflare Pages / Vercel (Frontend) + Railway / Render (FastAPI / PostgreSQL) |
+-------------------+--------------------------------------------------------------------------------+
```

---

## Master Documentation Hub

The [`DOCS/`](./DOCS) directory contains complete architectural, technical, design, and operational specifications:

| Document | Purpose & Description | Status |
|---|---|---|
| [**DOCS/MARKET_MAKER.md**](./DOCS/MARKET_MAKER.md) | **Master Market Maker Specification:** Mathematical engine, break-even threshold derivation, role views, UI components, and state propagation. | ✅ **Implemented & Canonical** |
| [**DOCS/PRD.md**](./DOCS/PRD.md) | **Product Requirements Document:** Problem statement, stakeholder personas, value propositions, feature modules, scope boundaries, and SIH success KPIs. | ✅ **Synchronized** |
| [**DOCS/TRD.md**](./DOCS/TRD.md) | **Technical Requirements Document:** System topology, modular architecture, PostGIS geodetic queries, failure fallbacks, and security. | ✅ **Synchronized** |
| [**DOCS/FLOWS.md**](./DOCS/FLOWS.md) | **End-to-End System Flows:** State machines (FSMs), Market Maker lifecycle, happy/failure paths, and assisted operator proxy flows. | ✅ **Synchronized** |
| [**DOCS/UI_UX_DESIGN.md**](./DOCS/UI_UX_DESIGN.md) | **UI/UX Design System:** Mobile-first 5-slot navigation, elevated center action, Market Maker visual widgets, design tokens, and color system. | ✅ **Synchronized** |
| [**DOCS/API_DESIGN.md**](./DOCS/API_DESIGN.md) | **REST API Specifications:** Canonical `/api/v1/*` contracts, Gemini voice extraction, and prototype state sync endpoints. | ✅ **Synchronized** |
| [**DOCS/DATABASE_DESIGN.md**](./DOCS/DATABASE_DESIGN.md) | **Database Schema & PostGIS DDL:** PostgreSQL DDLs, spatial GiST indexes, foreign keys, and prototype envelope. | ✅ **Synchronized** |
| [**DOCS/AI_SYSTEMS.md**](./DOCS/AI_SYSTEMS.md) | **AI & Optimization Systems:** Closed-form Market Maker engine, Gemini voice NLP, pricing benchmarks, and realistic roadmap status. | ✅ **Synchronized** |
| [**DOCS/DEPLOYMENT.md**](./DOCS/DEPLOYMENT.md) | **Deployment & Infrastructure Guide:** Container setup, environment variables, health probes, and local orchestration. | ✅ **Synchronized** |
| [**DOCS/FUTURE_ROADMAP.md**](./DOCS/FUTURE_ROADMAP.md) | **Future Roadmap (Post-MVP):** Formal FPO cooperative ERP, cloud telephony IVR, and IoT cold-chain telemetry. | ✅ **Synchronized** |

---

## Target SIH 2026 Golden Demo Scenario

The entire system is optimized to demonstrate an end-to-end direct agricultural transaction across the **Sonipat – New Delhi Corridor** (42 km):

```
                                  SIH 2026 GOLDEN DEMO
                                  
   [STEP 1: Farmer Produce & Voice] ➔   Farmer Ramesh (Sonipat) speaks into mic in Hindi:
                                        "मुझे 725 किलो टमाटर ₹28 प्रति किलो में बेचने हैं..."
                                        Gemini parses text into listing draft with zero commission.
                                         
   [STEP 2: Market Maker Discovery] ➔   Farmer views Market Maker Pulse Card: 
                                        Needs 40 kg more demand to break even on a dedicated trip.
                                        Farmer taps "Give 40 kg more" from listing to boost pool.
   
   [STEP 3: Buyer Pooled Demand]    ➔   Bulk Buyer (FreshKart) commits 200 kg; Consumer pool commits 93 kg.
                                        Committed demand reaches 333 kg (100% threshold)!
                                        Market Demand Ring closes and turns vibrant green.
   
   [STEP 4: Direct Market Creation] ➔   Presenter taps "Create the direct market".
                                        Unlock Reveal animation opens; atomic transactions populate:
                                        • Farmer Order @ ₹28.00/kg protected floor.
                                        • Bulk Procurement Order @ ₹33.02/kg delivered.
                                        • One pooled multi-farm route (RTE-MM-XXXX) on Tata Ace (750 kg).
                                         
   [STEP 5: Logistics & Fleet]      ➔   Logistics console shows active corridor, multi-stop pickup manifest,
                                        and real-time impact metrics (+28.5% Farmer Gain, 14.2% Buyer Saving).
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- Virtualenv (`python3 -m venv .venv`)

### 1. Frontend Quick Start
```bash
cd frontend
npm install
npm run dev
```
- **Frontend URL:** `http://localhost:5173`

### 2. Backend Quick Start
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- **Backend API URL:** `http://localhost:8000`
- **Swagger Interactive API Docs:** `http://localhost:8000/docs`

---

## Team & Attribution

**Smart India Hackathon 2026** — *Problem Statement 26033*  
**Team Aeris**  
*Maintained for the Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution.*
