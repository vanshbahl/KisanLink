import { bulkSupplies } from '../data/insights'

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 300))

export const bulkService = {
  async getDashboard() {
    await pause()
    return {
      todayRequirement: '2.5 tonnes',
      activeRequests: 3,
      nearbySupply: '8.4 tonnes',
      supplies: bulkSupplies,
    }
  },
}
