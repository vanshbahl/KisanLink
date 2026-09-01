# KisanLink — REST API & WebSocket Specifications

**Document Status:** Placeholder / Architecture Draft  
**Version:** 0.1.0  
**Parent Specification:** [Product Requirements Document (PRD)](./PRD.md) | [Implementation Plan](./IMPLEMENTATION_PLAN.md)  

---

## Document Scope & Purpose

This document will provide OpenAPI 3.1 compatible API endpoint contracts, request/response JSON schemas, authentication header specifications, error code mappings, and WebSocket event payloads for **KisanLink**.

---

## Planned Contents

When fully detailed in subsequent phases, this document will contain:

1. **Authentication & Session Endpoints (`/api/v1/auth`):**
   - `POST /request-otp`: Trigger 6-digit SMS OTP.
   - `POST /verify-otp`: Validate token and return JWT + user role payload.
   - `GET /me`: Fetch authenticated user profile.
2. **Farmer Listings Endpoints (`/api/v1/listings`):**
   - `POST /`: Create standard or pre-harvest crop listing.
   - `GET /`: Query listings with spatial bounding box, crop, price, and harvest date filters.
   - `POST /parse-voice`: Process audio/transcribed text into structured listing JSON.
3. **Buyer Requirements Endpoints (`/api/v1/requirements`):**
   - `POST /`: Publish procurement requirement (Reverse Marketplace).
   - `GET /{id}/matches`: Fetch recommended individual farmers and dynamic clusters.
4. **Matching & Optimization Endpoints (`/api/v1/matching`):**
   - `POST /cluster`: Execute dynamic supply pooling solver for target demand.
5. **Logistics & Routing Endpoints (`/api/v1/logistics`):**
   - `POST /optimize-route`: Execute Google OR-Tools multi-stop pickup routing.
   - `GET /shipments/{id}`: Fetch live shipment manifest and waypoint milestones.
6. **Order & Escrow Endpoints (`/api/v1/orders`):**
   - `POST /`: Create order from listing or dynamic cluster.
   - `POST /{id}/lock-escrow`: Secure buyer funds.
   - `POST /{id}/confirm-delivery`: Verify delivery OTP and trigger automated split settlements.
7. **Intelligence, Pricing & Impact Endpoints (`/api/v1/pricing`, `/api/v1/impact`):**
   - `GET /pricing/guidance`: Retrieve fair-price band and mandi benchmarks.
   - `GET /forecasting/regional`: Retrieve regional demand forecast indices.
   - `GET /impact/summary`: Retrieve live SIH macroeconomic impact metrics.

---
*For immediate development specifications, refer to [DOCS/IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).*
