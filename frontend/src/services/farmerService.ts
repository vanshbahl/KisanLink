import { farmerDashboard } from '../data/insights'
import { listings } from '../data/listings'

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 280))

export const farmerService = {
  async getDashboard() {
    await pause()
    return farmerDashboard
  },
  async getListings() {
    await pause()
    return listings.filter((listing) => listing.farmerId === 'farmer_001')
  },
}
