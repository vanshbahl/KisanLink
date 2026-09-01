# KisanLink — UI/UX Design System & Wireframe Specifications

**Project Name:** KisanLink (Direct Farm-to-Buyer Operating System)  
**Problem Statement ID:** 26033 (Smart India Hackathon 2026)  
**Document Version:** 1.0.0  
**Status:** Approved Design System Specification  
**Design Philosophy:** Premium Agricultural Simplicity — Radical Rural Ease + Institutional Procurement Elegance  
**Last Updated:** September 2026  

---

## Table of Contents

1. [Design Vision & Identity](#1-design-vision--identity)
2. [Reference Inspiration & Aesthetics](#2-reference-inspiration--aesthetics)
3. [What We Take From Reference vs. What We Explicitly Avoid](#3-what-we-take-from-reference-vs-what-we-explicitly-avoid)
4. [Brand Personality & Perception](#4-brand-personality--perception)
5. [Core Design Principles](#5-core-design-principles)
6. [Color System & Semantic Tokens](#6-color-system--semantic-tokens)
7. [Typography Hierarchy](#7-typography-hierarchy)
8. [Spacing & Layout Grid](#8-spacing--layout-grid)
9. [Shape Language & Corner Radii](#9-shape-language--corner-radii)
10. [Elevation & Depth](#10-elevation--depth)
11. [Iconography Standards](#11-iconography-standards)
12. [Produce Photography Guidelines](#12-produce-photography-guidelines)
13. [Purposeful Motion & Micro-Interactions](#13-purposeful-motion--micro-interactions)
14. [Responsive Breakpoint Architecture](#14-responsive-breakpoint-architecture)
15. [Accessibility & WCAG 2.1 AA Compliance](#15-accessibility--wcag-21-aa-compliance)
16. [Localization & Bilingual Toggle Architecture](#16-localization--bilingual-toggle-architecture)
17. [Farmer UX Principles (Radical Simplicity)](#17-farmer-ux-principles-radical-simplicity)
18. [Farmer Navigation System](#18-farmer-navigation-system)
19. [Farmer Component Patterns](#19-farmer-component-patterns)
20. [Farmer Screen Wireframes (ASCII)](#20-farmer-screen-wireframes-ascii)
21. [Voice User Experience (VUI)](#21-voice-user-experience-vui)
22. [Buyer UX Principles (Progressive Complexity)](#22-buyer-ux-principles-progressive-complexity)
23. [Consumer Direct Marketplace Experience](#23-consumer-direct-marketplace-experience)
24. [B2B Procurement Workspace](#24-b2b-procurement-workspace)
25. [Buyer Screen Wireframes (ASCII)](#25-buyer-screen-wireframes-ascii)
26. [Logistics Provider UX (Utility-First)](#26-logistics-provider-ux-utility-first)
27. [Logistics Screen Wireframes (ASCII)](#27-logistics-screen-wireframes-ascii)
28. [Map Design & Spatial Data Visualization (MapLibre)](#28-map-design--spatial-data-visualization-maplibre)
29. [Demand & Supply Forecast Presentation](#29-demand--supply-forecast-presentation)
30. [Explainable Matching UI](#30-explainable-matching-ui)
31. [Dynamic Farmer Cluster Visualizer (SIH Hero Screen)](#31-dynamic-farmer-cluster-visualizer-sih-hero-screen)
32. [Order Tracking & State Visualizer](#32-order-tracking--state-visualizer)
33. [Payment & Settlement Transparency Visuals](#33-payment--settlement-transparency-visuals)
34. [Wastage Rescue & Urgent Sale Tagging UI](#34-wastage-rescue--urgent-sale-tagging-ui)
35. [Empty State Design](#35-empty-state-design)
36. [Loading States & Skeleton Screens](#36-loading-states--skeleton-screens)
37. [Error Handling & Forgiving UI](#37-error-handling--forgiving-ui)
38. [Offline & Weak Network Indicators](#38-offline--weak-network-indicators)
39. [Desktop & Laptop Layout Adaptation](#39-desktop--laptop-layout-adaptation)
40. [Mobile-First Native Feel](#40-mobile-first-native-feel)
41. [Design Token Reference Table](#41-design-token-reference-table)
42. [Component Inventory](#42-component-inventory)
43. [Anti-Patterns to Strictly Avoid](#43-anti-patterns-to-strictly-avoid)
44. [Future Phase Design Considerations](#44-future-phase-design-considerations)

---

## 1. Design Vision & Identity

**KisanLink** embodies a modern, premium agricultural operating system. It bridges the gap between rural Indian smallholders who require radical simplicity and institutional bulk buyers who demand sophisticated procurement tools.

---

## 2. Reference Inspiration & Aesthetics

The design draws inspiration from modern, high-end organic produce marketplaces:
- Soft, organic neutral canvases.
- Large, high-definition crop photography with generous white space.
- Clean sans-serif typography with high legibility.
- Large rounded card surfaces and restrained brand accents.

---

## 3. What We Take From Reference vs. What We Explicitly Avoid

### What We Take:
- **Calm, High-End Presentation:** Light, clean surfaces that feel trustworthy and premium.
- **Large Product Cards:** Crisp visual focus on harvest quality and origin details.
- **Clear Categorical Filtering:** Pill/chip-based navigation for immediate discovery.
- **Obvious Primary Actions:** High-contrast CTA buttons that leave no ambiguity.

### What We Explicitly Do NOT Copy:
- **No Cluttered ERPs:** We do not build dense spreadsheet-style screens for farmers.
- **No Generic Green Overkill:** We avoid painting every background, card, and icon green.
- **No Rustic Caricatures:** No cartoon tractors, faux-wooden textures, or generic government portal styling.
- **No Neon or Glassmorphism:** No translucent neon blur effects that hurt readability in bright sunlight.

---

## 4. Brand Personality & Perception

```
+--------------------------------------------------------------------------------------------------+
|                                    KISANLINK BRAND ATTRIBUTES                                    |
+-------------------+-------------------+--------------------+------------------+------------------+
|      PREMIUM      |   AGRICULTURAL    |     ACCESSIBLE     |   TRUSTWORTHY    |     MODERN       |
| Refined & sleek   | Rooted in Indian  | Effortless for low-| Transparent with | Fast, reactive,  |
| for bulk buyers   | soil & harvests   | literacy farmers   | zero hidden cuts | and intelligent  |
+-------------------+-------------------+--------------------+------------------+------------------+
```

---

## 5. Core Design Principles

1. **Radical Simplicity for Farmers:** 6 large primary touch cards on Home. One question per screen for listings. Zero data-dense dashboards.
2. **Progressive Complexity for Buyers:** Clean consumer marketplace by default; rich procurement tools (reverse marketplace, supply calendar, cluster planner) for B2B institutions.
3. **Utility-First for Transporters:** Clear manifests, turn-by-turn waypoint routes, and immediate payment confirmations.
4. **Restrained Semantic Color:** Green is a deliberate brand accent, not a background fill.
5. **Human Voice & Assisted Touchpoints:** Native Hindi/English voice input + prominent 1-tap `Call Support / हमसे बात करें`.

---

## 6. Color System & Semantic Tokens

```
+----------------------------------------------------------------------------------------------------+
|                                    COLOR PALETTE SPECIFICATION                                     |
+--------------------+------------+------------------------------------------------------------------+
| TOKEN NAME         | HEX VALUE  | SEMANTIC USAGE                                                   |
+--------------------+------------+------------------------------------------------------------------+
| `canvas-warm`      | `#F7F4EB`  | Main application canvas / background (warm ivory)                |
| `surface-white`    | `#FFFFFF`  | Card backgrounds, modals, input fields                           |
| `brand-deep-green` | `#236747`  | Primary CTA buttons, active tabs, brand headers                  |
| `brand-soil`       | `#75563B`  | Earth accents, farm origin badges, harvest icons                 |
| `brand-harvest`    | `#EBAF3C`  | Pre-harvest badges, high demand alerts, rating stars             |
| `brand-urgency`    | `#D9613C`  | Spoilage rescue badges, call-center emergency, price drop alerts |
| `text-primary`     | `#1F2924`  | Primary headings, body copy, active numbers (deep charcoal)      |
| `text-secondary`   | `#68736D`  | Subtitles, helper text, timestamps, unit labels                  |
| `border-subtle`    | `#DDE3DD`  | Card borders, dividers, inactive input strokes                   |
+--------------------+------------+------------------------------------------------------------------+
```

---

## 7. Typography Hierarchy

- **Primary English Font:** `Manrope`, sans-serif (Clean geometric modernism).
- **Primary Indian Language Font:** `Noto Sans Devanagari` (Native Hindi readability).

| Level | Size | Weight | Line Height | Application |
|---|---|---|---|---|
| **Display (Farmer)** | `28px - 32px` | Bold (`700`) | `38px` | Farmer greeting & single-question listing headers |
| **Heading 1 (H1)** | `24px - 26px` | SemiBold (`600`) | `32px` | Buyer workspace titles, cluster hero headers |
| **Heading 2 (H2)** | `18px - 20px` | SemiBold (`600`) | `26px` | Card titles, crop names, modal headers |
| **Body (Farmer Touch)**| `18px` | Medium (`500`) | `26px` | Farmer card labels, option buttons |
| **Body (Standard)** | `15px - 16px` | Regular (`400`) | `22px` | General body copy, descriptions |
| **Caption / Badge** | `12px - 13px` | SemiBold (`600`) | `16px` | Grade badges, harvest dates, tags |

---

## 8. Spacing & Layout Grid

- **8pt Base Grid System:** All paddings, margins, and gaps are multiples of $4\text{px}$ or $8\text{px}$ (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Standard Container Max-Width:**
  - Mobile: $100\%$ width with $16\text{px}$ gutter.
  - Tablet: Max $768\text{px}$ width with $24\text{px}$ gutter.
  - Desktop: Max $1280\text{px}$ width with $32\text{px}$ gutter.

---

## 9. Shape Language & Corner Radii

- **Cards & Surfaces:** `16px – 20px` border radius (`rounded-2xl`).
- **Primary Buttons:** `12px – 16px` border radius (`rounded-xl`).
- **Pills & Status Chips:** `9999px` full pill radius (`rounded-full`).
- **Touch Target Dimensions:**
  - Standard Mobile CTA: Minimum $48\text{px}$ height.
  - Farmer Major Action Cards: $64\text{px} – 72\text{px}+$ height.

---

## 10. Elevation & Depth

- **Restrained Shadows:** We prioritize subtle 1px border strokes (`#DDE3DD`) over heavy shadows.
- **Card Shadow:** `box-shadow: 0 2px 8px rgba(31, 41, 36, 0.04);`
- **Floating Call Support Action Button:** `box-shadow: 0 4px 16px rgba(217, 97, 60, 0.25);`

---

## 11. Iconography Standards

- **Icon Set:** `lucide-react` with consistent $2\text{px}$ stroke width.
- **Dual Presentation Rule:** Every icon in the Farmer experience is accompanied by explicit text in Hindi and English. Zero ambiguous standalone icons.

---

## 12. Produce Photography Guidelines

- Clean, naturally lit produce shots with generous white or neutral background padding.
- Used prominently on Buyer Catalog, Pre-Harvest Previews, and Farm Story popups.
- Avoid low-resolution, overly saturated stock photos.

---

## 13. Purposeful Motion & Micro-Interactions

- **Voice Recording:** Gentle pulsing halo around the microphone icon when active.
- **Order State Progression:** Smooth CSS step transition as consignment changes state.
- **Cluster Aggregation:** Animated counter scaling from $0\text{ kg}$ to $5,000\text{ kg}$ as farmers are combined during the SIH demo.
- **Strict Motion Safeguard:** `prefers-reduced-motion` fully supported.

---

## 14. Responsive Breakpoint Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    RESPONSIVE BREAKPOINT GRID                                      |
+---------------+-------------------+----------------------------------------------------------------+
| BREAKPOINT    | MIN WIDTH         | LAYOUT SPECIFICATION                                           |
+---------------+-------------------+----------------------------------------------------------------+
| **Mobile**    | `< 640px`         | Single column, 6-card farmer grid (2x3), sticky bottom nav     |
| **Tablet**    | `640px - 1023px`  | 2-column marketplace grid, split preview panels                |
| **Desktop**   | `1024px - 1439px` | 3-4 column catalog, Left navigation + Canvas + Context panel   |
| **Wide**      | `≥ 1440px`        | Max-width centered container (1400px), rich twin map visualizer|
+---------------+-------------------+----------------------------------------------------------------+
```

---

## 15. Accessibility & WCAG 2.1 AA Compliance

- **Contrast Ratios:** Text on `#F7F4EB` canvas exceeds $4.5:1$ contrast ratio.
- **Large Touch Targets:** Minimum $48 \times 48\text{ px}$ clickable area for all buttons.
- **Screen Reader Support:** Semantic HTML5 elements (`<main>`, `<nav>`, `<article>`, `<button>`) with `aria-label` attributes for voice and status badges.

---

## 16. Localization & Bilingual Toggle Architecture

- Sticky Header Toggle: `[हिन्दी | English]` permanently accessible on top-right.
- Toggling instantly swaps runtime string dictionaries via `i18next` without page reload.

---

## 17. Farmer UX Principles (Radical Simplicity)

1. **Zero Clutter:** No complex graphs, analytical indices, or nested drawer menus.
2. **Immediate Clarity:** Every card presents a large recognizable icon and dual-language title.
3. **One Question Per Screen:** Step-by-step listing creation wizard.
4. **Always Reachable Support:** Floating red/green Call Support button.

---

## 18. Farmer Navigation System

Persistent 4-tab bottom navigation bar for mobile:
1. `🏠 Home / मुख्य`
2. `🌾 Sell / बेचें`
3. `📦 Orders / ऑर्डर`
4. `📞 Support / सहायता`

---

## 19. Farmer Component Patterns

### 6-Card Farmer Home Layout
```
+------------------------------------------------------------------------+
|  [Logo] KisanLink / किसान लिंक                 [हिन्दी | English]  [Bell]|
+------------------------------------------------------------------------+
|  🌾 Namaste, Ramesh Ji! (Sonipat, Haryana)                             |
+------------------------------------------------------------------------+
|                                                                        |
|   +--------------------------------+  +------------------------------+ |
|   |        [🌾 Sell My Crop]       |  |      [🔍 Find Buyers]        | |
|   |         अपनी फसल बेचें         |  |         खरीदार खोजें         | |
|   +--------------------------------+  +------------------------------+ |
|                                                                        |
|   +--------------------------------+  +------------------------------+ |
|   |        [📦 My Orders]          |  |      [🚚 Transport]          | |
|   |          मेरे ऑर्डर            |  |          गाड़ी / वाहन         | |
|   +--------------------------------+  +------------------------------+ |
|                                                                        |
|   +--------------------------------+  +------------------------------+ |
|   |        [💰 Payments]           |  |      [🤖 Speak to AI]        | |
|   |         भुगतान / खाते          |  |         बोलकर बताएं          | |
|   +--------------------------------+  +------------------------------+ |
|                                                                        |
+------------------------------------------------------------------------+
|  [🔴 Call Support / हमसे बात करें (Toll Free: 1800-XXX-XXXX)]          |
+------------------------------------------------------------------------+
|  Market Guidance: Tomato Mandi ₹19/kg | KisanLink Direct ₹25/kg        |
+------------------------------------------------------------------------+
```

---

## 20. Farmer Screen Wireframes (ASCII)

### 20.1 One-Question-Per-Screen Listing Wizard
```
+------------------------------------------------------------------------+
|  < Back                     Step 2 of 5                  [हिन्दी]      |
+------------------------------------------------------------------------+
|                                                                        |
|   How much quantity do you have?                                       |
|   आपके पास कितनी मात्रा है?                                            |
|                                                                        |
|                +------------------------------------+                  |
|                |            1,200  kg               |                  |
|                |         (1.2  Tonnes)              |                  |
|                +------------------------------------+                  |
|                                                                        |
|         [ - 100 kg ]                     [ + 100 kg ]                  |
|                                                                        |
|         Quick Select:  [ 500 kg ]   [ 1,000 kg ]   [ 2,000 kg ]        |
|                                                                        |
+------------------------------------------------------------------------+
|  [ Next / आगे बढ़ें  ➔ ]                                               |
+------------------------------------------------------------------------+
```

---

## 21. Voice User Experience (VUI)

```
+------------------------------------------------------------------------+
|                       🎤 Speaking in Hindi...                          |
|                       "सुन रहे हैं..."                                 |
+------------------------------------------------------------------------+
|                                                                        |
|                   ( ( ( ( (  🎙️  ) ) ) ) )                            |
|                                                                        |
|   "Mere paas 800 kilo tamatar hai, agle hafte taiyaar hoga"            |
|                                                                        |
+------------------------------------------------------------------------+
|   ✓ Understood:                                                        |
|     • Crop: Tomato (टमाटर)                                             |
|     • Quantity: 800 kg                                                 |
|     • Availability: Next Week (अगले हफ्ते)                             |
+------------------------------------------------------------------------+
|   [ Looks Correct / सही है ➔ ]              [ Try Again / दोबारा बोलें]|
+------------------------------------------------------------------------+
```

---

## 22. Buyer UX Principles (Progressive Complexity)

- **Consumer View:** Clean e-commerce catalog with high-res crop cards, origin farm stories, and direct checkout.
- **B2B Bulk Procurement View:** Sidebar navigation, reverse marketplace posting modal, 4-week forward crop calendar, dynamic cluster planner, and digital twin map.

---

## 23. Consumer Direct Marketplace Experience

- 3-column product grid featuring farm distance, harvest timestamp (*"Harvested 6h ago"*), farmer name, and savings vs. retail benchmark.

---

## 24. B2B Procurement Workspace

- Enables corporate buyers (hotels, restaurants, retail chains) to post 5,000kg+ requirements and receive multi-farmer aggregated supply plans.

---

## 25. Buyer Screen Wireframes (ASCII)

### 25.1 B2B Requirement Poster (Reverse Marketplace)
```
+------------------------------------------------------------------------+
|  Post Procurement Requirement / नया मांग पत्र                         |
+------------------------------------------------------------------------+
|  Crop: [ Tomato (टमाटर)          ▼ ]   Target Qty: [ 5,000  kg ]       |
|  Quality Grade: (•) Grade A   ( ) Grade B   ( ) Processing Grade       |
|  Delivery Location: [ The Imperial Hotel, Connaught Place, New Delhi ] |
|  Required By Date: [ 10 Sept 2026 ]   Ceiling Price: [ ₹ 28.00 / kg ]  |
+------------------------------------------------------------------------+
|  [ ⚡ Find Sourcing Matches / किसान खोजें ]                            |
+------------------------------------------------------------------------+
```

---

## 26. Logistics Provider UX (Utility-First)

- Clean load board showing payout in rupees, total payload weight, pickup stops, and destination.

---

## 27. Logistics Screen Wireframes (ASCII)

```
+------------------------------------------------------------------------+
|  Active Dispatch Job #SH-402                       Payout: ₹12,500    |
+------------------------------------------------------------------------+
|  Payload: 5.0 Tonnes Tomatoes | Vehicle: 5.0T Eicher Pro (HR-38-A-1024)|
|  Route: Sonipat ➔ Panipat ➔ New Delhi (Total: 112 km)                  |
+------------------------------------------------------------------------+
|  PICKUP STOPS:                                                         |
|  [✓] 1. Farm A (Ramesh - Sonipat)     : 1,200 kg  [Verified]           |
|  [✓] 2. Farm B (Suresh - Sonipat)     :   800 kg  [Verified]           |
|  [ ] 3. Farm C (Balbir - Panipat)     : 1,700 kg  [Navigate ➔]         |
|  [ ] 4. Farm D (Jaipal - Panipat)     : 1,300 kg  [Pending]            |
+------------------------------------------------------------------------+
|  DROP-OFF DESTINATION:                                                 |
|  [ ] The Imperial Hotel, New Delhi    : 5,000 kg  [Delivery OTP]       |
+------------------------------------------------------------------------+
```

---

## 28. Map Design & Spatial Data Visualization (MapLibre)

- MapLibre GL vector tiles in soft neutral tones (`#F7F4EB` canvas compatible).
- Dynamic Farmer Clusters represented as green circular catchment polygons with individual farm markers connected via optimized routing polyline.

---

## 29. Demand & Supply Forecast Presentation

- **Farmer View:** Qualitative, bold indicator chips:
  `🟢 High Demand Expected | Tomato | Next 3 Weeks | Fair Price: ₹24-₹27/kg`
- **Buyer View:** Quantitative trend graphs showing regional arrival volume indices and projected supply deficits.

---

## 30. Explainable Matching UI

```
+------------------------------------------------------------------------+
|  ✓ Why this sourcing match was selected:                               |
|    • Distance: All 4 farms within 28 km radius of Murthal highway.     |
|    • Quality: 100% Grade A certified via pre-harvest declarations.      |
|    • Timing: Harvest dates align within 24h of requested delivery.     |
|    • Logistics: Consolidated 1-truck pickup saves ₹4,800 in freight.   |
+------------------------------------------------------------------------+
```

---

## 31. Dynamic Farmer Cluster Visualizer (SIH Hero Screen)

```
+------------------------------------------------------------------------+
|  🎯 DYNAMIC FARMER CLUSTER #TC-104                 Status: 100% MATCH  |
+------------------------------------------------------------------------+
|  Target Sourcing Demand: 5,000 kg Tomatoes | Delivered to: Delhi NCR   |
|                                                                        |
|  +-------------------+  +-------------------+  +---------------------+ |
|  | Farmer A (Sonipat)|  | Farmer B (Sonipat)|  | Farmer C (Panipat)  | |
|  | 1,200 kg (₹25/kg) |  |   800 kg (₹25/kg) |  | 1,700 kg (₹25/kg)   | |
|  +-------------------+  +-------------------+  +---------------------+ |
|                                 +------------------------------------+ |
|                                 | Farmer D (Panipat) : 1,300 kg      | |
|                                 +------------------------------------+ |
|                                                                        |
|  TOTAL POOLED SUPPLY: 5,000 / 5,000 kg (✓ FULFILLED)                   |
|                                                                        |
|  • Average Farm Price : ₹ 25.00 / kg                                   |
|  • Shared Freight     : ₹  2.20 / kg                                   |
|  • Total Delivered    : ₹ 27.20 / kg  (Wholesale Mandi: ₹32.00 / kg)   |
|  • BUYER NET SAVINGS  : 15.0% (₹ 24,000 saved)                         |
|  • FARMER EXTRA GAIN  : +31.5% (vs Mandi ₹19/kg)                       |
+------------------------------------------------------------------------+
|  [ Accept Sourcing Plan & Lock Escrow (₹1,37,500) ➔ ]                  |
+------------------------------------------------------------------------+
```

---

## 32. Order Tracking & State Visualizer

Horizontal step indicator showing real-time milestone transitions:
`[✓ Matched] ➔ [✓ Confirmed] ➔ [✓ Escrow Locked] ➔ [🚚 In Transit] ➔ [ Delivered] ➔ [ Settled]`

---

## 33. Payment & Settlement Transparency Visuals

Detailed cost breakdown card showing every rupee allocated:
- Gross Buyer Payment: **₹1,37,500**
- Farmers Payout (Combined 5,000kg): **₹1,22,500**
- Transporter Freight: **₹12,500**
- Platform Fee (1.8%): **₹2,500**
- Middleman Cuts: **₹0.00 (Removed)**

---

## 34. Wastage Rescue & Urgent Sale Tagging UI

- Distinctive warm badge (`#D9613C`):
  `🚨 Urgent Sale / जल्दी बेचें (Expires in 48h) — Recommended Rescue Price: ₹21/kg`

---

## 35. Empty States

- Friendly illustrations with clear CTAs:
  *"No active listings found in this district. Post a Buyer Requirement to notify nearby farmers."*

---

## 36. Loading States & Skeleton Screens

- Shimmering light gray bone placeholders replicating the exact dimensions of produce cards to prevent layout shift (CLS).

---

## 37. Error Handling & Forgiving UI

- Non-blocking toast alerts with clear recovery actions:
  *"Network disconnected. Your listing draft is saved locally and will upload automatically."*

---

## 38. Offline & Weak Network Indicators

- Muted banner at screen top:
  `⚠️ Offline Mode — Working from local cache`

---

## 39. Desktop & Laptop Layout Adaptation

- On screen widths $\ge 1024\text{px}$:
  - Left navigation sidebar ($240\text{px}$).
  - Main working canvas ($800\text{px}$).
  - Right contextual summary panel ($360\text{px}$) showing dynamic cluster breakdown or cart overview.

---

## 40. Mobile-First Native Feel

- Bottom navigation bar, smooth touch swipes, pull-to-refresh on listing feeds, and oversized tap targets.

---

## 41. Design Token Reference Table

```css
:root {
  --color-canvas: #F7F4EB;
  --color-surface: #FFFFFF;
  --color-brand-green: #236747;
  --color-soil: #75563B;
  --color-harvest: #EBAF3C;
  --color-urgency: #D9613C;
  --color-text-primary: #1F2924;
  --color-text-secondary: #68736D;
  --color-border: #DDE3DD;
  --radius-card: 18px;
  --radius-btn: 14px;
}
```

---

## 42. Component Inventory

- `ButtonCard`: Large touch card for farmer actions.
- `VoiceMicButton`: Animated microphone recording trigger.
- `ClusterHeroCard`: Multi-farmer supply pooling visualizer.
- `ProduceCard`: Large image crop card with grade badge.
- `CallSupportFAB`: Floating emergency support button.
- `StatusBadge`: Semantic pill for crop/order states.

---

## 43. Anti-Patterns to Strictly Avoid

- ❌ Do not use tiny $12\text{px}$ text for farmer screens.
- ❌ Do not present raw unformatted numbers like `0.84279` to farmers.
- ❌ Do not create 12-field single-page forms for rural users.
- ❌ Do not use generic all-green interfaces.

---

## 44. Future Phase Design Considerations

- Future FPO cooperative management dashboards.
- Administrative dispute arbitration consoles.
- Real-time IoT temperature gauges for cold-chain transit.

---
*End of KisanLink UI/UX Design System & Wireframe Specifications*
