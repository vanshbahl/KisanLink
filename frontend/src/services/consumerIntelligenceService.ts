import type { CartItem, FarmerListing } from '../types'
import { orderCosts } from './phase2Service'

const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(`${value}T00:00:00`).getTime()) / 86400000))
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export type ConsumerFactor = { label: string; value: string }
export type ConsumerInsight = { title: string; recommendation: string; confidence: number; factors: ConsumerFactor[]; price?: number; mandi?: number; listingId?: string; ctaLabel?: string; note?: string }

/** Deterministic, listing-state-only recommendations: no distance, shelf-life, or model claims. */
export function freshPick(listings: FarmerListing[]): ConsumerInsight {
  const active = listings.filter((item) => item.status === 'active' && item.remainingKg > 0)
  const ranked = active.map((item) => ({ item, score: (item.grade === 'Grade A+' ? 20 : 12) + Math.max(0, 18 - daysSince(item.harvestDate) * 8) + Math.min(18, item.remainingKg / 20) + (item.isUrgentRescue ? 6 : 0) + clamp((item.mandiPricePerKg - (item.rescueStatus === 'RESCUE_ACTIVE' ? item.rescueDiscountPricePerKg ?? item.pricePerKg : item.pricePerKg)) * 2, -12, 18) })).sort((a, b) => b.score - a.score)
  const selected = ranked[0]?.item
  if (!selected) return { title: 'Fresh Pick', recommendation: 'No active produce is available to compare right now.', confidence: 55, factors: [] }
  const price = selected.rescueStatus === 'RESCUE_ACTIVE' ? selected.rescueDiscountPricePerKg ?? selected.pricePerKg : selected.pricePerKg
  return { title: 'Fresh Pick', recommendation: `${selected.crop} from ${selected.farm} is the strongest current pick.`, confidence: clamp(68 + Math.round(ranked[0].score / 4), 68, 91), price, mandi: selected.mandiPricePerKg, listingId: selected.id, ctaLabel: 'View listing', note: selected.rescueStatus === 'RESCUE_ACTIVE' ? 'Rescue price shown; best suited for near-term use.' : undefined, factors: [{ label: 'Price', value: `₹${price}/kg vs mandi ₹${selected.mandiPricePerKg}` }, { label: 'Harvest', value: daysSince(selected.harvestDate) === 0 ? 'Harvested today' : `Harvested ${daysSince(selected.harvestDate)} day${daysSince(selected.harvestDate) === 1 ? '' : 's'} ago` }, { label: 'Supply', value: `${selected.remainingKg} kg available` }, { label: 'Verification', value: 'Verified farmer' }] }
}

export function smartBuy(listing: FarmerListing): ConsumerInsight {
  const rescue = listing.isUrgentRescue || listing.rescueStatus === 'RESCUE_ACTIVE'; const price = rescue ? listing.rescueDiscountPricePerKg ?? listing.pricePerKg : listing.pricePerKg; const gap = listing.mandiPricePerKg - price; const age = daysSince(listing.harvestDate)
  const title = rescue ? 'Rescue Buy Check' : 'Smart Buy Analysis'; const judgement = rescue ? 'Best for near-term use' : gap >= 4 && age <= 1 ? 'Excellent buy' : gap >= 0 ? 'Good value' : gap >= -4 ? 'Fair price' : 'Premium price'
  return { title, recommendation: `${judgement} — ${listing.crop} is priced at ₹${price}/kg.`, confidence: clamp(72 + (listing.grade === 'Grade A+' ? 7 : 0) + (age <= 1 ? 5 : 0) + (listing.remainingKg > 20 ? 3 : 0), 60, 92), price, mandi: listing.mandiPricePerKg, ctaLabel: 'Add 3 kg to cart', note: rescue ? `₹${listing.pricePerKg}/kg normal price; discounted rescue price is active. Shorter selling window is indicated by the listing state.` : undefined, factors: [{ label: 'Mandi reference', value: `₹${listing.mandiPricePerKg}/kg` }, { label: 'Harvest', value: age === 0 ? 'Harvested today' : `Harvested ${age} day${age === 1 ? '' : 's'} ago` }, { label: 'Available supply', value: `${listing.remainingKg} kg` }, { label: 'Grade & farm', value: `${listing.grade} · verified farmer` }] }
}

export function basketOptimizer(cart: CartItem[], listings: FarmerListing[]): ConsumerInsight {
  const rows = cart.map((entry) => ({ entry, listing: listings.find((listing) => listing.id === entry.listingId) })).filter((row): row is { entry: CartItem; listing: FarmerListing } => Boolean(row.listing)); const costs = orderCosts(rows.map(({ entry, listing }) => ({ quantityKg: entry.quantityKg, pricePerKg: listing.pricePerKg }))); const farms = new Set(rows.map(({ listing }) => listing.farm)); const low = rows.filter(({ entry, listing }) => listing.remainingKg <= entry.quantityKg + 5)
  const efficient = farms.size <= 1 && low.length === 0
  return { title: 'Basket Optimizer', recommendation: efficient ? 'Your basket is already efficient for the current prototype pickup model.' : farms.size > 1 ? 'Your basket spans multiple farms; pooled pickup is estimated at checkout.' : 'One item has limited remaining stock; keep the basket unchanged to protect availability.', confidence: efficient ? 85 : 73, note: `Logistics estimate ₹${costs.logistics}, based on the current prototype logistics formula — not a route quote.`, ctaLabel: efficient ? 'Keep basket unchanged' : 'View nearby produce', factors: [{ label: 'Items', value: `${rows.length} line item${rows.length === 1 ? '' : 's'}` }, { label: 'Farm origins', value: `${farms.size} farm${farms.size === 1 ? '' : 's'}` }, { label: 'Prototype logistics', value: `₹${costs.logistics} estimate` }, { label: 'Stock check', value: low.length ? `${low.length} low-stock item${low.length === 1 ? '' : 's'}` : 'All selected quantities available' }] }
}

/**
 * Explore-page scout. Deliberately scoped to the listings the shopper's own filters have left on
 * screen, so the recommendation is always defensible against what they can actually see.
 */
export function bestInResults(listings: FarmerListing[]): ConsumerInsight {
  const available = listings.filter((item) => item.remainingKg > 0)
  if (!available.length) return { title: 'Best In These Results', recommendation: 'Nothing in the current results is in stock to compare.', confidence: 55, factors: [] }
  const priceOf = (item: FarmerListing) => (item.rescueStatus === 'RESCUE_ACTIVE' ? item.rescueDiscountPricePerKg ?? item.pricePerKg : item.pricePerKg)
  const pick = freshPick(available.map((item) => ({ ...item, status: 'active' as const })))
  const chosen = available.find((item) => item.id === pick.listingId) ?? available[0]
  const price = priceOf(chosen)
  const cheapest = [...available].sort((a, b) => priceOf(a) - priceOf(b))[0]
  const freshest = [...available].sort((a, b) => b.harvestDate.localeCompare(a.harvestDate))[0]
  const belowMandi = available.filter((item) => priceOf(item) < item.mandiPricePerKg).length
  return {
    title: 'Best In These Results',
    recommendation: `${chosen.crop} from ${chosen.farm} balances price and freshness best across these ${available.length} results.`,
    confidence: pick.confidence,
    price,
    mandi: chosen.mandiPricePerKg,
    listingId: chosen.id,
    ctaLabel: 'Open this listing',
    note: chosen.id === cheapest.id ? undefined : `${cheapest.crop} is cheaper at ₹${priceOf(cheapest)}/kg, but scores lower on harvest date, stock or grade.`,
    factors: [
      { label: 'Price', value: `₹${price}/kg vs mandi ₹${chosen.mandiPricePerKg}` },
      { label: 'Harvest', value: daysSince(chosen.harvestDate) === 0 ? 'Harvested today' : `Harvested ${daysSince(chosen.harvestDate)} day${daysSince(chosen.harvestDate) === 1 ? '' : 's'} ago` },
      { label: 'Supply', value: `${chosen.remainingKg} kg available` },
      { label: 'Grade & farm', value: `${chosen.grade} · verified farmer` },
      { label: 'Freshest in results', value: freshest.id === chosen.id ? 'This listing' : `${freshest.crop} · ${freshest.farm}` },
      { label: 'Below mandi reference', value: `${belowMandi} of ${available.length} results` },
    ],
  }
}
