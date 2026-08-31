# SIH 2026 — Problem Statement 26033
## AI-Powered Farmer-to-Buyer Agricultural Supply Network

Version: 0.1  
Status: Concept / Architecture Phase  
Competition: Smart India Hackathon 2026  
Category: Software  
Theme: Agriculture, FoodTech & Rural Development  

---

# 1. Problem Statement

## Problem Statement ID

26033

## Title

Multiple intermediaries reduce farmers earnings and increase consumer prices.

## Organization

Ministry of Consumer Affairs, Food & Public Distribution

## Department

Department of Consumer Affairs (DoCA)

## Expected Solution

Create a digital marketplace that:

- connects farmers and FPOs directly with consumers and bulk buyers
- provides logistics support
- uses AI for demand forecasting
- uses AI for route optimization

## Expected Benefits

- better prices for farmers
- lower prices for consumers
- reduced supply-chain inefficiencies

---

# 2. Core Problem

The agricultural supply chain often looks like:

```text
Farmer
  ↓
Local Aggregator
  ↓
Commission Agent
  ↓
Wholesaler
  ↓
Distributor
  ↓
Retailer
  ↓
Consumer
```

Every intermediary adds:

- margin
- transportation
- handling
- delays
- wastage
- information asymmetry

The result is that:

```text
Farmer receives low price
        +
Consumer pays high price
```

The challenge is not simply creating a website where farmers can list produce.

The real challenge is coordinating:

- fragmented farmer supply
- uncertain demand
- transportation
- quality
- pricing
- bulk procurement
- perishability
- payments
- delivery timing

---

# 3. Product Vision

Build an intelligent agricultural supply orchestration platform.

Instead of being only:

```text
Farmer Marketplace
```

the platform becomes:

```text
Farmer Supply
     +
Buyer Demand
     +
AI Matching
     +
Demand Forecasting
     +
Logistics Optimization
     +
Supply Aggregation
     +
Price Intelligence
     ↓
Optimized Agricultural Supply Network
```

The system should automatically determine:

- who should sell
- who should buy
- how much should be sourced
- which farmers should be grouped
- what price is economically viable
- what vehicle should be used
- what route should be followed
- when produce should be delivered

---

# 4. Positioning

Recommended positioning:

> An AI-powered agricultural supply orchestration platform that aggregates fragmented farmer supply, predicts demand, automatically matches farmers with bulk buyers, and optimizes first-mile logistics.

Avoid positioning the project merely as:

> An online marketplace connecting farmers and consumers.

[Likely] A generic marketplace will be difficult to differentiate during SIH because the obvious interpretation of the problem statement will lead many teams toward similar solutions.

---

# 5. User Types

The platform should support multiple stakeholders.

## 5.1 Farmers

Farmers can:

- register
- list crops
- declare expected harvests
- enter quantity
- enter minimum expected price
- upload crop photographs
- receive buyer matches
- receive price recommendations
- accept orders
- track logistics
- receive payments

---

## 5.2 Farmer Producer Organizations — FPOs

FPOs can:

- manage multiple farmers
- aggregate produce
- manage collective inventory
- negotiate bulk orders
- coordinate collection
- monitor member earnings
- manage dispatch

---

## 5.3 Bulk Buyers

Examples:

- hotels
- restaurants
- supermarkets
- grocery chains
- food processors
- caterers
- exporters
- institutional kitchens
- schools
- hospitals
- government institutions

Bulk buyers can:

- post procurement requirements
- specify grades
- specify quantity
- specify delivery date
- specify location
- specify maximum price
- receive automatically generated procurement plans

---

## 5.4 Consumers

Consumers can:

- discover nearby produce
- purchase directly
- view source farmer
- view quality information
- participate in group purchases

B2C should exist, but the primary economic engine should focus heavily on B2B procurement.

---

## 5.5 Logistics Providers

Transporters can provide:

- vehicle type
- current location
- available capacity
- refrigeration availability
- operating radius
- pricing

The platform can automatically assign vehicles.

---

## 5.6 Administrators

Administration dashboard:

- user verification
- dispute management
- transaction monitoring
- crop supply monitoring
- demand monitoring
- price anomaly detection
- logistics monitoring
- platform analytics

---

# 6. Core Platform Architecture

```text
                  ┌───────────────────────┐
                  │ Farmer / FPO Platform │
                  │ Mobile App / PWA      │
                  └───────────┬───────────┘
                              │
                              │
                  ┌───────────▼───────────┐
                  │     API Gateway       │
                  │ Authentication        │
                  └───────────┬───────────┘
                              │
      ┌───────────────────────┼──────────────────────────┐
      │                       │                          │
      ▼                       ▼                          ▼

┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Marketplace │       │ AI Intelligence │       │ Logistics       │
│ Engine      │       │ Layer           │       │ Engine          │
└──────┬──────┘       └────────┬────────┘       └────────┬────────┘
       │                       │                         │
       │              ┌────────┼───────────┐             │
       │              │        │           │             │
       │              ▼        ▼           ▼             │
       │           Demand   Matching    Pricing          │
       │          Forecast   Engine     Engine            │
       │                                                  │
       │                    ┌──────────────┐               │
       │                    │ CV Grading   │               │
       │                    │ Optional     │               │
       │                    └──────────────┘               │
       │                                                  │
       └───────────────────────┬──────────────────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │ PostgreSQL / Main Database  │
                │                             │
                │ Farmers                     │
                │ Buyers                      │
                │ Crops                       │
                │ Harvests                    │
                │ Orders                      │
                │ Vehicles                    │
                │ Routes                      │
                │ Prices                      │
                │ Transactions                │
                └──────────────┬──────────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │ External Data Sources    │
                 │                          │
                 │ Weather                  │
                 │ Maps                     │
                 │ Mandi Prices             │
                 │ Payments                 │
                 │ Government Data          │
                 └──────────────────────────┘
```

---

# 7. Core Modules

## 7.1 Farmer Supply Module

A farmer should be able to create a crop listing containing:

```text
Crop
Variety
Quantity
Grade
Location
Harvest status
Expected harvest date
Minimum expected price
Images
Shelf life
Preferred sale radius
```

Example:

```text
Farmer:
Ramesh Kumar

Crop:
Tomato

Quantity:
1,200 kg

Location:
Sonipat

Expected Harvest:
8 September

Expected Price:
₹25/kg
```

---

# 8. Pre-Harvest Supply Visibility

Traditional marketplaces usually become aware of produce only once it is ready for sale.

Our system should capture future supply.

Farmers can declare:

```text
Crop planted
Expected harvest date
Expected quantity
Estimated grade
```

Example:

```text
Tomato
Expected quantity: 1,200 kg
Harvest date: 8 September
Location: Sonipat
```

The platform can start searching for buyers before harvest.

Benefits:

- farmers know where their crop may be sold
- buyers know upcoming availability
- logistics can be planned beforehand
- distress selling can be reduced
- wastage can be reduced

---

# 9. Buyer Demand Module

Instead of requiring buyers to manually browse hundreds of listings, buyers can publish requirements.

Example:

```text
Buyer:
Hotel Procurement Company

Requirement:
Tomato

Grade:
A/B

Quantity:
5,000 kg

Location:
Delhi

Required before:
10 September

Maximum delivered price:
₹28/kg
```

The platform then generates a procurement plan.

---

# 10. AI Procurement Matching Engine

The system should automatically match buyer requirements with available farmers.

Inputs:

- required crop
- required quantity
- quality
- farmer location
- buyer location
- farmer price
- transport cost
- harvest date
- delivery deadline
- farmer reliability
- available vehicle capacity
- shelf life

Example:

```text
Buyer needs:
10,000 kg tomatoes in Delhi
```

Available supply:

```text
Farmer A
2,000 kg
Sonipat
₹22/kg

Farmer B
4,000 kg
Panipat
₹23/kg

FPO C
7,000 kg
Karnal
₹21/kg
```

AI output:

```text
Recommended Procurement Plan

Farmer A:
2,000 kg

Farmer B:
4,000 kg

FPO C:
4,000 kg

Total:
10,000 kg

Average farmer price:
₹22.20/kg

Logistics:
₹2.40/kg

Platform charges:
₹0.50/kg

Delivered buyer price:
₹25.10/kg
```

The objective function could minimize:

```text
Total Cost
+
Transport Distance
+
Delivery Risk
+
Spoilage Risk
```

while maximizing:

```text
Farmer Earnings
+
Vehicle Utilization
+
Buyer Requirement Fulfilment
```

---

# 11. Virtual FPO / Dynamic Farmer Aggregation

One of the primary differentiators.

Individual farmers often have insufficient quantity for large institutional buyers.

Example:

```text
Farmer A → 200 kg
Farmer B → 450 kg
Farmer C → 300 kg
Farmer D → 600 kg
...
```

A buyer may need:

```text
10,000 kg
```

The platform automatically groups geographically nearby farmers.

Output:

```text
Virtual Farmer Cluster #12

Farmers:
17

Crop:
Onion

Combined supply:
11.8 tonnes

Cluster radius:
22 km

Buyer requirement:
10 tonnes

Status:
Eligible
```

This effectively allows independent small farmers to compete for large procurement contracts.

Potential name:

```text
Dynamic Farmer Cluster
```

or:

```text
Virtual FPO
```

---

# 12. Reverse Marketplace

Normal marketplace model:

```text
Farmer lists produce
        ↓
Buyer searches
```

Our platform also supports:

```text
Buyer posts requirement
        ↓
System finds supply
        ↓
Farmers receive opportunity
```

Example:

```text
Buyer Requirement

20 tonnes onions
Delhi NCR
Delivery within 5 days
```

System:

```text
Identified:
12 farmers
2 FPOs
3 suitable trucks
```

The platform constructs the supply chain automatically.

---

# 13. Pre-Harvest Buyer Booking

Buyers should be able to reserve upcoming supply.

Example:

Farmer:

```text
Potato
8 tonnes
Harvest expected: 15 October
```

Buyer:

```text
Reserve:
3 tonnes

Agreed price:
₹24/kg
```

Benefits:

Farmer:

- demand certainty
- reduced distress selling
- better financial planning

Buyer:

- supply certainty
- predictable procurement
- reduced price volatility

---

# 14. Demand Forecasting Engine

The AI forecasting system predicts:

```text
What crop?
Where?
How much demand?
When?
At approximately what price?
```

Potential data inputs:

- historical mandi prices
- historical transactions
- buyer procurement history
- active buyer requirements
- weather
- crop seasonality
- geographical consumption
- festivals
- regional events
- historic supply
- harvest cycles

Example output:

```text
Region:
Delhi NCR

Crop:
Tomato

Forecast:
Demand expected to increase 18%

Next 7-day expected demand:
230 tonnes

Expected supply:
190 tonnes

Projected shortage:
40 tonnes
```

Farmer-facing output:

```text
HIGH DEMAND EXPECTED

Tomato
Delhi NCR

Period:
Next 14 days

Expected price range:
₹28–₹33/kg
```

---

# 15. Fair Price Intelligence Engine

The platform should not simply display mandi prices.

It should calculate an estimated fair farm-gate value.

Inputs:

```text
Mandi price
Commission
Transportation
Loading
Unloading
Intermediary margins
Distance
Regional demand
Current supply
Quality
```

Example:

Traditional supply chain:

```text
Farmer receives:
₹22/kg

Consumer pays:
₹50/kg
```

Platform optimized chain:

```text
Farmer receives:
₹30/kg

Buyer pays:
₹39/kg
```

Dashboard:

```text
Farmer Income Improvement:
+36%

Buyer Savings:
-22%
```

This becomes one of the primary measurable impact metrics.

---

# 16. Logistics Optimization Engine

Logistics should be a core feature rather than an external delivery button.

Example farmer supply:

```text
Farmer A:
1.5 tonnes

Farmer B:
2 tonnes

Farmer C:
1.2 tonnes
```

Truck:

```text
Capacity:
5 tonnes
```

Instead of sending three separate vehicles, the system creates one route.

```text
Collection Hub
      ↓
Farmer A
      ↓
Farmer C
      ↓
Farmer B
      ↓
Buyer
```

Optimization variables:

- distance
- travel time
- truck capacity
- fuel
- tolls
- product shelf life
- delivery deadline
- refrigeration requirement
- traffic
- pickup time
- driver availability

Recommended optimization library:

```text
Google OR-Tools
```

---

# 17. Load Consolidation

The platform should maximize vehicle utilization.

Example:

Without optimization:

```text
Truck 1:
40% utilization

Truck 2:
35%

Truck 3:
45%
```

After consolidation:

```text
Truck 1:
92%

Truck 2:
88%
```

Potential benefits:

- lower transportation cost
- reduced fuel consumption
- lower emissions
- fewer trips
- better farmer margins

---

# 18. Supply Chain Digital Twin

A visual control center can show:

```text
Farmers
   ↓
Collection Points
   ↓
Vehicles
   ↓
Buyers
```

The map can display:

- live farmer supply
- buyer demand
- available trucks
- active orders
- collection clusters
- routes
- demand hotspots

The system should also support simulations.

Example:

```text
Scenario:

Delhi tomato demand rises by 30%.
```

AI output:

```text
Expected shortage:
14 tonnes

Recommended sourcing:

Sonipat:
8 tonnes

Karnal:
4 tonnes

Meerut:
2 tonnes

Vehicles required:
3

Estimated delivered cost:
₹27.40/kg
```

This feature can provide a strong visual demonstration to judges.

---

# 19. Wastage Rescue Network

Perishable produce that remains unsold should automatically enter a rescue workflow.

Example:

```text
Crop:
Tomatoes

Quantity:
600 kg

Estimated remaining shelf life:
2 days
```

The platform changes buyer priority.

```text
Priority 1:
Restaurants

Priority 2:
Caterers

Priority 3:
Food processors

Priority 4:
Sauce / puree manufacturers

Priority 5:
NGOs / community kitchens
```

Dynamic pricing could be recommended.

Example:

```text
Today:
₹25/kg

Tomorrow:
₹21/kg

Final rescue price:
₹17/kg
```

The objective is to recover farmer value rather than allowing the produce to become waste.

---

# 20. AI Farmer Assistant

Farmers should be able to interact naturally.

Supported modes:

- text
- voice
- regional languages

Potential languages:

- Hindi
- Punjabi
- Marathi
- Bengali
- Tamil
- Telugu
- others later

Example:

Farmer:

```text
Mere paas 700 kilo tamatar 4 din mein ready honge.
Kahan bechu?
```

Assistant:

```text
Recommended buyer:

ABC Hotel Supplies
Delhi

Buyer requirement:
1,200 kg

Estimated farmer price:
₹29/kg

Current local mandi estimate:
₹23/kg

Potential additional earnings:
₹4,200
```

Possible assistant capabilities:

- create crop listing
- find buyers
- explain prices
- check order status
- check transport
- recommend selling location
- explain demand trends

---

# 21. AI Produce Grading

Optional computer-vision feature.

Farmer uploads crop images.

AI estimates:

```text
Crop:
Tomato

Grade A:
72%

Grade B:
24%

Potentially damaged:
4%
```

Possible attributes:

- size
- color
- visible damage
- ripeness
- surface defects
- uniformity

The system should clearly present grading as an AI estimate rather than laboratory certification.

Possible technologies:

```text
YOLO
EfficientNet
MobileNet
Vision Transformer
Vision API
```

---

# 22. Trust and Reputation System

Each participant receives reliability metrics.

Farmer metrics:

```text
Successful deliveries
Quality accuracy
Quantity accuracy
Order acceptance
Cancellation rate
Buyer ratings
```

Buyer metrics:

```text
Successful transactions
Payment reliability
Cancellation rate
Farmer ratings
```

Logistics metrics:

```text
On-time deliveries
Damage reports
Cancellation rate
Route reliability
```

This reduces uncertainty in direct transactions.

---

# 23. Transaction Workflow

```text
Buyer creates requirement
        ↓
Matching engine finds suppliers
        ↓
Procurement plan generated
        ↓
Farmers receive offers
        ↓
Farmers accept
        ↓
Quantity reserved
        ↓
Vehicle assigned
        ↓
Pickup scheduled
        ↓
Produce collected
        ↓
Quantity / quality verified
        ↓
Shipment begins
        ↓
Buyer receives produce
        ↓
Delivery confirmed
        ↓
Payment released
```

---

# 24. Escrow-Style Payment Workflow

For the prototype:

```text
Buyer Payment:
₹1,00,000
      ↓
Platform holds transaction
      ↓
Produce delivered
      ↓
Buyer confirms
      ↓
Payment distributed
```

Example:

```text
Farmer:
₹96,000

Logistics:
₹3,000

Platform:
₹1,000
```

For SIH, the system can simulate escrow without implementing a regulated financial escrow service.

---

# 25. Order Lifecycle

Possible statuses:

```text
DRAFT
MATCHING
AWAITING_FARMERS
CONFIRMED
PICKUP_SCHEDULED
IN_TRANSIT
DELIVERED
DISPUTED
COMPLETED
CANCELLED
```

---

# 26. Farmer Dashboard

Recommended dashboard components:

```text
Current crops

Upcoming harvests

Available buyer requests

Recommended opportunities

Current mandi price

Recommended selling price

Demand forecast

Active orders

Upcoming pickups

Payments

Income improvement
```

Example:

```text
Tomato

Available:
800 kg

Recommended Buyer:
Delhi Hotel Supply

Your Price:
₹29/kg

Local Mandi:
₹23/kg

Potential Additional Earnings:
₹4,800
```

---

# 27. Buyer Dashboard

Buyer dashboard:

```text
Open requirements

Procurement plans

Confirmed suppliers

Average procurement price

Current shipments

Upcoming deliveries

Farmer clusters

Quality metrics

Historic purchases
```

---

# 28. Command Center

Admin / operations dashboard:

```text
Live Supply
Live Demand
Demand Hotspots
Supply Shortages
Active Orders
Active Routes
Vehicle Utilization
Potential Wastage
Farmer Earnings
Buyer Savings
```

---

# 29. Impact Analytics

The product should constantly calculate measurable impact.

Metrics:

```text
Farmer income improvement

Buyer savings

Intermediary margin removed

Distance saved

Vehicle utilization

Food wastage prevented

Average farmer-to-buyer distance

Orders fulfilled

Farmers connected

Bulk buyers connected

Average transaction size
```

Example judge dashboard:

```text
Total Produce Traded:
28.4 tonnes

Farmer Additional Income:
₹1,84,000

Buyer Savings:
₹92,000

Transport Distance Saved:
1,420 km

Estimated Produce Saved From Waste:
2.3 tonnes
```

---

# 30. Recommended Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

---

## Farmer Mobile Experience

```text
Progressive Web App
```

A PWA avoids requiring farmers to install a heavy native application during the prototype.

---

## Backend

```text
FastAPI
Python
```

---

## Database

```text
PostgreSQL
```

---

## Cache / Real-Time Layer

Optional:

```text
Redis
WebSockets
```

---

# 31. AI / ML Stack

Demand forecasting:

```text
XGBoost
LightGBM
Prophet
LSTM if justified
```

Recommended prototype starting point:

```text
XGBoost / LightGBM
```

because structured agricultural demand data often does not justify using unnecessarily complex deep-learning models.

---

## Matching Engine

Combination of:

```text
Rules
+
Scoring Algorithm
+
Optimization
```

Potential technologies:

```text
Python
Google OR-Tools
```

---

## Route Optimization

```text
Google OR-Tools
```

Potential routing data:

```text
Google Maps
Mapbox
OpenStreetMap
OSRM
```

---

## Conversational AI

Possible:

```text
OpenAI
Gemini
Open-source LLM
```

Use for:

- voice interpretation
- multilingual interaction
- farmer queries
- explaining recommendations

Do not use the LLM as the mathematical optimization engine.

---

## Computer Vision

Optional:

```text
YOLO
EfficientNet
MobileNet
Vision API
```

---

# 32. External Data Sources

Potential integrations:

```text
Mandi price datasets

AGMARKNET

eNAM data where accessible

Weather APIs

Government agricultural datasets

Maps

Geocoding

Traffic

Payment gateway

SMS / WhatsApp

Regional weather forecasts
```

---

# 33. Main Differentiators

## Differentiator 1 — Virtual FPO

Automatically combine nearby small farmers into temporary supply clusters.

Value:

```text
Small farmer
      ↓
Virtual Farmer Cluster
      ↓
Large institutional contract
```

Priority:

```text
10/10
```

---

## Differentiator 2 — Intelligent Procurement Engine

Buyer enters:

```text
What
How much
Where
When
Budget
```

System returns a complete sourcing strategy.

Priority:

```text
10/10
```

---

## Differentiator 3 — Pre-Harvest Marketplace

Match supply and demand before crops are harvested.

Priority:

```text
9.5/10
```

---

## Differentiator 4 — Logistics Optimization

Combine pickups and automatically generate optimized routes.

Priority:

```text
9.5/10
```

---

## Differentiator 5 — Demand Forecasting

Predict crop demand at regional level.

Priority:

```text
9/10
```

---

## Differentiator 6 — Fair Price Intelligence

Show farmer income improvement and buyer savings.

Priority:

```text
9/10
```

---

## Differentiator 7 — Agricultural Supply Digital Twin

Visualize the complete network and simulate disruptions.

Priority:

```text
9/10
```

---

## Differentiator 8 — Wastage Rescue

Automatically redirect ageing produce toward alternative buyers.

Priority:

```text
8.5/10
```

---

## Differentiator 9 — Voice + Local Languages

Allow farmers to operate using natural speech.

Priority:

```text
8.5/10
```

---

## Differentiator 10 — AI Produce Grading

Image-based approximate quality assessment.

Priority:

```text
7.5/10
```

---

# 34. Features to Avoid Unless Time Permits

## Blockchain

[Likely] Blockchain would add significant implementation complexity without directly solving the primary supply-chain problem.

Priority:

```text
3/10
```

Only add it if traceability becomes a major requirement.

---

## Fully Autonomous Pricing

Avoid letting AI directly determine mandatory farmer prices.

Use:

```text
Price recommendation
```

rather than:

```text
AI-controlled price
```

---

## Excessive Microservices

For SIH prototype:

```text
Modular monolith
```

is preferable to:

```text
15 independent microservices
```

Build for reliability and demonstration speed.

---

# 35. Recommended MVP

The MVP should prove the core economic concept.

## Required

### Farmer

- registration
- crop listing
- expected harvest
- quantity
- price
- location

### Buyer

- buyer registration
- create procurement request
- quantity
- deadline
- grade
- location
- maximum price

### Marketplace

- farmer listings
- buyer requirements

### AI Matching

- automatically generate supplier combinations

### Virtual FPO

- cluster multiple farmers

### Logistics

- vehicle assignment
- route optimization

### Price Intelligence

- mandi comparison
- farmer benefit
- buyer savings

### Dashboard

- supply
- demand
- transactions
- impact metrics

---

# 36. MVP Plus

If core MVP works reliably, add:

```text
Demand forecasting

Multilingual farmer assistant

Live map

Pre-harvest booking

Wastage rescue

Basic produce grading
```

---

# 37. Stretch Features

Only after MVP stability:

```text
Real-time vehicle tracking

Advanced computer vision

Automated dispute resolution

Weather-based crop risk

Government procurement integration

Warehouse integration

Cold-chain optimization

Export buyer module

Credit scoring

Crop insurance integration

Carbon / emissions analytics

Advanced simulation digital twin
```

---

# 38. Recommended Database Entities

Initial schema:

```text
users
farmers
fpos
fpo_members
buyers
logistics_providers
vehicles
crops
crop_varieties
harvests
crop_listings
buyer_requirements
matches
farmer_clusters
orders
order_items
shipments
routes
route_stops
price_records
demand_forecasts
payments
ratings
quality_checks
notifications
```

---

# 39. Core Matching Score

A farmer-to-order match can initially use:

```text
Match Score =
Crop Compatibility
+
Quantity Compatibility
+
Price Compatibility
+
Distance Score
+
Harvest Timing
+
Quality Score
+
Farmer Reliability
+
Logistics Availability
```

Example weighting:

```text
Crop compatibility       25%
Price                     20%
Distance                  15%
Quantity                  15%
Harvest timing            10%
Quality                    5%
Farmer reliability         5%
Logistics availability     5%
```

Weights can later be optimized.

---

# 40. Procurement Optimization Objective

Conceptually:

```text
Minimize:

Procurement Cost
+
Transportation Cost
+
Spoilage Risk
+
Delivery Risk
```

subject to:

```text
Required Quantity Fulfilled

Quality Requirement Met

Delivery Deadline Met

Farmer Minimum Price Met

Vehicle Capacity Not Exceeded
```

---

# 41. Route Optimization Objective

```text
Minimize:

Total Distance
+
Total Travel Time
+
Number of Vehicles
+
Spoilage Risk
```

subject to:

```text
Truck capacity

Pickup windows

Delivery deadline

Cold-chain requirements

Vehicle availability
```

---

# 42. Killer SIH Demo

The demo should tell one complete story.

## Step 1 — Farmer

Judge sees farmer interface.

Farmer enters:

```text
Location:
Sonipat

Crop:
Tomato

Quantity:
800 kg

Harvest:
3 days

Minimum price:
₹25/kg
```

---

## Step 2 — More Farmers

System already contains:

```text
Farmer B:
900 kg

Farmer C:
1,100 kg

Farmer D:
700 kg

Farmer E:
1,500 kg
```

---

## Step 3 — Buyer

Buyer enters:

```text
Hotel Procurement Company

Need:
5 tonnes tomatoes

Location:
Delhi

Delivery:
Friday

Maximum delivered price:
₹31/kg
```

---

## Step 4 — System

Judge clicks:

```text
GENERATE PROCUREMENT PLAN
```

---

## Step 5 — AI Output

```text
Requirement:
5,000 kg

Farmers Selected:
6

Farmer Cluster:
Created automatically

Total Farmer Payout:
₹1,42,000

Traditional Mandi Estimate:
₹1,08,000

Farmer Income Improvement:
+31.5%

Buyer Saving:
18.2%

Vehicles:
2

Distance Saved:
71 km

Estimated Produce Wastage Avoided:
640 kg
```

---

## Step 6 — Logistics

Show map:

```text
Truck 1

Farmer A
  ↓
Farmer C
  ↓
Farmer D
  ↓
Delhi Buyer
```

---

## Step 7 — Demand Intelligence

Dashboard shows:

```text
Delhi NCR

Tomato demand:
↑ 18%

Projected shortage:
40 tonnes
```

---

## Step 8 — Final Impact

Show:

```text
Farmer earns more

Buyer pays less

Fewer intermediaries

Lower logistics cost

Higher truck utilization

Lower wastage
```

This should be the final judge takeaway.

---

# 43. Possible Product Names

Temporary brainstorming list:

```text
AgriMesh
FarmFlow
KrishiLink
AgriGrid
FarmBridge
KisanSetu
AgriRoute
CropConnect
FarmSync
KrishiGrid
MandiX
FarmDirect
AgriChain
KisanNet
```

Final name:

```text
TBD
```

---

# 44. Core Pitch

Short version:

> We are not building another farmer marketplace. We are building an AI-driven agricultural supply network that combines fragmented farmers into virtual clusters, predicts buyer demand, automatically creates procurement plans, and optimizes logistics so farmers earn more while buyers pay less.

---

# 45. 30-Second Pitch

> Small farmers often cannot directly supply large buyers because their produce is fragmented across hundreds of locations. Our platform creates virtual farmer clusters, predicts regional demand, matches them automatically with institutional buyers, and optimizes shared logistics. Instead of simply listing produce online, the platform creates the complete farm-to-buyer supply chain automatically, improving farmer income, reducing buyer cost, and preventing food wastage.

---

# 46. One-Line Pitch

> AI that automatically builds the cheapest and fairest farm-to-buyer supply chain.

---

# 47. Competitive Advantage

Traditional marketplace:

```text
Listings
+
Search
+
Order
```

Our system:

```text
Future Supply
+
Future Demand
+
Virtual FPO
+
AI Procurement
+
Price Intelligence
+
Logistics Optimization
+
Demand Forecasting
+
Waste Rescue
```

---

# 48. Why This Is Different

The platform attacks four structural agricultural problems simultaneously.

## Fragmentation

Solved using:

```text
Virtual FPO
```

## Information asymmetry

Solved using:

```text
Demand Forecasting
+
Fair Price Intelligence
```

## Logistics inefficiency

Solved using:

```text
Route Optimization
+
Load Consolidation
```

## Market access

Solved using:

```text
Direct B2B Procurement
+
Reverse Marketplace
```

---

# 49. Success Metrics

For prototype:

```text
Farmer income improvement %

Buyer savings %

Route distance reduction %

Vehicle utilization %

Demand forecasting accuracy

Order fulfilment %

Produce wastage prevented

Average matching time

Average procurement cost/kg
```

---

# 50. Potential Risks

## Fake Listings

Mitigation:

```text
Farmer verification
Location verification
Transaction reputation
FPO verification
```

---

## Quality Disputes

Mitigation:

```text
Photo evidence
Quality grading
Pickup verification
Buyer acceptance workflow
Dispute mechanism
```

---

## Supply Failure

Mitigation:

```text
Backup farmers
Reliability score
Overbooking buffer
Cluster sourcing
```

---

## Logistics Failure

Mitigation:

```text
Alternate vehicles
Driver tracking
Route reoptimization
```

---

## AI Forecast Inaccuracy

Mitigation:

```text
Confidence intervals
Historical validation
Continuous retraining
Human-readable recommendations
```

---

# 51. Development Philosophy

Priority order:

```text
1. Solve the economic problem
2. Build reliable transaction flow
3. Build matching
4. Build logistics optimization
5. Add useful AI
6. Improve UX
7. Add impressive experimental features
```

Avoid:

```text
AI for the sake of AI
Blockchain for the sake of blockchain
Complex architecture without user benefit
```

---

# 52. Recommended Build Order

## Phase 1

Foundation:

```text
Authentication
Users
Farmers
Buyers
Crops
Listings
Requirements
```

---

## Phase 2

Core marketplace:

```text
Farmer supply
Buyer demand
Search
Orders
```

---

## Phase 3

Main differentiator:

```text
Matching Engine
Virtual FPO
Procurement Plan Generator
```

---

## Phase 4

Logistics:

```text
Vehicles
Farmer pickup clustering
Route optimization
```

---

## Phase 5

Intelligence:

```text
Demand forecasting
Price intelligence
```

---

## Phase 6

Experience:

```text
Dashboards
Maps
Impact analytics
Multilingual assistant
```

---

## Phase 7

Stretch:

```text
CV grading
Waste rescue
Digital twin simulations
```

---

# 53. Current Feature Priority

| Feature | Priority | Status |
|---|---:|---|
| Farmer listings | 10/10 | Planned |
| Buyer requirements | 10/10 | Planned |
| Virtual FPO | 10/10 | Planned |
| Procurement matching | 10/10 | Planned |
| Route optimization | 9.5/10 | Planned |
| Pre-harvest listings | 9.5/10 | Planned |
| Price intelligence | 9/10 | Planned |
| Demand forecasting | 9/10 | Planned |
| Impact dashboard | 9/10 | Planned |
| Digital twin map | 9/10 | Planned |
| Wastage rescue | 8.5/10 | Planned |
| Voice assistant | 8.5/10 | Planned |
| Computer vision grading | 7.5/10 | Optional |
| Blockchain | 3/10 | Not Recommended |

---

# 54. Questions Still To Resolve

```text
What will the final product name be?

Will the MVP focus on one crop or multiple crops?

Which geographical region will the prototype simulate?

Which mandi-price dataset will be used?

Which weather dataset will be used?

Will buyers bid or specify fixed requirements?

Will farmers specify minimum prices?

How will quality grades be standardized?

Will logistics providers directly register?

Will collection hubs exist?

How will FPOs differ from virtual clusters?

Will payments be simulated or integrated?

Which languages will be supported in the prototype?

Which demand forecasting model will be selected?

Which routing service will be used?

What exact data will train the forecasting model?
```

---

# 55. Current Strategic Recommendation

[Likely] The strongest combination for the SIH submission is:

```text
Virtual FPO
        +
Pre-Harvest Supply
        +
Reverse B2B Marketplace
        +
AI Procurement Engine
        +
Route Optimization
        +
Fair Price Intelligence
```

Demand forecasting should support this core rather than becoming the entire product.

Computer vision, voice assistance and digital-twin simulations should enhance the product after the core procurement workflow works reliably.

---

# 56. North-Star User Journey

```text
Farmer announces future harvest
            ↓
Platform understands future supply
            ↓
Buyer announces future requirement
            ↓
AI identifies suitable farmers
            ↓
Nearby farmers become virtual cluster
            ↓
Procurement plan generated
            ↓
Farmers accept
            ↓
Transport optimized
            ↓
Produce collected
            ↓
Buyer receives produce
            ↓
Farmers receive payment
            ↓
Platform measures farmer gain + buyer saving
```

---

# 57. Ultimate Vision

Long-term, the platform could evolve from a marketplace into an agricultural operating network.

```text
Predict
   ↓
Aggregate
   ↓
Match
   ↓
Price
   ↓
Transport
   ↓
Deliver
   ↓
Learn
```

The system continuously learns:

```text
Where crops are being produced

Where demand is emerging

Which farmers are reliable

Which buyers purchase regularly

Which routes are efficient

Which products are likely to become surplus

Which regions may experience shortages
```

This creates an increasingly intelligent agricultural supply network.

---

# 58. Revision Log

## Version 0.1

Date:

```text
1 September 2026
```

Added:

```text
Initial problem analysis
Core system architecture
Virtual FPO concept
Reverse marketplace
Pre-harvest marketplace
AI procurement matching
Demand forecasting
Route optimization
Fair-price intelligence
Digital twin
Waste rescue
Farmer assistant
Computer vision grading
Technology architecture
MVP definition
Feature priorities
Demo strategy
Risk analysis
Development roadmap
```

---

# 59. Future Revision Template

Whenever the plan changes, add:

```text
## Version X.X

Date:
DD Month YYYY

Added:
-

Changed:
-

Removed:
-

Important Decisions:
-

Open Questions:
-
```

---

# 60. Current Project Status

```text
Problem Selected:
Yes

Problem Understanding:
Initial Complete

Architecture:
Drafted

Differentiators:
Drafted

MVP:
Drafted

Tech Stack:
Proposed

Dataset Research:
Pending

UI/UX:
Pending

Database Design:
Pending

API Design:
Pending

ML Architecture:
Pending

Prototype:
Pending

SIH Submission:
Pending
```

---

# End of Master Plan

Current Version:

```text
v0.1
```

This document should remain the central source of truth for the SIH 26033 project.