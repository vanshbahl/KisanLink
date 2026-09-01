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
  emoji: string
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
  emoji: string
  visual: ProduceListing['visual']
  locations: string
}
