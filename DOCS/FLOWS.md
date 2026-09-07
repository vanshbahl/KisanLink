# KisanLink — End-to-End System Flows & State Machines

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.1.0  
**Status:** Canonical System Flow Specification (Synchronized with Codebase)  
**Parent Specifications:** [PRD.md](./PRD.md) | [TRD.md](./TRD.md) | [MARKET_MAKER.md](./MARKET_MAKER.md)  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Flow Architecture Overview](#1-flow-architecture-overview)
2. [Finite State Machines (FSM)](#2-finite-state-machines-fsm)
   - 2.1 [Market Maker Corridor State Machine](#21-market-maker-corridor-state-machine)
   - 2.2 [Order Lifecycle State Machine](#22-order-lifecycle-state-machine)
   - 2.3 [Crop Listing State Machine](#23-crop-listing-state-machine)
   - 2.4 [Logistics & Route State Machine](#24-logistics--route-state-machine)
3. [Market Maker Multi-Role Sequence Flow](#3-market-maker-multi-role-sequence-flow)
4. [Farmer Experience Flows](#4-farmer-experience-flows)
   - 4.1 [Farmer Onboarding & Mobile OTP](#41-farmer-onboarding--mobile-otp)
   - 4.2 [Produce Management & Listing Creation](#42-produce-management--listing-creation)
   - 4.3 [Gemini AI Voice-Assisted Listing Flow](#43-gemini-ai-voice-assisted-listing-flow)
   - 4.4 [Farmer Market Maker Participation Flow](#44-farmer-market-maker-participation-flow)
   - 4.5 [Farmer Payout & Earnings Ledger Tracking](#45-farmer-payout--earnings-ledger-tracking)
5. [Consumer Experience Flows](#5-consumer-experience-flows)
   - 5.1 [Unified Home & In-Page Marketplace Discovery](#51-unified-home--in-page-marketplace-discovery)
   - 5.2 [Direct Produce Purchase, Cart & Checkout](#52-direct-produce-purchase-cart--checkout)
   - 5.3 [Consumer Market Maker Household Pooling](#53-consumer-market-maker-household-pooling)
6. [Bulk Buyer Procurement Flows](#6-bulk-buyer-procurement-flows)
   - 6.1 [Reverse Marketplace RFQ Creation with Target Price Advisor](#61-reverse-marketplace-rfq-creation-with-target-price-advisor)
   - 6.2 [Deterministic Supply Match Preview & Order Conversion](#62-deterministic-supply-match-preview--order-conversion)
   - 6.3 [Bulk Buyer Market Maker Corridor Commitment](#63-bulk-buyer-market-maker-corridor-commitment)
7. [Logistics Experience Flows](#7-logistics-experience-flows)
   - 7.1 [Operations Dashboard & Active Jobs Prioritization](#71-operations-dashboard--active-jobs-prioritization)
   - 7.2 [Digital Twin Corridor Map & Schematic Fallback](#72-digital-twin-corridor-map--schematic-fallback)
   - 7.3 [Vehicle Holding, Re-Quoting & Fleet Allocation Lever](#73-vehicle-holding-re-quoting--fleet-allocation-lever)
8. [Cross-Module State Synchronization Flow](#8-cross-module-state-synchronization-flow)
9. [Exception & Fallback Flows](#9-exception--fallback-flows)

---

## 1. Flow Architecture Overview

Every workflow in **KisanLink** is designed around **Farmer Floor Protection**, **Closed-Form Transport Feasibility**, and **Zero Hidden Intermediary Overhead**.

```mermaid
graph TD
    classDef farmer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef buyer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef sys fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    classDef log fill:#fff3e0,stroke:#e65100,stroke-width:2px;

    FarmerSupply["Farmer Offers Lot / Listing\n(Voice or Touch)"]:::farmer --> MMEngine["Market Maker Engine\n(Closed-Form Feasibility)"]:::sys
    BulkDemand["Bulk Buyer Posts RFQ / Commits"]:::buyer --> MMEngine
    ConsumerDemand["Consumers Pool Household Demand"]:::buyer --> MMEngine
    FleetStatus["Logistics Fleet Availability"]:::log --> MMEngine

    MMEngine -->|Committed >= Threshold| ViableMarket["Viable Corridor Unlocked\n(Delivered <= Buyer Ceiling)"]:::sys
    ViableMarket -->|Create Triggered| RealState["Materialize Shared State"]:::sys

    RealState --> FarmerOrders["Farmer Order @ Floor Price\n(Zero Deductions)"]:::farmer
    RealState --> BuyerOrders["Landed Bulk & Consumer Orders\n(Save vs Retail)"]:::buyer
    RealState --> PooledRoute["Pooled Route & Pickups\n(Full Vehicle Payload)"]:::log
```

---

## 2. Finite State Machines (FSM)

### 2.1 Market Maker Corridor State Machine

```mermaid
stateDiagram-v2
    [*] --> FORMING : Corridor Initialized (Lots & Demand Seeded)
    
    FORMING --> VIABLE : Demand Reaches Break-Even Threshold (Committed >= ThresholdKg)
    FORMING --> BLOCKED : Fleet Vehicle Withdrawn / Capacity Exceeded
    
    BLOCKED --> FORMING : Vehicle Released Back / Demand Adjusted
    BLOCKED --> VIABLE : Adequate Vehicle Assigned & Threshold Satisfied
    
    VIABLE --> FORMING : User Withdraws Demand (Committed < ThresholdKg)
    VIABLE --> CREATED : User / Presenter Taps "Create Direct Market"
    
    CREATED --> [*] : Orders, Pickups & Routes Materialized in Shared State
```

### 2.2 Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : Order Placed / Market Created
    CONFIRMED --> ESCROW_LOCKED : Funds Secured in Simulated Escrow
    ESCROW_LOCKED --> PICKUP_SCHEDULED : Vehicle Dispatched to Farm Clusters
    PICKUP_SCHEDULED --> IN_TRANSIT : Farm Pickups Loaded & Verified
    IN_TRANSIT --> DELIVERED : Delivery Arrives at Destination
    DELIVERED --> SETTLED : Verification OTP Entered (Farmer & Transporter Disbursed)
    
    CONFIRMED --> CANCELLED : Cancelled Before Dispatch (100% Refund)
    IN_TRANSIT --> DISPUTED : Weight/Quality Issue Reported (Funds Withheld)
    DISPUTED --> SETTLED : Dispute Resolved via Operator Mediation
    
    SETTLED --> [*]
    CANCELLED --> [*]
```

### 2.3 Crop Listing State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Voice / Form Initiated
    DRAFT --> ACTIVE : Published by Farmer
    ACTIVE --> PAUSED : Paused by Farmer
    PAUSED --> ACTIVE : Resumed by Farmer
    ACTIVE --> RESCUE_ACTIVE : Tagged as Urgent Spoilage Rescue
    ACTIVE --> SOLD : 100% Stock Allocated / Remaining = 0
    RESCUE_ACTIVE --> SOLD : Sold via Urgent Discount
    ACTIVE --> UNAVAILABLE : Marked Unavailable
    
    SOLD --> [*]
    UNAVAILABLE --> [*]
```

### 2.4 Logistics & Route State Machine

```mermaid
stateDiagram-v2
    [*] --> PLANNED : Route Formed by Market Maker / Clustering
    PLANNED --> ACTIVE : Vehicle Dispatched on Route
    ACTIVE --> COMPLETED : All Pickups & Deliveries Verified
    
    ACTIVE --> ISSUE : Exception Reported (Delay / Vehicle Breakdown)
    ISSUE --> ACTIVE : Exception Resolved
    
    COMPLETED --> [*]
```

---

## 3. Market Maker Multi-Role Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer (Ramesh)
    actor Consumer as Consumer (Neha)
    actor Bulk as Bulk Buyer (FreshKart)
    participant Engine as Market Maker Engine
    actor Logi as Logistics (Kavita)

    Note over Farmer, Logi: 1. Corridor Evaluation
    Engine->>Engine: Evaluates Sonipat ➔ Azadpur (Tomatoes Grade A, 42 km)
    Engine->>Engine: Fixed Trip Cost = ₹1,668 (Tata Ace 750 kg)
    Engine->>Engine: Headroom = ₹34.00 (Ceiling) - ₹28.00 (Floor) - ₹0.98 (Fee) = ₹5.02/kg
    Engine->>Engine: Break-Even Volume = ceil(1668 / 5.02) = 333 kg

    Note over Farmer, Engine: 2. Supply Side Activation
    Farmer->>Engine: Views Market Maker Pulse: 40 kg short of break-even
    Farmer->>Engine: Taps "40 किलो और दें" (Releases 40 kg more from listing)
    Engine-->>Logi: Notification: Corridor supply increased

    Note over Bulk, Consumer: 3. Demand Pooling
    Bulk->>Engine: Commits 200 kg procurement demand
    Consumer->>Engine: Commits 93 kg household group demand
    Consumer->>Engine: Demo User commits +40 kg
    Note over Engine: Committed = 333 kg (100% threshold reached!)
    Engine->>Engine: Corridor flips from 'forming' to 'viable'
    Engine-->>Farmer: Notification: "सीधा बाज़ार अब संभव है" (Direct market now viable)
    Engine-->>Bulk: Notification: "साझा कॉरिडोर व्यवहार्य है" (Pooled corridor viable)

    Note over Farmer, Logi: 4. Market Creation & State Materialization
    Farmer->>Engine: Clicks "Create the direct market"
    Engine->>Engine: Materializes Farmer Order @ ₹28.00/kg floor (Zero deductions)
    Engine->>Engine: Materializes Bulk Order @ ₹33.02/kg delivered
    Engine->>Engine: Materializes Consumer Order (KL-C-MM-XXXX)
    Engine->>Engine: Materializes Pooled Route (RTE-MM-XXXX) with farm pickup stops
    Engine->>Farmer: Opens MarketUnlockReveal modal with clickable ledger links
```

---

## 4. Farmer Experience Flows

### 4.1 Farmer Onboarding & Mobile OTP
1. Farmer enters mobile number (`+91 98765 43210`).
2. Taps "Send OTP" / "ओटीपी भेजें".
3. System verifies OTP (`123456` in demo environment).
4. System sets role token and opens `/farmer` dashboard.

### 4.2 Produce Management & Listing Creation
1. Farmer navigates to Produce via elevated center slot (`/farmer/produce`).
2. Taps "+ Sell Produce" (`/farmer/sell`).
3. Selects Crop from visual agricultural cards.
4. Enters harvest date, quantity (kg/quintal), and asking price.
5. Reviews fair-price comparison against local APMC mandi price.
6. Submits; listing appears immediately in Active tab.

### 4.3 Gemini AI Voice-Assisted Listing Flow
```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer
    participant Browser as Browser Web Speech API
    participant Backend as FastAPI (/api/v1/listings/parse-voice)
    participant Gemini as Google Gemini AI Engine

    Farmer->>Browser: Taps Microphone & speaks Hindi: "Mujhe 725 kilo tamatar ₹28 mein bechne hain..."
    Browser->>Browser: Captures audio & streams real-time transcript
    Farmer->>Browser: Speech ends / Taps Stop
    Browser->>Backend: POST /api/v1/listings/parse-voice { transcript, language: "hi" }
    Backend->>Gemini: Executes extract_listing(transcript, "hi")
    alt Gemini Success
        Gemini-->>Backend: Structured JSON (crop: "Tomato", qty: 725, price: 28, unit: "kg")
    else API Timeout / Failure
        Backend->>Backend: Executes _basic_extract(transcript) regex fallback
    end
    Backend-->>Browser: Returns VoiceParseResponse
    Browser->>Farmer: Displays pre-filled editable review form
    Farmer->>Browser: Inspects fields & taps "Apply"
    Browser->>Browser: Populates Sell Produce form for instant publishing
```

### 4.4 Farmer Market Maker Participation Flow
1. Farmer views **Market Maker Pulse Card** on home dashboard.
2. Taps into `/farmer/market`.
3. Reviews colloquial Hindi guidance: *"सीधा बाज़ार बनने के लिए 40 किलो और चाहिए"* (Needs 40 kg more).
4. Taps **"40 किलो और दें" (Give 40 kg more)** to release held crop into the corridor.

---

## 5. Consumer Experience Flows

### 5.1 Unified Home & In-Page Marketplace Discovery
1. Consumer opens `/consumer`.
2. Inspects **Fresh Near You** carousel and **Fresh Pick** AI recommendation.
3. Scrolls into **Explore Fresh Produce (`#marketplace`)**:
   - Types query into search bar.
   - Toggles category chips (`All`, `Vegetables`, `Fruits`, `Grains`, `Staples`).
   - Opens filter drawer to set maximum price, distance, or grade.
   - Adjusts sort order (`Recommended`, `Nearest`, `Freshest`, `Price low to high`).
4. Clicks product card to view listing detail with retail benchmark comparison.

### 5.2 Direct Produce Purchase, Cart & Checkout
1. Consumer selects quantity and taps **"Add to Cart"** or **"Buy Now"**.
2. Navigates to Cart via elevated center slot (`/consumer/cart`).
3. Reviews transparent cost split (Produce share, Logistics fee, Platform fee).
4. Proceeds to Checkout (`/consumer/checkout`).
5. Selects delivery address and simulated payment method (UPI / Card / Cash on Delivery).
6. Order confirmed; consumer tracks status on `/consumer/orders/:id`.

---

## 6. Bulk Buyer Procurement Flows

### 6.1 Reverse Marketplace RFQ Creation with Target Price Advisor
1. Bulk Buyer opens `/bulk` and taps **"Post Requirement"** (`/bulk/requests`).
2. Step 1 (Details): Enters crop, grade, quantity (MOQ 100 kg), target price, delivery location, and window.
   - Interacts with **Target Price Advisor** AI component to select competitive pricing.
3. Step 2 (Match Preview): Reviews deterministic supply pooling showing participating farm lots.
4. Step 3 (Review): Reviews total estimated landed cost.
5. Step 4 (Submit): Requirement published with active matching status.

### 6.2 Deterministic Supply Match Preview & Order Conversion
1. Buyer opens requirement detail (`/bulk/requests/:id`).
2. Reviews fulfilled percentage and multi-farmer contribution visual.
3. Taps **"Accept match & convert"**.
4. System creates confirmed Procurement Order (`/bulk/orders/:id`) with transparent landed cost.

---

## 7. Logistics Experience Flows

### 7.1 Operations Dashboard & Active Jobs Prioritization
1. Operator opens `/logistics`.
2. Reviews shift KPIs: Active pickups, active deliveries, vehicle capacity, load in transit.
3. Scans Active Jobs ranked in priority order:
   - Exceptions (`issue`) ranked first.
   - Unassigned pickups (`unassigned`) ranked second.
   - Scheduled work ranked third.
4. Taps job card to open pickup manifest or delivery confirmation.

### 7.2 Digital Twin Corridor Map & Schematic Fallback
```mermaid
flowchart TD
    InitMap[Mount DigitalTwinCorridorMap] --> Check[WebGL Probe & Tile Network Check]
    Check -->|WebGL OK & Online| RenderMap[Render MapLibre GL JS with Bezier Corridors]
    Check -->|WebGL Unsupported / Timeout / Offline| Fallback[Render Structured Schematic Corridor Cards]
    RenderMap -->|Tile Error / Disconnect| Fallback
    Fallback --> Retry[User Taps 'Retry']
    Retry --> Check
```

### 7.3 Vehicle Holding, Re-Quoting & Fleet Allocation Lever
1. Operator opens Market Maker console (`/logistics/market`).
2. Views corridor quoter: Tata Ace (750 kg) is held for the corridor.
3. Operator taps **"Withdraw vehicle from corridor"** (simulating maintenance).
4. Engine immediately re-quotes corridor against next available fleet vehicle (1,500 kg pickup).
5. Higher fixed trip costs shift break-even threshold volume from 333 kg to 480 kg in real time!

---

## 8. Cross-Module State Synchronization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Presenter as User / Presenter
    participant Frontend as React App (Shared Services)
    participant ProtoAPI as Prototype API (/api/state)
    participant BackendAPI as Canonical Backend (/api/v1/*)

    Note over Presenter, BackendAPI: Cross-Module Prototype Roundtrip
    Presenter->>Frontend: Adds commitment or creates market
    Frontend->>ProtoAPI: PUT /api/state (Updated StatePayload with 'markets')
    ProtoAPI-->>Frontend: Returns synced state
    Frontend->>BackendAPI: Syncs listing status / order allocations where applicable
    Frontend->>Presenter: Instant UI re-render across all role views
```

---

## 9. Exception & Fallback Flows

1. **Speech Recognition Failure:** Browser displays clear localized error message ("माइक अनुमति दें" / "Microphone blocked") and keeps direct numeric touch inputs open.
2. **Gemini AI Outage:** Backend automatically catches exception and executes regex entity extractor (`_basic_extract`).
3. **MapLibre Canvas Error:** Graceful fallback UI renders schematic corridor node cards with full details and retry CTA.
4. **Backend Unreachable:** Frontend hooks gracefully fall back to local prototype seed state without breaking the demonstration.

---
*End of KisanLink End-to-End System Flows & State Machines*
