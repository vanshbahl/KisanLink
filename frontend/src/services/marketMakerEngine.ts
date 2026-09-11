import type { FarmerListing, MarketCropSegment, MarketMakerBoard, MarketSupplyLot, Vehicle } from '../types'

/**
 * KisanLink Market Maker — the deterministic feasibility engine.
 * Supports BOTH Single-Crop and Multi-Crop Shared Transport Corridors.
 *
 * There is no model and no prediction here. A direct farm-to-buyer trip has a *fixed* cost
 * (a driver, a vehicle, a set number of kilometres) that does not shrink when the load does.
 * That single fact is why fragmented demand cannot buy direct today: 15 kg carries the whole
 * trip, 331 kg splits it. The Market Maker's job is to find the exact volume at which the
 * trip pays for itself while the farmer still clears their floor, and then to assemble that
 * volume out of demand and supply that are individually too small to matter.
 *
 * Multi-Crop Shared Transport:
 * Multiple compatible crops (e.g. Tomatoes + Onions + Potatoes) sharing the same corridor vehicle.
 * Freight cost is allocated proportionally by weight (cropQuantity / totalQuantity * totalFreight).
 * Crop-level floor/ceiling economics remain strictly independent per crop.
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
  isMultiCrop: boolean
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
  regionContributions?: RegionContribution[]
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
  /** Multi-crop detailed economics & compatibility structure */
  multiCropMath?: MultiCropMath
  regionContributions?: RegionContribution[]
}

const round2 = (value: number) => Math.round(value * 100) / 100
const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`
const rupee = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
/** Trip totals are whole rupees; only per-kg figures carry paise. */
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/** Compute multi-region NCR supply contribution breakdown by origin region */
export function computeRegionContributions(board: MarketMakerBoard): RegionContribution[] {
  const map = new Map<string, { regionId: string; regionName: string; offeredKg: number; committedKg: number; crops: Set<string> }>()
  
  const processLot = (lot: MarketSupplyLot, cropName?: string) => {
    let name = lot.regionName
    if (!name) {
      const loc = lot.location || ''
      if (loc.toLowerCase().includes('sonipat') || loc.toLowerCase().includes('murthal') || loc.toLowerCase().includes('gannaur') || loc.toLowerCase().includes('rai') || loc.toLowerCase().includes('bahalgarh')) name = 'Sonipat'
      else if (loc.toLowerCase().includes('rohtak') || loc.toLowerCase().includes('kalanaur')) name = 'Rohtak'
      else if (loc.toLowerCase().includes('meerut') || loc.toLowerCase().includes('hastinapur') || loc.toLowerCase().includes('sardhana')) name = 'Meerut'
      else if (loc.toLowerCase().includes('ghaziabad') || loc.toLowerCase().includes('loni') || loc.toLowerCase().includes('muradnagar')) name = 'Ghaziabad'
      else name = 'Sonipat'
    }
    const id = lot.regionId || `reg_${name.toLowerCase()}`

    let entry = map.get(id)
    if (!entry) {
      entry = { regionId: id, regionName: name, offeredKg: 0, committedKg: 0, crops: new Set() }
      map.set(id, entry)
    }
    entry.offeredKg += lot.offeredKg
    if (cropName) entry.crops.add(cropName)
    else if (board.crop) entry.crops.add(board.crop)
  }

  if (board.isMultiCrop && board.crops && board.crops.length > 0) {
    board.crops.forEach((c) => {
      c.lots.forEach((lot) => processLot(lot, c.crop))
    })
  } else {
    board.lots.forEach((lot) => processLot(lot, board.crop))
  }

  const totalOffered = Array.from(map.values()).reduce((sum, e) => sum + e.offeredKg, 0)
  const totalCommitted = board.isMultiCrop && board.crops
    ? board.crops.reduce((sum, c) => sum + c.commitments.reduce((s, item) => s + item.quantityKg, 0), 0)
    : board.commitments.reduce((sum, item) => sum + item.quantityKg, 0)

  return Array.from(map.values()).map((entry) => {
    const fraction = totalOffered > 0 ? entry.offeredKg / totalOffered : 0
    return {
      regionId: entry.regionId,
      regionName: entry.regionName,
      offeredKg: entry.offeredKg,
      committedKg: Math.round(fraction * totalCommitted),
      crops: Array.from(entry.crops),
    }
  })
}

/** Check compatibility between crops in a shared transport corridor */
export function checkCropCompatibility(crops: MarketCropSegment[]): { compatible: boolean; reason?: string } {
  if (!crops || crops.length <= 1) return { compatible: true }

  const types = crops.map((c) => c.storageType || 'ambient')
  const uniqueTypes = new Set(types)

  if (uniqueTypes.has('cold_chain') && uniqueTypes.has('ambient')) {
    return {
      compatible: false,
      reason: 'Handling/storage requirements are incompatible: Ambient produce (Tomatoes/Onions) cannot share un-refrigerated transport with Cold Chain produce.',
    }
  }

  if (uniqueTypes.has('delicate') && uniqueTypes.has('dry')) {
    return {
      compatible: false,
      reason: 'Handling/storage requirements are incompatible: Delicate produce cannot be pooled under heavy dry grain cargo.',
    }
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
 * already committed to this market's own route once the market exists.
 */
function candidateVehicles(board: MarketMakerBoard, vehicles: Vehicle[]) {
  if (board.vehicleId) {
    const specific = vehicles.filter((v) => v.id === board.vehicleId)
    if (specific.length > 0) return specific
  }
  return vehicles.filter((vehicle) =>
    vehicle.status === 'available' || Boolean(board.routeId && vehicle.currentAssignment === board.routeId))
}

export function evaluateMarket(board: MarketMakerBoard, listings: FarmerListing[], vehicles: Vehicle[]): MarketMath {
  // Check if this board is configured with multi-crop segments
  const isMulti = Boolean(board.isMultiCrop && board.crops && board.crops.length > 0)

  if (isMulti && board.crops) {
    return evaluateMultiCropMarket(board, board.crops, listings, vehicles)
  }

  // Fall back to standard Single-Crop evaluation
  const singleMath = evaluateSingleCropMarket(board, listings, vehicles)
  
  // Attach synthetic multiCropMath for single-crop boards so UI can consume uniformly
  const singleSegment: MarketCropSegment = {
    id: board.id,
    crop: board.crop,
    cropHi: board.cropHi,
    grade: board.grade,
    imageSrc: board.imageSrc,
    visual: board.visual,
    farmerFloorPerKg: board.farmerFloorPerKg,
    mandiPricePerKg: board.mandiPricePerKg,
    buyerCeilingPerKg: board.buyerCeilingPerKg,
    buyerCurrentPerKg: board.buyerCurrentPerKg,
    platformFeePct: board.platformFeePct,
    lots: board.lots,
    commitments: board.commitments,
  }

  const standaloneFreightShare = singleMath.freightTotal
  const singleCropSegmentMath: CropSegmentMath = {
    segment: singleSegment,
    committedKg: singleMath.committedKg,
    consumerKg: singleMath.consumerKg,
    bulkKg: singleMath.bulkKg,
    offeredKg: singleMath.offeredKg,
    allocations: singleMath.allocations,
    farmerFloorPerKg: board.farmerFloorPerKg,
    mandiPricePerKg: board.mandiPricePerKg,
    buyerCeilingPerKg: board.buyerCeilingPerKg,
    buyerCurrentPerKg: board.buyerCurrentPerKg,
    platformFeePerKg: singleMath.platformFeePerKg,
    headroomPerKg: singleMath.headroomPerKg,
    allocatedFreightShare: standaloneFreightShare,
    allocatedFreightPerKg: singleMath.freightPerKg,
    standaloneFreightTotal: standaloneFreightShare,
    standaloneFreightPerKg: singleMath.freightPerKg,
    freightSavingsTotal: 0,
    deliveredPerKg: singleMath.deliveredPerKg,
    buyerSavingPerKg: singleMath.buyerSavingPerKg,
    buyerSavingTotal: singleMath.buyerSavingTotal,
    farmerTotal: singleMath.farmerTotal,
    farmerMandiTotal: singleMath.farmerMandiTotal,
    farmerGainTotal: singleMath.farmerGainTotal,
    viable: singleMath.viable,
    progressPct: singleMath.progressPct,
  }

  singleMath.multiCropMath = {
    isMultiCrop: false,
    cropMaths: [singleCropSegmentMath],
    totalCommittedKg: singleMath.committedKg,
    totalOfferedKg: singleMath.offeredKg,
    totalHeadroom: round2(singleMath.headroomPerKg * singleMath.committedKg),
    vehicle: singleMath.vehicle,
    freightTotal: singleMath.freightTotal,
    capacityKg: singleMath.capacityKg,
    utilisationPct: singleMath.utilisationPct,
    compatibility: { compatible: true },
    corridorStatus: singleMath.viable ? 'viable' : singleMath.blockers.some((b) => b.kind !== 'demand') ? 'infeasible' : 'forming',
    viable: singleMath.viable,
    blockers: singleMath.blockers,
    whyItWorks: [
      `✓ Single-crop corridor dedicated to ${board.crop}`,
      `✓ Total committed volume: ${kg(singleMath.committedKg)} / break-even ${kg(singleMath.thresholdKg)}`,
      singleMath.viable ? `✓ Direct freight ${rupee(singleMath.freightPerKg)}/kg fits within buyer ceiling ${rupee(board.buyerCeilingPerKg)}/kg` : `⚠️ ${singleMath.gapKg} kg additional demand needed for break-even`,
    ],
  }

  return singleMath
}

function evaluateSingleCropMarket(board: MarketMakerBoard, listings: FarmerListing[], vehicles: Vehicle[]): MarketMath {
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

/** Multi-Crop Shared Transport Engine */
function evaluateMultiCropMarket(
  board: MarketMakerBoard,
  crops: MarketCropSegment[],
  listings: FarmerListing[],
  vehicles: Vehicle[]
): MarketMath {
  const compatibility = checkCropCompatibility(crops)

  // 1. Process crop-level commitments, supply lots, and independent economics
  let totalCommittedKg = 0
  let totalConsumerKg = 0
  let totalBulkKg = 0
  let totalOfferedKg = 0
  let totalParticipants = 0
  let totalConsumerParticipants = 0
  let totalHeadroom = 0
  const allAllocations: MarketAllocation[] = []

  const cropMaths: CropSegmentMath[] = crops.map((segment) => {
    const committedKg = segment.commitments.reduce((sum, item) => sum + item.quantityKg, 0)
    const consumerKg = segment.commitments.filter((item) => item.source === 'consumer').reduce((sum, item) => sum + item.quantityKg, 0)
    const bulkKg = committedKg - consumerKg

    const availability = segment.lots.map((lot) => ({ lot, availableKg: resolveLotAvailability(lot, listings) }))
    const offeredKg = availability.reduce((sum, entry) => sum + entry.availableKg, 0)

    const platformFeePerKg = round2(segment.farmerFloorPerKg * segment.platformFeePct)
    const headroomPerKg = round2(segment.buyerCeilingPerKg - segment.farmerFloorPerKg - platformFeePerKg)
    const cropHeadroomTotal = round2(headroomPerKg * committedKg)

    totalCommittedKg += committedKg
    totalConsumerKg += consumerKg
    totalBulkKg += bulkKg
    totalOfferedKg += offeredKg
    totalParticipants += segment.commitments.length
    totalConsumerParticipants += segment.commitments.filter((item) => item.source === 'consumer').length
    totalHeadroom += cropHeadroomTotal

    const ordered = [...availability].sort((a, b) => a.lot.detourKm - b.lot.detourKm || b.availableKg - a.availableKg)
    let remaining = Math.min(committedKg, offeredKg)
    const allocations: MarketAllocation[] = ordered.map((entry) => {
      const allocatedKg = Math.max(0, Math.min(entry.availableKg, remaining))
      remaining -= allocatedKg
      return { lot: entry.lot, availableKg: entry.availableKg, allocatedKg }
    })
    allAllocations.push(...allocations)

    return {
      segment,
      committedKg,
      consumerKg,
      bulkKg,
      offeredKg,
      allocations,
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

  // 2. Select vehicle based on total combined corridor weight
  const weightedHeadroomPerKg = totalCommittedKg > 0 ? round2(totalHeadroom / totalCommittedKg) : round2(cropMaths.reduce((sum, c) => sum + c.headroomPerKg, 0) / (crops.length || 1))

  const priced = candidateVehicles(board, vehicles)
    .map((vehicle) => {
      const model = freightModel(vehicle.capacityKg)
      const freightTotal = Math.round(model.fixed + model.perKm * board.routeDistanceKm)
      const thresholdKg = weightedHeadroomPerKg > 0 ? Math.ceil(freightTotal / weightedHeadroomPerKg) : Number.POSITIVE_INFINITY
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

  const thresholdKg = chosen ? chosen.thresholdKg : Number.POSITIVE_INFINITY
  const freightTotal = chosen ? chosen.freightTotal : 0
  const capacityKg = chosen ? chosen.vehicle.capacityKg : 0
  const allocatedFreightPerKg = totalCommittedKg > 0 && chosen ? round2(freightTotal / totalCommittedKg) : 0

  // 3. Proportional Shared Freight Allocation across crops
  cropMaths.forEach((c) => {
    c.allocatedFreightShare = totalCommittedKg > 0 ? round2((c.committedKg / totalCommittedKg) * freightTotal) : 0
    c.allocatedFreightPerKg = c.committedKg > 0 ? round2(c.allocatedFreightShare / c.committedKg) : allocatedFreightPerKg

    // Standalone trip cost for shipping this crop alone in the same corridor vehicle
    const standaloneModel = chosen ? freightModel(chosen.vehicle.capacityKg) : { fixed: 0, perKm: 0 }
    c.standaloneFreightTotal = chosen ? Math.round(standaloneModel.fixed + standaloneModel.perKm * board.routeDistanceKm) : 0
    c.standaloneFreightPerKg = c.committedKg > 0 ? round2(c.standaloneFreightTotal / c.committedKg) : 0
    c.freightSavingsTotal = Math.max(0, Math.round(c.standaloneFreightTotal - c.allocatedFreightShare))

    c.deliveredPerKg = c.committedKg > 0 ? round2(c.farmerFloorPerKg + c.allocatedFreightPerKg + c.platformFeePerKg) : 0
    c.buyerSavingPerKg = c.committedKg > 0 ? round2(c.buyerCurrentPerKg - c.deliveredPerKg) : 0
    c.buyerSavingTotal = Math.round(c.buyerSavingPerKg * c.committedKg)
    c.farmerTotal = Math.round(c.committedKg * c.farmerFloorPerKg)
    c.farmerMandiTotal = Math.round(c.committedKg * c.mandiPricePerKg)
    c.farmerGainTotal = c.farmerTotal - c.farmerMandiTotal
    c.viable = c.committedKg > 0 && c.deliveredPerKg <= c.buyerCeilingPerKg
    c.progressPct = Number.isFinite(thresholdKg) && thresholdKg > 0 ? Math.min(100, Math.round((c.committedKg / (c.offeredKg || 1)) * 100)) : 0
  })

  // 4. Evaluate Corridor Blockers & Viability
  const blockers: MarketBlocker[] = []
  if (!compatibility.compatible) {
    blockers.push({
      kind: 'compatibility',
      title: 'Incompatible crop handling requirements',
      detail: compatibility.reason || 'Crops cannot share transport due to storage temperature or handling conflict.',
    })
  }
  if (!chosen) {
    blockers.push({
      kind: 'vehicle',
      title: 'No vehicle available for this multi-crop corridor',
      detail: 'Every vehicle that could run this route is assigned elsewhere or in maintenance.',
    })
  } else if (!feasible) {
    if (thresholdKg > capacityKg) blockers.push({
      kind: 'capacity',
      title: 'Combined break-even volume exceeds vehicle capacity',
      detail: `${chosen.vehicle.type} needs ${kg(thresholdKg)} combined load but only holds ${kg(capacityKg)}.`,
    })
    else if (thresholdKg > totalOfferedKg) blockers.push({
      kind: 'supply',
      title: 'Total corridor supply is below break-even',
      detail: `All farms combined offered ${kg(totalOfferedKg)}; vehicle needs ${kg(thresholdKg)} total.`,
    })
    else blockers.push({
      kind: 'capacity',
      title: 'Committed multi-crop demand exceeds vehicle capacity',
      detail: `${kg(totalCommittedKg)} committed but largest free vehicle holds ${kg(capacityKg)}.`,
    })
  }

  const gapKg = chosen && Number.isFinite(thresholdKg) ? Math.max(0, thresholdKg - totalCommittedKg) : 0
  if (chosen && feasible && gapKg > 0) blockers.push({
    kind: 'demand',
    title: `${kg(gapKg)} short of a viable multi-crop corridor`,
    detail: `At ${kg(totalCommittedKg)} combined load, the ${rupees(freightTotal)} trip works out to ${rupee(allocatedFreightPerKg)}/kg across pooled crops.`,
  })

  const allCropsViable = cropMaths.every((c) => c.committedKg === 0 || c.deliveredPerKg <= c.buyerCeilingPerKg)
  const viable = Boolean(compatibility.compatible) && Boolean(chosen) && Boolean(feasible) && gapKg === 0 && totalCommittedKg <= capacityKg && totalCommittedKg <= totalOfferedKg && totalCommittedKg > 0 && allCropsViable

  let corridorStatus: 'forming' | 'partially_viable' | 'viable' | 'infeasible' = 'forming'
  if (!compatibility.compatible || !chosen || totalCommittedKg > capacityKg) {
    corridorStatus = 'infeasible'
  } else if (viable) {
    corridorStatus = 'viable'
  } else if (totalCommittedKg > 0 && (gapKg === 0 || allCropsViable)) {
    corridorStatus = 'partially_viable'
  } else {
    corridorStatus = 'forming'
  }

  // 5. Build Explainability Statements ("WHY THIS CORRIDOR WORKS / FAILS")
  const whyItWorks: string[] = []
  if (!compatibility.compatible) {
    whyItWorks.push(`🔴 Incompatible crops: ${compatibility.reason}`)
  } else {
    whyItWorks.push(`✓ ${totalCommittedKg} kg total produce pooled across ${crops.length} crops`)
    if (chosen) {
      const util = Math.round((totalCommittedKg / capacityKg) * 100)
      whyItWorks.push(`✓ ${util}% vehicle capacity utilization (${chosen.vehicle.type} · ${capacityKg} kg cap)`)
    }
    whyItWorks.push(`✓ Proportional freight allocation: ₹${allocatedFreightPerKg}/kg across all pooled items`)
    const totalFreightSavings = cropMaths.reduce((sum, c) => sum + c.freightSavingsTotal, 0)
    if (totalFreightSavings > 0) {
      whyItWorks.push(`✓ Total logistics savings via pooling: ${rupees(totalFreightSavings)} vs separate shipments`)
    }
    if (allCropsViable) {
      whyItWorks.push(`✓ All crop delivered prices remain below buyer ceiling price limits`)
    } else {
      whyItWorks.push(`⚠️ One or more crops exceed buyer ceiling delivered prices`)
    }
  }

  const regionContributions = computeRegionContributions(board)

  const multiCropMath: MultiCropMath = {
    isMultiCrop: true,
    cropMaths,
    totalCommittedKg,
    totalOfferedKg,
    totalHeadroom,
    vehicle: chosen?.vehicle ?? null,
    freightTotal,
    capacityKg,
    utilisationPct: capacityKg ? Math.round((totalCommittedKg / capacityKg) * 100) : 0,
    compatibility,
    corridorStatus,
    viable,
    blockers,
    whyItWorks,
    regionContributions,
  }

  // Synthesize top-level MarketMath for legacy components reading top-level fields
  const avgFloor = round2(cropMaths.reduce((sum, c) => sum + c.farmerFloorPerKg * c.committedKg, 0) / (totalCommittedKg || 1))
  const avgMandi = round2(cropMaths.reduce((sum, c) => sum + c.mandiPricePerKg * c.committedKg, 0) / (totalCommittedKg || 1))
  const avgCeiling = round2(cropMaths.reduce((sum, c) => sum + c.buyerCeilingPerKg * c.committedKg, 0) / (totalCommittedKg || 1))
  const avgCurrent = round2(cropMaths.reduce((sum, c) => sum + c.buyerCurrentPerKg * c.committedKg, 0) / (totalCommittedKg || 1))
  const totalFarmerGain = cropMaths.reduce((sum, c) => sum + c.farmerGainTotal, 0)
  const totalBuyerSaving = cropMaths.reduce((sum, c) => sum + c.buyerSavingTotal, 0)

  return {
    committedKg: totalCommittedKg,
    consumerKg: totalConsumerKg,
    bulkKg: totalBulkKg,
    participants: totalParticipants,
    consumerParticipants: totalConsumerParticipants,
    offeredKg: totalOfferedKg,
    allocations: allAllocations,
    thresholdKg,
    gapKg,
    progressPct: Number.isFinite(thresholdKg) && thresholdKg > 0 ? Math.round((totalCommittedKg / thresholdKg) * 100) : 0,
    ceilingKg: Math.min(totalOfferedKg, capacityKg || totalOfferedKg),
    vehicle: chosen?.vehicle ?? null,
    freightFixed: chosen?.fixed ?? 0,
    freightPerKm: chosen?.perKm ?? 0,
    freightTotal,
    freightPerKg: allocatedFreightPerKg,
    platformFeePerKg: round2(avgFloor * (board.platformFeePct || 0.02)),
    headroomPerKg: round2(avgCeiling - avgFloor),
    farmerGatePerKg: avgFloor,
    deliveredPerKg: round2(avgFloor + allocatedFreightPerKg),
    deliveredAtThresholdPerKg: chosen ? round2(avgFloor + freightTotal / thresholdKg) : 0,
    capacityKg,
    utilisationPct: capacityKg ? Math.round((totalCommittedKg / capacityKg) * 100) : 0,
    viable,
    blockers,
    farmerTotal: cropMaths.reduce((sum, c) => sum + c.farmerTotal, 0),
    farmerMandiTotal: cropMaths.reduce((sum, c) => sum + c.farmerMandiTotal, 0),
    farmerGainTotal: totalFarmerGain,
    farmerGainPct: 15,
    buyerTotal: Math.round(totalCommittedKg * avgFloor + freightTotal),
    buyerCurrentTotal: Math.round(totalCommittedKg * avgCurrent),
    buyerSavingPerKg: round2(avgCurrent - (avgFloor + allocatedFreightPerKg)),
    buyerSavingTotal: totalBuyerSaving,
    spreadBeforePerKg: round2(avgCurrent - avgMandi),
    spreadAfterPerKg: allocatedFreightPerKg,
    spreadRemovedPerKg: round2((avgCurrent - avgMandi) - allocatedFreightPerKg),
    spreadRemovedTotal: totalBuyerSaving + totalFarmerGain,
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
 * The audit trail behind "why is this viable?".
 */
export function explainMarket(board: MarketMakerBoard, math: MarketMath): MarketDerivationStep[] {
  if (math.multiCropMath && math.multiCropMath.isMultiCrop) {
    const multi = math.multiCropMath
    return [
      {
        label: 'Corridor Mode',
        value: 'Multi-Crop Shared Transport',
        note: `Pooling ${multi.cropMaths.length} compatible crops into a single vehicle (${multi.vehicle?.type ?? 'Unassigned'}).`,
      },
      {
        label: 'Shared Trip Freight',
        value: rupees(multi.freightTotal),
        note: multi.vehicle
          ? `${multi.vehicle.type} (${multi.capacityKg} kg cap) · Route distance ${board.routeDistanceKm} km.`
          : 'No vehicle available.',
      },
      {
        label: 'Proportional Freight Share',
        value: `${rupee(math.freightPerKg)}/kg`,
        note: `Freight cost allocated proportionally across ${kg(multi.totalCommittedKg)} combined load.`,
      },
      {
        label: 'Total Freight Savings',
        value: rupees(multi.cropMaths.reduce((sum, c) => sum + c.freightSavingsTotal, 0)),
        note: 'Savings achieved by pooling vs dispatching separate standalone trips for each crop.',
      },
      {
        label: 'Corridor Status',
        value: multi.corridorStatus.toUpperCase(),
        note: multi.whyItWorks[0] || (multi.viable ? 'Corridor is fully viable.' : 'Corridor is forming.'),
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

