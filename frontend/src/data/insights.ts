import type { BulkSupply, FarmerDashboardData } from '../types'

export const farmerDashboard: FarmerDashboardData = {
  earnings: 18450,
  activeListings: 3,
  newOrders: 2,
  upcomingPickup: 'Tomorrow, 7:30 AM',
}

export const bulkSupplies: BulkSupply[] = [
  { id: 'bulk_tomato', product: 'Tomatoes', availableTonnes: 2.4, startingPrice: 28, moqKg: 100, farmerCount: 8, emoji: '🍅', visual: 'tomato', locations: 'Sonipat · Panipat' },
  { id: 'bulk_potato', product: 'Potatoes', availableTonnes: 3.1, startingPrice: 21, moqKg: 200, farmerCount: 6, emoji: '🥔', visual: 'potato', locations: 'Jhajjar · Rohtak' },
  { id: 'bulk_capsicum', product: 'Green Capsicum', availableTonnes: 1.2, startingPrice: 47, moqKg: 100, farmerCount: 4, emoji: '🫑', visual: 'green', locations: 'Meerut · Sonipat' },
]
