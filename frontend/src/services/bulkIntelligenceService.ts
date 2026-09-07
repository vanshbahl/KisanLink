import type { BulkRfq, FarmerListing, SupplyContribution } from '../types'
import { getCropIntel, type FarmerCrop } from './farmerAiService'

const cropFor = (crop: string): FarmerCrop | null => (['Tomatoes', 'Potatoes', 'Onion', 'Spinach', 'Wheat', 'Carrots'] as FarmerCrop[]).find((item) => crop.toLowerCase().includes(item.slice(0, -1).toLowerCase())) ?? null
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
export type BulkFactor = { label: string; value: string }
export type BulkInsight = { title: string; recommendation: string; confidence: number; factors: BulkFactor[]; ctaLabel?: string; href?: string; note?: string }
/** Shape of one pooled-supply row as assembled by `phase2Service.supplyPools()`. */
export type SupplyPoolLike = { id: string; product: string; grade: string; corridor: string; totalQuantityKg: number; startingPrice: number; priceMax: number; moqKg: number; farmerCount: number; readiness: string; dispatch: string }

/** Price-option likelihoods are transparent deterministic prototype scores, not model predictions. */
export function targetPriceOptions(crop: string, quantity: number, fallback: number) {
  const intel = cropFor(crop) ? getCropIntel(cropFor(crop)!) : null; const base = intel ? Math.round((intel.recommendedMin + intel.recommendedMax) / 2) : fallback
  return [{ id: 'fast', label: 'Fast fulfilment', price: Math.max(1, base - 2), likelihood: clamp(86 - Math.round(quantity / 2500), 60, 90) }, { id: 'recommended', label: 'Recommended', price: base, likelihood: clamp(74 - Math.round(quantity / 3500), 52, 82) }, { id: 'aggressive', label: 'Aggressive saving', price: Math.max(1, base - 4), likelihood: clamp(58 - Math.round(quantity / 5000), 28, 62) }]
}

export function procurementPulse(rfqs: BulkRfq[], listings: FarmerListing[]): BulkInsight {
  const atRisk = rfqs.find((rfq) => !['converted', 'closed'].includes(rfq.status) && rfq.matches.reduce((sum, match) => sum + match.quantityKg, 0) < rfq.requiredQuantityKg)
  if (atRisk) { const matched = atRisk.matches.reduce((sum, match) => sum + match.quantityKg, 0); return { title: 'Procurement Pulse', recommendation: `${atRisk.crop} requirement needs attention: ${matched.toLocaleString('en-IN')} kg matched of ${atRisk.requiredQuantityKg.toLocaleString('en-IN')} kg.`, confidence: 81, href: `/bulk/requests/${atRisk.id}`, ctaLabel: 'Review requirement', factors: [{ label: 'Fulfilment', value: `${Math.round(matched / atRisk.requiredQuantityKg * 100)}% matched` }, { label: 'Farmer cluster', value: `${atRisk.matches.length} farmers` }, { label: 'Target rate', value: `₹${atRisk.targetPrice}/kg` }, { label: 'Delivery', value: atRisk.deliveryWindow }] } }
  const best = listings.filter((item) => item.status === 'active' && item.remainingKg > 0).sort((a, b) => b.remainingKg - a.remainingKg)[0]
  return best ? { title: 'Procurement Pulse', recommendation: `${best.crop} has ${best.remainingKg.toLocaleString('en-IN')} kg available at ₹${best.pricePerKg}/kg.`, confidence: 78, href: '/bulk/supply', ctaLabel: 'Browse supply', factors: [{ label: 'Available supply', value: `${best.remainingKg.toLocaleString('en-IN')} kg` }, { label: 'Farm-gate rate', value: `₹${best.pricePerKg}/kg` }, { label: 'Mandi reference', value: `₹${best.mandiPricePerKg}/kg` }, { label: 'Readiness', value: 'Listing active' }] } : { title: 'Procurement Pulse', recommendation: 'No active supply is available to assess.', confidence: 55, factors: [] }
}

/**
 * Shared reading of one pooled farmer allocation. `matchIntelligence` (a whole RFQ) and the
 * contribution preview on supply, requirement and order screens all resolve to this, so every
 * screen states the same five weighted factors instead of re-deriving them locally.
 */
export function contributionIntelligence(contributions: SupplyContribution[], requiredQuantityKg: number, context?: { deliveryWindow?: string; grade?: string }): BulkInsight {
  const matched = contributions.reduce((sum, item) => sum + item.quantityKg, 0)
  const average = matched ? Math.round(contributions.reduce((sum, item) => sum + item.quantityKg * item.ratePerKg, 0) / matched) : 0
  const top = Math.max(0, ...contributions.map((item) => item.quantityKg))
  const concentration = matched ? top / matched : 0
  const fulfilment = requiredQuantityKg ? matched / requiredQuantityKg : 0
  const risk = fulfilment < .75 ? 'Moderate procurement risk' : concentration >= .65 ? 'High concentration risk' : 'Low procurement risk'
  return {
    title: 'Match Intelligence',
    recommendation: `${Math.min(100, Math.round(fulfilment * 100))}% matched — ${risk.toLowerCase()}.`,
    confidence: clamp(Math.round(58 + Math.min(1, fulfilment) * 30 + Math.min(contributions.length * 3, 9)), 55, 92),
    note: 'Distance, price, time, reliability and quality use the backend weighted match engine when a canonical cluster is available; local previews use deterministic prototype defaults.',
    factors: [
      { label: 'Distance · 30%', value: 'Weighted by match engine or prototype route context' },
      { label: 'Price · 25%', value: average ? `Average ₹${average}/kg` : 'Awaiting supply' },
      { label: 'Time · 20%', value: context?.deliveryWindow ?? 'Delivery-window compatibility' },
      { label: 'Reliability · 15%', value: 'Backend profile/default prototype signal' },
      { label: 'Quality · 10%', value: context?.grade ?? 'Listing grade signal' },
      { label: 'Cluster risk', value: concentration >= .65 ? 'One supplier contributes a large share' : `${contributions.length} supplier allocations` },
    ],
  }
}

export function matchIntelligence(rfq: BulkRfq): BulkInsight {
  return contributionIntelligence(rfq.matches, rfq.requiredQuantityKg, { deliveryWindow: rfq.deliveryWindow, grade: rfq.grade })
}

/** Browse-supply scout: which pooled listing in the current filtered view is the strongest start. */
export function supplyPoolScout(pools: SupplyPoolLike[]): BulkInsight {
  if (!pools.length) return { title: 'Supply Scout', recommendation: 'No pooled supply matches the current filters.', confidence: 55, factors: [] }
  const score = (pool: SupplyPoolLike) => Math.min(30, pool.totalQuantityKg / 400) + Math.max(0, 26 - pool.startingPrice / 2) + Math.min(18, pool.farmerCount * 2) + Math.max(0, 12 - pool.moqKg / 100) + (pool.grade === 'Grade A+' ? 6 : 0)
  const ranked = [...pools].sort((a, b) => score(b) - score(a))
  const best = ranked[0]
  const cheapest = [...pools].sort((a, b) => a.startingPrice - b.startingPrice)[0]
  return {
    title: 'Supply Scout',
    recommendation: `${best.product} in the ${best.corridor} corridor is the strongest pool to open first.`,
    confidence: clamp(66 + Math.round(score(best) / 4), 66, 90),
    ctaLabel: 'Open this pool',
    href: `/bulk/supply/${best.id}`,
    note: best.id === cheapest.id ? undefined : `${cheapest.product} starts lower at ₹${cheapest.startingPrice}/kg but scores below on pooled depth, MOQ or farmer count.`,
    factors: [
      { label: 'Pooled depth', value: `${best.totalQuantityKg.toLocaleString('en-IN')} kg across ${best.farmerCount} farmers` },
      { label: 'Farm-gate range', value: `₹${best.startingPrice}–₹${best.priceMax}/kg` },
      { label: 'Minimum order', value: `${best.moqKg.toLocaleString('en-IN')} kg MOQ` },
      { label: 'Grade', value: best.grade },
      { label: 'Readiness', value: `${best.readiness} · dispatch ${best.dispatch}` },
      { label: 'Pools compared', value: `${pools.length} in the current filters` },
    ],
  }
}
