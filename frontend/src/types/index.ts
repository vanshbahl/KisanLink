export type Role = 'farmer' | 'consumer' | 'bulk'
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
  mandiPricePerKg: number
  farm: string
  pickupDate: string
  pickupWindow: string
  fulfillment: 'pickup' | 'self_delivery'
  status: ListingStatus
  assisted: boolean
  views: number
  inquiries: number
  createdAt: string
}

export interface FarmerOrder {
  id: string
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
export interface BulkRfq {
  id: string; crop: string; grade: FarmerListing['grade']; requiredQuantityKg: number; targetPrice: number; deliveryLocation: string; deliveryWindow: string
  frequency: 'one-time' | 'recurring'; notes: string; status: RfqStatus; createdAt: string; matches: SupplyContribution[]
}
export type BulkOrderStatus = 'confirmed' | 'farmers_preparing' | 'pickup_scheduled' | 'consolidating' | 'in_transit' | 'delivered' | 'cancelled'
export interface BulkOrder {
  id: string; rfqId: string; crop: string; grade: FarmerListing['grade']; orderedQuantityKg: number; suppliedQuantityKg: number; contributions: SupplyContribution[]
  produceValue: number; logisticsFee: number; platformFee: number; total: number; traditionalEstimate: number; deliveryLocation: string; deliveryWindow: string
  status: BulkOrderStatus; invoiceStatus: 'Mock invoice generated' | 'Mock paid'; orderedAt: string
}
export interface BulkProfileData { businessName: string; representative: string; phone: string; gst: string; language: Language; procurementLocations: string[]; deliveryAddresses: string[]; notifications: { matches: boolean; orders: boolean; deliveries: boolean } }
