# KisanLink — UI/UX Design System & Component Specifications

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.1.0  
**Status:** Canonical Design System Specification (Synchronized with Codebase)  
**Design Philosophy:** Premium Agricultural Simplicity — Radical Rural Ease + Institutional Procurement Elegance  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Design Vision & Identity](#1-design-vision--identity)
2. [Reference Aesthetics & Implementation Stack](#2-reference-aesthetics--implementation-stack)
3. [Color System & Semantic Tokens](#3-color-system--semantic-tokens)
4. [Typography & Responsive Scale](#4-typography--responsive-scale)
5. [Cross-Module Navigation Strategy (5-Slot Mobile Architecture)](#5-cross-module-navigation-strategy-5-slot-mobile-architecture)
6. [Market Maker Visual System (Flagship Core)](#6-market-maker-visual-system-flagship-core)
7. [AI Card & Intelligence Interaction Pattern (MarketplaceAiTrigger)](#7-ai-card--intelligence-interaction-pattern-marketplaceaitrigger)
8. [Farmer Experience Design (Radical Simplicity & Voice)](#8-farmer-experience-design-radical-simplicity--voice)
9. [Consumer Direct Marketplace Experience (Unified Home)](#9-consumer-direct-marketplace-experience-unified-home)
10. [Bulk Buyer Procurement Workspace](#10-bulk-buyer-procurement-workspace)
11. [Logistics Console & Fleet Experience](#11-logistics-console--fleet-experience)
12. [Map Visualization Design & Schematic Fallback](#12-map-visualization-design--schematic-fallback)
13. [Component Inventory & Design Tokens](#13-component-inventory--design-tokens)

---

## 1. Design Vision & Identity

**KisanLink** bridges the gap between rural Indian smallholder farmers who require radical simplicity and institutional bulk buyers who demand sophisticated procurement tools. 

The aesthetic is clean, trustworthy, and modern:
- Soft, natural ivory and warm neutral canvases (`#fbf8f2`, `#f4ede2`).
- Deep agricultural green accents (`#236747`, `#1a5036`) for trust and primary actions.
- Restrained amber highlights (`#c88424`, `#d99232`) for pending states and commercial signals.
- High legibility sans-serif typography with generous spacing and large touch targets.

---

## 2. Reference Aesthetics & Implementation Stack

- **Technology Stack:** Built with pure **Vanilla CSS** (`frontend/src/index.css`) utilizing CSS variables and semantic design tokens. (Zero Tailwind CSS or heavy component library overhead).
- **Iconography:** `lucide-react` with consistent optical sizing ($16\text{px}$, $18\text{px}$, $20\text{px}$, $22\text{px}$).
- **Micro-Animations:** Fluid CSS transitions (`180ms ease`, `240ms cubic-bezier`) with strict compliance to `prefers-reduced-motion`.

---

## 3. Color System & Semantic Tokens

```css
:root {
  /* Brand Green Palette */
  --color-primary: #236747;
  --color-primary-dark: #184c33;
  --color-primary-light: #e8f3ec;

  /* Accent Amber Palette */
  --color-accent: #c88424;
  --color-accent-light: #fdf5ea;

  /* Surfaces & Canvas */
  --color-bg: #fbf8f2;
  --color-surface: #ffffff;
  --color-surface-muted: #f4ede2;
  --color-border: #e6dcce;

  /* Typography */
  --color-text: #1d251f;
  --color-text-muted: #647067;

  /* Semantic Alerts */
  --color-success: #2e7d32;
  --color-warning: #e65100;
  --color-error: #c62828;
}
```

---

## 4. Typography & Responsive Scale

- **Primary Typeface:** `Inter`, system `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- **Bilingual Typographic Harmony:** Hindi (Devanagari script) and English share unified baseline heights and font weights across all views.
- **Scale:**
  - `Hero Heading`: $28\text{px} - 32\text{px}$ (Bold / 700)
  - `Section Heading`: $20\text{px} - 24\text{px}$ (Semi-bold / 600)
  - `Card Title`: $16\text{px} - 18\text{px}$ (Semi-bold / 600)
  - `Body Copy`: $14\text{px} - 15\text{px}$ (Regular / 400)
  - `Caption & Eyebrow`: $11\text{px} - 12\text{px}$ (Medium / 500, uppercase letter-spacing $0.05\text{em}$)

---

## 5. Cross-Module Navigation Strategy (5-Slot Mobile Architecture)

Every role in KisanLink uses a strictly standardized **5-slot bottom navigation bar** (`AppShell.tsx`):
- Equal width slots ($20\%$ each) with fixed icon boxes ensuring a flat, unified label baseline.
- **Slot 3** is permanently reserved for the **elevated primary action** (`nav-primary`), styled with an elevated round action bubble (`nav-bubble`).
- **Slot 4** is universally dedicated to **Market Maker** (`/role/market`) across all 4 roles, signaled by the Radar icon.

```
+-------------------------------------------------------------------------+
| [ Slot 1 ]   [ Slot 2 ]   [  (SLOT 3)  ]   [ Slot 4 ]   [  Slot 5   ]   |
|   Home         Orders     [  PRIMARY   ]     Market       Profile /     |
|                           [  ELEVATED  ]     Maker        Operations    |
+-------------------------------------------------------------------------+
```

### 5.1 Role Navigation Matrix

| Role | Slot 1 | Slot 2 | Slot 3 (Primary Elevated) | Slot 4 | Slot 5 | Profile Access Pattern |
|---|---|---|---|---|---|---|
| **Farmer** | Home (`/farmer`) | Orders (`/farmer/orders`) | **Produce / Fasal** (`/farmer/produce`) | Market Maker (`/farmer/market`) | Profile (`/farmer/profile`) | In bottom nav (Slot 5) |
| **Consumer** | Home (`/consumer`) | Orders (`/consumer/orders`) | **Cart** (`/consumer/cart`) | Market Maker (`/consumer/market`) | Profile (`/consumer/profile`) | In bottom nav (Slot 5) |
| **Bulk Buyer** | Overview (`/bulk`) | Supply (`/bulk/supply`) | **Requests** (`/bulk/requests`) | Orders (`/bulk/orders`) | Market Maker (`/bulk/market`) | **Mobile Header Avatar** |
| **Logistics** | Overview (`/logistics`) | Pickups (`/logistics/pickups`) | **Routes** (`/logistics/routes`) | Deliveries (`/logistics/deliveries`) | Market Maker (`/logistics/market`) | **Mobile Header Avatar** |

### 5.2 Header Profile Avatar Pattern
In Bulk Buyer and Logistics, all 5 bottom navigation slots represent core operational workflows. Profile access is placed in the top mobile header as an interactive avatar with user initials (`header-avatar`).

---

## 6. Market Maker Visual System (Flagship Core)

Market Maker is visually anchored in `frontend/src/components/market/`:

### 6.1 Market Demand Ring (`MarketDemandRing.tsx`)
- **Radial Geometry:** $220\text{px} \times 220\text{px}$ SVG ring with $16\text{px}$ stroke width.
- **Arc Segments:**
  - Green gradient arc: Commercial bulk demand.
  - Amber gradient arc: Consumer household demand.
  - Dashed track: Remaining demand gap ($\text{Gap}_{\text{kg}}$).
- **Animated Number Center:** Real-time count-up odometer displaying committed kilograms and percentage of threshold.

### 6.2 Outcome Summary Bar (`MarketOutcomeSummary`)
- High-contrast visual banner contrasting:
  - Before: Mandi rate (₹24/kg) vs Retail buyer price (₹42/kg).
  - After: Protected farmer floor (₹28/kg) vs Pooled direct price (₹33.02/kg).

### 6.3 State Rail (`MarketStateRail`)
- 3-step progress stepper:
  1. `Market is forming / बाज़ार बन रहा है`
  2. `Ready to create / बनाने के लिए तैयार`
  3. `Direct market created / सीधा बाज़ार बन गया`

### 6.4 Deep Visualizations
- **Delivered Price Curve (`MarketFreightCurve.tsx`):** Plots hyperbolic freight amortization ($y = \text{Floor} + \frac{\text{FixedTrip}}{x} + \text{Fee}$) against committed volume, with green shaded viable zone past break-even. Responsive viewBox switches between desktop ($660\text{px}$) and mobile ($360\text{px}$).
- **Value Split Stack (`MarketValueSplit.tsx`):** Proportional stacked bars comparing traditional 5-tier intermediary margin against direct costs (Farmer, Freight, Fee, Buyer Savings).
- **Convergence Flow (`MarketConvergence.tsx`):** 3-column responsive grid showing individual smallholder lots on the left, central transit vehicle, and pooled buyers on the right.
- **Arithmetic Audit Panel (`MarketWhyPanel.tsx`):** Expandable 7-step accordion detailing the exact mathematical derivation of trip viability.

### 6.5 Market Unlock Reveal (`MarketUnlockReveal.tsx`)
- Modal with dark blurred scrim (`mm-reveal-scrim`), animated checkmark badge, and live ledger table linking directly to generated farmer orders, bulk procurement invoices, and pooled routes.

---

## 7. AI Card & Intelligence Interaction Pattern (`MarketplaceAiTrigger`)

Every AI card across KisanLink (`FarmerPulseCard`, `MarketplaceAiSection`, `BulkIntelligenceCards`, `LogisticsIntelligenceCards`) adheres to a unified interaction lifecycle:

```
[ Idle Card ] ──(User Tap)──> [ Floating Portal Focus State ]
                                   │
                                   ├── Background page scroll locked (.ai-analysis-active)
                                   ├── Dark blurred overlay mounted via React Portal
                                   ├── Floating card elevated above overlay (never blurred)
                                   ├── In-flow placeholder reserves measured height (no layout shift)
                                   │
                                   ▼
                              [ Staged Thinking Animation (AiThinkingState) ]
                                   │  4-5 paced check steps across 1400ms
                                   ▼
                              [ Recommendation / Result Surface ]
                                   │  Confidence badge + Reasoning factors + CTA
                                   ▼
                              [ Dismissal / Settle ]
                                   Escape key / Close button smoothly restores normal flow
```

---

## 8. Farmer Experience Design (Radical Simplicity & Voice)

### 8.1 Farmer Home Layout (`/farmer`)
```
+------------------------------------------------------------------------+
|  [Logo] KisanLink / किसान लिंक                 [हिन्दी | English]  [Bell]|
+------------------------------------------------------------------------+
|  Namaste, Ramesh Ji! (Sonipat, Haryana)                        [29°C ☀️]|
+------------------------------------------------------------------------+
|  [ MARKET MAKER PULSE CARD ]                                           |
|  Radar: Tomato Corridor · Needs 40 kg more demand to break even        |
|  Farmer Floor: ₹28/kg | Local Mandi: ₹24/kg                            |
|  [ View opportunity ➔ ]                                               |
+------------------------------------------------------------------------+
|  [ Attention Metrics: ₹ Earnings Month | Active Listings | New Orders ] |
+------------------------------------------------------------------------+
|  [ FARMER AI PULSE CARD (MarketplaceAiTrigger) ]                       |
|  "Check stock and prices across your active listings"                  |
+------------------------------------------------------------------------+
|  [ Quick Action Grid: My Produce | Orders | Earnings | Demand Insights]|
+------------------------------------------------------------------------+
|  [ Upcoming Pickup Card ]          | [ Tomato Price Insight: +₹7/kg ]  |
+------------------------------------------------------------------------+
|  [ Call Support / हमसे बात करें (Toll Free: 1800 123 4567) ]           |
+------------------------------------------------------------------------+
|  [Home]       [Orders]       [(PRODUCE)]       [Market]       [Profile]|
+------------------------------------------------------------------------+
```

### 8.2 Voice Input Modal (`VoiceInputModal.tsx`)
- Floating modal with microphone visualizer.
- Browser speech recognition with audio level feedback.
- Gemini AI auto-parsing into review form (Crop, Qty, Unit, Price, Harvest Date, Window).
- One-tap confirmation into produce listing draft.

---

## 9. Consumer Direct Marketplace Experience (Unified Home)

### 9.1 Unified Home Architecture (`/consumer`)
- Direct access to Market Maker pulse card and Fresh Pick recommendation.
- **Integrated Marketplace Section (`#marketplace`):** Eliminates separate explore page; deep-linked directly from home.
- Search input with instant keyword filtering.
- Category chips (`All`, `Vegetables`, `Fruits`, `Grains`, `Staples`).
- Filter drawer modal with grade, freshness, price slider, and distance filters.
- Responsive product card grid with quick Add-to-Cart buttons.
- Price transparency comparison: Farm-direct (₹31/kg) vs Retail shop (₹42/kg).

---

## 10. Bulk Buyer Procurement Workspace

### 10.1 Sourcing Desk (`/bulk`)
- Monthly procurement savings counter (₹26,450).
- Reverse marketplace requirement posting wizard with **Target Price Advisor** AI component.
- Deterministic supply pooling preview showing multi-farm contribution breakdown.
- Landed cost summary (Produce value + Consolidated freight + Platform fee).

---

## 11. Logistics Console & Fleet Experience

### 11.1 Operational Console (`/logistics`)
- Shift status badge and 4 operational KPIs (Active pickups, deliveries, capacity, produce in transit).
- Active jobs card ranking issues (`status === 'issue'`) and unassigned pickups before routine work.
- Digital Twin Corridor map showing multi-farm pickup nodes and buyer drops.
- Market Maker fleet lever allowing operators to hold or withdraw vehicles from corridors.

---

## 12. Map Visualization Design & Schematic Fallback

- **Canvas:** MapLibre GL JS vector map with CartoCDN Positron style.
- **Corridor Routing:** Quadratic Bezier polyline arcs connecting pickup nodes, Sonipat Hub, and Azadpur Mandi.
- **Graceful Schematic Fallback:** If WebGL fails, tiles time out, or browser is offline, the component renders a structured schematic card list with retry button, ensuring zero broken canvases.

---

## 13. Component Inventory & Design Tokens

```text
frontend/src/components/
├── ai/
│   ├── AiConfidenceBadge.tsx
│   ├── AiInsightCard.tsx
│   ├── AiReasoningFactors.tsx
│   ├── AiThinkingState.tsx
│   ├── BulkIntelligenceCards.tsx
│   ├── FarmerPulseCard.tsx
│   ├── LogisticsIntelligenceCards.tsx
│   ├── MarketplaceAiSection.tsx
│   ├── MarketplaceAiTrigger.tsx
│   └── MarketplaceInsightResult.tsx
├── maps/
│   └── DigitalTwinCorridorMap.tsx
├── market/
│   ├── AnimatedNumber.tsx
│   ├── FarmerMarketMaker.tsx
│   ├── MarketCommitPanel.tsx
│   ├── MarketConvergence.tsx
│   ├── MarketDemandRing.tsx
│   ├── MarketFreightCurve.tsx
│   ├── MarketHowItWorks.tsx
│   ├── MarketInfographics.tsx
│   ├── MarketPulseCard.tsx
│   ├── MarketThresholdMeter.tsx
│   ├── MarketUnlockReveal.tsx
│   ├── MarketValueSplit.tsx
│   └── MarketWhyPanel.tsx
├── marketplace/
│   └── ConsumerMarketplace.tsx
└── voice/
    └── VoiceInputModal.tsx
```

---
*End of KisanLink UI/UX Design System Specification*
