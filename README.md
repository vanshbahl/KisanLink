# KisanLink (किसान लिंक)

> **Direct Farm-to-Buyer Operating System & Agricultural Supply Orchestration Network**  
> *Smart India Hackathon 2026 — Problem Statement 26033*  
> **Ministry:** Ministry of Consumer Affairs, Food & Public Distribution | Department of Consumer Affairs (DoCA)  
> **Theme:** Agriculture, FoodTech & Rural Development  

---

## 🌾 Overview

**KisanLink** is an intelligent farm-to-buyer operating system that eliminates exploitative agricultural middlemen. By dynamically clustering fragmented smallholder farm yields, forecasting regional demand, guiding fair farm-gate pricing, and optimizing multi-stop shared logistics, KisanLink ensures **farmers earn 25–35% more** while **bulk buyers and consumers pay 15–25% less**.

---

## 📚 Project Documentation Hub

All architectural specifications, requirements, technical designs, and implementation roadmaps are maintained in the [`DOCS/`](./DOCS) directory:

| Document | Description | Status |
|---|---|---|
| [**DOCS/PRD.md**](./DOCS/PRD.md) | **Master Product Requirements Document** (Vision, User Personas, Feature Modules, Economic Models, MVP Scope) | ✅ **Complete (v1.0)** |
| [**DOCS/IMPLEMENTATION_PLAN.md**](./DOCS/IMPLEMENTATION_PLAN.md) | **System Implementation Plan** (Phase 0–11 Roadmap, Schemas, OR-Tools Routing, AI/ML Engines, Demo Runbook) | ✅ **Complete (v1.0)** |
| [**DOCS/TRD.md**](./DOCS/TRD.md) | **Technical Requirements Document** (Topology, Concurrency, Performance Benchmarks, Fault Tolerance) | 📝 Placeholder |
| [**DOCS/FLOWS.md**](./DOCS/FLOWS.md) | **End-to-End System Flows & State Machines** (FSMs, Order Lifecycles, Sequence Diagrams) | 📝 Placeholder |
| [**DOCS/UI_UX_DESIGN.md**](./DOCS/UI_UX_DESIGN.md) | **UI/UX Design System** (Ultra-Simple 6-Card Farmer UI, B2B Procurement Workspace, Design Tokens) | 📝 Placeholder |
| [**DOCS/API_DESIGN.md**](./DOCS/API_DESIGN.md) | **REST API & WebSocket Specifications** (OpenAPI 3.1 Endpoint Contracts, Request/Response Schemas) | 📝 Placeholder |
| [**DOCS/DATABASE_DESIGN.md**](./DOCS/DATABASE_DESIGN.md) | **Database Schema & Data Architecture** (PostgreSQL 16 + PostGIS Table DDLs, Spatial GiST Indexes) | 📝 Placeholder |
| [**DOCS/AI_SYSTEMS.md**](./DOCS/AI_SYSTEMS.md) | **AI, ML & Optimization Specifications** (Demand Forecasting, Google OR-Tools CVRP, Voice NLP Intent Parser) | 📝 Placeholder |
| [**DOCS/DEPLOYMENT.md**](./DOCS/DEPLOYMENT.md) | **Deployment & Infrastructure Guide** (Docker Compose, Single-Command Startup, Seed Scripts) | 📝 Placeholder |
| [**DOCS/FUTURE_ROADMAP.md**](./DOCS/FUTURE_ROADMAP.md) | **Future Roadmap & Post-MVP Scope** (Formal FPO Management, Operations CRM, IoT Cold Chain) | 📝 Placeholder |

---

## 🎯 Target SIH 2026 Golden Path Demo

The platform is designed around demonstrating a single complete agricultural transaction:
1. **Farmer Pre-Harvest Listing:** Sonipat farmer lists 1.2T tomatoes via native Hindi voice input; receives fair-price guidance.
2. **Reverse Marketplace Posting:** Delhi hotel posts 5.0T tomato requirement.
3. **Dynamic Farmer Clustering:** Matching engine automatically aggregates 4 nearby farmers into a single 5.0T supply pool.
4. **Simulated Escrow Lock:** Buyer secures funds in escrow; farmers receive guaranteed harvest confirmations.
5. **Google OR-Tools Route Optimization:** Generates optimal multi-farm pickup route for a single 5.0T truck.
6. **Delivery & Instant Split Settlement:** Buyer verifies delivery OTP; escrow instantly splits payments to each farmer and the transporter.
7. **Live Macroeconomic Impact:** Dashboard displays real-time farmer income improvement (+32.4%), buyer savings (18.1%), and transport km saved (68 km).

---
*Maintained by Team Aeris for Smart India Hackathon 2026 SIH26033*
