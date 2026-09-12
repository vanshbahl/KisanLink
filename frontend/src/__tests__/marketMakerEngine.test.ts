import { beforeEach, describe, expect, it } from 'vitest'
import { checkCropCompatibility, evaluateMarket } from '../services/marketMakerEngine'
import { marketMakerService } from '../services/marketMakerService'
import { prototypeService } from '../services/prototypeService'

beforeEach(async () => {
  localStorage.clear()
  await prototypeService.seedScenario('market')
})

describe('Market Maker engine', () => {
  it('preserves the canonical single-crop corridor behavior', async () => {
    const view = await marketMakerService.board()
    expect(view?.board.id).toBe('MM-TOM-SONIPAT')
    expect(view?.math.multiCropMath).toBeUndefined()
    expect(Number.isFinite(view!.math.deliveredPerKg)).toBe(true)
  })

  it('allocates one shared freight total proportionally across crop segments', async () => {
    const view = await marketMakerService.board('MM-SONIPAT-001')
    const crops = view!.math.multiCropMath!.cropMaths
    expect(crops.length).toBeGreaterThan(1)
    expect(crops.reduce((sum, crop) => sum + crop.allocatedFreightShare, 0)).toBeCloseTo(view!.math.freightTotal, 6)
    expect(crops.every((crop) => Number.isFinite(crop.deliveredPerKg))).toBe(true)
    expect(view!.math.committedKg).toBe(crops.reduce((sum, crop) => sum + crop.committedKg, 0))
  })

  it('does not cross-subsidize a crop whose own ceiling cannot cover its floor and fee', async () => {
    const state = await prototypeService.getState()
    const board = structuredClone(state.markets.find((item) => item.id === 'MM-SONIPAT-001')!)
    board.crops![0].buyerCeilingPerKg = board.crops![0].farmerFloorPerKg
    const math = evaluateMarket(board, state.listings, state.vehicles)
    expect(math.multiCropMath!.cropMaths[0].viable).toBe(false)
    expect(math.viable).toBe(false)
  })

  it('reports capacity or supply constraints without NaN or Infinity', async () => {
    const state = await prototypeService.getState()
    const board = structuredClone(state.markets.find((item) => item.id === 'MM-SONIPAT-001')!)
    board.crops!.forEach((crop, index) => crop.commitments.push({ id: `over-${index}`, source: 'bulk', party: 'Stress test', detail: 'Capacity', quantityKg: 2500, committedAt: new Date().toISOString() }))
    const math = evaluateMarket(board, state.listings, state.vehicles)
    expect(math.viable).toBe(false)
    expect(math.blockers.some((blocker) => blocker.kind === 'capacity' || blocker.kind === 'supply')).toBe(true)
    expect([math.committedKg, math.offeredKg, math.deliveredPerKg, math.buyerTotal].every(Number.isFinite)).toBe(true)
  })

  it('rejects incompatible storage combinations', async () => {
    const view = await marketMakerService.board('MM-SONIPAT-001')
    const crops = structuredClone(view!.board.crops!)
    crops[0].storageType = 'cold_chain'
    crops[1].storageType = 'ambient'
    expect(checkCropCompatibility(crops).compatible).toBe(false)
  })
})
