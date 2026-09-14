import { cropIntelFor, cropKeys, normalPriceFor, pooledKgOf, priceFloorFor, sameCrop } from './farmerDeal'
import type { CropSegmentMath } from './marketMakerEngine'
import { marketMakerService, type MarketView } from './marketMakerService'
import { prototypeService } from './prototypeService'
import type { PriceSourceMeta } from './pricingEngine'
import type { FarmerListing, FarmerProfileData, MarketSupplyLot } from '../types'

/**
 * "बेहतर सौदा" as a marketplace: every open deal a farmer could sell into, ranked for them.
 *
 * `farmerDeal.ts` answers per crop ("is there a deal for *this* listing?"). This module answers
 * the other question a farmer asks — "what better deals are open for me right now?" — by
 * walking every Market Maker board and multi-crop segment and turning each one with real
 * buyer demand into one `Opportunity`. The shape is deliberately not Market Maker specific:
 * `kind` says where a row came from, and everything the list renders (crop, kg needed,
 * ₹/kg, earning, uplift, where the truck goes, status) is meaningful for any future source
 * (a bulk RFQ, a consumer pool, a rescue buyer) without the screen changing.
 *
 * Nothing here invents a number. Prices are the engine's farm-gate rate lifted to the same
 * floor every other surface uses; demand, pooled supply and vehicles are the engine's math.
 */
export type OpportunityKind = 'marketMaker'

export type OpportunityStatus =
  /** Enough buyers and a vehicle: the farmer can take this price now. */
  | 'ready'
  /** Buyers have committed more than nearby farms have offered, so supply is what is missing. */
  | 'highDemand'
  /** Buyers or a vehicle are still gathering. */
  | 'forming'

/**
 * One reason a row ranks where it does. Kept as data so the list can show it ("You grow
 * this") and so a real relevance model can replace the weights without touching the UI.
 */
export interface RelevanceSignal {
  id: 'ownLot' | 'growing' | 'nearby' | 'ready' | 'gain' | 'highDemand'
  weight: number
}

export interface Opportunity {
  id: string
  kind: OpportunityKind
  cropEn: string
  cropHi: string
  imageSrc: string
  visual: FarmerListing['visual']
  /** kg buyers have committed to on this deal. */
  neededKg: number
  /** What this farmer is paid per kg if they sell into the deal. */
  offeredPerKg: number
  /** What a normal listing of the same crop fetches. */
  normalPerKg: number
  gainPerKg: number
  /** The quantity the earning estimate assumes: the farmer's own listed crop capped at the deal's demand, else the demand itself. */
  baseKg: number
  /** True when `baseKg` is the farmer's own listed stock. */
  baseIsOwn: boolean
  earnTotal: number
  extraTotal: number
  status: OpportunityStatus
  buyerCount: number
  pooledKg: number
  hasVehicle: boolean
  corridor: string
  corridorHi: string
  destination: string
  deliveryWindow: string
  mandiSource?: PriceSourceMeta
  /** The farmer's own listing for this crop, when one is live. */
  listingId?: string
  ownLotId?: string
  boardId: string
  segmentId?: string
  relevance: number
  signals: RelevanceSignal[]
}

export interface OpportunitySummary {
  count: number
  readyCount: number
  /** Largest ₹/kg uplift across the open deals; 0 when none beats a normal listing. */
  bestGainPerKg: number
}

/** Weights are provisional; a served relevance score would replace `rank`, not the screen. */
const WEIGHTS: Record<RelevanceSignal['id'], number> = {
  ownLot: 50,
  growing: 30,
  nearby: 20,
  ready: 15,
  highDemand: 8,
  gain: 1,
}

interface FarmerContext {
  listings: FarmerListing[]
  profile: FarmerProfileData
}

const lower = (value: string) => value.trim().toLowerCase()

/** The farmer's live listing for a crop, if any; drafts do not count as stock on offer. */
function ownListingFor(cropName: string, listings: FarmerListing[]): FarmerListing | undefined {
  return listings.find((item) => item.status === 'active' && item.remainingKg > 0 && sameCrop(item.crop, cropName))
}

function nearFarmer(view: MarketView, lots: MarketSupplyLot[], profile: FarmerProfileData): boolean {
  const district = lower(profile.district || '')
  const village = lower(profile.village || '')
  const places = [
    view.board.corridor, view.board.destination,
    ...(view.board.regions ?? []).flatMap((region) => [region.name, region.district ?? '']),
    ...lots.map((lot) => lot.location),
  ].map(lower)
  return Boolean(district) && places.some((place) => place.includes(district) || (village && place.includes(village)))
}

function rank(signals: RelevanceSignal[]): number {
  return signals.reduce((sum, signal) => sum + signal.weight, 0)
}

function statusOf(input: { viable: boolean; hasVehicle: boolean; blocked: boolean; neededKg: number; offeredKg: number; sold: boolean }): OpportunityStatus {
  if (input.sold || (input.viable && input.hasVehicle && !input.blocked)) return 'ready'
  if (input.neededKg > input.offeredKg) return 'highDemand'
  return 'forming'
}

/** Shared tail of both builders: prices, earnings and ranking from the numbers each source read. */
function finish(input: {
  id: string
  view: MarketView
  segmentId?: string
  cropEn: string
  cropHi: string
  imageSrc: string
  visual: FarmerListing['visual']
  farmerGatePerKg: number
  mandiPerKg: number
  mandiSource?: PriceSourceMeta
  neededKg: number
  offeredKg: number
  buyerCount: number
  lots: MarketSupplyLot[]
  allocations: Parameters<typeof pooledKgOf>[0]
  viable: boolean
  context: FarmerContext
}): Opportunity | null {
  const { view, context } = input
  if (input.neededKg <= 0) return null

  const intel = cropIntelFor(input.cropEn)
  const offeredPerKg = Math.round(Math.max(input.farmerGatePerKg, priceFloorFor(input.mandiPerKg, intel)))
  const normalPerKg = normalPriceFor({ crop: input.cropEn, mandiPricePerKg: input.mandiPerKg }, null)
  const gainPerKg = Math.max(0, offeredPerKg - normalPerKg)

  const listing = ownListingFor(input.cropEn, context.listings)
  const own = input.allocations.find((entry) => entry.lot.own)
  const baseKg = Math.round(listing ? Math.min(listing.remainingKg, input.neededKg) : input.neededKg)
  const hasVehicle = Boolean(view.math.vehicle)
  const blocked = view.math.blockers.some((blocker) => blocker.kind !== 'demand')
  const status = statusOf({ viable: input.viable, hasVehicle, blocked, neededKg: input.neededKg, offeredKg: input.offeredKg, sold: view.board.status === 'created' })

  const signals: RelevanceSignal[] = []
  if (own) signals.push({ id: 'ownLot', weight: WEIGHTS.ownLot })
  if (listing || context.listings.some((item) => sameCrop(item.crop, input.cropEn))) signals.push({ id: 'growing', weight: WEIGHTS.growing })
  if (nearFarmer(view, input.lots, context.profile)) signals.push({ id: 'nearby', weight: WEIGHTS.nearby })
  if (status === 'ready') signals.push({ id: 'ready', weight: WEIGHTS.ready })
  if (status === 'highDemand') signals.push({ id: 'highDemand', weight: WEIGHTS.highDemand })
  if (gainPerKg > 0) signals.push({ id: 'gain', weight: WEIGHTS.gain * gainPerKg })

  return {
    id: input.id,
    kind: 'marketMaker',
    cropEn: input.cropEn, cropHi: input.cropHi, imageSrc: input.imageSrc, visual: input.visual,
    neededKg: Math.round(input.neededKg),
    offeredPerKg, normalPerKg, gainPerKg,
    baseKg, baseIsOwn: Boolean(listing),
    earnTotal: offeredPerKg * baseKg,
    extraTotal: gainPerKg * baseKg,
    status,
    buyerCount: input.buyerCount,
    pooledKg: pooledKgOf(input.allocations),
    hasVehicle,
    corridor: view.board.corridor, corridorHi: view.board.corridorHi,
    destination: view.board.destination, deliveryWindow: view.board.deliveryWindow,
    mandiSource: input.mandiSource ?? intel?.benchmark,
    listingId: listing?.id,
    ownLotId: own?.lot.id,
    boardId: view.board.id,
    segmentId: input.segmentId,
    relevance: rank(signals),
    signals,
  }
}

function fromBoard(view: MarketView, context: FarmerContext): Opportunity | null {
  const { board, math } = view
  return finish({
    id: `marketMaker:${board.id}`,
    view, context,
    cropEn: board.crop, cropHi: board.cropHi, imageSrc: board.imageSrc, visual: board.visual,
    farmerGatePerKg: math.farmerGatePerKg, mandiPerKg: board.mandiPricePerKg, mandiSource: board.mandiSource,
    neededKg: math.committedKg, offeredKg: math.offeredKg,
    buyerCount: math.participants,
    lots: board.lots, allocations: math.allocations,
    viable: math.viable,
  })
}

function fromSegment(view: MarketView, crop: CropSegmentMath, context: FarmerContext): Opportunity | null {
  const { segment } = crop
  return finish({
    id: `marketMaker:${view.board.id}:${segment.id}`,
    view, context, segmentId: segment.id,
    cropEn: segment.crop, cropHi: segment.cropHi, imageSrc: segment.imageSrc, visual: segment.visual ?? view.board.visual,
    farmerGatePerKg: crop.farmerFloorPerKg, mandiPerKg: crop.mandiPricePerKg, mandiSource: segment.mandiSource,
    neededKg: crop.committedKg, offeredKg: crop.offeredKg,
    buyerCount: segment.commitments.length,
    lots: segment.lots, allocations: crop.allocations,
    viable: crop.viable,
  })
}

/** Every open deal on the boards, most relevant to this farmer first. Pure, for tests. */
export function opportunitiesFrom(views: MarketView[], context: FarmerContext): Opportunity[] {
  const rows: Opportunity[] = []
  for (const view of views) {
    if (view.board.isMultiCrop && view.math.multiCropMath) {
      for (const crop of view.math.multiCropMath.cropMaths) {
        const row = fromSegment(view, crop, context)
        if (row) rows.push(row)
      }
    } else if (!view.board.isMultiCrop) {
      const row = fromBoard(view, context)
      if (row) rows.push(row)
    }
  }
  return rows.sort((a, b) => b.relevance - a.relevance || b.gainPerKg - a.gainPerKg || b.neededKg - a.neededKg)
}

async function contextFor(listings?: FarmerListing[]): Promise<FarmerContext> {
  const [mine, profile] = await Promise.all([
    listings ? Promise.resolve(listings) : prototypeService.getMyListings(),
    prototypeService.getProfile(),
  ])
  return { listings: mine, profile }
}

export async function getOpportunities(listings?: FarmerListing[]): Promise<Opportunity[]> {
  const [views, context] = await Promise.all([marketMakerService.boards(), contextFor(listings)])
  return opportunitiesFrom(views, context)
}

export function summarize(rows: Opportunity[]): OpportunitySummary {
  return {
    count: rows.length,
    readyCount: rows.filter((row) => row.status === 'ready').length,
    bestGainPerKg: rows.reduce((best, row) => Math.max(best, row.gainPerKg), 0),
  }
}

/** The three numbers the compact entry points show. */
export async function getOpportunitySummary(listings?: FarmerListing[]): Promise<OpportunitySummary> {
  return summarize(await getOpportunities(listings))
}

/** Opportunities for one crop first, used when the farmer is already selling something. */
export function forCrop(rows: Opportunity[], cropName: string): Opportunity[] {
  const keys = cropKeys(cropName)
  return rows.filter((row) => cropKeys(row.cropEn).some((key) => keys.includes(key)))
}
