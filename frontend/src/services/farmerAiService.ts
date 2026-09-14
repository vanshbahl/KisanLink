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
import { apiClient } from './apiClient'
import { mandiBenchmarkService } from './mandiBenchmarkService'
import { derivePriceLadder, farmerAiContext, farmerPriceOptions, indicativeSeries, type FarmerAiContext, type MandiBenchmark, type PriceLadder } from './pricingEngine'

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
  /** Government benchmark the price fields were derived from (source, market, date, stale). */
  benchmark?: MandiBenchmark
  ladder?: PriceLadder
  /** The numbers any generated recommendation must quote. */
  aiContext?: FarmerAiContext
}

/**
 * Non-price demo signals per crop (demand, buyers, logistics). Every PRICE field on a
 * `CropIntel` comes from the centralized pricing engine over the live AGMARKNET benchmark —
 * see `withLivePrices` — so this table can never contradict a listing or a Market Maker board.
 */
type CropMeta = Omit<CropIntel, 'mandi' | 'direct' | 'historical' | 'forecast' | 'recommendedMin' | 'recommendedMax'>
const CROP_META: Record<FarmerCrop, CropMeta> = {
  Tomatoes: { crop: 'Tomatoes', cropHi: 'टमाटर', listingCrop: 'Fresh Tomatoes', listingCropHi: 'ताज़े टमाटर', demandIndex: 82, demandChangePct: 32, nearbyDemandKg: 1800, buyerCount: 46, volatility: 'Moderate', supplyPressure: 'Moderate', confidence: 88, actionKgMin: 300, actionKgMax: 500, pickupAvailableTomorrow: true },
  Potatoes: { crop: 'Potatoes', cropHi: 'आलू', listingCrop: 'New Potatoes', listingCropHi: 'नए आलू', demandIndex: 58, demandChangePct: 9, nearbyDemandKg: 900, buyerCount: 21, volatility: 'Low', supplyPressure: 'High', confidence: 74, actionKgMin: 400, actionKgMax: 600, pickupAvailableTomorrow: true },
  Onion: { crop: 'Onion', cropHi: 'प्याज़', listingCrop: 'Red Onion', listingCropHi: 'लाल प्याज़', demandIndex: 71, demandChangePct: 24, nearbyDemandKg: 1200, buyerCount: 33, volatility: 'High', supplyPressure: 'Moderate', confidence: 69, actionKgMin: 250, actionKgMax: 400, pickupAvailableTomorrow: false },
  Spinach: { crop: 'Spinach', cropHi: 'पालक', listingCrop: 'Baby Spinach', listingCropHi: 'बेबी पालक', demandIndex: 64, demandChangePct: 14, nearbyDemandKg: 400, buyerCount: 28, volatility: 'Moderate', supplyPressure: 'Low', confidence: 79, actionKgMin: 80, actionKgMax: 140, pickupAvailableTomorrow: true },
  Wheat: { crop: 'Wheat', cropHi: 'गेहूं', listingCrop: 'Sharbati Wheat', listingCropHi: 'शरबती गेहूं', demandIndex: 41, demandChangePct: 4, nearbyDemandKg: 3000, buyerCount: 12, volatility: 'Low', supplyPressure: 'High', confidence: 62, actionKgMin: 800, actionKgMax: 1200, pickupAvailableTomorrow: false },
  Carrots: { crop: 'Carrots', cropHi: 'गाजर', listingCrop: 'Sweet Carrots', listingCropHi: 'मीठी गाजर', demandIndex: 55, demandChangePct: 11, nearbyDemandKg: 700, buyerCount: 19, volatility: 'Moderate', supplyPressure: 'Moderate', confidence: 70, actionKgMin: 200, actionKgMax: 350, pickupAvailableTomorrow: true },
}

/** Price fields from the engine: mandi anchor, normal (min) and Market Maker (max) farmer prices. */
function withLivePrices(meta: CropMeta): CropIntel {
  const pricing = mandiBenchmarkService.pricingFor(meta.listingCrop) ?? mandiBenchmarkService.pricingFor(meta.crop)
  if (!pricing) throw new Error(`No benchmark for ${meta.crop}`)
  const { ladder, benchmark } = pricing
  const series = indicativeSeries(ladder.mandiPerKg)
  return {
    ...meta,
    mandi: ladder.mandiPerKg,
    direct: ladder.marketMakerFarmerPerKg,
    historical: series.historical,
    forecast: series.forecast,
    recommendedMin: ladder.kisanlinkNormalPerKg,
    recommendedMax: ladder.marketMakerFarmerPerKg,
    confidence: benchmark.source === 'agmarknet' && !benchmark.stale ? meta.confidence : Math.min(meta.confidence, 62),
    benchmark,
    ladder,
    aiContext: farmerAiContext(ladder, benchmark),
  }
}

const CROP_INTEL = new Proxy({} as Record<FarmerCrop, CropIntel>, { get: (_target, crop: FarmerCrop) => withLivePrices(CROP_META[crop]) })

export const FARMER_CROPS: FarmerCrop[] = ['Tomatoes', 'Potatoes', 'Onion', 'Spinach', 'Wheat', 'Carrots']

export function getCropIntel(crop: FarmerCrop): CropIntel { return CROP_INTEL[crop] }
export function listCropIntel(): CropIntel[] { return FARMER_CROPS.map((crop) => CROP_INTEL[crop]) }

function cropFromListingName(listingCrop: string): FarmerCrop | null {
  const match = FARMER_CROPS.find((crop) => CROP_META[crop].listingCrop === listingCrop || listingCrop.toLowerCase().includes(CROP_META[crop].crop.toLowerCase().slice(0, -1)))
  return match ?? null
}


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
    ? candidates.reduce((top, entry) => (CROP_META[entry.crop].demandIndex > CROP_META[top.crop].demandIndex ? entry : top))
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

/**
 * Feature 3 — Smart Price Advisor. The three anchors are the engine's normal, Market Maker and
 * stretch prices for the crop's live benchmark; only the sale-chance estimate is heuristic.
 */
export function getPriceOptions(listing: Pick<FarmerListing, 'crop' | 'mandiPricePerKg' | 'grade'>): PriceOption[] {
  const crop = cropFromListingName(listing.crop)
  const meta = crop ? CROP_META[crop] : null
  const pricing = mandiBenchmarkService.pricingFor(listing.crop)
  const ladder = pricing?.ladder ?? derivePriceLadder(listing.mandiPricePerKg > 0 ? listing.mandiPricePerKg : 24, listing.crop)
  return farmerPriceOptions(ladder, listing.grade, meta?.demandIndex ?? 65)
}

/**
 * Backend-backed variant of `getPriceOptions` — tries the real pricing intelligence
 * API first (deterministic price anchors computed from mandi/demand data server-side)
 * and falls back to the local deterministic table above if the request fails, so the
 * price advisor always has an answer regardless of backend availability.
 */
export async function fetchLivePriceOptions(listing: Pick<FarmerListing, 'crop' | 'mandiPricePerKg' | 'grade'>): Promise<PriceOption[]> {
  try {
    const res = await apiClient.getRecommendPrice(listing.crop, 100, listing.grade || 'Grade A', listing.mandiPricePerKg)
    if (res && res.options && res.options.length > 0) {
      type BackendPriceOption = { id: PriceOption['id']; price: number; label_key: string; hint_key: string; sale_chance_pct: number }
      return (res.options as BackendPriceOption[]).map((opt) => ({
        id: opt.id,
        price: opt.price,
        labelKey: opt.label_key,
        hintKey: opt.hint_key,
        saleChancePct: opt.sale_chance_pct,
      }))
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[KisanIntel] Price recommendation API call failed; using prototype fallback.', err)
    }
  }
  return getPriceOptions(listing)
}

/**
 * Backend-backed variant of `getCropIntel` — same fallback contract as
 * `fetchLivePriceOptions`.
 */
export async function fetchLiveCropIntel(crop: FarmerCrop): Promise<CropIntel> {
  try {
    const res = await apiClient.getCropForecast(crop)
    if (res && res.historical) {
      return {
        crop,
        cropHi: res.crop_hi || crop,
        listingCrop: `Fresh ${crop}`,
        listingCropHi: res.crop_hi || crop,
        mandi: res.mandi,
        direct: res.direct,
        historical: res.historical,
        forecast: res.forecast,
        demandIndex: res.demand_index,
        demandChangePct: res.demand_change_pct,
        nearbyDemandKg: res.nearby_demand_kg,
        buyerCount: res.buyer_count,
        volatility: res.volatility as Level,
        supplyPressure: res.supply_pressure as Level,
        confidence: res.confidence,
        recommendedMin: res.recommended_min,
        recommendedMax: res.recommended_max,
        actionKgMin: 300,
        actionKgMax: 500,
        pickupAvailableTomorrow: true,
        ...(res.ladder ? { ladder: ladderFromBackend(res.ladder), aiContext: farmerAiContext(ladderFromBackend(res.ladder), res.benchmark ? { source: res.benchmark.source, arrivalDate: res.benchmark.arrival_date, market: res.benchmark.market } : null) } : {}),
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[KisanIntel] Crop forecast API call failed; using prototype fallback.', err)
    }
  }
  return getCropIntel(crop)
}

type BackendLadder = Record<string, number>
const ladderFromBackend = (raw: BackendLadder): PriceLadder => ({
  mandiPerKg: raw.mandi_per_kg, kisanlinkNormalPerKg: raw.kisanlink_normal_per_kg, marketMakerFarmerPerKg: raw.market_maker_farmer_per_kg,
  marketMakerConsumerPerKg: raw.market_maker_consumer_per_kg, kisanlinkNormalConsumerPerKg: raw.kisanlink_normal_consumer_per_kg,
  localReferencePerKg: raw.local_reference_per_kg, farmerPremiumPerKg: raw.farmer_premium_per_kg, farmerPremiumPct: raw.farmer_premium_pct,
  normalOverMandiPerKg: raw.normal_over_mandi_per_kg, consumerSavingPerKg: raw.consumer_saving_per_kg, consumerSavingPct: raw.consumer_saving_pct,
  pooledPlatformFeePerKg: raw.pooled_platform_fee_per_kg, pooledFreightAllowancePerKg: raw.pooled_freight_allowance_per_kg, unpooledLogisticsPerKg: raw.unpooled_logistics_per_kg,
})

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
