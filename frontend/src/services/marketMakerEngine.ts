import type { FarmerListing, MarketMakerBoard, MarketSupplyLot, Vehicle } from '../types'

/**
 * KisanLink Market Maker — the deterministic feasibility engine.
 *
 * There is no model and no prediction here. A direct farm-to-buyer trip has a *fixed* cost
 * (a driver, a vehicle, a set number of kilometres) that does not shrink when the load does.
 * That single fact is why fragmented demand cannot buy direct today: 15 kg carries the whole
 * trip, 331 kg splits it. The Market Maker's job is to find the exact volume at which the
 * trip pays for itself while the farmer still clears their floor, and then to assemble that
 * volume out of demand and supply that are individually too small to matter.
 *
 * Everything below is closed-form and inspectable:
 *
 *   freightTotal  = fixed + perKm x routeDistanceKm            (independent of load)
 *   headroomPerKg = buyerCeiling - farmerFloor - platformFee   (what is left for transport)
 *   thresholdKg   = ceil(freightTotal / headroomPerKg)         (break-even volume)
 *   deliveredPerKg= farmerFloor + freightTotal/committedKg + platformFee
 *
 * The farmer floor is an input, never an output: the engine solves for volume, not for a
 * lower farm-gate price.
 */

/** Freight is quoted per vehicle class. Bigger vehicle, higher fixed and per-km cost. */
export function freightModel(capacityKg: number) {
  return {
    fixed: Math.round(300 + capacityKg * 0.375),
    perKm: Math.round((9 + capacityKg * 0.0225) * 100) / 100,
  }
}

export type MarketBlockerKind = 'vehicle' | 'capacity' | 'supply' | 'demand'
export interface MarketBlocker {
  kind: MarketBlockerKind
  title: string
  detail: string
}

export interface MarketAllocation {
  lot: MarketSupplyLot
  availableKg: number
  allocatedKg: number
}

export interface MarketMath {
  committedKg: number
  consumerKg: number
  bulkKg: number
  participants: number
  consumerParticipants: number
  offeredKg: number
  allocations: MarketAllocation[]
  /** Break-even volume for the chosen vehicle. */
  thresholdKg: number
  gapKg: number
  progressPct: number
  /** The largest volume this corridor could still absorb (supply and vehicle capped). */
  ceilingKg: number
  vehicle: Vehicle | null
  freightFixed: number
  freightPerKm: number
  freightTotal: number
  freightPerKg: number
  platformFeePerKg: number
  headroomPerKg: number
  farmerGatePerKg: number
  deliveredPerKg: number
  deliveredAtThresholdPerKg: number
  capacityKg: number
  utilisationPct: number
  viable: boolean
  blockers: MarketBlocker[]
  /** Value comparison against the route the produce takes today. */
  farmerTotal: number
  farmerMandiTotal: number
  farmerGainTotal: number
  farmerGainPct: number
  buyerTotal: number
  buyerCurrentTotal: number
  buyerSavingPerKg: number
  buyerSavingTotal: number
  spreadBeforePerKg: number
  spreadAfterPerKg: number
  spreadRemovedPerKg: number
  spreadRemovedTotal: number
}

const round2 = (value: number) => Math.round(value * 100) / 100
const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`
const rupee = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
/** Trip totals are whole rupees; only per-kg figures carry paise. */
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/** Live stock caps a lot: a farmer who sold elsewhere cannot also offer it to the corridor. */
export function resolveLotAvailability(lot: MarketSupplyLot, listings: FarmerListing[]): number {
  if (!lot.listingId) return lot.offeredKg
  const listing = listings.find((item) => item.id === lot.listingId)
  if (!listing) return lot.offeredKg
  return Math.max(0, Math.min(lot.offeredKg, listing.remainingKg))
}

/**
 * Vehicles this corridor may quote against: anything free in the fleet, plus the vehicle
 * already committed to this market's own route once the market exists. A vehicle in
 * maintenance or working another route is genuinely unavailable, and the market says so.
 */
function candidateVehicles(board: MarketMakerBoard, vehicles: Vehicle[]) {
  return vehicles.filter((vehicle) =>
    vehicle.status === 'available' || Boolean(board.routeId && vehicle.currentAssignment === board.routeId))
}

export function evaluateMarket(board: MarketMakerBoard, listings: FarmerListing[], vehicles: Vehicle[]): MarketMath {
  const committedKg = board.commitments.reduce((sum, item) => sum + item.quantityKg, 0)
  const consumerKg = board.commitments.filter((item) => item.source === 'consumer').reduce((sum, item) => sum + item.quantityKg, 0)
  const bulkKg = committedKg - consumerKg

  const availability = board.lots.map((lot) => ({ lot, availableKg: resolveLotAvailability(lot, listings) }))
  const offeredKg = availability.reduce((sum, entry) => sum + entry.availableKg, 0)

  const farmerGatePerKg = board.farmerFloorPerKg
  const platformFeePerKg = round2(farmerGatePerKg * board.platformFeePct)
  const headroomPerKg = round2(board.buyerCeilingPerKg - farmerGatePerKg - platformFeePerKg)

  const priced = candidateVehicles(board, vehicles)
    .map((vehicle) => {
      const model = freightModel(vehicle.capacityKg)
      const freightTotal = Math.round(model.fixed + model.perKm * board.routeDistanceKm)
      const thresholdKg = headroomPerKg > 0 ? Math.ceil(freightTotal / headroomPerKg) : Number.POSITIVE_INFINITY
      return { vehicle, ...model, freightTotal, thresholdKg }
    })
    .sort((a, b) => a.freightTotal - b.freightTotal)

  // Prefer the cheapest vehicle that can actually reach viability in this corridor; otherwise
  // fall back to the cheapest one that could at least carry what is already committed, so the
  // board can still state a real number alongside a real blocker.
  const feasible = priced.find((option) =>
    option.thresholdKg <= option.vehicle.capacityKg
    && option.thresholdKg <= offeredKg
    && committedKg <= option.vehicle.capacityKg)
  const chosen = feasible
    ?? priced.find((option) => committedKg <= option.vehicle.capacityKg)
    ?? priced[0]
    ?? null

  const thresholdKg = chosen ? chosen.thresholdKg : Number.POSITIVE_INFINITY
  const freightTotal = chosen ? chosen.freightTotal : 0
  const capacityKg = chosen ? chosen.vehicle.capacityKg : 0
  const freightPerKg = committedKg > 0 && chosen ? round2(freightTotal / committedKg) : 0
  const deliveredPerKg = committedKg > 0 && chosen ? round2(farmerGatePerKg + freightTotal / committedKg + platformFeePerKg) : 0
  const deliveredAtThresholdPerKg = chosen && Number.isFinite(thresholdKg)
    ? round2(farmerGatePerKg + freightTotal / thresholdKg + platformFeePerKg)
    : 0

  const blockers: MarketBlocker[] = []
  if (!chosen) {
    blockers.push({
      kind: 'vehicle',
      title: 'No vehicle available on this corridor',
      detail: 'Every vehicle that could run this route is assigned elsewhere or in maintenance, so no direct trip can be quoted.',
    })
  } else if (!feasible) {
    if (thresholdKg > capacityKg) blockers.push({
      kind: 'capacity',
      title: 'One trip cannot carry the break-even volume',
      detail: `${chosen.vehicle.type} needs ${kg(thresholdKg)} to pay for itself but only holds ${kg(capacityKg)}.`,
    })
    else if (thresholdKg > offeredKg) blockers.push({
      kind: 'supply',
      title: 'Corridor supply is below break-even',
      detail: `Farms in this corridor have offered ${kg(offeredKg)}; ${chosen.vehicle.type} needs ${kg(thresholdKg)} to run economically.`,
    })
    else blockers.push({
      kind: 'capacity',
      title: 'Committed demand exceeds the available vehicle',
      detail: `${kg(committedKg)} is committed but the largest free vehicle holds ${kg(capacityKg)}.`,
    })
  }
  if (chosen && committedKg > offeredKg) blockers.push({
    kind: 'supply',
    title: 'Committed demand exceeds offered supply',
    detail: `${kg(committedKg)} committed against ${kg(offeredKg)} offered in this corridor.`,
  })
  const gapKg = chosen && Number.isFinite(thresholdKg) ? Math.max(0, thresholdKg - committedKg) : 0
  if (chosen && feasible && gapKg > 0) blockers.push({
    kind: 'demand',
    title: `${kg(gapKg)} short of a viable direct market`,
    detail: `At ${kg(committedKg)} the fixed ${rupees(freightTotal)} trip works out to ${rupee(freightPerKg)}/kg, putting delivered produce at ${rupee(deliveredPerKg)}/kg — above the ${rupee(board.buyerCeilingPerKg)}/kg buyers will switch at.`,
  })

  const viable = Boolean(chosen) && Boolean(feasible) && gapKg === 0 && committedKg <= capacityKg && committedKg <= offeredKg && committedKg > 0

  // Nearest farm first: the pooled route absorbs the least detour it can for each kilogram.
  const ordered = [...availability].sort((a, b) => a.lot.detourKm - b.lot.detourKm || b.availableKg - a.availableKg)
  let remaining = Math.min(committedKg, offeredKg)
  const allocations: MarketAllocation[] = ordered.map((entry) => {
    const allocatedKg = Math.max(0, Math.min(entry.availableKg, remaining))
    remaining -= allocatedKg
    return { lot: entry.lot, availableKg: entry.availableKg, allocatedKg }
  })

  const farmerTotal = Math.round(committedKg * farmerGatePerKg)
  const farmerMandiTotal = Math.round(committedKg * board.mandiPricePerKg)
  const buyerTotal = committedKg > 0 && chosen ? Math.round(committedKg * farmerGatePerKg + freightTotal + committedKg * platformFeePerKg) : 0
  const buyerCurrentTotal = Math.round(committedKg * board.buyerCurrentPerKg)
  const buyerSavingPerKg = committedKg > 0 && chosen ? round2(board.buyerCurrentPerKg - (farmerGatePerKg + freightTotal / committedKg + platformFeePerKg)) : 0
  const spreadBeforePerKg = round2(board.buyerCurrentPerKg - board.mandiPricePerKg)
  const spreadAfterPerKg = committedKg > 0 && chosen ? round2(freightTotal / committedKg + platformFeePerKg) : 0

  return {
    committedKg,
    consumerKg,
    bulkKg,
    participants: board.commitments.length,
    consumerParticipants: board.commitments.filter((item) => item.source === 'consumer').length,
    offeredKg,
    allocations,
    thresholdKg,
    gapKg,
    progressPct: Number.isFinite(thresholdKg) && thresholdKg > 0 ? Math.round((committedKg / thresholdKg) * 100) : 0,
    ceilingKg: Math.min(offeredKg, capacityKg || offeredKg),
    vehicle: chosen?.vehicle ?? null,
    freightFixed: chosen?.fixed ?? 0,
    freightPerKm: chosen?.perKm ?? 0,
    freightTotal,
    freightPerKg,
    platformFeePerKg,
    headroomPerKg,
    farmerGatePerKg,
    deliveredPerKg,
    deliveredAtThresholdPerKg,
    capacityKg,
    utilisationPct: capacityKg ? Math.round((committedKg / capacityKg) * 100) : 0,
    viable,
    blockers,
    farmerTotal,
    farmerMandiTotal,
    farmerGainTotal: farmerTotal - farmerMandiTotal,
    farmerGainPct: farmerMandiTotal ? round2(((farmerTotal - farmerMandiTotal) / farmerMandiTotal) * 100) : 0,
    buyerTotal,
    buyerCurrentTotal,
    buyerSavingPerKg,
    buyerSavingTotal: Math.round(buyerCurrentTotal - buyerTotal),
    spreadBeforePerKg,
    spreadAfterPerKg,
    spreadRemovedPerKg: round2(spreadBeforePerKg - spreadAfterPerKg),
    spreadRemovedTotal: Math.round((spreadBeforePerKg - spreadAfterPerKg) * committedKg),
  }
}

export interface MarketDerivationStep {
  label: string
  value: string
  note: string
}

/**
 * The audit trail behind "why is this viable?". Each step is one arithmetic operation on
 * numbers the operator can see elsewhere in the app, in the order the engine applies them.
 */
export function explainMarket(board: MarketMakerBoard, math: MarketMath): MarketDerivationStep[] {
  const steps: MarketDerivationStep[] = [
    {
      label: 'Fixed cost of one trip',
      value: rupees(math.freightTotal),
      note: math.vehicle
        ? `${rupees(math.freightFixed)} base + ${rupee(math.freightPerKm)}/km × ${board.routeDistanceKm} km · ${math.vehicle.type} (${math.vehicle.capacityKg} kg)`
        : 'No vehicle is available to quote this corridor.',
    },
    {
      label: 'Price buyers will switch at',
      value: `${rupee(board.buyerCeilingPerKg)}/kg`,
      note: `They pay ${rupee(board.buyerCurrentPerKg)}/kg today through the mandi chain.`,
    },
    {
      label: 'Farmer floor, protected',
      value: `${rupee(board.farmerFloorPerKg)}/kg`,
      note: `The mandi pays ${rupee(board.mandiPricePerKg)}/kg. This floor is an input — the market maker solves for volume, never for a lower farm-gate price.`,
    },
    {
      label: 'Platform fee',
      value: `${rupee(math.platformFeePerKg)}/kg`,
      note: `${Math.round(board.platformFeePct * 1000) / 10}% of farm-gate, billed to the buyer so the farmer's floor stays whole.`,
    },
    {
      label: 'Left for transport',
      value: `${rupee(math.headroomPerKg)}/kg`,
      note: `${rupee(board.buyerCeilingPerKg)} − ${rupee(board.farmerFloorPerKg)} − ${rupee(math.platformFeePerKg)}`,
    },
    {
      label: 'Break-even volume',
      value: kg(math.thresholdKg),
      note: `${rupees(math.freightTotal)} ÷ ${rupee(math.headroomPerKg)}/kg, rounded up. Below this the trip costs more per kilogram than buyers will pay.`,
    },
  ]

  steps.push(math.viable
    ? {
      label: 'Committed today',
      value: kg(math.committedKg),
      note: `Freight lands at ${rupee(math.freightPerKg)}/kg, so delivered produce is ${rupee(math.deliveredPerKg)}/kg — at or under the ${rupee(board.buyerCeilingPerKg)}/kg ceiling. The market is viable.`,
    }
    : {
      label: 'Committed today',
      value: kg(math.committedKg),
      note: math.committedKg > 0 && math.vehicle
        ? `Freight lands at ${rupee(math.freightPerKg)}/kg, so delivered produce is ${rupee(math.deliveredPerKg)}/kg — ${rupee(Math.max(0, Math.round((math.deliveredPerKg - board.buyerCeilingPerKg) * 100) / 100))}/kg above the ceiling.`
        : 'Nothing is committed to this corridor yet.',
    })

  return steps
}
