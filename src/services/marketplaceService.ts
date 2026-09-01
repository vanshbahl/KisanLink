import { categories } from '../data/products'
import { listings } from '../data/listings'

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 320))

export const marketplaceService = {
  async getFeaturedListings() {
    await pause()
    return listings.slice(0, 6)
  },
  async getListings() {
    await pause()
    return listings
  },
  async getListing(id: string) {
    await pause()
    return listings.find((listing) => listing.id === id) ?? null
  },
  getCategories() {
    return categories
  },
}
