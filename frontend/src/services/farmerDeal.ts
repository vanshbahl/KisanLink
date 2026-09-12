import { getCropIntel, listCropIntel, type CropIntel, type FarmerCrop } from './farmerAiService'
import { marketMakerService, type MarketView } from './marketMakerService'
import { prototypeService } from './prototypeService'
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
  /** What the mandi pays for the same crop today. */
  mandiPerKg: number
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

  return {
    boardId: board.id,
    cropEn: board.crop,
    cropHi: board.cropHi,
    imageSrc: board.imageSrc,
    visual: board.visual,
    pricePerKg: math.farmerGatePerKg,
    mandiPerKg: board.mandiPricePerKg,
    gainPerKg: Math.max(0, math.farmerGatePerKg - board.mandiPricePerKg),
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
