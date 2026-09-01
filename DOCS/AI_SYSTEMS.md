# KisanLink — AI, Machine Learning & Optimization Specifications

**Document Status:** Placeholder / Architecture Draft  
**Version:** 0.1.0  
**Parent Specification:** [Product Requirements Document (PRD)](./PRD.md) | [Implementation Plan](./IMPLEMENTATION_PLAN.md)  

---

## Document Scope & Purpose

This document will detail the mathematical models, machine learning architectures, training pipelines, optimization formulation, and conversational/vision inference systems powering **KisanLink**.

---

## Planned Contents

When fully detailed in subsequent phases, this document will contain:

1. **System Separation: Deterministic vs. Optimization vs. AI/ML:**
   - Explicit boundaries ensuring financial, order state, and quantity logic remain 100% deterministic.
2. **Regional Demand & Price Forecasting Engine:**
   - LightGBM / XGBoost regression pipeline predicting 7-day and 14-day crop demand indices based on historical mandi arrivals, seasonal trends, festival calendars, and active buyer procurement requests.
   - Translation of numeric regression into simple farmer-facing status indicators: `High Demand` / `Normal` / `Low Demand`.
3. **Dynamic Farmer Clustering Solver:**
   - Mixed-Integer Linear Programming (MILP) formulation using SciPy / PuLP to aggregate individual farm quantities into minimum-cost, geographically compact supply clusters.
4. **Google OR-Tools Vehicle Routing Problem (CVRP) Engine:**
   - Multi-stop pickup waypoint optimization with capacity constraints, time windows, and distance minimization.
5. **Multilingual Voice & NLP Parser:**
   - Web Speech API + Whisper / LLM structured JSON intent extractor for spoken Hindi and English crop listing creation.
6. **Indicative Produce Computer Vision Grading (Stretch):**
   - MobileNetV3 / Vision API classifier estimating surface defects, color consistency, and indicative quality grade (Grade A / B / Process Grade).
7. **Graceful Degradation & Fallback Safeguards:**
   - Algorithmic fallbacks for every AI model to guarantee 100% system availability even when ML services are offline.

---
*For immediate development specifications, refer to [DOCS/IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).*
