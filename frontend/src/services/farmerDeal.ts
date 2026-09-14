import { assessFreshness, type Freshness } from './cropFreshness'
import { getCropIntel, listCropIntel, type CropIntel, type FarmerCrop } from './farmerAiService'
import type { MarketAllocation } from './marketMakerEngine'
import { marketMakerService, type MarketView } from './marketMakerService'
import { prototypeService } from './prototypeService'
import { derivePriceLadder, type PriceSourceMeta } from './pricingEngine'
import type { FarmerListing } from '../types'

/**
 * "बेहतर सौदा" — the farmer-facing read of the Market Maker.
 *
 * The engine in `marketMakerEngine.ts` is untouched and still computes everything it always
 * did: break-even volume, freight per kg, vehicle utilisation, delivered price, blockers.
 * None of that vocabulary belongs on a farmer's phone, so this module answers only the three
 * questions a farmer actually asks —
 *
 *   1. मुझे कितना मिलेगा?      -> pricePerKg
 *   2. मंडी से अच्छा है?        -> gainPerKg
 *   3. अब मुझे क्या करना है?    -> state + matchedKg
 *
 * — and keeps the reasoning available behind `factors` for the optional
 * "यह दाम कैसे तय हुआ?" disclosure. Deliberately no scores, no percentages, no stage names.
 */
export type DealState =
  /** Sold — orders, pickups and a route exist. */
  | 'sold'
  /** Enough buyers; the farmer's crop can move. */
  | 'ready'
  /** Still gathering buyers. */
  | 'forming'
  /** Demand exists but there is no vehicle. Nothing the farmer can do. */
  | 'noVehicle'

export interface DealFactor {
  id: 'mandi' | 'buyers' | 'demand' | 'vehicle'
  /** Dictionary key for the row label. */
  labelKey: string
  /** Dictionary key for the explanation, plus its values. */
  hintKey: string
  values: Record<string, string | number>
  /** Shown on the right of the row when there is a number worth showing. */
  value?: string
}

export interface FarmerDeal {
  boardId: string
  cropEn: string
  cropHi: string
  imageSrc: string
  visual: FarmerListing['visual']
  /** What this farmer is paid per kg if they sell into the deal. */
  pricePerKg: number
  /** What the mandi pays for the same crop today (live AGMARKNET benchmark). */
  mandiPerKg: number
  /** Provenance of `mandiPerKg`: source, market, date, stale. */
  mandiSource?: PriceSourceMeta
  /** pricePerKg − mandiPerKg, floored at 0. */
  gainPerKg: number
  /** Number of buyers who have already committed. */
  buyerCount: number
  /** Whether a vehicle can serve this farm. */
  hasVehicle: boolean
  state: DealState
  /** kg of this farmer's own crop already matched into the deal. */
  matchedKg: number
  /** kg of this farmer's crop held for the deal but not yet matched. */
  availableKg: number
  /** The listing this deal applies to, when the farmer has one for this crop. */
  listingId?: string
  factors: DealFactor[]
  /** Last 7 days and next 3, for the single plainly-labelled chart on /farmer/deal. */
  intel: CropIntel | null
  /** Kept so the detail page can still act on the board (offer more crop). */
  view: MarketView
  ownLotId?: string
}

/** Matches a board's crop to the deterministic crop-intelligence table, when one exists. */
function intelFor(cropName: string): CropIntel | null {
  const normalized = cropName.toLowerCase()
  return listCropIntel().find((intel) =>
    intel.listingCrop.toLowerCase() === normalized
    || normalized.includes(intel.crop.toLowerCase().replace(/e?s$/, ''))) ?? null
}

function stateOf(view: MarketView): DealState {
  if (view.board.status === 'created') return 'sold'
  if (view.math.blockers.some((blocker) => blocker.kind !== 'demand')) return 'noVehicle'
  return view.math.viable ? 'ready' : 'forming'
}

function factorsFor(view: MarketView, intel: CropIntel | null, cropLabelKey: { en: string; hi: string }): DealFactor[] {
  const { board, math } = view
  const factors: DealFactor[] = [
    {
      id: 'mandi',
      labelKey: 'mandiToday',
      hintKey: 'mandiTodayHint',
      values: { crop: cropLabelKey.en },
      value: `₹${board.mandiPricePerKg}`,
    },
    {
      id: 'buyers',
      labelKey: 'buyersNearby',
      hintKey: 'buyersNearbyHint',
      values: { count: math.participants, crop: cropLabelKey.en },
      value: String(math.participants),
    },
  ]
  if (intel) {
    factors.push({
      id: 'demand',
      labelKey: 'demandNearby',
      hintKey: 'demandNearbyHint',
      values: { tonnes: (intel.nearbyDemandKg / 1000).toFixed(1) },
    })
  }
  factors.push({
    id: 'vehicle',
    labelKey: 'vehicleAvailable',
    hintKey: math.vehicle ? 'vehicleAvailableHint' : 'vehicleUnavailable',
    values: {},
  })
  return factors
}

/**
 * The floor every Market Maker price must clear.
 *
 * `intel.recommendedMin` is the same number the sell flow offers as its own default ask and
 * the crop-card "suggested" badge reads — the safe price a farmer would set without KisanLink.
 * A board or corridor's farm-gate rate is a real input from that market's own buyers, so it is
 * never lowered here; it is only ever lifted to this floor, which stops a stale or
 * under-priced board from ever reading as *worse* than the plain, no-help suggestion right
 * next to it on screen. Without an intel row to anchor to, the centralized pricing engine's
 * normal price for that mandi benchmark stands in — the same rule every other surface uses.
 */
function priceFloorFor(mandiPerKg: number, intel: CropIntel | null): number {
  return intel ? intel.recommendedMin : derivePriceLadder(Math.max(1, mandiPerKg)).kisanlinkNormalPerKg
}

/**
 * The best open deal for this farmer.
 *
 * Preference order: a board whose crop the farmer is actually growing (so the deal is
 * actionable), then any open board (so the home still has something to show), then nothing.
 * Returns `null` rather than a placeholder — the UI has a real empty state for that.
 */
export async function getFarmerDeal(listings?: FarmerListing[]): Promise<FarmerDeal | null> {
  const [views, myListings] = await Promise.all([
    marketMakerService.boards(),
    listings ? Promise.resolve(listings) : prototypeService.getMyListings(),
  ])
  if (!views.length) return null

  const growing = new Set(myListings.filter((item) => item.status === 'active').map((item) => item.crop.toLowerCase()))
  const ownFirst = views.filter((view) => view.math.allocations.some((entry) => entry.lot.own))
  const matchingCrop = views.filter((view) => growing.has(view.board.crop.toLowerCase()))
  const view = ownFirst[0] ?? matchingCrop[0] ?? views[0]
  if (!view) return null

  const { board, math } = view
  const own = math.allocations.find((entry) => entry.lot.own)
  const intel = intelFor(board.crop)
  const listing = myListings.find((item) => item.crop.toLowerCase() === board.crop.toLowerCase())
  const pricePerKg = Math.max(math.farmerGatePerKg, priceFloorFor(board.mandiPricePerKg, intel))

  return {
    boardId: board.id,
    cropEn: board.crop,
    cropHi: board.cropHi,
    imageSrc: board.imageSrc,
    visual: board.visual,
    pricePerKg,
    mandiPerKg: board.mandiPricePerKg,
    mandiSource: board.mandiSource ?? intel?.benchmark,
    gainPerKg: Math.max(0, pricePerKg - board.mandiPricePerKg),
    buyerCount: math.participants,
    hasVehicle: Boolean(math.vehicle),
    state: stateOf(view),
    matchedKg: own?.allocatedKg ?? 0,
    availableKg: own?.availableKg ?? 0,
    listingId: listing?.id,
    factors: factorsFor(view, intel, { en: board.crop, hi: board.cropHi }),
    intel,
    view,
    ownLotId: own?.lot.id,
  }
}

/**
 * A suggested price for one of the farmer's own crops, used on the crop cards.
 *
 * Only returns a number when it genuinely beats what the farmer is asking today — a
 * "suggestion" equal to or below the current price is noise on a list.
 */
export function suggestedPriceFor(listing: FarmerListing, deal: FarmerDeal | null): number | null {
  if (deal && deal.cropEn.toLowerCase() === listing.crop.toLowerCase() && deal.pricePerKg > listing.pricePerKg) {
    return deal.pricePerKg
  }
  const intel = intelFor(listing.crop)
  if (intel && intel.recommendedMin > listing.pricePerKg) return intel.recommendedMin
  return null
}

/** Crop intelligence for a listing, for the "why this price" disclosure in the sell flow. */
export function cropIntelFor(cropName: string): CropIntel | null {
  return intelFor(cropName)
}

export { getCropIntel }
export type { FarmerCrop }

/* ---------------------------------------------------------------------------
 * Per-crop Market Maker
 * ---------------------------------------------------------------------------
 * `getFarmerDeal` above picks the single best deal for the farm, which is what the home's
 * task list and /farmer/deal need. Every crop card also needs its *own* answer, so this
 * second read walks the same boards per listing:
 *
 *   1. a single-crop board for this crop (Sonipat tomatoes)          -> 'board'
 *   2. a segment of a multi-crop regional corridor for this crop     -> 'board'
 *   3. the deterministic crop-intelligence table                     -> 'intel'
 *   4. nothing — the UI says so rather than inventing a number       -> null
 *
 * No value here is made up: prices, buyer counts and vehicles come from the engine's math,
 * and the fallback table is the same one the price advisor and forecast already use.
 */
export type CropDealSource = 'board' | 'intel'
export type PriceTrend = 'rising' | 'steady' | 'falling'

export interface CropDeal {
  listingId: string
  cropEn: string
  cropHi: string
  pricePerKg: number
  mandiPerKg: number
  mandiSource?: PriceSourceMeta
  gainPerKg: number
  buyerCount: number
  hasVehicle: boolean
  state: DealState
  /** kg of this listing already matched into a corridor. */
  matchedKg: number
  /** kg other farmers nearby have already put into the same corridor. 0 when no board exists. */
  pooledKg: number
  source: CropDealSource
  boardId?: string
  ownLotId?: string
  trend: PriceTrend | null
  intel: CropIntel | null
  freshness: Freshness
}

/**
 * Canonical crop keys so "Fresh Tomatoes", "Tomatoes" and "टमाटर" all land on `tomato`.
 * Generic pool segments ("Leafy Vegetables") deliberately do not absorb specific crops: a
 * spinach listing gets spinach numbers from the intelligence table rather than a pooled
 * greens floor that may sit below what the farmer is already asking.
 */
const CROP_KEYS: Array<{ key: string; match: string[] }> = [
  { key: 'tomato', match: ['tomato', 'टमाटर'] },
  { key: 'onion', match: ['onion', 'प्याज'] },
  { key: 'potato', match: ['potato', 'आलू'] },
  { key: 'spinach', match: ['spinach', 'palak', 'पालक'] },
  { key: 'leafy', match: ['leafy', 'हरी सब्ज़ी'] },
  { key: 'wheat', match: ['wheat', 'गेहू'] },
  { key: 'carrot', match: ['carrot', 'गाजर'] },
  { key: 'capsicum', match: ['capsicum', 'शिमला'] },
  { key: 'cucumber', match: ['cucumber', 'खीरा'] },
]

export function cropKeys(name: string): string[] {
  const lower = name.toLowerCase()
  const keys = CROP_KEYS.filter((entry) => entry.match.some((keyword) => lower.includes(keyword))).map((entry) => entry.key)
  return keys.length ? keys : [lower.trim()]
}

const sameCrop = (a: string, b: string) => {
  const keysA = cropKeys(a)
  return cropKeys(b).some((key) => keysA.includes(key))
}

function trendOf(intel: CropIntel | null): PriceTrend | null {
  if (!intel) return null
  const today = intel.historical[intel.historical.length - 1]
  const ahead = intel.forecast[intel.forecast.length - 1]
  return ahead > today ? 'rising' : ahead < today ? 'falling' : 'steady'
}

/** Supply other farmers have already pooled into a corridor, excluding this farmer's own lot. */
function pooledKgOf(allocations: MarketAllocation[]): number {
  return Math.round(allocations.filter((entry) => !entry.lot.own).reduce((sum, entry) => sum + entry.allocatedKg, 0))
}

function dealFromBoard(listing: FarmerListing, view: MarketView, intel: CropIntel | null): CropDeal {
  const { board, math } = view
  const own = math.allocations.find((entry) => entry.lot.own && (entry.lot.listingId === listing.id || !entry.lot.listingId))
  const pricePerKg = Math.max(math.farmerGatePerKg, priceFloorFor(board.mandiPricePerKg, intel))
  return {
    listingId: listing.id,
    cropEn: listing.crop, cropHi: listing.cropHi,
    pricePerKg,
    mandiPerKg: board.mandiPricePerKg,
    mandiSource: board.mandiSource ?? listing.mandiSource ?? intel?.benchmark,
    gainPerKg: Math.max(0, pricePerKg - board.mandiPricePerKg),
    buyerCount: math.participants,
    hasVehicle: Boolean(math.vehicle),
    state: stateOf(view),
    matchedKg: own?.allocatedKg ?? 0,
    pooledKg: pooledKgOf(math.allocations),
    source: 'board',
    boardId: board.id,
    ownLotId: own?.lot.id,
    trend: trendOf(intel),
    intel,
    freshness: assessFreshness(listing),
  }
}

function dealFromSegment(listing: FarmerListing, view: MarketView, intel: CropIntel | null): CropDeal | null {
  const segment = view.math.multiCropMath?.cropMaths.find((crop) => sameCrop(crop.segment.crop, listing.crop))
  if (!segment) return null
  const own = segment.allocations.find((entry) => entry.lot.own)
  const blocked = view.math.blockers.some((blocker) => blocker.kind !== 'demand')
  const pricePerKg = Math.max(segment.farmerFloorPerKg, priceFloorFor(segment.mandiPricePerKg, intel))
  return {
    listingId: listing.id,
    cropEn: listing.crop, cropHi: listing.cropHi,
    pricePerKg,
    mandiPerKg: segment.mandiPricePerKg,
    mandiSource: segment.segment.mandiSource ?? listing.mandiSource ?? intel?.benchmark,
    gainPerKg: Math.max(0, pricePerKg - segment.mandiPricePerKg),
    buyerCount: segment.segment.commitments.length,
    hasVehicle: Boolean(view.math.vehicle),
    state: view.board.status === 'created' ? 'sold' : blocked ? 'noVehicle' : segment.viable ? 'ready' : 'forming',
    matchedKg: own?.allocatedKg ?? 0,
    pooledKg: pooledKgOf(segment.allocations),
    source: 'board',
    boardId: view.board.id,
    ownLotId: own?.lot.id,
    trend: trendOf(intel),
    intel,
    freshness: assessFreshness(listing),
  }
}

/**
 * No board covers this crop, so the deterministic intelligence table answers on its own.
 * `recommendedMin` is the base/no-help price (see `priceFloorFor`); `recommendedMax` is the
 * same table's own upper end for this crop, offered only when the two real signals a farmer
 * would actually check — buyers already interested, a vehicle actually free tomorrow — both
 * hold. Never a flat "+₹2/+₹3": the premium is whatever this crop's own row already says its
 * ceiling is, and it collapses back to the base the moment either signal is missing.
 */
function dealFromIntel(listing: FarmerListing, intel: CropIntel): CropDeal {
  const supported = intel.buyerCount > 0 && intel.pickupAvailableTomorrow
  const pricePerKg = supported ? intel.recommendedMax : intel.recommendedMin
  const mandiPerKg = listing.mandiPricePerKg || intel.mandi
  return {
    listingId: listing.id,
    cropEn: listing.crop, cropHi: listing.cropHi,
    pricePerKg,
    mandiPerKg,
    mandiSource: listing.mandiSource ?? intel.benchmark,
    gainPerKg: Math.max(0, pricePerKg - mandiPerKg),
    buyerCount: intel.buyerCount,
    hasVehicle: intel.pickupAvailableTomorrow,
    state: intel.pickupAvailableTomorrow ? 'ready' : 'forming',
    matchedKg: 0,
    pooledKg: 0,
    source: 'intel',
    trend: trendOf(intel),
    intel,
    freshness: assessFreshness(listing),
  }
}

/** The Market Maker's answer for one crop, or `null` when nothing real applies. */
export function cropDealFrom(listing: FarmerListing, views: MarketView[]): CropDeal | null {
  const intel = intelFor(listing.crop)
  const single = views.filter((view) => !view.board.isMultiCrop && sameCrop(view.board.crop, listing.crop))
  const ownSingle = single.find((view) => view.math.allocations.some((entry) => entry.lot.own))
  const board = ownSingle ?? single[0]
  if (board) return dealFromBoard(listing, board, intel)

  for (const view of views) {
    if (!view.board.isMultiCrop) continue
    const deal = dealFromSegment(listing, view, intel)
    if (deal) return deal
  }

  return intel ? dealFromIntel(listing, intel) : null
}

export async function getCropDeal(listing: FarmerListing): Promise<CropDeal | null> {
  return cropDealFrom(listing, await marketMakerService.boards())
}

/** One pass over the boards for a whole crop list; keyed by listing id. */
export async function getCropDeals(listings: FarmerListing[]): Promise<Record<string, CropDeal | null>> {
  const views = await marketMakerService.boards()
  return Object.fromEntries(listings.map((listing) => [listing.id, cropDealFrom(listing, views)]))
}

/* ---------------------------------------------------------------------------
 * "बेहतर सौदा" while listing
 * ---------------------------------------------------------------------------
 * The sell flow shows the Market Maker as an *optional* opportunity beside the form, never as
 * the way a price gets chosen. This reads a `CropDeal` against the price a plain listing
 * would fetch and answers only: is there a deal, is it ready, and what is it worth.
 */
export type SellOpportunityStatus =
  /** Nothing real applies to this crop, or the deal is no better than a normal listing. */
  | 'none'
  /** Buyers or a vehicle are still being gathered; the price may still improve. */
  | 'forming'
  /** Buyers committed and a vehicle is available; the price can be taken now. */
  | 'ready'

export interface SellOpportunity {
  status: SellOpportunityStatus
  deal: CropDeal
  /** What a normal listing fetches: the engine's normal price for this crop. */
  normalPerKg: number
  /** What the deal pays this farmer. */
  dealPerKg: number
  gainPerKg: number
  /** gainPerKg × quantity, so the farmer sees the rupees, not only the rate. */
  extraTotal: number
}

/** The price a plain listing gets: the engine's normal price, or the crop-intel floor. */
export function normalPriceFor(listing: Pick<FarmerListing, 'crop' | 'mandiPricePerKg'>, deal: CropDeal | null): number {
  const intel = deal?.intel ?? intelFor(listing.crop)
  return Math.round(priceFloorFor(listing.mandiPricePerKg || deal?.mandiPerKg || 1, intel))
}

export function sellOpportunityFrom(listing: FarmerListing, deal: CropDeal | null): SellOpportunity | null {
  if (!deal) return null
  const normalPerKg = normalPriceFor(listing, deal)
  const dealPerKg = Math.round(deal.pricePerKg)
  const gainPerKg = Math.max(0, dealPerKg - normalPerKg)
  const ready = (deal.state === 'ready' || deal.state === 'sold') && deal.hasVehicle
  const status: SellOpportunityStatus = ready && gainPerKg > 0 ? 'ready'
    : ready ? 'none'
      : (deal.buyerCount > 0 || deal.pooledKg > 0) ? 'forming'
        : 'none'
  return { status, deal, normalPerKg, dealPerKg, gainPerKg, extraTotal: gainPerKg * listing.quantityKg }
}

export async function getSellOpportunity(listing: FarmerListing): Promise<SellOpportunity | null> {
  return sellOpportunityFrom(listing, await getCropDeal(listing))
}
