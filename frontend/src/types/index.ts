export type Role = 'farmer' | 'consumer' | 'bulk' | 'logistics'
export type Language = 'en' | 'hi'

export interface User {
  id: string
  role: Role
  name: string
  phone: string
  location: string
  avatarInitials: string
  farmName?: string
  company?: string
  representative?: string
  gst?: string
}

export interface Session {
  authenticated: true
  role: Role
  userId: string
}

export type Category = 'Vegetables' | 'Fruits' | 'Grains' | 'Staples'

export interface Farmer {
  id: string
  name: string
  farmName: string
  location: string
  verified: boolean
  yearsFarming: number
}

export interface ProduceListing {
  id: string
  product: string
  productHi?: string
  category: Category
  farmerId: string
  pricePerKg: number
  marketPricePerKg: number
  availableKg: number
  freshness: string
  distanceKm: number
  imageSrc: string
  visual: 'tomato' | 'potato' | 'onion' | 'leafy' | 'grain' | 'fruit' | 'root' | 'green'
  grade: 'Grade A' | 'Grade A+'
}

export interface FarmerDashboardData {
  earnings: number
  activeListings: number
  newOrders: number
  upcomingPickup: string
}

export interface BulkSupply {
  id: string
  product: string
  availableTonnes: number
  startingPrice: number
  moqKg: number
  farmerCount: number
  imageSrc: string
  visual: ProduceListing['visual']
  locations: string
}

export type ListingStatus = 'active' | 'draft' | 'paused' | 'sold' | 'unavailable'
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'pickup_scheduled' | 'in_transit' | 'delivered' | 'cancelled'
export type PickupStatus = 'scheduled' | 'driver_assigned' | 'arriving' | 'collected' | 'in_transit' | 'completed'

export interface FarmerListing {
  id: string
  crop: string
  cropHi: string
  category: Category
  imageSrc: string
  visual: ProduceListing['visual']
  quantityKg: number
  remainingKg: number
  allocatedKg: number
  unit: 'kg' | 'quintal' | 'tonne'
  grade: 'Grade A' | 'Grade A+'
  harvestDate: string
  availableFrom: string
  farmingMethod: string
  notes: string
  pricePerKg: number
  /** Wholesale reference. Farmer- and buyer-facing only — never shown to consumers. */
  mandiPricePerKg: number
  /**
   * What a household pays for the same produce at a local shop today. This is the only
   * comparison a consumer sees: comparing a retail purchase against a mandi wholesale rate
   * would be misleading, and made KisanLink look expensive.
   */
  retailPricePerKg: number
  farmerId: string
  farm: string
  pickupDate: string
  pickupWindow: string
  fulfillment: 'pickup' | 'self_delivery'
  status: ListingStatus
  assisted: boolean
  views: number
  inquiries: number
  isUrgentRescue?: boolean
  rescueDiscountPricePerKg?: number
  rescueStatus?: string
  createdAt: string
}

export interface FarmerOrder {
  id: string
  db_id?: string
  buyerUserId?: string
  buyerName: string
  buyerType: 'Consumer' | 'Bulk Buyer'
  crop: string
  cropHi: string
  listingId: string
  quantityKg: number
  ratePerKg: number
  total: number
  farmerPayout: number
  platformFee: number
  logisticsFee: number
  orderedAt: string
  status: OrderStatus
  paymentStatus: 'pending' | 'processing' | 'paid' | 'refunded'
  pickupId?: string
}

export interface Pickup {
  id: string
  orderId: string
  crop: string
  cropHi: string
  quantityKg: number
  date: string
  timeWindow: string
  driver: string
  vehicle: string
  farmAddress: string
  status: PickupStatus
}

export interface EarningsTransaction {
  id: string
  orderId: string
  crop: string
  cropHi: string
  gross: number
  deductions: number
  net: number
  mandiEquivalent: number
  date: string
  status: 'pending' | 'paid'
}

export interface PrototypeNotification {
  id: string
  role: Role
  title: string
  titleHi: string
  body: string
  bodyHi: string
  timestamp: string
  read: boolean
  href: string
}

export interface FarmerProfileData {
  name: string
  phone: string
  language: Language
  farmName: string
  village: string
  district: string
  state: string
  farmSizeAcres: number
  mainCrops: string
  pickupLocation: string
  payoutMethod: 'UPI' | 'Bank account'
  payoutMasked: string
  farmerVerified: boolean
  farmVerified: boolean
  identityStatus: 'Verified' | 'Pending'
}

export type ConsumerOrderStatus = 'confirmed' | 'farmer_preparing' | 'pickup_scheduled' | 'collected' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled'
export interface CartItem { listingId: string; quantityKg: number }
export interface Address { id: string; label: string; recipient: string; phone: string; line1: string; city: string; pincode: string; isDefault: boolean }
export interface ConsumerOrderItem { listingId: string; crop: string; cropHi: string; farm: string; imageSrc: string; quantityKg: number; ratePerKg: number }
export interface ConsumerOrder {
  id: string; items: ConsumerOrderItem[]; subtotal: number; logisticsFee: number; platformFee: number; farmerShare: number; total: number
  address: Address; deliverySlot: string; eta: string; note: string; paymentMethod: 'UPI' | 'Card' | 'Pay on Delivery'; paymentStatus: 'Mock paid' | 'Pay on delivery'
  status: ConsumerOrderStatus; orderedAt: string; timeline: Array<{ status: ConsumerOrderStatus; label: string; at: string }>
}
export interface ConsumerProfileData { name: string; phone: string; language: Language; defaultLocation: string; addresses: Address[]; notifications: { orders: boolean; freshness: boolean; offers: boolean } }

export type RfqStatus = 'open' | 'matching' | 'partially_matched' | 'fully_matched' | 'converted' | 'closed'
export interface SupplyContribution { farmer: string; farm: string; listingId: string; quantityKg: number; ratePerKg: number }
export type RfqPackaging = 'Loose crates' | '10 kg crates' | '25 kg crates' | '50 kg jute sacks'
export type RfqFrequency = 'one-time' | 'weekly' | 'twice-weekly' | 'fortnightly' | 'monthly'
export interface BulkRfq {
  id: string; crop: string; grade: FarmerListing['grade']; requiredQuantityKg: number; targetPrice: number; deliveryLocation: string; deliveryWindow: string
  /** ISO date (yyyy-mm-dd) the load must be at the delivery point. Drives the pickup plan. */
  requiredBy: string
  /** Receiving window on the required-by date. */
  deliverySlot: string
  packaging: RfqPackaging
  recurring: boolean
  frequency: RfqFrequency; notes: string; status: RfqStatus; createdAt: string; matches: SupplyContribution[]
  /** Snapshot of the Market Maker analysis that produced `matches`. */
  plan?: ProcurementPlan
}

/** One farm's leg of a constructed procurement deal. */
export interface ProcurementStop {
  farmer: string
  farm: string
  listingId: string
  location: string
  quantityKg: number
  ratePerKg: number
  /** Position in the pooled collection run, 1-based. */
  sequence: number
  detourKm: number
  pickupWindow: string
}

/**
 * The result of the Market Maker constructing a deal for one requirement: what was asked
 * for, which farms answer it, what it costs, and whether one vehicle can physically do it.
 */
export interface ProcurementPlan {
  requiredKg: number
  matchedKg: number
  shortfallKg: number
  fillPct: number
  stops: ProcurementStop[]
  /** Farms considered but not used, with the reason, so the match is inspectable. */
  rejected: Array<{ farm: string; reason: string }>
  produceValue: number
  weightedRatePerKg: number
  logisticsCost: number
  platformFee: number
  landedTotal: number
  landedPerKg: number
  /** What the same load costs through the mandi -> wholesaler -> buyer chain today. */
  benchmarkPerKg: number
  benchmarkTotal: number
  savingTotal: number
  savingPct: number
  farmerUpliftPerKg: number
  farmerUpliftTotal: number
  routeDistanceKm: number
  routeDurationMinutes: number
  vehicle: Vehicle | null
  capacityKg: number
  utilisationPct: number
  feasible: boolean
  /** Why the deal cannot run, when it cannot. */
  blockers: string[]
  pickupDate: string
  consolidationAt: string
  estimatedDelivery: string
  confidence: number
  /** Plain-language reasons this match became possible. */
  rationale: string[]
}
export type BulkOrderStatus = 'confirmed' | 'farmers_preparing' | 'pickup_scheduled' | 'consolidating' | 'in_transit' | 'delivered' | 'cancelled'
export interface BulkOrder {
  id: string; rfqId: string; crop: string; grade: FarmerListing['grade']; orderedQuantityKg: number; suppliedQuantityKg: number; contributions: SupplyContribution[]
  produceValue: number; logisticsFee: number; platformFee: number; total: number; traditionalEstimate: number; deliveryLocation: string; deliveryWindow: string
  status: BulkOrderStatus; invoiceStatus: 'Mock invoice generated' | 'Mock paid'; orderedAt: string
}
export interface BulkProfileData { businessName: string; representative: string; phone: string; gst: string; language: Language; procurementLocations: string[]; deliveryAddresses: string[]; notifications: { matches: boolean; orders: boolean; deliveries: boolean } }

export type LogisticsPickupStatus = 'unassigned' | 'assigned' | 'en_route' | 'arrived' | 'loaded' | 'completed' | 'issue'
export type DeliveryStatus = 'scheduled' | 'loaded' | 'in_transit' | 'at_hub' | 'out_for_delivery' | 'delivered' | 'issue'
export type VehicleStatus = 'available' | 'assigned' | 'in_transit' | 'maintenance'
export interface LogisticsTimelineItem { label: string; labelHi: string; at: string }
export interface LogisticsPickup { id: string; farmer: string; farm: string; farmLocation: string; crop: string; cropHi: string; quantityKg: number; pickupWindow: string; orderRefs: string[]; vehicleId?: string; driver?: string; status: LogisticsPickupStatus; notes: string; routeId?: string; checklist: { arrived: boolean; quantityVerified: boolean; qualityChecked: boolean; loadSecured: boolean; pickupCompleted: boolean }; timeline: LogisticsTimelineItem[] }
export interface Delivery { id: string; origin: string; destination: string; buyer: string; buyerType: 'Consumer' | 'Bulk Buyer'; shipment: string; produce: string; produceHi: string; quantityKg: number; eta: string; vehicleId?: string; orderRefs: string[]; status: DeliveryStatus; handlingNotes: string; issues: string[]; timeline: LogisticsTimelineItem[] }
export interface RouteStop {
  /** Key into `data/geo.ts`. */
  placeId: string
  label: string
  kind: 'pickup' | 'hub' | 'drop'
  /** Linked pickup or delivery record, when there is one. */
  refId?: string
  quantityKg?: number
  window?: string
  status?: 'done' | 'current' | 'upcoming'
}
export interface LogisticsRoute { id: string; name: string; nameHi: string; vehicleId: string; pickups: string[]; deliveries: string[]; stops: string[]; routeStops?: RouteStop[]; distanceKm: number; durationMinutes: number; capacityKg: number; loadKg: number; status: 'planned' | 'active' | 'completed'; pooled: boolean }
export interface Vehicle { id: string; registration: string; type: string; typeHi: string; capacityKg: number; driver: string; currentAssignment?: string; status: VehicleStatus }
export interface LogisticsProfileData { name: string; phone: string; hub: string; shift: string; language: Language; notifications: { pickups: boolean; deliveries: boolean; issues: boolean; delays: boolean } }
export type DemoScenario = 'full' | 'empty' | 'consumer' | 'bulk' | 'issue' | 'market'

export interface PaymentsLedgerEntry {
  id: string
  order_id: string
  beneficiary_user_id?: string | null
  entry_type: 'ESCROW_LOCK' | 'FARMER_PAYOUT' | 'TRANSPORTER_FREIGHT' | 'PLATFORM_FEE' | 'REFUND' | string
  amount_rupees: number
  gateway_reference_id?: string | null
  is_settled: boolean
  settled_at?: string | null
  created_at?: string
}

export interface Review {
  id: string
  order_id: string
  author_id: string
  target_id: string
  rating_score: number
  feedback_text?: string | null
  created_at?: string
}

export interface Dispute {
  id: string
  order_id: string
  raised_by: string
  dispute_reason: string
  withheld_amount_rupees: number
  is_resolved: boolean
  resolution_notes?: string | null
  created_at?: string
}

export interface OperatorAuditLog {
  id: string
  operator_user_id: string
  farmer_user_id: string
  action_type: string
  entity_id?: string | null
  created_at?: string
}

/* ===================== Market Maker =====================
 * A Market Maker board is one crop, one corridor, one delivery window. It holds the
 * fragmented supply lots that no single buyer wanted and the fragmented demand that
 * no single farmer could serve, and it is evaluated against live logistics capacity.
 * Every number below is an input to a deterministic calculation — nothing is predicted.
 */
export type MarketCommitmentSource = 'consumer' | 'bulk'
export type MarketStatus = 'forming' | 'viable' | 'created'

export interface MarketCommitment {
  id: string
  source: MarketCommitmentSource
  party: string
  detail: string
  quantityKg: number
  committedAt: string
  /** Committed by the demo user from one of the role modules (vs. seeded network demand). */
  own?: boolean
}

export interface MarketSupplyLot {
  id: string
  /** Set when the lot is a real listing in shared state, so live stock caps the offer. */
  listingId?: string
  farmer: string
  farm: string
  location: string
  offeredKg: number
  /** Extra kilometres the pooled route spends to include this farm. */
  detourKm: number
  /** True for the demo farmer's own lot. */
  own?: boolean
}

export interface MarketMakerBoard {
  id: string
  crop: string
  cropHi: string
  grade: FarmerListing['grade']
  corridor: string
  corridorHi: string
  destination: string
  deliveryWindow: string
  imageSrc: string
  visual: ProduceListing['visual']
  /** Minimum the farmer will accept per kg. Never pushed down by the market maker. */
  farmerFloorPerKg: number
  /** What the same produce fetches at the local mandi today. */
  mandiPricePerKg: number
  /** Delivered price at or below which buyers switch away from their current supplier. */
  buyerCeilingPerKg: number
  /** What buyers pay today through mandi -> wholesaler -> retailer. */
  buyerCurrentPerKg: number
  /** Platform fee as a share of the farm-gate price, billed to the buyer. */
  platformFeePct: number
  routeDistanceKm: number
  /** Vehicle the corridor is quoted against; feasibility re-checks live fleet status. */
  vehicleId: string
  lots: MarketSupplyLot[]
  commitments: MarketCommitment[]
  status: MarketStatus
  createdAt: string
  unlockedAt?: string
  routeId?: string
  farmerOrderIds?: string[]
  bulkOrderId?: string
  consumerOrderId?: string
  pickupIds?: string[]
  deliveryIds?: string[]
}
