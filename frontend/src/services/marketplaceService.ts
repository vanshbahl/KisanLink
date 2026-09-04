import { categories } from '../data/products'
import type { ProduceListing } from '../types'
import { apiClient } from './apiClient'
import { prototypeService } from './prototypeService'

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 320))

export const marketplaceService = {
  async getFeaturedListings() {
    await pause()
    return (await liveListings()).slice(0, 6)
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

async function liveListings(): Promise<ProduceListing[]> {
  try {
    const canonical = await apiClient.getListings({ status: 'ACTIVE' })
    if (canonical.length > 0) {
      return canonical.map((item) => ({
        id: item.id,
        product: item.crop,
        productHi: item.cropHi,
        category: item.category,
        farmerId: 'farmer_001',
        pricePerKg: item.pricePerKg,
        marketPricePerKg: item.mandiPricePerKg,
        availableKg: item.remainingKg,
        freshness: item.harvestDate === new Date().toISOString().slice(0, 10) ? 'Harvested today' : 'Harvested recently',
        distanceKm: 42,
        imageSrc: item.imageSrc,
        visual: item.visual,
        grade: item.grade,
      }))
    }
  } catch (err) {
    console.warn('API listings query fallback:', err)
  }
  return (await prototypeService.getListings())
    .filter((item) => item.status === 'active' || item.status === 'sold')
    .map((item) => ({
      id: item.id,
      product: item.crop,
      productHi: item.cropHi,
      category: item.category,
      farmerId: 'farmer_001',
      pricePerKg: item.pricePerKg,
      marketPricePerKg: item.mandiPricePerKg,
      availableKg: item.remainingKg,
      freshness: item.harvestDate === new Date().toISOString().slice(0, 10) ? 'Harvested today' : 'Harvested yesterday',
      distanceKm: 42,
      imageSrc: item.imageSrc,
      visual: item.visual,
      grade: item.grade,
    }))
}
