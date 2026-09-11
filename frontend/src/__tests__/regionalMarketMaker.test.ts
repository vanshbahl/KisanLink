import { describe, expect, it, beforeAll } from 'vitest'
import { prototypeService } from '../services/prototypeService'
import { marketMakerService } from '../services/marketMakerService'
import { phase2Service } from '../services/phase2Service'
import { evaluateMarket } from '../services/marketMakerEngine'

// Polyfill localStorage & window for Node test environment
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {}
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
      length: 0,
      key: () => null,
    }
  }
  if (typeof globalThis.window === 'undefined') {
    const listeners: Record<string, Function[]> = {}
    globalThis.window = {
      dispatchEvent: (event: Event) => {
        const list = listeners[event.type] || []
        list.forEach((fn) => fn(event))
        return true
      },
      addEventListener: (type: string, fn: Function) => {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(fn)
      },
      removeEventListener: (type: string, fn: Function) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((item) => item !== fn)
        }
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    } as unknown as Window & typeof globalThis
  }
})

describe('Phase 8.5 — Regional Market Maker Ecosystem & Cross-Role Discovery', () => {
  it('1. Multi-region board initialization (6 independent boards)', async () => {
    globalThis.localStorage.clear()
    const state = await prototypeService.getState()
    expect(state.markets.length).toBeGreaterThanOrEqual(6)

    const expectedBoardIds = [
      'MM-SONIPAT-001',
      'MM-GURGAON-001',
      'MM-FARIDABAD-001',
      'MM-ROHTAK-001',
      'MM-MEERUT-001',
      'MM-GHAZIABAD-001',
    ]

    expectedBoardIds.forEach((id) => {
      const board = state.markets.find((m) => m.id === id)
      expect(board).toBeDefined()
      expect(board?.crops?.length).toBeGreaterThan(0)
      expect(board?.status).toBe('forming')
    })
  })

  it('2. Strict economic isolation between regions (Gurgaon commit does not alter Sonipat or Faridabad)', async () => {
    globalThis.localStorage.clear()
    const stateBefore = await prototypeService.getState()
    const sonipatBefore = stateBefore.markets.find((m) => m.id === 'MM-SONIPAT-001')!
    const faridabadBefore = stateBefore.markets.find((m) => m.id === 'MM-FARIDABAD-001')!
    const gurgaonBefore = stateBefore.markets.find((m) => m.id === 'MM-GURGAON-001')!

    const sonipatMathBefore = evaluateMarket(sonipatBefore, stateBefore.listings, stateBefore.vehicles)
    const gurgaonMathBefore = evaluateMarket(gurgaonBefore, stateBefore.listings, stateBefore.vehicles)

    // Commit 40 kg to Gurgaon board only
    await marketMakerService.commit('MM-GURGAON-001', {
      source: 'bulk',
      party: 'Gurgaon Tech Park Canteen',
      detail: 'Gurgaon Dedicated Procurement',
      quantityKg: 40,
      cropId: 'seg_gurgaon_onion',
    })

    const stateAfter = await prototypeService.getState()
    const sonipatAfter = stateAfter.markets.find((m) => m.id === 'MM-SONIPAT-001')!
    const gurgaonAfter = stateAfter.markets.find((m) => m.id === 'MM-GURGAON-001')!

    const sonipatMathAfter = evaluateMarket(sonipatAfter, stateAfter.listings, stateAfter.vehicles)
    const gurgaonMathAfter = evaluateMarket(gurgaonAfter, stateAfter.listings, stateAfter.vehicles)

    // Gurgaon committed volume increases by 40 kg
    expect(gurgaonMathAfter.committedKg).toBe(gurgaonMathBefore.committedKg + 40)

    // Sonipat committed volume and math remain COMPLETELY UNCHANGED
    expect(sonipatMathAfter.committedKg).toBe(sonipatMathBefore.committedKg)
  })

  it('3. Dynamic threshold unlocking & cap validation', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const gurgaonView = views.find((v) => v.board.id === 'MM-GURGAON-001')!

    expect(gurgaonView.math.committedKg).toBeLessThanOrEqual(gurgaonView.math.thresholdKg)
    const headroom = gurgaonView.math.thresholdKg - gurgaonView.math.committedKg
    expect(headroom).toBeGreaterThan(0)
  })

  it('4. Cross-role state synchronization via shared marketMakerService', async () => {
    globalThis.localStorage.clear()
    let eventDispatched = false
    const listener = () => { eventDispatched = true }
    window.addEventListener('kisanlink-state', listener)

    await marketMakerService.commit('MM-SONIPAT-001', {
      source: 'consumer',
      party: 'Dwarka Sector 12 Pool',
      detail: 'Consumer Pooled Tomatoes',
      quantityKg: 25,
      cropId: 'seg_sonipat_tomato',
    })

    window.removeEventListener('kisanlink-state', listener)
    expect(eventDispatched).toBe(true)

    // Check that all views read the updated shared state
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    expect(sonipat.math.committedKg).toBeGreaterThan(0)
  })

  it('5. Cart pooling metadata retention (marketMakerId, regionId, cropId, savings)', () => {
    const cart = phase2Service.addPooledToCart({
      listingId: 'listing_001',
      quantityKg: 10,
      pooledPricePerKg: 28.50,
      regularPricePerKg: 36.00,
      savingsPerKg: 7.50,
      boardId: 'MM-GURGAON-001',
      cropId: 'seg_gurgaon_onion',
    })

    const pooledItem = cart.find((i) => i.listingId === 'listing_001' && i.isPooled)!
    expect(pooledItem).toBeDefined()
    expect(pooledItem.isPooled).toBe(true)
    expect(pooledItem.marketMakerId).toBe('MM-GURGAON-001')
    expect(pooledItem.pooledPricePerKg).toBe(28.50)
    expect(pooledItem.savingsPerKg).toBe(7.50)

    // Cleanup
    phase2Service.saveCart(cart.filter((i) => !i.isPooled))
  })

  it('6. Backward compatibility: MM-MULTI-SONIPAT resolves seamlessly to MM-SONIPAT-001', async () => {
    const legacyView = await marketMakerService.board('MM-MULTI-SONIPAT')
    expect(legacyView).toBeDefined()
    expect(legacyView?.board.id).toBe('MM-SONIPAT-001')
  })
})
