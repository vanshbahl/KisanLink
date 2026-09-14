import type { BulkSupply, FarmerDashboardData } from '../types'
import { seedListingPrices } from '../services/pricingEngine'

export const farmerDashboard: FarmerDashboardData = {
  earnings: 18450,
  activeListings: 3,
  newOrders: 2,
  upcomingPickup: 'Tomorrow, 7:30 AM',
}

export const bulkSupplies: BulkSupply[] = [
  { id: 'bulk_tomato', product: 'Tomatoes', availableTonnes: 2.4, startingPrice: seedListingPrices('Tomatoes').pricePerKg, moqKg: 100, farmerCount: 8, imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', locations: 'Sonipat · Panipat' },
  { id: 'bulk_potato', product: 'Potatoes', availableTonnes: 3.1, startingPrice: seedListingPrices('Potatoes').pricePerKg, moqKg: 200, farmerCount: 6, imageSrc: '/assets/produce/potato.webp', visual: 'potato', locations: 'Jhajjar · Rohtak' },
  { id: 'bulk_capsicum', product: 'Green Capsicum', availableTonnes: 1.2, startingPrice: seedListingPrices('Green Capsicum').pricePerKg, moqKg: 100, farmerCount: 4, imageSrc: '/assets/produce/capsicum.webp', visual: 'green', locations: 'Meerut · Sonipat' },
]
