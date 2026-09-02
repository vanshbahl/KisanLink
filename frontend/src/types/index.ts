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
