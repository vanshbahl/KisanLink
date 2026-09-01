# KisanLink — Database Schema & Data Architecture

**Document Status:** Placeholder / Architecture Draft  
**Version:** 0.1.0  
**Parent Specification:** [Product Requirements Document (PRD)](./PRD.md) | [Implementation Plan](./IMPLEMENTATION_PLAN.md)  

---

## Document Scope & Purpose

This document will define the relational entity-relationship diagrams (ERD), PostgreSQL table DDLs, spatial indexes, foreign key constraints, migration workflows, and data seeding scripts for **KisanLink**.

---

## Planned Contents

When fully detailed in subsequent phases, this document will contain:

1. **Relational Entity-Relationship Diagram (ERD):** Visual table relations and cardinalities using Mermaid.
2. **PostgreSQL & PostGIS Table DDLs:**
   - `users`, `farmer_profiles`, `buyer_profiles`, `transporter_profiles`.
   - `crops`, `crop_listings` (with spatial coordinates `geog GEOGRAPHY(Point, 4326)` and `is_pre_harvest`), `harvest_schedules`.
   - `buyer_requirements`, `dynamic_clusters`, `cluster_items`.
   - `orders`, `order_items`, `shipments`, `route_waypoints`.
   - `price_records` (APMC mandi benchmarks), `demand_forecasts`.
   - `payments_ledger` (multi-split escrow entries), `dispute_tickets`, `operator_audit_logs`.
3. **Spatial Indexing & Query Optimizations:**
   - GiST spatial indexing on geodetic point coordinates (`CREATE INDEX idx_listings_geog ON crop_listings USING GIST(geog)`).
   - Compound indexes for multi-attribute marketplace filtering (`(crop_id, status, available_date)`).
4. **Data Integrity & Transactional Guarantees:**
   - Foreign key cascading policies, unique constraints, and check constraints (quantities $> 0$, prices $> 0$).
5. **Deterministic Seeding Specification:**
   - Seed scripts for the Delhi NCR – Haryana – Western UP agricultural corridor (Sonipat, Panipat, Karnal, Meerut, Delhi).

---
*For immediate development specifications, refer to [DOCS/IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).*
