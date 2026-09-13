import type { Delivery, LogisticsPickup, LogisticsRoute, RouteStop, Vehicle } from '../types'
import type { MarketView } from './marketMakerService'
import { logisticsService } from './logisticsService'

export type LogisticsFactor = { label: string; value: string }
export type LogisticsInsight = {
  title: string
  recommendation: string
  /** One short supporting line shown under the recommendation. */
  reason?: string
  /** Short verdict chip, e.g. "Dispatch now" or "Wait". */
  verdict?: string
  confidence: number
  factors: LogisticsFactor[]
  note?: string
  ctaLabel?: string
  href?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const kg = (value: number) => `${value.toLocaleString('en-IN')} kg`
const minutes = (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`

/**
 * Deterministic operational readings over the current prototype state. Nothing here is a trained
 * model: every factor is a plainly-stated count, window or ratio taken from the live state so the
 * operator can verify the reasoning against the same screens.
 */

/** Dashboard — the single operation that needs the hub's attention right now. */
export function dispatchPulse(pickups: LogisticsPickup[], deliveries: Delivery[], vehicles: Vehicle[]): LogisticsInsight {
  const openPickups = pickups.filter((item) => item.status !== 'completed')
  const openDeliveries = deliveries.filter((item) => item.status !== 'delivered')
  const available = vehicles.filter((item) => item.status === 'available').length
  const unassigned = openPickups.filter((item) => item.status === 'unassigned')
  const flagged = [...openPickups, ...openDeliveries].filter((item) => item.status === 'issue')
  const base: LogisticsFactor[] = [
    { label: 'Open pickups', value: `${openPickups.length} in the queue` },
    { label: 'Open deliveries', value: `${openDeliveries.length} in the queue` },
    { label: 'Available vehicles', value: `${available} of ${vehicles.length} fleet` },
    { label: 'Reported issues', value: flagged.length ? `${flagged.length} awaiting review` : 'None reported' },
  ]

  if (flagged.length) {
    const first = flagged[0]
    const isPickup = 'farm' in first
    return { title: 'Dispatch Pulse', recommendation: `Clear the issue on ${first.id} before assigning further work.`, reason: 'A reported issue is blocking the queue.', confidence: 86, ctaLabel: 'Open the exception', href: isPickup ? `/logistics/pickups/${first.id}` : `/logistics/deliveries/${first.id}`, factors: base }
  }
  if (unassigned.length) {
    const first = unassigned[0]
    const load = unassigned.reduce((sum, item) => sum + item.quantityKg, 0)
    return { title: 'Dispatch Pulse', recommendation: available ? `Assign a vehicle to ${first.id} at ${first.farm} first.` : `Release a vehicle before the ${first.pickupWindow} window closes.`, reason: available ? `${unassigned.length} pickup${unassigned.length === 1 ? ' still needs' : 's still need'} a vehicle and ${available} ${available === 1 ? 'is' : 'are'} free.` : `${unassigned.length} pickup${unassigned.length === 1 ? ' is' : 's are'} waiting and no vehicle is free.`, confidence: clamp(74 + unassigned.length * 3 + (available ? 6 : 0), 62, 90), ctaLabel: 'Assign a vehicle', href: `/logistics/pickups/${first.id}`, note: available ? undefined : 'Every vehicle is currently assigned or in maintenance.', factors: [...base, { label: 'Waiting load', value: kg(load) }, { label: 'Earliest window', value: first.pickupWindow }] }
  }
  const next = openDeliveries[0]
  return next
    ? { title: 'Dispatch Pulse', recommendation: `Next commitment: ${next.id} to ${next.destination}, ETA ${next.eta}.`, reason: `Queue is clear of exceptions; ${available} of ${vehicles.length} vehicles free.`, confidence: 80, ctaLabel: 'Open the delivery', href: `/logistics/deliveries/${next.id}`, factors: base }
    : { title: 'Dispatch Pulse', recommendation: 'No pickups or deliveries are open right now.', reason: 'Nothing needs a dispatch decision in the current state.', confidence: 55, factors: base }
}

/** Pickups queue — a defensible collection order for the open pickups. */
export function pickupSequence(pickups: LogisticsPickup[]) {
  const open = pickups.filter((item) => item.status !== 'completed')
  const score = (item: LogisticsPickup) => (item.status === 'issue' ? 100 : 0) + (item.status === 'unassigned' ? 40 : 0) + (item.pickupWindow.toLowerCase().includes('morning') ? 18 : item.pickupWindow.toLowerCase().includes('afternoon') ? 10 : 4) + Math.min(20, item.quantityKg / 40) + item.orderRefs.length * 4
  const ranked = open.map((item) => ({ item, score: score(item) })).sort((a, b) => b.score - a.score)
  return ranked.map((entry, index) => ({ ...entry, priority: (index === 0 ? 'first' : index < 3 ? 'next' : 'later') as 'first' | 'next' | 'later', reason: entry.item.status === 'issue' ? 'Reported issue blocks the linked orders' : entry.item.status === 'unassigned' ? 'No vehicle assigned yet' : entry.item.orderRefs.length > 1 ? `Feeds ${entry.item.orderRefs.length} linked orders` : 'Scheduled window and load size' }))
}

/** Routes — wraps the canonical OR-Tools optimizer, with the same prototype fallback it already uses. */
export async function routeOptimisationReview(routes: LogisticsRoute[], capacityKg = 1500): Promise<LogisticsInsight> {
  const result = await logisticsService.optimizeLiveRoute(capacityKg)
  const pooled = routes.filter((route) => route.pooled)
  const utilisation = routes.length ? Math.round(routes.reduce((sum, route) => sum + route.loadKg / Math.max(1, route.capacityKg), 0) / routes.length * 100) : 0
  const distance = result.total_distance_km ?? 0
  const duration = result.estimated_duration_minutes ?? 0
  const saved = result.trips_reduced ?? 0
  return {
    title: 'Route Review',
    recommendation: saved > 0 ? `Pooling collapses ${saved + 1} separate trips into 1 across ${distance} km.` : `The current plan runs ${distance} km with no further pooling available.`,
    confidence: clamp(70 + saved * 6 + (pooled.length ? 8 : 0), 60, 92),
    ctaLabel: routes.length ? 'Review pooled routes' : undefined,
    href: routes.length ? '/logistics/routes' : undefined,
    note: 'Sequencing comes from the backend OR-Tools capacitated VRP solver; the deterministic prototype benchmark is used when that service is unavailable.',
    factors: [
      { label: 'Planned distance', value: `${distance} km` },
      { label: 'Estimated duration', value: duration ? minutes(duration) : 'Not available' },
      { label: 'Vehicle utilisation', value: `${result.utilization_pct ?? utilisation}%` },
      { label: 'Trips reduced', value: saved ? `${saved} fewer trips` : 'No reduction available' },
      { label: 'Pooled routes', value: `${pooled.length} of ${routes.length} plans` },
      { label: 'Capacity assumed', value: kg(capacityKg) },
    ],
  }
}

/** Deliveries queue — where the commitments are most likely to slip. */
export function deliveryRiskCheck(deliveries: Delivery[]): LogisticsInsight {
  const open = deliveries.filter((item) => item.status !== 'delivered')
  if (!open.length) return { title: 'Delivery Risk', recommendation: 'Every delivery in this state is complete.', confidence: 60, factors: [] }
  const flagged = open.filter((item) => item.status === 'issue' || item.issues.length > 0)
  const unassigned = open.filter((item) => !item.vehicleId)
  const early = open.filter((item) => ['scheduled', 'loaded'].includes(item.status))
  const bulk = open.filter((item) => item.buyerType === 'Bulk Buyer')
  const focus = flagged[0] ?? unassigned[0] ?? open[0]
  const risk = flagged.length ? 'High' : unassigned.length ? 'Moderate' : 'Low'
  return {
    title: 'Delivery Risk',
    recommendation: flagged.length
      ? `Send a buyer update for ${focus.id} before it slips further.`
      : unassigned.length
        ? `Assign a vehicle to ${focus.id} next.`
        : `No delivery needs intervention; keep the queue moving.`,
    reason: flagged.length
      ? `${risk} risk: ${flagged.length} shipment${flagged.length === 1 ? ' has' : 's have'} a reported issue.`
      : unassigned.length
        ? `${risk} risk: ${unassigned.length} shipment${unassigned.length === 1 ? ' still has' : 's still have'} no vehicle.`
        : `${risk} risk: ${open.length === 1 ? 'the one open shipment has' : `all ${open.length} open shipments have`} a vehicle.`,
    verdict: `${risk} risk`,
    confidence: clamp(72 + flagged.length * 5 + unassigned.length * 3, 60, 91),
    ctaLabel: 'Open the shipment',
    href: `/logistics/deliveries/${focus.id}`,
    note: 'Risk tiers are read from delivery status, vehicle assignment and reported issues in the current state, not from a predicted ETA model.',
    factors: [
      { label: 'Open shipments', value: `${open.length} in the queue` },
      { label: 'Reported issues', value: flagged.length ? `${flagged.length} shipment${flagged.length === 1 ? '' : 's'}` : 'None reported' },
      { label: 'Awaiting a vehicle', value: unassigned.length ? `${unassigned.length} shipment${unassigned.length === 1 ? '' : 's'}` : 'All assigned' },
      { label: 'Not yet in transit', value: `${early.length} at origin or hub` },
      { label: 'Bulk commitments', value: `${bulk.length} of ${open.length}` },
      { label: 'Next ETA', value: focus.eta },
    ],
  }
}

/** Routes — should the operator keep the current sequence or re-run the optimizer? */
export function routeSequenceInsight(route: LogisticsRoute | undefined, stops: RouteStop[], pickups: LogisticsPickup[], deliveries: Delivery[]): LogisticsInsight | null {
  if (!route || route.status === 'completed' || !stops.length) return null
  const done = stops.filter((stop) => stop.status === 'done').length
  const next = stops.find((stop) => stop.status === 'current') ?? stops.find((stop) => stop.status !== 'done')
  const headroom = Math.max(0, route.capacityKg - route.loadKg)
  const utilisation = route.capacityKg ? Math.round((route.loadKg / route.capacityKg) * 100) : 0
  const onRoute = new Set(stops.map((stop) => stop.refId).filter(Boolean))
  const blocked = stops.find((stop) => stop.refId && [...pickups, ...deliveries].some((item) => item.id === stop.refId && item.status === 'issue'))
  const fits = pickups.filter((item) => item.status === 'unassigned' && !onRoute.has(item.id) && item.quantityKg <= headroom)
  const factors: LogisticsFactor[] = [
    { label: 'Stops complete', value: `${done} of ${stops.length}` },
    { label: 'Next stop', value: next?.label ?? 'None' },
    { label: 'Vehicle utilisation', value: `${utilisation}% of ${kg(route.capacityKg)}` },
    { label: 'Load headroom', value: kg(headroom) },
    { label: 'Planned distance', value: `${route.distanceKm} km, ${minutes(route.durationMinutes)}` },
  ]
  if (blocked) {
    return { title: 'Route Review', verdict: 'Reroute', recommendation: `Resequence around ${blocked.label}; its job ${blocked.refId} has a reported issue.`, reason: 'Run Optimize after the issue is cleared or the stop is dropped.', confidence: 84, href: `/logistics/${pickups.some((item) => item.id === blocked.refId) ? 'pickups' : 'deliveries'}/${blocked.refId}`, ctaLabel: 'Open the exception', factors }
  }
  if (fits.length && route.status === 'planned') {
    const first = fits[0]
    return { title: 'Route Review', verdict: 'Add a stop', recommendation: `${first.id} at ${first.farm} (${kg(first.quantityKg)}) fits the ${kg(headroom)} headroom on ${route.vehicleId}.`, reason: 'Confirm the detour before adding it; distance is not re-planned until Optimize runs.', confidence: 72, href: `/logistics/pickups/${first.id}`, ctaLabel: 'Open the pickup', factors: [...factors, { label: 'Unassigned that fit', value: `${fits.length} pickup${fits.length === 1 ? '' : 's'}` }] }
  }
  return { title: 'Route Review', verdict: 'Keep sequence', recommendation: next ? `Keep the current sequence; next stop is ${next.label}.` : 'Keep the current sequence; every stop is complete.', reason: `${utilisation}% loaded with ${done} of ${stops.length} stops done and no open exceptions on the route.`, confidence: 78, factors }
}

/**
 * Market Maker — once a pool is viable, dispatch now or wait for more commitments?
 * Reads utilisation, remaining aggregation potential, the delivery window and route distance
 * from the pool math; freshness exposure is a plain distance-based estimate, not a shelf-life model.
 */
export function marketDispatchTiming(view: MarketView): LogisticsInsight | null {
  const { board, math } = view
  if (!math.viable || board.status === 'created') return null
  const capacity = math.capacityKg || math.ceilingKg
  const utilisation = math.utilisationPct
  const remaining = Math.max(0, Math.min(math.ceilingKg, capacity) - math.committedKg)
  const remainingPct = capacity ? Math.round((remaining / capacity) * 100) : 0
  const openSupply = Math.max(0, math.offeredKg - math.committedKg)
  const roadHours = Math.max(1, Math.round((board.routeDistanceKm / 40) * 10) / 10)
  const sameDay = /today|tonight/i.test(board.deliveryWindow)
  const longHaul = board.routeDistanceKm >= 60
  const dispatchNow = utilisation >= 85 || remainingPct < 10 || sameDay || (longHaul && utilisation >= 70)
  const factors: LogisticsFactor[] = [
    { label: 'Truck utilisation', value: `${utilisation}% of ${kg(capacity)}` },
    { label: 'Committed', value: kg(math.committedKg) },
    { label: 'Room left in the pool', value: remaining ? `${kg(remaining)} (${remainingPct}% of the truck)` : 'None' },
    { label: 'Uncommitted supply', value: openSupply ? kg(openSupply) : 'None offered' },
    { label: 'Delivery window', value: board.deliveryWindow },
    { label: 'Route', value: `${board.routeDistanceKm} km, about ${roadHours} h on the road` },
    { label: 'Freshness exposure', value: longHaul ? 'Higher: long corridor, avoid adding wait time' : 'Lower: short corridor' },
  ]
  return dispatchNow
    ? { title: 'Dispatch timing', verdict: 'Dispatch now', ctaLabel: 'Dispatch now', recommendation: 'Dispatch now.', reason: sameDay ? 'The delivery window is today, so waiting risks the commitment.' : utilisation >= 85 ? `Truck utilisation is ${utilisation}% and waiting only adds freshness exposure.` : remainingPct < 10 ? 'The pool is nearly full; more waiting cannot improve utilisation much.' : `The ${board.routeDistanceKm} km corridor makes waiting costly for freshness at ${utilisation}% utilisation.`, confidence: clamp(70 + Math.round(utilisation / 5), 70, 92), factors, note: 'Departure time is not recorded, so the timing is judged from the delivery window and route length only.' }
    : { title: 'Dispatch timing', verdict: 'Wait', recommendation: 'Wait for one more commitment before dispatching.', reason: `${kg(remaining)} of truck space is still open and the delivery window (${board.deliveryWindow}) leaves time to fill it.`, confidence: clamp(62 + Math.round(remainingPct / 4), 62, 84), factors, note: 'No live commitment stream is modelled, so this cannot estimate how long the wait will be. Dispatch remains available below.' }
}
