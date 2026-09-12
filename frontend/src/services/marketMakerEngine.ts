import type { FarmerListing, MarketCropSegment, MarketMakerBoard, MarketSupplyLot, Vehicle } from '../types'

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

export type MarketBlockerKind = 'vehicle' | 'capacity' | 'supply' | 'demand' | 'compatibility'
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

export interface CropSegmentMath {
  segment: MarketCropSegment
  committedKg: number
  consumerKg: number
  bulkKg: number
  offeredKg: number
  allocations: MarketAllocation[]
  farmerFloorPerKg: number
  mandiPricePerKg: number
  buyerCeilingPerKg: number
  buyerCurrentPerKg: number
  platformFeePerKg: number
  headroomPerKg: number
  allocatedFreightShare: number
  allocatedFreightPerKg: number
  standaloneFreightTotal: number
  standaloneFreightPerKg: number
  freightSavingsTotal: number
  deliveredPerKg: number
  buyerSavingPerKg: number
  buyerSavingTotal: number
  farmerTotal: number
  farmerMandiTotal: number
  farmerGainTotal: number
  viable: boolean
  progressPct: number
}

export interface RegionContribution {
  regionId: string
  regionName: string
  committedKg: number
  offeredKg: number
  crops: string[]
}

export interface MultiCropMath {
  isMultiCrop: true
  cropMaths: CropSegmentMath[]
  totalCommittedKg: number
  totalOfferedKg: number
  totalHeadroom: number
  vehicle: Vehicle | null
  freightTotal: number
  capacityKg: number
  utilisationPct: number
  compatibility: { compatible: boolean; reason?: string }
  corridorStatus: 'forming' | 'partially_viable' | 'viable' | 'infeasible'
  viable: boolean
  blockers: MarketBlocker[]
  whyItWorks: string[]
  regionContributions: RegionContribution[]
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
  multiCropMath?: MultiCropMath
  regionContributions?: RegionContribution[]
}

const round2 = (value: number) => Math.round(value * 100) / 100
const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`
const rupee = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
/** Trip totals are whole rupees; only per-kg figures carry paise. */
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const safeKg = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

/** Summarises the NCR origins represented by a board without inventing GPS data. */
export function computeRegionContributions(board: MarketMakerBoard): RegionContribution[] {
  const regions = new Map<string, { regionName: string; offeredKg: number; crops: Set<string> }>()
  const addLot = (lot: MarketSupplyLot, crop: string) => {
    const regionName = lot.regionName ?? board.regions?.find((region) => region.id === lot.regionId)?.name ?? 'Unspecified'
    const regionId = lot.regionId ?? `reg_${regionName.toLowerCase().replace(/\W+/g, '_')}`
    const current = regions.get(regionId) ?? { regionName, offeredKg: 0, crops: new Set<string>() }
    current.offeredKg += safeKg(lot.offeredKg)
    current.crops.add(crop)
    regions.set(regionId, current)
  }

  if (board.isMultiCrop && board.crops?.length) {
    board.crops.forEach((segment) => segment.lots.forEach((lot) => addLot(lot, segment.crop)))
  } else {
    board.lots.forEach((lot) => addLot(lot, board.crop))
  }

  const entries = [...regions.entries()]
  const totalOfferedKg = entries.reduce((sum, [, entry]) => sum + entry.offeredKg, 0)
  const totalCommittedKg = board.isMultiCrop && board.crops?.length
    ? board.crops.reduce((sum, segment) => sum + segment.commitments.reduce((cropSum, item) => cropSum + safeKg(item.quantityKg), 0), 0)
    : board.commitments.reduce((sum, item) => sum + safeKg(item.quantityKg), 0)
  let allocatedKg = 0

  return entries.map(([regionId, entry], index) => {
    const committedKg = index === entries.length - 1
      ? Math.max(0, totalCommittedKg - allocatedKg)
      : Math.round(totalOfferedKg > 0 ? totalCommittedKg * entry.offeredKg / totalOfferedKg : 0)
    allocatedKg += committedKg
    return { regionId, regionName: entry.regionName, offeredKg: entry.offeredKg, committedKg, crops: [...entry.crops] }
  })
}

export function checkCropCompatibility(crops: MarketCropSegment[]): { compatible: boolean; reason?: string } {
  const storageTypes = new Set(crops.map((crop) => crop.storageType ?? 'ambient'))
  if (storageTypes.has('cold_chain') && storageTypes.has('ambient')) {
    return { compatible: false, reason: 'Ambient produce and cold-chain produce require different transport temperatures.' }
  }
  if (storageTypes.has('delicate') && storageTypes.has('dry')) {
    return { compatible: false, reason: 'Delicate produce cannot be safely loaded beneath heavy dry cargo.' }
  }
  return { compatible: true }
}

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
  if (board.isMultiCrop && board.crops?.length) return evaluateMultiCropMarket(board, board.crops, listings, vehicles)

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

function evaluateMultiCropMarket(
  board: MarketMakerBoard,
  crops: MarketCropSegment[],
  listings: FarmerListing[],
  vehicles: Vehicle[],
): MarketMath {
  const compatibility = checkCropCompatibility(crops)
  let totalCommittedKg = 0
  let totalConsumerKg = 0
  let totalBulkKg = 0
  let totalOfferedKg = 0
  let totalParticipants = 0
  let totalConsumerParticipants = 0
  let totalHeadroom = 0
  const allocations: MarketAllocation[] = []

  const cropMaths: CropSegmentMath[] = crops.map((segment) => {
    const committedKg = segment.commitments.reduce((sum, item) => sum + safeKg(item.quantityKg), 0)
    const consumerKg = segment.commitments
      .filter((item) => item.source === 'consumer')
      .reduce((sum, item) => sum + safeKg(item.quantityKg), 0)
    const bulkKg = segment.commitments
      .filter((item) => item.source !== 'consumer')
      .reduce((sum, item) => sum + safeKg(item.quantityKg), 0)
    const availability = segment.lots.map((lot) => ({ lot, availableKg: resolveLotAvailability(lot, listings) }))
    const offeredKg = availability.reduce((sum, entry) => sum + entry.availableKg, 0)
    const platformFeePerKg = round2(segment.farmerFloorPerKg * segment.platformFeePct)
    const headroomPerKg = round2(segment.buyerCeilingPerKg - segment.farmerFloorPerKg - platformFeePerKg)

    totalCommittedKg += committedKg
    totalConsumerKg += consumerKg
    totalBulkKg += bulkKg
    totalOfferedKg += offeredKg
    totalParticipants += segment.commitments.length
    totalConsumerParticipants += segment.commitments.filter((item) => item.source === 'consumer').length
    totalHeadroom += Math.max(0, headroomPerKg) * committedKg

    const ordered = [...availability].sort((a, b) => a.lot.detourKm - b.lot.detourKm || b.availableKg - a.availableKg)
    let remaining = Math.min(committedKg, offeredKg)
    const cropAllocations = ordered.map((entry) => {
      const allocatedKg = Math.max(0, Math.min(entry.availableKg, remaining))
      remaining -= allocatedKg
      return { ...entry, allocatedKg }
    })
    allocations.push(...cropAllocations)

    return {
      segment,
      committedKg,
      consumerKg,
      bulkKg,
      offeredKg,
      allocations: cropAllocations,
      farmerFloorPerKg: segment.farmerFloorPerKg,
      mandiPricePerKg: segment.mandiPricePerKg,
      buyerCeilingPerKg: segment.buyerCeilingPerKg,
      buyerCurrentPerKg: segment.buyerCurrentPerKg,
      platformFeePerKg,
      headroomPerKg,
      allocatedFreightShare: 0,
      allocatedFreightPerKg: 0,
      standaloneFreightTotal: 0,
      standaloneFreightPerKg: 0,
      freightSavingsTotal: 0,
      deliveredPerKg: 0,
      buyerSavingPerKg: 0,
      buyerSavingTotal: 0,
      farmerTotal: 0,
      farmerMandiTotal: 0,
      farmerGainTotal: 0,
      viable: false,
      progressPct: 0,
    }
  })

  const averageHeadroomPerKg = totalCommittedKg > 0
    ? round2(totalHeadroom / totalCommittedKg)
    : round2(cropMaths.reduce((sum, crop) => sum + Math.max(0, crop.headroomPerKg), 0) / Math.max(1, cropMaths.length))
  const priced = candidateVehicles(board, vehicles)
    .map((vehicle) => {
      const model = freightModel(vehicle.capacityKg)
      const freightTotal = Math.round(model.fixed + model.perKm * board.routeDistanceKm)
      const thresholdKg = averageHeadroomPerKg > 0 ? Math.ceil(freightTotal / averageHeadroomPerKg) : Number.POSITIVE_INFINITY
      return { vehicle, ...model, freightTotal, thresholdKg }
    })
    .sort((a, b) => a.freightTotal - b.freightTotal)
  const feasible = priced.find((option) =>
    option.thresholdKg <= option.vehicle.capacityKg
    && option.thresholdKg <= totalOfferedKg
    && totalCommittedKg <= option.vehicle.capacityKg)
  const chosen = feasible
    ?? priced.find((option) => totalCommittedKg <= option.vehicle.capacityKg)
    ?? priced[0]
    ?? null
  const rawThresholdKg = chosen?.thresholdKg ?? Number.POSITIVE_INFINITY
  const thresholdKg = Number.isFinite(rawThresholdKg) ? rawThresholdKg : 0
  const freightTotal = chosen?.freightTotal ?? 0
  const capacityKg = chosen?.vehicle.capacityKg ?? 0
  const freightPerKg = totalCommittedKg > 0 && chosen ? round2(freightTotal / totalCommittedKg) : 0

  let assignedFreight = 0
  cropMaths.forEach((crop, index) => {
    crop.allocatedFreightShare = index === cropMaths.length - 1
      ? round2(Math.max(0, freightTotal - assignedFreight))
      : round2(totalCommittedKg > 0 ? crop.committedKg / totalCommittedKg * freightTotal : 0)
    assignedFreight += crop.allocatedFreightShare
    crop.allocatedFreightPerKg = crop.committedKg > 0 ? round2(crop.allocatedFreightShare / crop.committedKg) : 0
    crop.standaloneFreightTotal = crop.committedKg > 0 ? freightTotal : 0
    crop.standaloneFreightPerKg = crop.committedKg > 0 ? round2(freightTotal / crop.committedKg) : 0
    crop.freightSavingsTotal = Math.max(0, Math.round(crop.standaloneFreightTotal - crop.allocatedFreightShare))
    crop.deliveredPerKg = crop.committedKg > 0
      ? round2(crop.farmerFloorPerKg + crop.platformFeePerKg + crop.allocatedFreightPerKg)
      : 0
    crop.buyerSavingPerKg = crop.committedKg > 0 ? round2(crop.buyerCurrentPerKg - crop.deliveredPerKg) : 0
    crop.buyerSavingTotal = Math.round(crop.buyerSavingPerKg * crop.committedKg)
    crop.farmerTotal = Math.round(crop.committedKg * crop.farmerFloorPerKg)
    crop.farmerMandiTotal = Math.round(crop.committedKg * crop.mandiPricePerKg)
    crop.farmerGainTotal = crop.farmerTotal - crop.farmerMandiTotal
    crop.viable = crop.committedKg > 0
      && crop.committedKg <= crop.offeredKg
      && crop.deliveredPerKg <= crop.buyerCeilingPerKg
    crop.progressPct = crop.offeredKg > 0 ? Math.min(100, Math.round(crop.committedKg / crop.offeredKg * 100)) : 0
  })

  const blockers: MarketBlocker[] = []
  if (!compatibility.compatible) {
    blockers.push({ kind: 'compatibility', title: 'Incompatible crop handling requirements', detail: compatibility.reason ?? 'These crops cannot share one vehicle.' })
  }
  if (!chosen) {
    blockers.push({ kind: 'vehicle', title: 'No vehicle available for this multi-crop corridor', detail: 'Every suitable vehicle is assigned elsewhere or in maintenance.' })
  } else if (!feasible) {
    if (!Number.isFinite(rawThresholdKg) || rawThresholdKg > capacityKg) {
      blockers.push({ kind: 'capacity', title: 'Combined break-even volume exceeds vehicle capacity', detail: `${chosen.vehicle.type} cannot carry the load required to cover this trip.` })
    } else if (rawThresholdKg > totalOfferedKg) {
      blockers.push({ kind: 'supply', title: 'Total corridor supply is below break-even', detail: `Farms offered ${kg(totalOfferedKg)}; this trip needs ${kg(rawThresholdKg)}.` })
    } else {
      blockers.push({ kind: 'capacity', title: 'Committed multi-crop demand exceeds vehicle capacity', detail: `${kg(totalCommittedKg)} is committed but the vehicle holds ${kg(capacityKg)}.` })
    }
  }
  if (totalCommittedKg > totalOfferedKg) {
    blockers.push({ kind: 'supply', title: 'Committed demand exceeds offered supply', detail: `${kg(totalCommittedKg)} committed against ${kg(totalOfferedKg)} offered.` })
  }
  const gapKg = chosen && Number.isFinite(rawThresholdKg) ? Math.max(0, rawThresholdKg - totalCommittedKg) : 0
  if (chosen && feasible && gapKg > 0) {
    blockers.push({ kind: 'demand', title: `${kg(gapKg)} short of a viable multi-crop corridor`, detail: `The ${rupees(freightTotal)} trip is currently ${rupee(freightPerKg)}/kg across the shared load.` })
  }

  const everyCommittedCropViable = cropMaths.every((crop) => crop.committedKg === 0 || crop.viable)
  const viable = compatibility.compatible
    && Boolean(chosen)
    && Boolean(feasible)
    && gapKg === 0
    && totalCommittedKg > 0
    && totalCommittedKg <= capacityKg
    && totalCommittedKg <= totalOfferedKg
    && everyCommittedCropViable
  const corridorStatus: MultiCropMath['corridorStatus'] = !compatibility.compatible || !chosen || totalCommittedKg > capacityKg
    ? 'infeasible'
    : viable
      ? 'viable'
      : totalCommittedKg > 0 && everyCommittedCropViable
        ? 'partially_viable'
        : 'forming'
  const regionContributions = computeRegionContributions(board)
  const totalFreightSavings = cropMaths.reduce((sum, crop) => sum + crop.freightSavingsTotal, 0)
  const whyItWorks = compatibility.compatible
    ? [
      `${Math.round(totalCommittedKg).toLocaleString('en-IN')} kg pooled across ${crops.length} crops`,
      chosen ? `${Math.round(totalCommittedKg / Math.max(1, capacityKg) * 100)}% of ${chosen.vehicle.type} capacity used` : 'No suitable vehicle is currently available',
      `Freight allocated proportionally at ${rupee(freightPerKg)}/kg`,
      `${rupees(totalFreightSavings)} saved versus separate crop trips`,
      everyCommittedCropViable ? 'Every committed crop remains within its own buyer ceiling' : 'One or more crops exceed their own buyer ceiling',
    ]
    : [compatibility.reason ?? 'Crop handling requirements are incompatible']
  const totalFarmer = cropMaths.reduce((sum, crop) => sum + crop.farmerTotal, 0)
  const totalFarmerMandi = cropMaths.reduce((sum, crop) => sum + crop.farmerMandiTotal, 0)
  const totalBuyerCurrent = cropMaths.reduce((sum, crop) => sum + Math.round(crop.committedKg * crop.buyerCurrentPerKg), 0)
  const totalPlatformFee = cropMaths.reduce((sum, crop) => sum + crop.committedKg * crop.platformFeePerKg, 0)
  const buyerTotal = Math.round(totalFarmer + freightTotal + totalPlatformFee)
  const averageFloor = totalCommittedKg > 0 ? round2(totalFarmer / totalCommittedKg) : 0
  const averageMandi = totalCommittedKg > 0 ? round2(totalFarmerMandi / totalCommittedKg) : 0
  const averagePlatformFee = totalCommittedKg > 0 ? round2(totalPlatformFee / totalCommittedKg) : 0
  const averageCurrent = totalCommittedKg > 0 ? round2(totalBuyerCurrent / totalCommittedKg) : 0
  const farmerGainTotal = totalFarmer - totalFarmerMandi
  const buyerSavingTotal = totalBuyerCurrent - buyerTotal
  const spreadBeforePerKg = round2(averageCurrent - averageMandi)
  const spreadAfterPerKg = round2(freightPerKg + averagePlatformFee)
  const multiCropMath: MultiCropMath = {
    isMultiCrop: true,
    cropMaths,
    totalCommittedKg,
    totalOfferedKg,
    totalHeadroom,
    vehicle: chosen?.vehicle ?? null,
    freightTotal,
    capacityKg,
    utilisationPct: capacityKg > 0 ? Math.round(totalCommittedKg / capacityKg * 100) : 0,
    compatibility,
    corridorStatus,
    viable,
    blockers,
    whyItWorks,
    regionContributions,
  }

  return {
    committedKg: totalCommittedKg,
    consumerKg: totalConsumerKg,
    bulkKg: totalBulkKg,
    participants: totalParticipants,
    consumerParticipants: totalConsumerParticipants,
    offeredKg: totalOfferedKg,
    allocations,
    thresholdKg,
    gapKg,
    progressPct: thresholdKg > 0 ? Math.min(100, Math.round(totalCommittedKg / thresholdKg * 100)) : 0,
    ceilingKg: Math.min(totalOfferedKg, capacityKg || totalOfferedKg),
    vehicle: chosen?.vehicle ?? null,
    freightFixed: chosen?.fixed ?? 0,
    freightPerKm: chosen?.perKm ?? 0,
    freightTotal,
    freightPerKg,
    platformFeePerKg: averagePlatformFee,
    headroomPerKg: averageHeadroomPerKg,
    farmerGatePerKg: averageFloor,
    deliveredPerKg: totalCommittedKg > 0 ? round2(buyerTotal / totalCommittedKg) : 0,
    deliveredAtThresholdPerKg: thresholdKg > 0 ? round2(averageFloor + averagePlatformFee + freightTotal / thresholdKg) : 0,
    capacityKg,
    utilisationPct: capacityKg > 0 ? Math.round(totalCommittedKg / capacityKg * 100) : 0,
    viable,
    blockers,
    farmerTotal: totalFarmer,
    farmerMandiTotal: totalFarmerMandi,
    farmerGainTotal,
    farmerGainPct: totalFarmerMandi > 0 ? round2(farmerGainTotal / totalFarmerMandi * 100) : 0,
    buyerTotal,
    buyerCurrentTotal: totalBuyerCurrent,
    buyerSavingPerKg: totalCommittedKg > 0 ? round2(buyerSavingTotal / totalCommittedKg) : 0,
    buyerSavingTotal,
    spreadBeforePerKg,
    spreadAfterPerKg,
    spreadRemovedPerKg: round2(spreadBeforePerKg - spreadAfterPerKg),
    spreadRemovedTotal: Math.round((spreadBeforePerKg - spreadAfterPerKg) * totalCommittedKg),
    multiCropMath,
    regionContributions,
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
  if (math.multiCropMath) {
    const multi = math.multiCropMath
    return [
      {
        label: 'Shared corridor load',
        value: kg(multi.totalCommittedKg),
        note: `${multi.cropMaths.length} compatible crops share one ${multi.vehicle?.type ?? 'unassigned vehicle'}.`,
      },
      {
        label: 'One pooled trip',
        value: rupees(multi.freightTotal),
        note: multi.vehicle
          ? `${multi.vehicle.type} (${kg(multi.capacityKg)} capacity) · ${board.routeDistanceKm} km.`
          : 'No suitable vehicle is currently available.',
      },
      {
        label: 'Allocated freight',
        value: `${rupee(math.freightPerKg)}/kg`,
        note: 'Each crop pays the same proportional per-kilogram share; its own farmer floor and buyer ceiling remain independent.',
      },
      {
        label: 'Separate-trip freight avoided',
        value: rupees(multi.cropMaths.reduce((sum, crop) => sum + crop.freightSavingsTotal, 0)),
        note: 'Compared with dispatching every committed crop as its own vehicle trip.',
      },
      {
        label: 'Corridor status',
        value: multi.corridorStatus.replace('_', ' '),
        note: multi.whyItWorks[0] ?? 'The corridor has no committed load yet.',
      },
    ]
  }

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
