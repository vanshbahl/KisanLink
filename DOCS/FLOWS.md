# KisanLink — End-to-End System Flows & State Machines

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.0.0  
**Status:** Approved System Flow Specification  
**Parent Specifications:** [PRD.md](./PRD.md) | [TRD.md](./TRD.md) | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Flow Architecture Overview](#1-flow-architecture-overview)
2. [Finite State Machines (FSM)](#2-finite-state-machines-fsm)
   - 2.1 [Order Lifecycle State Machine](#21-order-lifecycle-state-machine)
   - 2.2 [Crop Listing State Machine](#22-crop-listing-state-machine)
   - 2.3 [Shipment & Logistics State Machine](#23-shipment--logistics-state-machine)
   - 2.4 [Dynamic Supply Cluster State Machine](#24-dynamic-supply-cluster-state-machine)
3. [Farmer Experience Flows](#3-farmer-experience-flows)
   - 3.1 [Farmer Onboarding & Mobile OTP](#31-farmer-onboarding--mobile-otp)
   - 3.2 [Step-by-Step Touch Listing Flow](#32-step-by-step-touch-listing-flow)
   - 3.3 [Spoken Voice-Driven Listing Flow](#33-spoken-voice-driven-listing-flow)
   - 3.4 [Pre-Harvest Forward Listing Flow](#34-pre-harvest-forward-listing-flow)
   - 3.5 [Offer Receipt, Negotiation & Acceptance Flow](#35-offer-receipt-negotiation--acceptance-flow)
   - 3.6 [Order & Payment Payout Tracking Flow](#36-order--payment-payout-tracking-flow)
   - 3.7 [Wastage Rescue / Urgent Sale Tagging Flow](#37-wastage-rescue--urgent-sale-tagging-flow)
   - 3.8 [Assisted Tele-Support & Call Center Proxy Flow](#38-assisted-tele-support--call-center-proxy-flow)
4. [Buyer Experience Flows](#4-buyer-experience-flows)
   - 4.1 [Buyer Onboarding & Procurement Profile](#41-buyer-onboarding--procurement-profile)
   - 4.2 [Consumer Direct Marketplace Browse & Checkout](#42-consumer-direct-marketplace-browse--checkout)
   - 4.3 [Bulk Procurement Posting (Reverse Marketplace)](#43-bulk-procurement-posting-reverse-marketplace)
   - 4.4 [Dynamic Farmer Cluster Match & Procurement Plan Review](#44-dynamic-farmer-cluster-match--procurement-plan-review)
   - 4.5 [Payment Authorization & Escrow Lock Flow](#45-payment-authorization--escrow-lock-flow)
   - 4.6 [Consignment Delivery Verification & OTP Sign-Off](#46-consignment-delivery-verification--otp-sign-off)
   - 4.7 [Bidirectional Rating & Repeat Order Flow](#47-bidirectional-rating--repeat-order-flow)
5. [Logistics Provider Flows](#5-logistics-provider-flows)
   - 5.1 [Carrier Onboarding & Vehicle Registration](#51-carrier-onboarding--vehicle-registration)
   - 5.2 [Load Board Discovery & Job Acceptance](#52-load-board-discovery--job-acceptance)
   - 5.3 [Multi-Stop Farm Pickup & Manifest Execution](#53-multi-stop-farm-pickup--manifest-execution)
   - 5.4 [Delivery Handover & Freight Disbursement](#54-delivery-handover--freight-disbursement)
6. [Core System & Intelligence Flows](#6-core-system--intelligence-flows)
   - 6.1 [Demand & Supply Forecasting Flow](#61-demand--supply-forecasting-flow)
   - 6.2 [Fair Price Recommendation Flow](#62-fair-price-recommendation-flow)
   - 6.3 [Dynamic Cluster Formulation Solver Flow](#63-dynamic-cluster-formulation-solver-flow)
   - 6.4 [Google OR-Tools Route Optimization Flow](#64-google-or-tools-route-optimization-flow)
   - 6.5 [Multi-Party Escrow Settlement Split Flow](#65-multi-party-escrow-settlement-split-flow)
7. [Exception & Fallback Flows](#7-exception--fallback-flows)
   - 7.1 [AI Voice Recognition Failure Fallback](#71-ai-voice-recognition-failure-fallback)
   - 7.2 [Routing Engine Network Timeout Fallback](#72-routing-engine-network-timeout-fallback)
   - 7.3 [Quantity / Quality Discrepancy at Farm Gate](#73-quantity--quality-discrepancy-at-farm-gate)
   - 7.4 [Order Cancellation & Escrow Refund Protocol](#74-order-cancellation--escrow-refund-protocol)
   - 7.5 [Offline / Low-Connectivity PWA Synchronization](#75-offline--low-connectivity-pwa-synchronization)

---

## 1. Flow Architecture Overview

Every workflow in **KisanLink** is designed around the principles of **Radical Farmer Simplicity**, **Deterministic Transaction Integrity**, and **Zero Hidden Intermediary Overhead**.

```mermaid
graph TD
    classDef farmer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef buyer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef sys fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    classDef log fill:#fff3e0,stroke:#e65100,stroke-width:2px;

    FarmerSupply["Farmer Lists Harvest\n(Touch or Spoken Hindi)"]:::farmer --> MatchingEngine["System Matching &\nDynamic Clustering"]:::sys
    BuyerDemand["Buyer Posts Requirement\n(5T Bulk Procurement)"]:::buyer --> MatchingEngine

    MatchingEngine --> ClusterFormed["Dynamic Supply Pool\n(4 Farmers = 5.0T)"]:::sys
    ClusterFormed --> EscrowLocked["Buyer Confirms &\nEscrow Locked"]:::buyer
    EscrowLocked --> RouteOptimized["Google OR-Tools\nRoute Optimised"]:::sys
    RouteOptimized --> MultiPickup["Logistics Carrier\nMulti-Farm Pickups"]:::log
    MultiPickup --> DeliveryConfirmed["Consignment Delivered &\nBuyer Signs OTP"]:::buyer
    DeliveryConfirmed --> SplitPayout["Automated Escrow Split\n(4 Farmers + Transporter)"]:::sys
```

---

## 2. Finite State Machines (FSM)

### 2.1 Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Sourcing Plan Generated
    DRAFT --> CONFIRMED : Buyer & Farmers Agree
    CONFIRMED --> ESCROW_LOCKED : Buyer Authorizes Payment
    ESCROW_LOCKED --> PICKUP_SCHEDULED : Truck Assigned & Route Dispatched
    PICKUP_SCHEDULED --> IN_TRANSIT : Transporter Completes Farm Gate Pickups
    IN_TRANSIT --> DELIVERED : Vehicle Arrives at Buyer Facility
    DELIVERED --> SETTLED : Buyer Enters Verification OTP
    
    CONFIRMED --> CANCELLED : Cancelled Before Pickup (100% Refund)
    IN_TRANSIT --> DISPUTED : Damaged Goods / Weight Mismatch Reported
    DISPUTED --> SETTLED : Mediation Adjustment Executed
    SETTLED --> [*]
    CANCELLED --> [*]
```

### 2.2 Crop Listing State Machine

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : Crop Listed by Farmer
    ACTIVE --> RESERVED : Matched in Confirmed Order
    ACTIVE --> RESCUE_ACTIVE : Tagged for Urgent Spoilage Sale
    RESERVED --> HARVESTED : Farm Gate Pickup Verified
    RESCUE_ACTIVE --> RESERVED : Matched with Secondary Buyer (Processor)
    HARVESTED --> SOLD : Consignment Delivered & Paid
    ACTIVE --> EXPIRED : Past Harvest Window without Sale
    SOLD --> [*]
    EXPIRED --> [*]
```

### 2.3 Shipment & Logistics State Machine

```mermaid
stateDiagram-v2
    [*] --> UNASSIGNED : Cluster Formed & Escrow Locked
    UNASSIGNED --> ASSIGNED : Transporter Accepts Job
    ASSIGNED --> PICKUP_IN_PROGRESS : Driver Navigates to Farm Stop 1
    PICKUP_IN_PROGRESS --> LOADED : All Multi-Farm Stops Completed
    LOADED --> IN_TRANSIT : Moving on Highway to Buyer
    IN_TRANSIT --> ARRIVED : Arrived at Drop-off Hub
    ARRIVED --> COMPLETED : Delivery OTP Verified by Buyer
    COMPLETED --> [*]
```

### 2.4 Dynamic Supply Cluster State Machine

```mermaid
stateDiagram-v2
    [*] --> PROPOSED : Sourcing Solver Aggregates Farms
    PROPOSED --> COMMITTED : All Matched Farmers Accept
    COMMITTED --> FULFILLED : All Crop Lots Picked Up
    COMMITTED --> PARTIAL_DISPATCH : 1 Farmer Fails; Backup Injected
    PROPOSED --> DISSOLVED : Buyer Declines or Window Times Out
    FULFILLED --> [*]
    DISSOLVED --> [*]
```

---

## 3. Farmer Experience Flows

### 3.1 Farmer Onboarding & Mobile OTP
```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant App as React PWA
    participant Auth as FastAPI Auth Router
    participant DB as PostgreSQL

    F->>App: Opens App -> Selects "हिन्दी"
    App->>F: Displays Mobile Input (No password / email required)
    F->>App: Enters +91 98123 45678
    App->>Auth: POST /api/v1/auth/request-otp { phone: "+919812345678" }
    Auth-->>F: Sends 6-digit SMS OTP (Demo: '123456')
    F->>App: Enters OTP
    App->>Auth: POST /api/v1/auth/verify-otp { phone, otp, role: "FARMER" }
    Auth->>DB: Upserts User & FarmerProfile (Location, Name)
    Auth-->>App: Returns JWT Token
    App-->>F: Displays 6-Card Simplified Home Screen
```

### 3.2 Step-by-Step Touch Listing Flow
To eliminate cognitive overload, the listing flow enforces **One Question Per Screen**:

```
Screen 1: What crop? (Crop Icons: Tomato, Potato, Onion, Cauliflower)
   ↓
Screen 2: How much quantity? (Large stepper: 1,200 kg / 1.2 Tonnes)
   ↓
Screen 3: When is it available? ("Ready Now" vs "Pre-Harvest: 3 Days")
   ↓
Screen 4: What is your expected price? (Guidance: ₹23-₹26/kg | Input: ₹25/kg)
   ↓
Screen 5: Add photo? (Optional camera capture)
   ↓
Screen 6: Big Green Button -> "Confirm & Sell / फसल बेचें"
```

### 3.3 Spoken Voice-Driven Listing Flow
```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant App as React Microphone Widget
    participant Gateway as FastAPI Voice Router
    participant NLP as BHASHINI / NLP Engine
    participant Form as Listing Form State

    F->>App: Taps & Holds Mic: "मेरे पास 800 किलो टमाटर है, अगले हफ्ते तैयार होगा"
    App->>Gateway: POST /api/v1/voice/parse-audio (Audio Stream)
    Gateway->>NLP: Transcribes Hindi Audio -> Extracts Intent & Entities
    NLP-->>Gateway: { crop: "Tomato", quantity_kg: 800, harvest_window: "NEXT_WEEK" }
    Gateway-->>App: Returns Extracted JSON
    App->>Form: Pre-fills Crop & Quantity Cards
    App-->>F: Displays Confirmation Modal + Asks Voice Prompt: "आप क्या दाम चाहते हैं?" (Price)
    F->>App: Taps ₹25/kg Guidance Card -> Confirms Listing
```

### 3.4 Pre-Harvest Forward Listing Flow
- Farmers declare crops 1 to 4 weeks prior to harvest.
- The platform tags the listing `is_pre_harvest = true` and indexes it in the **Crop Availability Calendar**.
- Buyers can place pre-harvest reservation locks, giving the farmer guaranteed purchase security before harvesting.

### 3.5 Offer Receipt, Negotiation & Acceptance Flow
```mermaid
sequenceDiagram
    autonumber
    actor F as Farmer
    participant App as Farmer PWA
    actor B as Bulk Buyer
    participant Core as KisanLink Engine

    B->>Core: Accepts Sourcing Plan for 5.0T Cluster
    Core->>App: Push Alert: "बधाई! खरीदार मिला: 1,200kg टमाटर @ ₹25/kg"
    App->>F: Displays Simple Action Card:
    Note over F,App: Net Earnings: ₹30,000 | Buyer: Delhi Hotel | Pickup: Friday
    F->>App: Taps "स्वीकार करें" (Accept Offer)
    App->>Core: POST /api/v1/offers/{id}/accept
    Core-->>App: Confirms: "ऑर्डर पक्का हुआ! गाड़ी का इंतज़ार करें।"
```

### 3.6 Order & Payment Payout Tracking Flow
- Farmer taps **"💰 Payments / भुगतान"** card on Home.
- Screen displays clear cards:
  - **In Escrow (Locked):** `₹30,000 (Tomato 1.2T - In Transit)`
  - **Paid to Bank:** `₹24,500 (Cauliflower - Delivered Yesterday)`
- Zero complex accounting tables; direct rupee amounts.

### 3.7 Wastage Rescue / Urgent Sale Tagging Flow
- If produce is approaching maturity without a buyer or an order is cancelled:
- Farmer taps **"Urgent Sale / जल्दी बेचें"** on the listing.
- System recommends dynamic rescue price (e.g., ₹21/kg vs. standard ₹25/kg).
- Listing is prioritized on the **Buyer Rescue Feed** for nearby food processors and catering kitchens.

### 3.8 Assisted Tele-Support & Call Center Proxy Flow
```mermaid
sequenceDiagram
    autonumber
    actor F as Low-Literacy Farmer
    actor Agent as Call Center Operator
    participant Terminal as Operator Console
    participant Core as KisanLink Backend

    F->>Agent: Dials Toll-Free Support (1800-XXX-XXXX): "मुझे 500 किलो गोभी बेचनी है"
    Agent->>Terminal: Enters Farmer Phone -> Triggers 4-digit Voice/SMS OTP
    F->>Agent: Speaks OTP over call
    Agent->>Terminal: Enters OTP -> Unlocks Farmer Proxy Session
    Agent->>Terminal: Selects Cauliflower, 500kg, Ready in 2 days, ₹18/kg
    Terminal->>Core: POST /api/v1/assisted/proxy-listing (Audit: Agent ID #09)
    Core-->>F: Sends Confirmation SMS to Farmer: "आपकी 500kg गोभी लिस्ट हो गई है"
```

---

## 4. Buyer Experience Flows

### 4.1 Buyer Onboarding & Procurement Profile
- Buyer registers with Phone + OTP.
- Selects Buyer Type: **Individual Consumer**, **Restaurant / Hotel**, **Retailer**, or **Food Processor**.
- Inputs Business Name, GSTIN (optional for consumers), and primary delivery warehouse coordinates.

### 4.2 Consumer Direct Marketplace Browse & Checkout
- Consumer browses nearby single-farm listings.
- Selects 10 kg Tomatoes @ ₹26/kg (vs. Retail ₹34/kg).
- Views farmer farm story (*"Harvested in Sonipat 6 hours ago by Ramesh"*).
- Instant simulated UPI checkout with direct delivery.

### 4.3 Bulk Procurement Posting (Reverse Marketplace)
```mermaid
sequenceDiagram
    autonumber
    actor B as Bulk Buyer (Hotel Procurement)
    participant UI as Buyer Procurement Dashboard
    participant API as FastAPI Backend
    participant Solver as Dynamic Cluster Solver

    B->>UI: Clicks "Post Procurement Requirement"
    B->>UI: Inputs: Tomato | 5,000 kg | Grade A | Delhi NCR | Max ₹28/kg | Required Friday
    UI->>API: POST /api/v1/requirements
    API->>Solver: Executes Dynamic Supply Clustering
    Solver-->>UI: Returns Sourcing Plan: 4 Farmers in Sonipat/Panipat (5,000 kg @ ₹25.10/kg)
    UI-->>B: Displays Interactive Cluster Plan with Route & Economic Savings Breakdown
```

### 4.4 Dynamic Farmer Cluster Match & Procurement Plan Review
- Buyer sees visual cluster card:
  - Total Volume: **5,000 / 5,000 kg (100% Fulfilled)**.
  - Sourcing Breakdown: Farmer A (1.2T), Farmer B (0.8T), Farmer C (1.7T), Farmer D (1.3T).
  - Average Farm-Gate Cost: **₹25.00/kg**.
  - Shared Freight Cost: **₹2.20/kg**.
  - Landed Kitchen Cost: **₹27.20/kg** (vs. Wholesale Mandi ₹32.00/kg ➔ **15.0% Buyer Savings**).

### 4.5 Payment Authorization & Escrow Lock Flow
- Buyer clicks **"Accept Sourcing Plan & Secure Payment"**.
- Simulated payment gateway locks ₹1,37,500 in platform custody.
- Escrow ledger entry created; triggers automated notification to all 4 cluster farmers.

### 4.6 Consignment Delivery Verification & OTP Sign-Off
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Logistics Driver
    actor Buyer as Buyer Receiving Manager
    participant App as Buyer App
    participant Core as KisanLink Backend

    Driver->>Buyer: Arrives at Delhi Hotel with 5.0T Consolidated Tomatoes
    Buyer->>Buyer: Inspects quality & verifies digital scale weighbridge
    Buyer->>App: Opens Active Order -> Clicks "Verify Delivery & Release Payment"
    App-->>Buyer: Displays 4-Digit Delivery OTP: "8421"
    Driver->>Core: Enters Delivery OTP "8421" in Driver App
    Core->>Core: Validates OTP -> Changes Order State to SETTLED
    Core->>Core: Executes Multi-Party Split Settlement (Farmers + Transporter)
```

### 4.7 Bidirectional Rating & Repeat Order Flow
- Buyer rates Farmer Cluster: Quality (5/5), Fulfilment Accuracy (5/5).
- Farmers rate Buyer: Unloading Turnaround (5/5), Payment Promptness (5/5).
- Buyer can click **"Repeat Order"** to automatically initiate future procurement from the same farmer group.

---

## 5. Logistics Provider Flows

### 5.1 Carrier Onboarding & Vehicle Registration
- Transporter registers vehicle: Capacity (3.5T or 5.0T), Vehicle Type (Eicher / Tata 407 / Pickup), Operating Base (e.g., Murthal, Haryana).

### 5.2 Load Board Discovery & Job Acceptance
- Transporter views available pooled jobs:
  - **Route:** Sonipat ➔ Panipat ➔ Delhi NCR.
  - **Stops:** 4 Farm Gate Pickups ➔ 1 Drop-off.
  - **Payload:** 5,000 kg.
  - **Freight Payout:** ₹12,500.
- Transporter clicks **"Accept Dispatch Job"**.

### 5.3 Multi-Stop Farm Pickup & Manifest Execution
```mermaid
sequenceDiagram
    autonumber
    actor Driver as Transporter
    actor F1 as Farmer A (Sonipat)
    actor F2 as Farmer B (Sonipat)
    participant App as Driver Manifest App
    participant Core as KisanLink Logistics Engine

    Driver->>App: Opens Waypoint Route -> Navigates to Farm Stop 1
    Driver->>F1: Weighs & Loads 1,200kg Tomatoes
    Driver->>App: Verifies Farm Pickup 1 OTP -> Status: LOADED_1
    Driver->>App: Navigates to Farm Stop 2
    Driver->>F2: Weighs & Loads 800kg Tomatoes
    Driver->>App: Verifies Farm Pickup 2 OTP -> Status: LOADED_2
    Note over Driver,App: Repeats for Farm Stop 3 & 4 (Total 5,000kg in Truck)
    Driver->>App: Clicks "Depart to Buyer Destination" -> State: IN_TRANSIT
```

### 5.4 Delivery Handover & Freight Disbursement
- Driver arrives at Buyer warehouse.
- Buyer enters Delivery OTP.
- System automatically credits ₹12,500 freight payment to Transporter wallet.

---

## 6. Core System & Intelligence Flows

### 6.1 Demand & Supply Forecasting Flow
1. Nightly cron job executes LightGBM regression pipeline on regional APMC arrivals and buyer procurement trends.
2. Updates `demand_forecasts` table with 7-day and 14-day demand pressure index.
3. Farmer and Buyer UI consume `/api/v1/forecasts/regional` to render demand trend badges.

### 6.2 Fair Price Recommendation Flow
```
Inputs: Modal Mandi Price (₹19/kg) + Buyer Wholesale Benchmark (₹32/kg) + Transit Cost (₹2.20/kg)
   ↓
Formula: Fair Base = Mandi + 0.5 * (Wholesale - Mandi - Transit) = 19 + 0.5 * (32 - 19 - 2.20) = ₹24.40/kg
   ↓
Output Band: ₹23.50/kg to ₹26.00/kg (Rendered on Farmer & Buyer screens)
```

### 6.3 Dynamic Cluster Formulation Solver Flow
```mermaid
flowchart TD
    Req[Buyer Requirement: 5,000kg] --> SpatialFilter[PostGIS Query: Active/Pre-Harvest within 100km]
    SpatialFilter --> Candidates[Candidate Pool: 12 Farmers]
    Candidates --> MILP[SciPy MILP Solver\nMinimizes Distance & Price Variance]
    MILP --> Cluster[Dynamic Cluster Created:\nFarmer A: 1.2T | Farmer B: 0.8T | Farmer C: 1.7T | Farmer D: 1.3T]
    Cluster --> Preview[Render Sourcing Plan on Buyer UI]
```

### 6.4 Google OR-Tools Route Optimization Flow
1. Inputs: Depot coordinates, 4 Farm coordinates, 1 Buyer destination coordinate, 5.0T vehicle capacity.
2. Distance Matrix: Fetched asynchronously from OSRM table endpoint.
3. OR-Tools CVRP Solver executes Capacitated Vehicle Routing solver with 2-second time limit.
4. Returns optimal pickup order minimizing total km traveled: $\text{Depot} \rightarrow \text{Farm C} \rightarrow \text{Farm A} \rightarrow \text{Farm D} \rightarrow \text{Farm B} \rightarrow \text{Buyer}$.

### 6.5 Multi-Party Escrow Settlement Split Flow
```mermaid
sequenceDiagram
    autonumber
    participant Core as Settlement Service
    participant DB as Payments Ledger
    participant Gate as Payment Gateway / Bank Rail

    Core->>DB: Read Locked Escrow (Order #ORD-9821: ₹1,37,500)
    Core->>DB: Begin Atomic ACID Transaction
    Core->>Gate: Transfer ₹30,000 -> Farmer A UPI
    Core->>Gate: Transfer ₹20,000 -> Farmer B UPI
    Core->>Gate: Transfer ₹42,500 -> Farmer C UPI
    Core->>Gate: Transfer ₹32,500 -> Farmer D UPI
    Core->>Gate: Transfer ₹12,500 -> Transporter Account
    Core->>DB: Credit Platform Fee ₹2,500 -> Platform Wallet
    Core->>DB: Commit Transaction -> State: SETTLED
```

---

## 7. Exception & Fallback Flows

### 7.1 AI Voice Recognition Failure Fallback
```
[Farmer Speaks Audio] ➔ [Audio Transmission Timeout / Unclear Audio]
                               │
                [System Detects Low Confidence < 0.60]
                               │
            [App Displays Gentle Fallback Screen in Hindi]
       "माफ़ कीजिये, आवाज़ साफ नहीं आई। कृपया स्क्रीन पर फसल चुनें।"
                               │
         [Farmer Completes Step-by-Step Touch Wizard (1 Question/Screen)]
```

### 7.2 Routing Engine Network Timeout Fallback
- If the OSRM road matrix server times out ($> 2.0\text{ s}$), the system calculates pairwise Euclidean distances adjusted by a $1.3\times$ road-tortuosity factor and executes a greedy nearest-neighbor TSP algorithm.

### 7.3 Quantity / Quality Discrepancy at Farm Gate
- If Farmer A listed 1,200 kg but only loads 1,000 kg:
  1. Driver inputs actual scale weight ($1,000\text{ kg}$) into manifest check-in.
  2. Farmer confirms modified weight via SMS OTP.
  3. Escrow ledger automatically recalculates payout shares ($1,000 \times ₹25 = ₹25,000$) and refunds surplus ($200 \times ₹25 = ₹5,000$) to the buyer.

### 7.4 Order Cancellation & Escrow Refund Protocol
- **Cancellation Before Dispatch:** 100% full refund returned to buyer escrow account; listings reverted to `ACTIVE`.
- **Cancellation After Dispatch:** Transporter receives 100% guaranteed freight payment; produce redirected to nearby **Wastage Rescue** processor.

### 7.5 Offline / Low-Connectivity PWA Synchronization
```
[Farmer Submits Listing in Low-Network Khet]
                   │
     [No Active Internet Connection Detected]
                   │
[PWA Service Worker Stores Listing in Local IndexedDB]
                   │
[UI Displays: "ऑफ़लाइन सेव हुआ - नेटवर्क आते ही अपलोड होगा"]
                   │
     [Device Reconnects to 4G Network]
                   │
[Background Sync Worker Transmits Payload to FastAPI Backend]
```

---
*End of KisanLink End-to-End System Flows & State Machines*
