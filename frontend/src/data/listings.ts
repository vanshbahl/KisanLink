import type { ProduceListing } from '../types'
import { seedListingPrices } from '../services/pricingEngine'

/**
 * `marketPricePerKg` here is the local *retail* reference a household would otherwise pay.
 * Both numbers come from the centralized pricing engine's seed ladder — nothing is typed here.
 */
const consumerSeedPrices = (crop: string) => {
  const prices = seedListingPrices(crop)
  return { pricePerKg: prices.pricePerKg, marketPricePerKg: prices.retailPricePerKg }
}

export const listings: ProduceListing[] = [
  { id: 'listing_001', product: 'Fresh Tomatoes', category: 'Vegetables', farmerId: 'farmer_001', ...consumerSeedPrices('Fresh Tomatoes'), availableKg: 420, freshness: 'Harvested today', distanceKm: 32, imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', grade: 'Grade A+' },
  { id: 'listing_002', product: 'New Potatoes', category: 'Staples', farmerId: 'farmer_003', ...consumerSeedPrices('New Potatoes'), availableKg: 680, freshness: 'Harvested yesterday', distanceKm: 54, imageSrc: '/assets/produce/potato.webp', visual: 'potato', grade: 'Grade A' },
  { id: 'listing_003', product: 'Red Onions', category: 'Staples', farmerId: 'farmer_004', ...consumerSeedPrices('Red Onions'), availableKg: 540, freshness: 'Harvested 2 days ago', distanceKm: 61, imageSrc: '/assets/produce/onion.webp', visual: 'onion', grade: 'Grade A' },
  { id: 'listing_004', product: 'Snow Cauliflower', category: 'Vegetables', farmerId: 'farmer_002', ...consumerSeedPrices('Snow Cauliflower'), availableKg: 310, freshness: 'Harvested today', distanceKm: 118, imageSrc: '/assets/produce/cauliflower.webp', visual: 'leafy', grade: 'Grade A+' },
  { id: 'listing_005', product: 'Green Capsicum', category: 'Vegetables', farmerId: 'farmer_006', ...consumerSeedPrices('Green Capsicum'), availableKg: 180, freshness: 'Harvested today', distanceKm: 74, imageSrc: '/assets/produce/capsicum.webp', visual: 'green', grade: 'Grade A' },
  { id: 'listing_006', product: 'Sweet Carrots', category: 'Vegetables', farmerId: 'farmer_003', ...consumerSeedPrices('Sweet Carrots'), availableKg: 260, freshness: 'Harvested yesterday', distanceKm: 55, imageSrc: '/assets/produce/carrot.webp', visual: 'root', grade: 'Grade A+' },
  { id: 'listing_007', product: 'Sharbati Wheat', category: 'Grains', farmerId: 'farmer_005', ...consumerSeedPrices('Sharbati Wheat'), availableKg: 2200, freshness: 'Milled this week', distanceKm: 96, imageSrc: '/assets/produce/wheat.webp', visual: 'grain', grade: 'Grade A' },
  { id: 'listing_008', product: 'Basmati Rice', category: 'Grains', farmerId: 'farmer_002', ...consumerSeedPrices('Basmati Rice'), availableKg: 1800, freshness: 'New season crop', distanceKm: 121, imageSrc: '/assets/produce/rice.webp', visual: 'grain', grade: 'Grade A+' },
  { id: 'listing_009', product: 'Himachali Apples', category: 'Fruits', farmerId: 'farmer_005', ...consumerSeedPrices('Himachali Apples'), availableKg: 360, freshness: 'Packed yesterday', distanceKm: 94, imageSrc: '/assets/produce/apple.webp', visual: 'fruit', grade: 'Grade A' },
  { id: 'listing_010', product: 'Yellow Mustard', category: 'Staples', farmerId: 'farmer_004', ...consumerSeedPrices('Yellow Mustard'), availableKg: 920, freshness: 'Cleaned this week', distanceKm: 64, imageSrc: '/assets/produce/mustard.webp', visual: 'grain', grade: 'Grade A' },
  { id: 'listing_011', product: 'Baby Spinach', category: 'Vegetables', farmerId: 'farmer_001', ...consumerSeedPrices('Baby Spinach'), availableKg: 140, freshness: 'Harvested 4h ago', distanceKm: 32, imageSrc: '/assets/produce/spinach.webp', visual: 'leafy', grade: 'Grade A+' },
  { id: 'listing_012', product: 'Crisp Cucumbers', category: 'Vegetables', farmerId: 'farmer_006', ...consumerSeedPrices('Crisp Cucumbers'), availableKg: 380, freshness: 'Harvested today', distanceKm: 73, imageSrc: '/assets/produce/cucumber.webp', visual: 'green', grade: 'Grade A' },
]
