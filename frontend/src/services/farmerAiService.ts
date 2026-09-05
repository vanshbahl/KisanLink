// Deterministic "Kisan Intelligence" engine for the Farmer module.
//
// This is intentionally NOT a real ML/LLM service. Every function below is a pure,
// explainable calculation over deterministic demo data (crop intelligence table) and
// whatever real farmer state (listings/orders/pickups/earnings) is passed in. Given the
// same inputs, every function always returns the same output — no Math.random(), no
// network calls, no clocks other than a fixed "today" reference used across the app.
//
// The shape of these types is deliberately clean so this layer could later be swapped
// for a real forecasting/LLM backend without touching the UI components that consume it.
import type { EarningsTransaction, FarmerListing, FarmerOrder, Pickup } from '../types'

export type FarmerCrop = 'Tomatoes' | 'Potatoes' | 'Onion' | 'Spinach' | 'Wheat' | 'Carrots'
export type Level = 'Low' | 'Moderate' | 'High'

export interface CropIntel {
  crop: FarmerCrop
  cropHi: string
  /** matches FarmerListing.crop values used across the sell wizard / produce pages */
  listingCrop: string
  listingCropHi: string
  mandi: number
  direct: number
  historical: number[] // last 7 days, oldest -> today
  forecast: number[] // next 3 days
  demandIndex: number // 0-100
  demandChangePct: number // vs this week's average
  nearbyDemandKg: number
  buyerCount: number
  volatility: Level
  supplyPressure: Level
  confidence: number // 0-100
  recommendedMin: number
  recommendedMax: number
  actionKgMin: number
  actionKgMax: number
  pickupAvailableTomorrow: boolean
}

const CROP_INTEL: Record<FarmerCrop, CropIntel> = {
  Tomatoes: { crop: 'Tomatoes', cropHi: 'टमाटर', listingCrop: 'Fresh Tomatoes', listingCropHi: 'ताज़े टमाटर', mandi: 24, direct: 32, historical: [27, 28, 28, 30, 29, 31, 32], forecast: [33, 33, 32], demandIndex: 82, demandChangePct: 32, nearbyDemandKg: 1800, buyerCount: 46, volatility: 'Moderate', supplyPressure: 'Moderate', confidence: 88, recommendedMin: 31, recommendedMax: 33, actionKgMin: 300, actionKgMax: 500, pickupAvailableTomorrow: true },
  Potatoes: { crop: 'Potatoes', cropHi: 'आलू', listingCrop: 'New Potatoes', listingCropHi: 'नए आलू', mandi: 21, direct: 25, historical: [20, 21, 21, 22, 22, 24, 25], forecast: [25, 26, 26], demandIndex: 58, demandChangePct: 9, nearbyDemandKg: 900, buyerCount: 21, volatility: 'Low', supplyPressure: 'High', confidence: 74, recommendedMin: 24, recommendedMax: 26, actionKgMin: 400, actionKgMax: 600, pickupAvailableTomorrow: true },
  Onion: { crop: 'Onion', cropHi: 'प्याज़', listingCrop: 'Red Onion', listingCropHi: 'लाल प्याज़', mandi: 18, direct: 24, historical: [17, 18, 19, 19, 21, 23, 24], forecast: [25, 26, 25], demandIndex: 71, demandChangePct: 24, nearbyDemandKg: 1200, buyerCount: 33, volatility: 'High', supplyPressure: 'Moderate', confidence: 69, recommendedMin: 23, recommendedMax: 26, actionKgMin: 250, actionKgMax: 400, pickupAvailableTomorrow: false },
  Spinach: { crop: 'Spinach', cropHi: 'पालक', listingCrop: 'Baby Spinach', listingCropHi: 'बेबी पालक', mandi: 35, direct: 42, historical: [33, 35, 36, 38, 39, 40, 42], forecast: [43, 43, 42], demandIndex: 64, demandChangePct: 14, nearbyDemandKg: 400, buyerCount: 28, volatility: 'Moderate', supplyPressure: 'Low', confidence: 79, recommendedMin: 40, recommendedMax: 44, actionKgMin: 80, actionKgMax: 140, pickupAvailableTomorrow: true },
  Wheat: { crop: 'Wheat', cropHi: 'गेहूं', listingCrop: 'Sharbati Wheat', listingCropHi: 'शरबती गेहूं', mandi: 31, direct: 37, historical: [30, 31, 31, 32, 33, 34, 37], forecast: [37, 38, 38], demandIndex: 41, demandChangePct: 4, nearbyDemandKg: 3000, buyerCount: 12, volatility: 'Low', supplyPressure: 'High', confidence: 62, recommendedMin: 36, recommendedMax: 38, actionKgMin: 800, actionKgMax: 1200, pickupAvailableTomorrow: false },
  Carrots: { crop: 'Carrots', cropHi: 'गाजर', listingCrop: 'Sweet Carrots', listingCropHi: 'मीठी गाजर', mandi: 29, direct: 36, historical: [27, 28, 30, 31, 33, 35, 36], forecast: [37, 37, 36], demandIndex: 55, demandChangePct: 11, nearbyDemandKg: 700, buyerCount: 19, volatility: 'Moderate', supplyPressure: 'Moderate', confidence: 70, recommendedMin: 35, recommendedMax: 38, actionKgMin: 200, actionKgMax: 350, pickupAvailableTomorrow: true },
}

export const FARMER_CROPS: FarmerCrop[] = ['Tomatoes', 'Potatoes', 'Onion', 'Spinach', 'Wheat', 'Carrots']

export function getCropIntel(crop: FarmerCrop): CropIntel { return CROP_INTEL[crop] }
export function listCropIntel(): CropIntel[] { return FARMER_CROPS.map((crop) => CROP_INTEL[crop]) }

function cropFromListingName(listingCrop: string): FarmerCrop | null {
  const match = FARMER_CROPS.find((crop) => CROP_INTEL[crop].listingCrop === listingCrop || listingCrop.toLowerCase().includes(CROP_INTEL[crop].crop.toLowerCase().slice(0, -1)))
  return match ?? null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number) => Math.round(value)

export type InsightFactorId = 'buyerDemand' | 'marketGap' | 'supplyGap' | 'pickupCapacity'
export interface InsightFactor { id: InsightFactorId; labelKey: string; valueKey: string; values: Record<string, string | number> }

export interface FarmerOpportunityInsight {
  crop: FarmerCrop
  cropHi: string
  listingCrop: string
  listingCropHi: string
  intel: CropIntel
  demandChangePct: number
  nearbyDemandTonnes: number
  gainPerKg: number
  confidence: number
  confidenceTier: 'High' | 'Medium' | 'Low'
  factors: InsightFactor[]
}

/** Feature 1 — AI Farm Pulse. Picks the strongest opportunity among the farmer's own active listings. */
export function getFarmOpportunity(listings: FarmerListing[]): FarmerOpportunityInsight {
  const active = listings.filter((item) => item.status === 'active')
  const candidates = active.map((item) => ({ listing: item, crop: cropFromListingName(item.crop) })).filter((entry): entry is { listing: FarmerListing; crop: FarmerCrop } => entry.crop !== null)
  const best = candidates.length
    ? candidates.reduce((top, entry) => (CROP_INTEL[entry.crop].demandIndex > CROP_INTEL[top.crop].demandIndex ? entry : top))
    : { listing: null as FarmerListing | null, crop: 'Tomatoes' as FarmerCrop }
  const intel = CROP_INTEL[best.crop]
  const gainPerKg = intel.recommendedMin - intel.mandi
  const confidenceTier: FarmerOpportunityInsight['confidenceTier'] = intel.confidence >= 80 ? 'High' : intel.confidence >= 60 ? 'Medium' : 'Low'
  const factors: InsightFactor[] = [
    { id: 'buyerDemand', labelKey: 'factorBuyerDemand', valueKey: 'factorBuyerDemandValue', values: { count: intel.buyerCount } },
    { id: 'marketGap', labelKey: 'factorMarketGap', valueKey: 'factorMarketGapValue', values: { gap: gainPerKg } },
    { id: 'supplyGap', labelKey: 'factorSupplyGap', valueKey: 'factorSupplyGapValue', values: { tonnes: (intel.nearbyDemandKg / 1000).toFixed(1) } },
    { id: 'pickupCapacity', labelKey: 'factorPickup', valueKey: intel.pickupAvailableTomorrow ? 'factorPickupAvailable' : 'factorPickupLimited', values: {} },
  ]
  return { crop: intel.crop, cropHi: intel.cropHi, listingCrop: intel.listingCrop, listingCropHi: intel.listingCropHi, intel, demandChangePct: intel.demandChangePct, nearbyDemandTonnes: intel.nearbyDemandKg / 1000, gainPerKg, confidence: intel.confidence, confidenceTier, factors }
}

export interface MarketAnalysis {
  intel: CropIntel
  demandLabel: Level
  supplyLabel: Level
  momentum: 'Rising' | 'Stable' | 'Falling'
  pickup: 'Available' | 'Limited'
  grade: string
}

/** Feature 2 — Market Intelligence deep analysis for a chosen crop. */
export function analyseMarket(crop: FarmerCrop, grade = 'Grade A'): MarketAnalysis {
  const intel = CROP_INTEL[crop]
  const demandLabel: Level = intel.demandIndex >= 70 ? 'High' : intel.demandIndex >= 45 ? 'Moderate' : 'Low'
  const momentum = intel.forecast[intel.forecast.length - 1] > intel.historical[intel.historical.length - 1] ? 'Rising' : intel.forecast[intel.forecast.length - 1] < intel.historical[intel.historical.length - 1] ? 'Falling' : 'Stable'
  const pickup = intel.pickupAvailableTomorrow ? 'Available' : 'Limited'
  return { intel, demandLabel, supplyLabel: intel.supplyPressure, momentum, pickup, grade }
}

export interface PriceOption {
  id: 'fast' | 'balanced' | 'high'
  price: number
  labelKey: string
  hintKey: string
  saleChancePct: number
}

/** Feature 3 — Smart Price Advisor. Derives 3 anchor prices and a deterministic sale-chance estimate. */
export function getPriceOptions(listing: Pick<FarmerListing, 'crop' | 'mandiPricePerKg' | 'grade'>): PriceOption[] {
  const crop = cropFromListingName(listing.crop)
  const intel = crop ? CROP_INTEL[crop] : null
  const mandi = listing.mandiPricePerKg || intel?.mandi || 24
  const mid = intel ? round((intel.recommendedMin + intel.recommendedMax) / 2) : mandi + 8
  const low = mandi + 5
  const high = mid + (mid - low)
  const demandIndex = intel?.demandIndex ?? 65
  const gradeBonus = listing.grade === 'Grade A+' ? 4 : 0
  const chanceFor = (price: number) => clamp(round(84 - (price - mid) * 6 + (demandIndex - 70) * 0.3 + gradeBonus), 30, 97)
  return [
    { id: 'fast', price: low, labelKey: 'fastSale', hintKey: 'lowerEarnings', saleChancePct: chanceFor(low) },
    { id: 'balanced', price: mid, labelKey: 'bestBalance', hintKey: 'bestBalanceHint', saleChancePct: chanceFor(mid) },
    { id: 'high', price: high, labelKey: 'higherEarnings', hintKey: 'lowerSaleProbability', saleChancePct: chanceFor(high) },
  ]
}

export interface RankedOrder {
  order: FarmerOrder
  pickup: Pickup | null
  priority: 'first' | 'next' | 'later'
  routeShared: boolean
  score: number
}

/** Feature 4 — AI Order Advisor. Ranks active orders by pickup urgency, payout, and shared routes. Advisory only. */
export function rankOrders(orders: FarmerOrder[], pickups: Pickup[]): RankedOrder[] {
  const active = orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
  const scored = active.map((order) => {
    const pickup = pickups.find((item) => item.orderId === order.id) ?? null
    const routeShared = pickup ? pickups.some((other) => other.id !== pickup.id && other.date === pickup.date) : false
    const statusWeight = order.status === 'accepted' ? 200 : order.status === 'preparing' ? 260 : order.status === 'new' ? 150 : 100
    const pickupWeight = pickup ? 80 : 0
    const payoutWeight = order.farmerPayout / 50
    const routeWeight = routeShared ? 30 : 0
    return { order, pickup, routeShared, score: statusWeight + pickupWeight + payoutWeight + routeWeight }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map((entry, index): RankedOrder => ({ ...entry, priority: index === 0 ? 'first' : index === 1 ? 'next' : 'later' }))
}

export interface EarningsStory {
  gain: number
  bestCrop: { crop: string; cropHi: string; gain: number } | null
  averageGainPerKg: number
  pendingAmount: number
  opportunity: { crop: FarmerCrop; cropHi: string; kg: number; min: number; max: number }
}

/** Feature 5 — AI Earnings Story. Built entirely from the farmer's own transaction history. */
export function buildEarningsStory(earnings: EarningsTransaction[], orders: FarmerOrder[]): EarningsStory {
  const gain = earnings.reduce((sum, item) => sum + (item.net - item.mandiEquivalent), 0)
  const pendingAmount = earnings.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.net, 0)
  const byCrop = new Map<string, { cropHi: string; gain: number }>()
  for (const item of earnings) {
    const current = byCrop.get(item.crop) ?? { cropHi: item.cropHi, gain: 0 }
    current.gain += item.net - item.mandiEquivalent
    byCrop.set(item.crop, current)
  }
  let bestCrop: EarningsStory['bestCrop'] = null
  for (const [crop, value] of byCrop) if (!bestCrop || value.gain > bestCrop.gain) bestCrop = { crop, cropHi: value.cropHi, gain: value.gain }
  const totalKg = earnings.reduce((sum, item) => {
    const order = orders.find((entry) => entry.id === item.orderId)
    return sum + (order?.quantityKg ?? 0)
  }, 0)
  const averageGainPerKg = totalKg > 0 ? gain / totalKg : 0
  const opportunity = getFarmOpportunity([])
  const opportunityKg = 400
  return { gain, bestCrop, averageGainPerKg, pendingAmount, opportunity: { crop: opportunity.crop, cropHi: opportunity.cropHi, kg: opportunityKg, min: opportunityKg * opportunity.gainPerKg, max: opportunityKg * (opportunity.intel.recommendedMax - opportunity.intel.mandi) } }
}
