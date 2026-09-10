import { categories } from '../data/products'
import { localDay } from '../utils/dates'
import type { ProduceListing } from '../types'
// `ProduceListing.marketPricePerKg` feeds consumer cards only, so it carries the local
// retail reference. Mandi pricing never reaches a consumer surface.
import { prototypeService } from './prototypeService'

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 320))

/** Road distance from each farm to the Delhi delivery area, so cards do not all claim 42 km. */
const DISTANCES: Record<string, number> = {
  'Green Field Farm': 42, 'Sunehri Khet': 121, 'Yadav Fresh Fields': 89,
  'Malik Family Farm': 68, 'Doaba Harvests': 74, 'Ganga Plains Farm': 79, 'Rana Vegetable Farm': 47,
}
const distanceFor = (farm: string) => DISTANCES[farm] ?? 42

export const marketplaceService = {
  /** Only produce a shopper can actually buy right now. */
  async getFeaturedListings() {
    await pause()
    return (await liveListings()).filter((item) => item.availableKg > 0).slice(0, 6)
  },
  async getListings() {
    await pause()
    return liveListings()
  },
  async getListing(id: string) {
    await pause()
    return (await liveListings()).find((listing) => listing.id === id) ?? null
  },
  getCategories() {
    return categories
  },
}

/**
 * Consumer feed shape, mapped from the one authoritative listing store. The canonical
 * backend keeps its own unrelated seed, so reading it here would put different farms and
 * quantities on the consumer marketplace than the rest of the prototype is showing.
 */
async function liveListings(): Promise<ProduceListing[]> {
  return (await prototypeService.getListings())
    .filter((item) => item.status === 'active' || item.status === 'sold')
    .map((item) => ({
      id: item.id,
      product: item.crop,
      productHi: item.cropHi,
      category: item.category,
      farmerId: item.farmerId || 'farmer_001',
      pricePerKg: item.pricePerKg,
      marketPricePerKg: item.retailPricePerKg,
      availableKg: item.remainingKg,
      freshness: item.harvestDate === localDay() ? 'Harvested today' : 'Harvested yesterday',
      distanceKm: distanceFor(item.farm),
      imageSrc: item.imageSrc,
      visual: item.visual,
      grade: item.grade,
    }))
}
