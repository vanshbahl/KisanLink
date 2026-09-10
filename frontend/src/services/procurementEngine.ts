import { farmers } from '../data/farmers'
import { distanceKm, placeById, resolvePlace } from '../data/geo'
import { daysUntil, localDay } from '../utils/dates'
import type { FarmerListing, ProcurementPlan, ProcurementStop, RfqPackaging, Vehicle } from '../types'

/**
 * KisanLink Market Maker — procurement side.
 *
 * A bulk requirement rarely matches one farm. The interesting question is not "who has
 * tomatoes" (a search) but "which combination of farms, on one vehicle, on one road, at
 * prices each farmer already asked for, lands this requirement under what the buyer pays
 * today" (a construction). This module answers the second question.
 *
 * Nothing here is predicted. Given the listings, the fleet and the requirement, the same
 * inputs always produce the same deal — which is what makes it demonstrable, and what makes
 * the "why did this match?" panel possible at all.
 *
 * The construction runs in five passes:
 *   1. eligibility  — crop, grade, stock, and a farm the map can actually route to
 *   2. ordering     — cheapest first, then nearest, because price is the buyer's ask and
 *                     distance is what the pooled trip pays for
 *   3. allocation   — fill the requirement, never over-draw a farm's remaining stock
 *   4. routing      — sequence the chosen farms north-to-south into the hub, then the buyer
 *   5. economics    — landed cost against the buyer's current chain, and farmer uplift
 */

const BUYER_DESTINATION = 'okhla_dc'
const HUB = 'sonipat_hub'

/**
 * Pooled road freight, per kilogram-kilometre. A dedicated part-load trip in this corridor is
 * far dearer than this; the whole point of pooling farm collections onto one southbound run
 * is that the buyer pays the marginal cost of their tonnage rather than a whole trip.
 */
const FREIGHT_PER_KG_KM = 0.014
/** Loading, paperwork and the driver's time at each farm gate. */
const FREIGHT_PER_STOP = 250
/** No trip is dispatched below this, however small the load. */
const MIN_DISPATCH = 2500
/** Handling at the consolidation hub, per kg: sorting, re-crating, weighing. */
const HANDLING_PER_KG = 0.35
const PLATFORM_PCT = 0.02
/**
 * What the same produce costs the buyer today, as a multiple of the mandi rate: the
 * commission agent, the wholesaler's margin and the buyer's own lift from the mandi to their
 * dock. Applied to the mandi price the farmers themselves quote, so the comparison is against
 * numbers already visible elsewhere in the prototype.
 */
const TRADITIONAL_CHAIN_MULTIPLE = 1.55

const round2 = (value: number) => Math.round(value * 100) / 100
const iso = localDay

export interface ProcurementRequest {
  crop: string
  grade: FarmerListing['grade']
  requiredQuantityKg: number
  targetPrice: number
  deliveryLocation: string
  requiredBy: string
  deliverySlot: string
  packaging: RfqPackaging
}

/** Loose crop matching: "Tomatoes" must find "Fresh Tomatoes", "Onions" must find "Red Onions". */
const cropMatches = (listingCrop: string, wanted: string) => {
  const norm = (value: string) => value.toLowerCase().replace(/\b(fresh|baby|new|sweet|crisp|green|red|snow)\b/g, '').replace(/[^a-z]/g, '')
  const a = norm(listingCrop)
  const b = norm(wanted)
  if (!a || !b) return false
  const stem = (value: string) => (value.endsWith('es') ? value.slice(0, -2) : value.endsWith('s') ? value.slice(0, -1) : value)
  return stem(a) === stem(b) || a.includes(stem(b)) || b.includes(stem(a))
}

const gradeRank = (grade: FarmerListing['grade']) => (grade === 'Grade A+' ? 2 : 1)

/**
 * The pooled collection run, ordered by how a driver would actually drive it: farthest farm
 * first, then progressively back towards the consolidation hub. That is what makes one trip
 * cheaper than three, so it is also what the map draws.
 */
function sequenceStops(chosen: Array<{ listing: FarmerListing; quantityKg: number }>) {
  const hub = placeById(HUB)!
  return [...chosen]
    .map((entry) => ({ ...entry, place: resolvePlace(entry.listing.farm) }))
    .sort((a, b) => {
      const da = a.place ? distanceKm(a.place, hub) : 0
      const db = b.place ? distanceKm(b.place, hub) : 0
      return db - da
    })
}

export function buildProcurementPlan(
  request: ProcurementRequest,
  listings: FarmerListing[],
  vehicles: Vehicle[],
): ProcurementPlan {
  const rejected: ProcurementPlan['rejected'] = []
  const hub = placeById(HUB)!
  const destination = resolvePlace(request.deliveryLocation) ?? placeById(BUYER_DESTINATION)!

  // --- 1. Eligibility -----------------------------------------------------------------
  const eligible: FarmerListing[] = []
  for (const listing of listings) {
    if (listing.status !== 'active') continue
    if (!cropMatches(listing.crop, request.crop)) continue
    if (listing.remainingKg <= 0) { rejected.push({ farm: listing.farm, reason: 'No stock left on this listing' }); continue }
    if (gradeRank(listing.grade) < gradeRank(request.grade)) { rejected.push({ farm: listing.farm, reason: `${listing.grade} is below the requested ${request.grade}` }); continue }
    if (!resolvePlace(listing.farm)) { rejected.push({ farm: listing.farm, reason: 'Farm is outside the mapped collection corridor' }); continue }
    eligible.push(listing)
  }

  // --- 2. Ordering: the farmer's own asking price first, then the shortest detour -------
  const ranked = [...eligible].sort((a, b) => {
    if (a.pricePerKg !== b.pricePerKg) return a.pricePerKg - b.pricePerKg
    const pa = resolvePlace(a.farm)!
    const pb = resolvePlace(b.farm)!
    return distanceKm(pa, hub) - distanceKm(pb, hub)
  })

  // --- 3. Allocation -------------------------------------------------------------------
  let remaining = request.requiredQuantityKg
  const chosen: Array<{ listing: FarmerListing; quantityKg: number }> = []
  for (const listing of ranked) {
    if (remaining <= 0) { rejected.push({ farm: listing.farm, reason: 'Requirement already filled by nearer or better-priced farms' }); continue }
    const take = Math.min(listing.remainingKg, remaining)
    if (take <= 0) continue
    chosen.push({ listing, quantityKg: take })
    remaining -= take
  }

  const matchedKg = chosen.reduce((sum, entry) => sum + entry.quantityKg, 0)
  const shortfallKg = Math.max(0, request.requiredQuantityKg - matchedKg)

  // --- 4. Routing ----------------------------------------------------------------------
  const sequenced = sequenceStops(chosen)
  let routeDistanceKm = 0
  let cursor = sequenced[0]?.place ?? hub
  for (let index = 1; index < sequenced.length; index += 1) {
    const next = sequenced[index].place
    if (next) { routeDistanceKm += distanceKm(cursor, next); cursor = next }
  }
  routeDistanceKm += distanceKm(cursor, hub) + distanceKm(hub, destination)

  const pickupWindows = ['4–5 PM', '5–6 PM', '6–7 PM', '7–8 PM']
  const pickupDate = request.requiredBy ? iso(Math.max(0, daysUntil(request.requiredBy) - 1)) : iso(0)
  const stops: ProcurementStop[] = sequenced.map((entry, index) => ({
    farmer: farmerNameFor(entry.listing),
    farm: entry.listing.farm,
    listingId: entry.listing.id,
    location: entry.place ? entry.place.district : entry.listing.farm,
    quantityKg: entry.quantityKg,
    ratePerKg: entry.listing.pricePerKg,
    sequence: index + 1,
    detourKm: entry.place ? distanceKm(entry.place, hub) : 0,
    pickupWindow: `${index === 0 ? 'Collection day' : 'Then'} · ${pickupWindows[Math.min(index, pickupWindows.length - 1)]}`,
  }))

  // --- 5. Vehicle & economics ----------------------------------------------------------
  const usable = vehicles.filter((vehicle) => vehicle.status !== 'maintenance')
  const sufficient = usable.filter((vehicle) => vehicle.capacityKg >= matchedKg)
  // Smallest vehicle that still carries the whole load: freight scales with vehicle class,
  // so over-sizing the truck is money taken straight out of the saving.
  const vehicle = sufficient.sort((a, b) => a.capacityKg - b.capacityKg)[0]
    ?? [...usable].sort((a, b) => b.capacityKg - a.capacityKg)[0]
    ?? null

  const capacityKg = vehicle?.capacityKg ?? 0
  const freight = vehicle
    ? Math.round(Math.max(MIN_DISPATCH, matchedKg * routeDistanceKm * FREIGHT_PER_KG_KM) + stops.length * FREIGHT_PER_STOP)
    : 0
  const handling = Math.round(matchedKg * HANDLING_PER_KG)
  const logisticsCost = freight + handling

  const produceValue = Math.round(chosen.reduce((sum, entry) => sum + entry.quantityKg * entry.listing.pricePerKg, 0))
  const weightedRatePerKg = matchedKg ? round2(produceValue / matchedKg) : 0
  const platformFee = Math.round(produceValue * PLATFORM_PCT)
  const landedTotal = produceValue + logisticsCost + platformFee
  const landedPerKg = matchedKg ? round2(landedTotal / matchedKg) : 0

  // What the buyer pays today: the mandi rate plus the wholesaler and transport margin that
  // sits between the mandi and their dock. Read from the listings, not invented.
  const avgMandi = matchedKg
    ? chosen.reduce((sum, entry) => sum + entry.quantityKg * entry.listing.mandiPricePerKg, 0) / matchedKg
    : 0
  const benchmarkPerKg = round2(avgMandi * TRADITIONAL_CHAIN_MULTIPLE)
  const benchmarkTotal = Math.round(benchmarkPerKg * matchedKg)
  const savingTotal = benchmarkTotal - landedTotal
  const savingPct = benchmarkTotal ? round2((savingTotal / benchmarkTotal) * 100) : 0

  const farmerUpliftPerKg = round2(weightedRatePerKg - avgMandi)
  const farmerUpliftTotal = Math.round(farmerUpliftPerKg * matchedKg)

  const blockers: string[] = []
  if (!vehicle) blockers.push('No vehicle in the fleet is available for this corridor.')
  else if (matchedKg > capacityKg) blockers.push(`${matchedKg.toLocaleString('en-IN')} kg exceeds the largest available vehicle (${capacityKg.toLocaleString('en-IN')} kg). This would need two trips.`)
  if (shortfallKg > 0) blockers.push(`${shortfallKg.toLocaleString('en-IN')} kg of the requirement is unmatched — corridor supply is short.`)
  if (matchedKg > 0 && landedPerKg > request.targetPrice + 2) blockers.push(`Landed cost ₹${landedPerKg.toFixed(2)}/kg is above the ₹${request.targetPrice}/kg target.`)

  const feasible = Boolean(vehicle) && matchedKg > 0 && matchedKg <= capacityKg && shortfallKg === 0

  const routeDurationMinutes = Math.round(routeDistanceKm * 1.35 + stops.length * 25 + 30)
  const fillPct = request.requiredQuantityKg ? Math.min(100, Math.round((matchedKg / request.requiredQuantityKg) * 100)) : 0

  // Confidence is the fill rate, the headroom against the target price, and how spread the
  // load is — a deal resting on one farm is more fragile than the same deal across three.
  const concentration = matchedKg ? Math.max(...chosen.map((entry) => entry.quantityKg), 0) / matchedKg : 1
  const confidence = Math.max(45, Math.min(96, Math.round(
    48
    + fillPct * 0.32
    + (landedPerKg && landedPerKg <= request.targetPrice ? 12 : 0)
    + (feasible ? 8 : 0)
    + (1 - concentration) * 14,
  )))

  const rationale: string[] = []
  if (chosen.length > 1) rationale.push(`No single farm could cover ${request.requiredQuantityKg.toLocaleString('en-IN')} kg. ${chosen.length} farms in one corridor can, so the requirement was split across them at each farmer's own asking rate.`)
  else if (chosen.length === 1) rationale.push(`${chosen[0].listing.farm} alone holds enough ${request.crop.toLowerCase()} at the requested grade, so no pooling is needed.`)
  if (vehicle && stops.length > 1) rationale.push(`All ${stops.length} farms sit on one ${routeDistanceKm} km southbound road into the Sonipat hub, so a single ${vehicle.type.toLowerCase()} collects the whole load instead of ${stops.length} separate trips.`)
  if (farmerUpliftPerKg > 0) rationale.push(`Every farm is paid its listed rate — ₹${weightedRatePerKg.toFixed(2)}/kg on average, ₹${farmerUpliftPerKg.toFixed(2)}/kg above the mandi price they would otherwise take.`)
  if (savingTotal > 0) rationale.push(`Removing the mandi and wholesaler margin leaves ₹${landedPerKg.toFixed(2)}/kg landed against ₹${benchmarkPerKg.toFixed(2)}/kg through the current chain.`)
  if (!rationale.length) rationale.push('This requirement could not be constructed from the supply currently listed in the corridor.')

  return {
    requiredKg: request.requiredQuantityKg,
    matchedKg,
    shortfallKg,
    fillPct,
    stops,
    rejected: rejected.slice(0, 4),
    produceValue,
    weightedRatePerKg,
    logisticsCost,
    platformFee,
    landedTotal,
    landedPerKg,
    benchmarkPerKg,
    benchmarkTotal,
    savingTotal,
    savingPct,
    farmerUpliftPerKg,
    farmerUpliftTotal,
    routeDistanceKm,
    routeDurationMinutes,
    vehicle,
    capacityKg,
    utilisationPct: capacityKg ? Math.round((matchedKg / capacityKg) * 100) : 0,
    feasible,
    blockers,
    pickupDate,
    consolidationAt: `${pickupDate} · 8–10 PM`,
    estimatedDelivery: `${request.requiredBy} · ${request.deliverySlot}`,
    confidence,
    rationale,
  }
}

/** Listings carry the farm name; the grower's name lives in the farmer directory. */
function farmerNameFor(listing: FarmerListing) {
  return farmerLookup[listing.farm] ?? farmerLookup[listing.farmerId] ?? 'Verified farmer'
}

const farmerLookup: Record<string, string> = Object.fromEntries(
  farmers.flatMap((farmer) => [[farmer.farmName, farmer.name], [farmer.id, farmer.name]]),
)
