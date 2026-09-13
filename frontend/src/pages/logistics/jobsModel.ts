import type { Delivery, LogisticsPickup } from '../../types'
export interface DispatchJob {
  id: string
  kind: 'pickups' | 'deliveries'
  produce: string
  produceHi: string
  location: string
  party: string
  quantityKg: number
  window: string
  vehicle?: string
  status: string
}
export function dispatchJobs(
  pickups: LogisticsPickup[],
  deliveries: Delivery[],
): DispatchJob[] {
  return [
    ...pickups.map((p) => ({
      id: p.id,
      kind: 'pickups' as const,
      produce: p.crop,
      produceHi: p.cropHi,
      location: p.farmLocation,
      party: p.farmer,
      quantityKg: p.quantityKg,
      window: p.pickupWindow,
      vehicle: p.vehicleId,
      status: p.status,
    })),
    ...deliveries.map((d) => ({
      id: d.id,
      kind: 'deliveries' as const,
      produce: d.produce,
      produceHi: d.produceHi,
      location: d.destination,
      party: d.buyer,
      quantityKg: d.quantityKg,
      window: d.eta,
      vehicle: d.vehicleId,
      status: d.status,
    })),
  ]
}
export function attentionJobs(jobs: DispatchJob[]) {
  const rank = (j: DispatchJob) =>
    j.status === 'issue'
      ? 0
      : j.status === 'unassigned'
        ? 1
        : j.status === 'arrived' || j.status === 'at_hub'
          ? 2
          : 3
  return jobs.filter((j) => rank(j) < 3).sort((a, b) => rank(a) - rank(b))
}
