# KisanLink — End-to-End System Flows & State Machines

**Document Status:** Placeholder / Architecture Draft  
**Version:** 0.1.0  
**Parent Specification:** [Product Requirements Document (PRD)](./PRD.md) | [Implementation Plan](./IMPLEMENTATION_PLAN.md)  

---

## Document Scope & Purpose

This document will provide comprehensive sequence diagrams, finite state machine (FSM) specifications, and user journey flowcharts across all actors (Farmer, Buyer, Transporter, Call-Center Operator).

---

## Planned Contents

When fully detailed in subsequent phases, this document will contain:

1. **State Machine Specifications:**
   - `OrderState` FSM (`DRAFT` ➔ `MATCHED` ➔ `CONFIRMED` ➔ `ESCROW_LOCKED` ➔ `PICKUP_SCHEDULED` ➔ `IN_TRANSIT` ➔ `DELIVERED` ➔ `SETTLED` / `DISPUTED` / `CANCELLED`).
   - `ListingState` FSM (`ACTIVE`, `RESERVED`, `HARVESTED`, `EXPIRED`, `RESCUE_ACTIVE`).
   - `ShipmentState` FSM (`ASSIGNED`, `PICKUP_PROGRESS`, `TRANSIT`, `DELIVERED`).
2. **End-to-End Actor Interaction Flows:**
   - Forward Listing & Pre-Harvest Discovery Flow.
   - Reverse Marketplace & Procurement Requirement Posting Flow.
   - Dynamic Farmer Clustering & Multi-Farmer Match Agreement Flow.
   - Multi-Stop Pickup, In-Transit Handover & Proof of Delivery (PoD) Flow.
   - Escrow Lock, Multi-Party Split Settlement & Payout Flow.
   - Assisted Tele-Support & Call-Center Proxy Execution Flow.
3. **Exception & Dispute Resolution Flows:**
   - Quantity / Weight discrepancy handling at farm pickup vs. buyer delivery.
   - Transit delay, carrier re-dispatch, and partial escrow withhold workflows.

---
*For immediate development specifications, refer to [DOCS/IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).*
