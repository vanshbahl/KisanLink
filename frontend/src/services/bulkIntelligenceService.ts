import type { BulkRfq, FarmerListing } from '../types'
import { getCropIntel, type FarmerCrop } from './farmerAiService'

const cropFor = (crop: string): FarmerCrop | null => (['Tomatoes', 'Potatoes', 'Onion', 'Spinach', 'Wheat', 'Carrots'] as FarmerCrop[]).find((item) => crop.toLowerCase().includes(item.slice(0, -1).toLowerCase())) ?? null
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
export type BulkFactor = { label: string; value: string }
export type BulkInsight = { title: string; recommendation: string; confidence: number; factors: BulkFactor[]; ctaLabel?: string; href?: string; note?: string }

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

export function matchIntelligence(rfq: BulkRfq): BulkInsight {
  const matched = rfq.matches.reduce((sum, item) => sum + item.quantityKg, 0); const average = matched ? Math.round(rfq.matches.reduce((sum, item) => sum + item.quantityKg * item.ratePerKg, 0) / matched) : 0; const top = Math.max(0, ...rfq.matches.map((item) => item.quantityKg)); const concentration = matched ? top / matched : 0; const fulfilment = rfq.requiredQuantityKg ? matched / rfq.requiredQuantityKg : 0
  const risk = fulfilment < .75 ? 'Moderate procurement risk' : concentration >= .65 ? 'High concentration risk' : 'Low procurement risk'
  return { title: 'Match Intelligence', recommendation: `${Math.round(fulfilment * 100)}% matched — ${risk.toLowerCase()}.`, confidence: clamp(Math.round(58 + fulfilment * 30 + Math.min(rfq.matches.length * 3, 9)), 55, 92), note: 'Distance, price, time, reliability and quality use the backend weighted match engine when a canonical cluster is available; local previews use deterministic prototype defaults.', factors: [{ label: 'Distance · 30%', value: 'Weighted by match engine or prototype route context' }, { label: 'Price · 25%', value: average ? `Average ₹${average}/kg` : 'Awaiting supply' }, { label: 'Time · 20%', value: rfq.deliveryWindow }, { label: 'Reliability · 15%', value: 'Backend profile/default prototype signal' }, { label: 'Quality · 10%', value: rfq.grade }, { label: 'Cluster risk', value: concentration >= .65 ? 'One supplier contributes a large share' : `${rfq.matches.length} supplier allocations` }] }
}
