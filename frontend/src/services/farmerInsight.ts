import type { CropDeal } from './farmerDeal'
import { FRESHNESS_URGENCY, isUrgentFreshness } from './cropFreshness'
import type { FarmerKey } from '../i18n/farmer'
import type { FarmerListing } from '../types'

/**
 * The sentences behind the farmer module's AI overviews.
 *
 * Each returns a dictionary key plus the numbers to fill it, never prose, so both languages
 * stay natural and every claim traces to a field on the deal: freshness stage, price trend,
 * buyer count, gain over the mandi. There is no "AI recommends selling now" default — when the
 * data says nothing worth saying, the caller gets `null` and renders nothing.
 */
export interface Insight {
  key: FarmerKey
  values: Record<string, string | number>
  urgent: boolean
  /** The crop this insight is about, when it is about one — lets a caller build a CTA. */
  listingId?: string
}

const rupees = (value: number) => `₹${Math.round(value)}`

/** One line for a single crop (crop page, Market Maker result). */
export function cropInsight(listing: FarmerListing, deal: CropDeal | null, cropLabel: string): Insight | null {
  if (!deal) return null
  const { freshness, trend } = deal
  const days = Math.max(0, freshness.daysLeft)

  if (isUrgentFreshness(freshness)) return { key: 'aiCropUrgent', values: { crop: cropLabel }, urgent: true }
  if (freshness.stage === 'SELL_SOON') return { key: days === 1 ? 'aiCropSoonOne' : 'aiCropSoon', values: { crop: cropLabel, days, price: rupees(deal.pricePerKg) }, urgent: false }
  if (trend === 'falling') return { key: 'aiCropFalling', values: { crop: cropLabel }, urgent: false }
  if (trend === 'rising') return { key: 'aiCropFreshRising', values: { crop: cropLabel, days }, urgent: false }
  if (deal.buyerCount > 0) return { key: 'aiCropFreshSteady', values: { crop: cropLabel, buyers: deal.buyerCount }, urgent: false }
  return null
}

/** The one line on Home: the crop that most needs attention, or a calm "all steady". */
export function homeInsight(
  listings: FarmerListing[],
  deals: Record<string, CropDeal | null>,
  pick: (en: string, hi?: string) => string,
): Insight | null {
  const live = listings.filter((item) => item.status === 'active' && deals[item.id])
  if (!live.length) return null

  const ranked = [...live].sort((a, b) => {
    const da = deals[a.id]!, db = deals[b.id]!
    const urgency = FRESHNESS_URGENCY[db.freshness.stage] - FRESHNESS_URGENCY[da.freshness.stage]
    return urgency !== 0 ? urgency : db.gainPerKg - da.gainPerKg
  })
  const top = ranked[0]
  const deal = deals[top.id]!
  const crop = pick(top.crop, top.cropHi)
  const days = Math.max(0, deal.freshness.daysLeft)

  if (isUrgentFreshness(deal.freshness)) return { key: 'aiHomeUrgent', values: { crop }, urgent: true, listingId: top.id }
  if (deal.freshness.stage === 'SELL_SOON' && deal.gainPerKg > 0) {
    return { key: days === 1 ? 'aiHomeSoonOne' : 'aiHomeSoon', values: { crop, days, price: rupees(deal.pricePerKg), gain: rupees(deal.gainPerKg) }, urgent: false, listingId: top.id }
  }
  if (deal.gainPerKg > 0 && deal.buyerCount > 0) {
    return { key: 'aiHomeFresh', values: { crop, price: rupees(deal.pricePerKg), gain: rupees(deal.gainPerKg), buyers: deal.buyerCount }, urgent: false, listingId: top.id }
  }
  return { key: 'aiHomeQuiet', values: {}, urgent: false }
}

/** The "why" line under a Market Maker result. */
export function dealWhy(deal: CropDeal, f: (key: FarmerKey, values?: Record<string, string | number>) => string): string {
  const days = Math.max(0, deal.freshness.daysLeft)
  return f(deal.source === 'board' ? 'aiDealWhy' : 'aiDealWhyIntel', {
    count: deal.buyerCount,
    vehicle: f(deal.hasVehicle ? 'aiDealVehicleYes' : 'aiDealVehicleNo'),
    fresh: deal.freshness.daysLeft <= 1 ? f('aiDealFreshTight') : f('aiDealFreshOk', { days }),
  })
}
