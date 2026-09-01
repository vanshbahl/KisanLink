# KisanLink — AI, Machine Learning & Optimization Specifications

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.0.0  
**Status:** Approved Intelligence Systems Specification  
**Architecture Principle:** Mathematical Optimization for Logistics & Pooling; Statistical ML for Forecasting; NLP for Speech; Strict Deterministic Bounds for Commerce  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Intelligence Systems Philosophy & Taxonomy](#1-intelligence-systems-philosophy--taxonomy)
2. [Classification Matrix (Deterministic vs. Optimization vs. ML vs. NLP vs. Vision)](#2-classification-matrix)
3. [System 1: Regional Demand Forecasting (ML / LightGBM)](#3-system-1-regional-demand-forecasting)
4. [System 2: Forward Supply Forecasting (Statistical & Time-Series)](#4-system-2-forward-supply-forecasting)
5. [System 3: Multi-Criteria Farmer-Buyer Matching Engine (Scoring Function)](#5-system-3-multi-criteria-farmer-buyer-matching-engine)
6. [System 4: Dynamic Farmer Supply Clustering (Mixed-Integer Linear Programming)](#6-system-4-dynamic-farmer-supply-clustering)
7. [System 5: Logistics Route Optimization (Google OR-Tools CVRP)](#7-system-5-logistics-route-optimization)
8. [System 6: Fair Price Intelligence Engine (Statistical & Hedonic Model)](#8-system-6-fair-price-intelligence-engine)
9. [System 7: Spoken Voice & NLP Intent Extractor (BHASHINI / Speech-to-Intent)](#9-system-7-spoken-voice--nlp-intent-extractor)
10. [System 8: Multilingual Language Translation (BHASHINI Subsystem)](#10-system-8-multilingual-language-translation)
11. [System 9: Indicative Produce Computer Vision Grading (MobileNetV3)](#11-system-9-indicative-produce-computer-vision-grading)
12. [System 10: Supply-Demand Imbalance & Arbitrage Detection](#12-system-10-supply-demand-imbalance--arbitrage-detection)
13. [System 11: Wastage Rescue Recommendation Engine (Dynamic Discounting)](#13-system-11-wastage-rescue-recommendation-engine)
14. [AI Failure Safeguards & Graceful Degradation Framework](#14-ai-failure-safeguards--graceful-degradation-framework)
15. [SIH Demonstration Execution Strategy](#15-sih-demonstration-execution-strategy)

---

## 1. Intelligence Systems Philosophy & Taxonomy

**KisanLink** rejects the anti-pattern of "AI for the sake of marketing." We apply strict engineering discipline:
- **Never use Generative AI or LLMs for mathematical optimization, financial settlements, or database state transitions.**
- **Use Mathematical Solvers (OR-Tools / MILP)** for physical resource constraints (truck capacities, kilometer minimization, multi-farm supply pooling).
- **Use Statistical Machine Learning (LightGBM)** for time-series forecasting where historical mandi arrival patterns provide structured signals.
- **Use NLP & Speech Models (BHASHINI)** strictly for accessibility (transcribing spoken Hindi into structured form inputs).

---

## 2. Classification Matrix

```
+----------------------------------------------------------------------------------------------------+
|                                    SYSTEM CLASSIFICATION MATRIX                                    |
+--------------------------+-----------------------+------------------------+------------------------+
| SUBSYSTEM                | CLASSIFICATION        | PRIMARY ALGORITHM/TOOL | PRIMARY FUNCTION       |
+--------------------------+-----------------------+------------------------+------------------------+
| 1. Demand Forecasting    | **Machine Learning**  | LightGBM / XGBoost     | Regional demand trends |
| 2. Supply Forecasting    | **Statistical ML**    | Seasonal Holt-Winters  | Harvest volume curves  |
| 3. Sourcing Matching     | **Deterministic**     | Weighted Utility Model | Candidate pre-ranking  |
| 4. Dynamic Clustering    | **Optimization**      | MILP (SciPy / PuLP)    | Pool multiple farms    |
| 5. Route Optimization    | **Optimization**      | Google OR-Tools CVRP   | Multi-stop pickup route|
| 6. Fair Price Engine     | **Statistical Model** | Hedonic Price Equation | Indicative price bands |
| 7. Voice Listing Intent  | **NLP / LLM Parsing** | BHASHINI / Whisper STT | Spoken Hindi -> JSON   |
| 8. Translation           | **NLP Machine Trans** | BHASHINI / NLLB        | Dynamic string i18n    |
| 9. Produce Grading       | **Computer Vision**   | MobileNetV3 Classifier | Surface defect score   |
| 10. Imbalance Detection  | **Statistical / Rules**| Z-Score Anomaly Filter | Regional deficit alert |
| 11. Wastage Rescue       | **Dynamic Pricing**   | Decay Discount Model   | Spoilage salvage price |
+--------------------------+-----------------------+------------------------+------------------------+
```

---

## 3. System 1: Regional Demand Forecasting

- **Classification:** Machine Learning (Gradient Boosted Decision Trees).
- **Problem Statement:** Farmers suffer from price crashes because they plant and harvest blindly without forward demand visibility.
- **Why ML is Needed:** Agricultural demand is influenced by non-linear interactions across seasonal calendar lags, regional festival dates, APMC arrival history, and live wholesale procurement requirements.
- **Inputs:**
  - `crop_id`, `district_id`, `calendar_week`, `is_festival_season` (Boolean).
  - Lag features: Mandi arrival volumes at $T-7, T-14, T-28$ days.
  - Live 7-day buyer procurement requirement velocity.
- **Output:** Predicted 7-day demand index ($\Delta D \in [-1.0, +1.0]$) mapped to farmer qualitative status (`HIGH_DEMAND`, `NORMAL`, `LOW_DEMAND`).
- **Algorithm & Library:** `LightGBM Regressor` via Python `scikit-learn` pipeline.
- **Training Data:** Historical APMC Agmarknet daily price/arrival datasets (2020–2025) for Delhi NCR / Haryana.
- **Fallback Strategy:** If inference fails or feature data is missing, the system falls back to a 30-day moving average of historical mandi trading volumes.

---

## 4. System 2: Forward Supply Forecasting

- **Classification:** Statistical Aggregation & Time-Series Extrapolation.
- **Problem Statement:** Buyers cannot plan forward procurement contracts without knowing upcoming harvest volumes.
- **Inputs:** Active pre-harvest listings (`is_pre_harvest = true`, `harvest_date`), historical yield per acre in district.
- **Output:** 4-week forward district-level supply availability curves ($S_{t+1}, S_{t+2}, S_{t+3}, S_{t+4}$).
- **Fallback:** Sum of verified active pre-harvest farmer listings within the district boundary.

---

## 5. System 3: Multi-Criteria Farmer-Buyer Matching Engine

- **Classification:** Deterministic Weighted Utility Scoring Function.
- **Why Deterministic:** Sourcing matching must be 100% explainable to both farmers and institutional buyers.
- **Utility Function:**
  $$\text{Score}(F_i, R) = 0.30 \cdot S_{\text{dist}} + 0.25 \cdot S_{\text{price}} + 0.20 \cdot S_{\text{time}} + 0.15 \cdot S_{\text{rel}} + 0.10 \cdot S_{\text{quality}}$$
- **Outputs:** Ranked candidate list of farmers eligible for single fulfillment or dynamic clustering.

---

## 6. System 4: Dynamic Farmer Supply Clustering

- **Classification:** Mathematical Optimization (Mixed-Integer Linear Programming - MILP).
- **Problem Statement:** Individual smallholder farmers (e.g., 800 kg – 1.7T) cannot fulfill bulk institutional orders (e.g., 5,000 kg).
- **Why Optimization is Needed:** Finding the optimal subset of geographically clustered farmers that minimizes total transit distance and landed price while satisfying capacity constraints is an NP-hard combinatorial problem.
- **Mathematical Formulation:**
  $$\min_{x, y} \sum_{i=1}^N \left( P_i \cdot x_i + \lambda \cdot D(F_i, C_{\text{centroid}}) \cdot y_i \right)$$
  $$\text{Subject to:} \quad \sum_{i=1}^N x_i = Q_{\text{target}}, \quad 0 \le x_i \le q_i \cdot y_i, \quad y_i \in \{0, 1\}$$
- **Algorithm & Solver:** SciPy `linprog` / PuLP with CBC solver bounded to candidates within $100\text{ km}$.
- **Execution SLA:** $< 500\text{ ms}$ for candidate pool sizes $N \le 50$.
- **Fallback:** Greedy Nearest-Neighbor Selection by proximity to buyer until target volume is reached.

---

## 7. System 5: Logistics Route Optimization

- **Classification:** Mathematical Optimization (Google OR-Tools CVRP Solver).
- **Problem Statement:** Multi-farm pickups without routing optimization result in zig-zag transit, excessive fuel consumption, and delivery delays.
- **Inputs:**
  - Depot coordinates ($lat_0, lon_0$).
  - Farm pickup waypoints $(lat_1 \dots lat_k, lon_1 \dots lon_k)$ with pickup weights $w_i$.
  - Buyer destination coordinates ($lat_{\text{dest}}, lon_{\text{dest}}$).
  - Vehicle max payload capacity $W_{\max} = 5,000\text{ kg}$.
  - $N \times N$ road distance matrix from OSRM table service.
- **Output:** Optimal sequence of stops: $\text{Depot} \rightarrow \text{Farm C} \rightarrow \text{Farm A} \rightarrow \text{Farm D} \rightarrow \text{Farm B} \rightarrow \text{Buyer}$.
- **Solver Configuration:** `pywrapcp.RoutingModel` with `PATH_CHEAPEST_ARC` first solution strategy and `GUIDED_LOCAL_SEARCH` metaheuristic (time limit: 2.0s).
- **Fallback:** 2-Opt Euclidean Traveling Salesperson Problem (TSP) algorithm with $1.3\times$ road-tortuosity adjustment.

---

## 8. System 6: Fair Price Intelligence Engine

- **Classification:** Statistical Hedonic Pricing Model.
- **Inputs:**
  - $P_{\text{mandi}}$: Current modal mandi price from APMC Agmarknet.
  - $P_{\text{wholesale}}$: Benchmark wholesale landed price at buyer hub.
  - $C_{\text{transport}}$: Estimated shared freight cost per kg.
  - $C_{\text{platform}}$: Platform fee ($1.8\%$).
- **Pricing Formulation:**
  $$\text{Fair Farm-Gate Base} = P_{\text{mandi}} + 0.5 \cdot (P_{\text{wholesale}} - P_{\text{mandi}} - C_{\text{transport}})$$
  $$\text{Recommended Band} = \left[ \text{Base} \times 0.96, \, \text{Base} \times 1.05 \right]$$
- **Output Example:** Mandi: ₹19/kg, Wholesale: ₹32/kg ➔ **Recommended Fair Band: ₹23.50–₹26.00/kg**.

---

## 9. System 7: Spoken Voice & NLP Intent Extractor

- **Classification:** Speech-to-Text (ASR) + Structured Entity Extraction (NLP/LLM).
- **Problem Statement:** Rural farmers struggle with complex digital form fields and smartphone keyboards.
- **Pipeline:**
  1. Audio stream recorded in browser via HTML5 MediaRecorder.
  2. ASR Transcription via **BHASHINI ASR API** (Hindi / Indian regional dialects).
  3. Structured Entity Parser: Regex + lightweight transformer/LLM parsing intent and slots:
     ```json
     {
       "intent": "CREATE_LISTING",
       "crop": "Tomato",
       "quantity_kg": 800.0,
       "harvest_date_relative": "NEXT_WEEK"
     }
     ```
- **Safety Boundary:** AI-extracted values are presented on an interactive confirmation card for the farmer to tap and approve. **Zero unchecked direct database writes.**
- **Fallback:** If audio is noisy or API fails, UI displays: *"आवाज़ साफ नहीं आई"* and opens the 1-question-per-screen touch wizard.

---

## 10. System 8: Multilingual Language Translation

- **Classification:** Machine Translation (BHASHINI / NLLB).
- **Pipeline:** Pre-compiled static JSON dictionaries for UI chrome; dynamic runtime translation via BHASHINI API for user-generated notes and custom crop variety descriptions.

---

## 11. System 9: Indicative Produce Computer Vision Grading

- **Classification:** Computer Vision (MobileNetV3 Lightweight CNN).
- **Problem Statement:** Remote buyers require visual confidence regarding surface defects and ripeness.
- **Inputs:** RGB photo of produce ($224 \times 224\text{ px}$).
- **Output:** Indicative classification: `GRADE_A (84%)`, `GRADE_B (14%)`, `DEFECT_RISK (2%)`.
- **Framing & Disclaimer:** Clearly labeled as **"Indicative AI Visual Estimation"**; does not replace physical weighbridge and buyer inspection at drop-off.
- **Fallback:** Farmer self-assesses grade (`Grade A / Grade B`) from visual reference guide.

---

## 12. System 10: Supply-Demand Imbalance & Arbitrage Detection

- **Classification:** Statistical Anomaly Detection.
- **Function:** Compares regional supply volume with aggregate buyer demand.
- **Example Alert:** *"High tomato surplus in Sonipat (18 tonnes) + High tomato deficit in South Delhi (-14 tonnes) ➔ Arbitrage opportunity created."*

---

## 13. System 11: Wastage Rescue Recommendation Engine

- **Classification:** Dynamic Discounting & Perishability Decay Model.
- **Function:** For produce within 48 hours of maximum shelf-life without an order:
  $$\text{Rescue Price} = \max\left(P_{\text{floor}}, \, P_{\text{asking}} \times \left(1 - 0.15 \times \frac{\text{Days Stale}}{\text{Shelf Life}}\right)\right)$$
- Immediately broadcasts listing to nearby secondary food processors, sauce manufacturers, and catering kitchens.

---

## 14. AI Failure Safeguards & Graceful Degradation Framework

```
+----------------------------------------------------------------------------------------------------+
|                                    AI FAILURE SAFEGUARD ARCHITECTURE                               |
+--------------------------+-------------------------------+-----------------------------------------+
| SYSTEM                   | FAILURE TRIGGER               | AUTOMATED SAFEGUARD BEHAVIOR            |
+--------------------------+-------------------------------+-----------------------------------------+
| Voice NLP Parsing        | API timeout / low confidence  | Opens 1-question-per-screen touch form  |
| Demand Forecasting       | Missing historical features   | Uses 30-day APMC arrival moving average |
| Route Optimization       | OSRM / OR-Tools solver timeout| Greedy Nearest-Neighbor Euclidean TSP   |
| Dynamic Clustering       | Solver infeasibility / timeout| Best-fit single farmer + shortfall note |
| Computer Vision Grading  | Low-light / blurry photo      | Prompts manual farmer grade selection   |
+--------------------------+-------------------------------+-----------------------------------------+
```

---

## 15. SIH Demonstration Execution Strategy

- **Deterministic Baseline Guarantee:** For the SIH live presentation, all ML and Optimization models are pre-seeded with deterministic parameters for the **Delhi NCR – Sonipat – Panipat corridor**.
- **Instant Demo Reset:** `/api/v1/demo/reset` endpoint restores all model states, active listings, and cluster caches to baseline in $< 1\text{ second}$.

---
*End of KisanLink AI, Machine Learning & Optimization Specifications*
