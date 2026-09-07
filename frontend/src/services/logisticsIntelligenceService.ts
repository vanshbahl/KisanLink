import type { Delivery, LogisticsPickup, LogisticsRoute, Vehicle } from '../types'
import { logisticsService } from './logisticsService'

export type LogisticsFactor = { label: string; value: string }
export type LogisticsInsight = { title: string; recommendation: string; confidence: number; factors: LogisticsFactor[]; note?: string; ctaLabel?: string; href?: string }

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
    return { title: 'Dispatch Pulse', recommendation: `${first.id} has a reported issue and is blocking the queue — clear it before assigning further work.`, confidence: 86, ctaLabel: 'Open the exception', href: isPickup ? `/logistics/pickups/${first.id}` : `/logistics/deliveries/${first.id}`, factors: base }
  }
  if (unassigned.length) {
    const first = unassigned[0]
    const load = unassigned.reduce((sum, item) => sum + item.quantityKg, 0)
    return { title: 'Dispatch Pulse', recommendation: available ? `${unassigned.length} pickup${unassigned.length === 1 ? ' still needs' : 's still need'} a vehicle — start with ${first.id} at ${first.farm}.` : `${unassigned.length} pickup${unassigned.length === 1 ? ' is' : 's are'} waiting and no vehicle is free; release one before the window closes.`, confidence: clamp(74 + unassigned.length * 3 + (available ? 6 : 0), 62, 90), ctaLabel: 'Assign a vehicle', href: `/logistics/pickups/${first.id}`, note: available ? undefined : 'Every vehicle is currently assigned or in maintenance.', factors: [...base, { label: 'Waiting load', value: kg(load) }, { label: 'Earliest window', value: first.pickupWindow }] }
  }
  const next = openDeliveries[0]
  return next
    ? { title: 'Dispatch Pulse', recommendation: `Queue is clear of exceptions — ${next.id} to ${next.destination} is the next commitment, ETA ${next.eta}.`, confidence: 80, ctaLabel: 'Open the delivery', href: `/logistics/deliveries/${next.id}`, factors: base }
    : { title: 'Dispatch Pulse', recommendation: 'No pickups or deliveries are open in the current prototype state.', confidence: 55, factors: base }
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
      { label: 'Estimated duration', value: duration ? minutes(duration) : '—' },
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
      ? `${risk} risk — ${flagged.length} shipment${flagged.length === 1 ? ' has' : 's have'} a reported issue; ${focus.id} needs a buyer update.`
      : unassigned.length
        ? `${risk} risk — ${unassigned.length} shipment${unassigned.length === 1 ? ' still has' : 's still have'} no vehicle, starting with ${focus.id}.`
        : `${risk} risk — ${open.length === 1 ? 'the one open shipment has' : `all ${open.length} open shipments have`} a vehicle and ${open.length === 1 ? 'is' : 'are'} moving through the queue.`,
    confidence: clamp(72 + flagged.length * 5 + unassigned.length * 3, 60, 91),
    ctaLabel: 'Open the shipment',
    href: `/logistics/deliveries/${focus.id}`,
    note: 'Risk tiers are read from delivery status, vehicle assignment and reported issues in the current state — not from a predicted ETA model.',
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
