import { apiClient } from './apiClient'
import { prototypeService } from './prototypeService'
import type { FarmerListing } from '../types'

/**
 * "जल्दी बेचें" — the urgent rescue sale, as one function.
 *
 * The backend applies its own discount when the listing is a real record; when it is not
 * (created in this browser only) the same deterministic 25% cut is applied locally so the
 * flow still completes. Shared by the crop sheet, the Market Maker card and the home task so
 * every entry point does exactly the same thing.
 */
export const RESCUE_DISCOUNT = 0.75

export const rescuePriceFor = (listing: Pick<FarmerListing, 'pricePerKg'>) => Math.round(listing.pricePerKg * RESCUE_DISCOUNT)

export const isRescueActive = (listing: Pick<FarmerListing, 'isUrgentRescue' | 'rescueStatus'>) =>
  Boolean(listing.isUrgentRescue || listing.rescueStatus === 'RESCUE_ACTIVE')

export async function startRescueSale(listing: FarmerListing): Promise<number> {
  let rescuePricePerKg: number
  try {
    const result = await apiClient.tagUrgentRescue(listing.id)
    rescuePricePerKg = result.rescue_price_per_kg
  } catch {
    rescuePricePerKg = rescuePriceFor(listing)
  }
  await prototypeService.patchListing(listing.id, {
    isUrgentRescue: true,
    rescueDiscountPricePerKg: rescuePricePerKg,
    rescueStatus: 'RESCUE_ACTIVE',
    status: 'active',
  })
  return rescuePricePerKg
}
