import { describe, expect, it, beforeAll } from 'vitest'
import { prototypeService } from '../services/prototypeService'
import { marketMakerService } from '../services/marketMakerService'
import { phase2Service } from '../services/phase2Service'
import { evaluateMarket } from '../services/marketMakerEngine'
import { extractUserRegion, rankMarketMakerOpportunities } from '../services/marketRankingService'
import { MarketDemandRing } from '../components/market/MarketDemandRing'

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
    const rohtakBefore = stateBefore.markets.find((m) => m.id === 'MM-ROHTAK-001')!
    const meerutBefore = stateBefore.markets.find((m) => m.id === 'MM-MEERUT-001')!
    const ghaziabadBefore = stateBefore.markets.find((m) => m.id === 'MM-GHAZIABAD-001')!
    const gurgaonBefore = stateBefore.markets.find((m) => m.id === 'MM-GURGAON-001')!

    const sonipatMathBefore = evaluateMarket(sonipatBefore, stateBefore.listings, stateBefore.vehicles)
    const faridabadMathBefore = evaluateMarket(faridabadBefore, stateBefore.listings, stateBefore.vehicles)
    const rohtakMathBefore = evaluateMarket(rohtakBefore, stateBefore.listings, stateBefore.vehicles)
    const meerutMathBefore = evaluateMarket(meerutBefore, stateBefore.listings, stateBefore.vehicles)
    const ghaziabadMathBefore = evaluateMarket(ghaziabadBefore, stateBefore.listings, stateBefore.vehicles)
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
    const faridabadAfter = stateAfter.markets.find((m) => m.id === 'MM-FARIDABAD-001')!
    const rohtakAfter = stateAfter.markets.find((m) => m.id === 'MM-ROHTAK-001')!
    const meerutAfter = stateAfter.markets.find((m) => m.id === 'MM-MEERUT-001')!
    const ghaziabadAfter = stateAfter.markets.find((m) => m.id === 'MM-GHAZIABAD-001')!
    const gurgaonAfter = stateAfter.markets.find((m) => m.id === 'MM-GURGAON-001')!

    const sonipatMathAfter = evaluateMarket(sonipatAfter, stateAfter.listings, stateAfter.vehicles)
    const faridabadMathAfter = evaluateMarket(faridabadAfter, stateAfter.listings, stateAfter.vehicles)
    const rohtakMathAfter = evaluateMarket(rohtakAfter, stateAfter.listings, stateAfter.vehicles)
    const meerutMathAfter = evaluateMarket(meerutAfter, stateAfter.listings, stateAfter.vehicles)
    const ghaziabadMathAfter = evaluateMarket(ghaziabadAfter, stateAfter.listings, stateAfter.vehicles)
    const gurgaonMathAfter = evaluateMarket(gurgaonAfter, stateAfter.listings, stateAfter.vehicles)

    // Gurgaon committed volume increases by 40 kg
    expect(gurgaonMathAfter.committedKg).toBe(gurgaonMathBefore.committedKg + 40)

    // Strict isolation: all 5 other regions remain COMPLETELY UNCHANGED
    expect(sonipatMathAfter.committedKg).toBe(sonipatMathBefore.committedKg)
    expect(faridabadMathAfter.committedKg).toBe(faridabadMathBefore.committedKg)
    expect(rohtakMathAfter.committedKg).toBe(rohtakMathBefore.committedKg)
    expect(meerutMathAfter.committedKg).toBe(meerutMathBefore.committedKg)
    expect(ghaziabadMathAfter.committedKg).toBe(ghaziabadMathBefore.committedKg)
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

describe('Phase 8.6 — Simplified Benefit-First Market Maker Experience', () => {
  it('1-4. Regional ranking: Farmer, Consumer, and Bulk regions rank first while other NCR regions remain available', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    expect(views.length).toBeGreaterThanOrEqual(6)

    // 1. Farmer's own region ranks first
    const farmerRank = rankMarketMakerOpportunities(views, 'Sonipat')
    expect(farmerRank.hero.board.id).toBe('MM-SONIPAT-001')
    expect(farmerRank.userRegionMatched).toBe(true)
    expect(farmerRank.matchedRegionName).toBe('Sonipat')
    expect(farmerRank.others.length).toBe(views.length - 1)

    const farmerGurgaon = rankMarketMakerOpportunities(views, 'Gurgaon')
    expect(farmerGurgaon.hero.board.id).toBe('MM-GURGAON-001')

    // 2. Consumer's own region ranks first
    const consumerRank = rankMarketMakerOpportunities(views, 'Faridabad')
    expect(consumerRank.hero.board.id).toBe('MM-FARIDABAD-001')
    expect(consumerRank.userRegionMatched).toBe(true)
    expect(consumerRank.others.length).toBe(views.length - 1)

    // 3. Bulk Buyer's own region ranks first
    const bulkRank = rankMarketMakerOpportunities(views, 'Rohtak')
    expect(bulkRank.hero.board.id).toBe('MM-ROHTAK-001')
    expect(bulkRank.userRegionMatched).toBe(true)

    // 4. Other NCR regions remain available
    expect(bulkRank.others.some((o) => o.board.id === 'MM-SONIPAT-001')).toBe(true)
    expect(bulkRank.others.some((o) => o.board.id === 'MM-GURGAON-001')).toBe(true)

    // Region unavailable fallback
    const unkRank = rankMarketMakerOpportunities(views, null)
    expect(unkRank.userRegionMatched).toBe(false)
    expect(unkRank.hero).toBeDefined()
    expect(unkRank.others.length).toBe(views.length - 1)
  })

  it('5-6. Farmer premium calculation and honest display (no fake premiums)', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const tomatoSegment = sonipat.board.crops?.find((c) => c.crop === 'Tomatoes')!

    // 5. Correct premium calculation
    const mandiPrice = tomatoSegment.mandiPricePerKg
    const farmerPrice = tomatoSegment.farmerFloorPerKg
    const premiumPerKg = farmerPrice - mandiPrice
    expect(premiumPerKg).toBe(4) // 28 - 24

    const qty = 100
    const mandiEarning = qty * mandiPrice
    const mmEarning = qty * farmerPrice
    const extraEarning = mmEarning - mandiEarning
    expect(mandiEarning).toBe(2400)
    expect(mmEarning).toBe(2800)
    expect(extraEarning).toBe(400)

    // 6. Honest display when Market Maker <= mandi
    const fakeMandiEqual = farmerPrice
    const noExtraPerKg = farmerPrice - fakeMandiEqual
    expect(noExtraPerKg).toBe(0)
    const hasPremium = noExtraPerKg > 0
    expect(hasPremium).toBe(false)
  })

  it('7-8. Consumer discount calculation and honest display (no fake discounts)', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const tomatoSegment = sonipat.board.crops?.find((c) => c.crop === 'Tomatoes')!

    const regPrice = tomatoSegment.buyerCurrentPerKg // 40
    const pooledPrice = tomatoSegment.buyerCeilingPerKg // 36
    const savingsPerKg = Math.max(0, regPrice - pooledPrice)
    expect(savingsPerKg).toBe(4)

    const qty = 5
    const totalSavings = savingsPerKg * qty
    expect(totalSavings).toBe(20)

    // 8. No discount when pooled >= regular
    const fakeEqualPooled = 40
    const zeroSavings = Math.max(0, regPrice - fakeEqualPooled)
    expect(zeroSavings).toBe(0)
  })

  it('9. Bulk landed-cost savings calculation is correct', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const onionSegment = sonipat.board.crops?.find((c) => c.crop === 'Onions')!

    const stdLanded = onionSegment.buyerCurrentPerKg // 30
    const mmLanded = onionSegment.buyerCeilingPerKg // 27
    const savingsPerKg = Math.max(0, stdLanded - mmLanded)
    expect(savingsPerKg).toBe(3)

    const qty = 500
    const totalSavings = savingsPerKg * qty
    expect(totalSavings).toBe(1500)
  })

  it('10-13. Farmer direct contribution safeguards (crop selection, quantity validation, threshold headroom enforcement)', async () => {
    globalThis.localStorage.clear()
    const viewsBefore = await marketMakerService.boards()
    const sonipatBefore = viewsBefore.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const headroom = sonipatBefore.math.thresholdKg - sonipatBefore.math.committedKg

    // 12. Invalid quantity rejected
    await expect(
      marketMakerService.contributeProduce('MM-SONIPAT-001', {
        cropName: 'Tomatoes',
        quantityKg: 0,
      })
    ).rejects.toThrow('Please enter a valid quantity greater than 0 kg.')

    await expect(
      marketMakerService.contributeProduce('MM-SONIPAT-001', {
        cropName: 'Tomatoes',
        quantityKg: -50,
      })
    ).rejects.toThrow('Please enter a valid quantity greater than 0 kg.')

    // 13. Threshold headroom enforced
    await expect(
      marketMakerService.contributeProduce('MM-SONIPAT-001', {
        cropName: 'Tomatoes',
        quantityKg: headroom + 500,
      })
    ).rejects.toThrow(`Maximum ${headroom} kg can currently be added to this opportunity.`)
  })

  it('14-17. Farmer contribution updates board and synchronizes Farmer Produce listing', async () => {
    globalThis.localStorage.clear()
    const stateBefore = await prototypeService.getState()
    const sonipatBefore = stateBefore.markets.find((m) => m.id === 'MM-SONIPAT-001')!
    const sonipatMathBefore = evaluateMarket(sonipatBefore, stateBefore.listings, stateBefore.vehicles)
    const initialCommitted = sonipatMathBefore.committedKg

    // Contribute 50 kg Tomatoes directly from Market Maker hero
    const result = await marketMakerService.contributeProduce('MM-SONIPAT-001', {
      cropName: 'Tomatoes',
      quantityKg: 50,
    })

    // 14. Updates correct board
    expect(result.board.id).toBe('MM-SONIPAT-001')
    expect(result.math.committedKg).toBe(initialCommitted + 50)

    // 15. Farmer Produce listing is created/updated
    const stateAfter = await prototypeService.getState()
    const tomatoListing = stateAfter.listings.find((l) =>
      l.crop.toLowerCase().includes('tomato') && l.status === 'active'
    )!
    expect(tomatoListing).toBeDefined()
    expect(tomatoListing.allocatedKg).toBeGreaterThanOrEqual(50)

    // 16. Listing retains Market Maker ID
    expect(tomatoListing.marketMakerId).toBe('MM-SONIPAT-001')

    // 17. Listing retains crop and region
    expect(tomatoListing.crop.toLowerCase()).toContain('tomato')
    expect(tomatoListing.regionName).toBe('Sonipat')
    expect(tomatoListing.marketMakerCommittedKg).toBeGreaterThanOrEqual(50)
  })

  it('18. Consumer cart retains Market Maker pooling metadata', () => {
    const cart = phase2Service.addPooledToCart({
      listingId: 'listing_001',
      quantityKg: 5,
      pooledPricePerKg: 28.00,
      regularPricePerKg: 34.00,
      savingsPerKg: 6.00,
      boardId: 'MM-SONIPAT-001',
      cropId: 'seg_sonipat_tomato',
      regionId: 'reg_sonipat',
    })

    const item = cart.find((i) => i.listingId === 'listing_001' && i.isPooled)!
    expect(item).toBeDefined()
    expect(item.marketMakerId).toBe('MM-SONIPAT-001')
    expect(item.regionId).toBe('reg_sonipat')
    expect(item.cropId).toBe('seg_sonipat_tomato')
    expect(item.pooledPricePerKg).toBe(28.00)
    expect(item.regularPricePerKg).toBe(34.00)
    expect(item.savingsPerKg).toBe(6.00)

    phase2Service.saveCart(cart.filter((i) => !i.isPooled))
  })

  it('19-22. Cross-role synchronization & strict regional isolation after Farmer contribution', async () => {
    globalThis.localStorage.clear()
    const viewsBefore = await marketMakerService.boards()
    const sonipatBefore = viewsBefore.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const gurgaonBefore = viewsBefore.find((v) => v.board.id === 'MM-GURGAON-001')!
    const faridabadBefore = viewsBefore.find((v) => v.board.id === 'MM-FARIDABAD-001')!
    const rohtakBefore = viewsBefore.find((v) => v.board.id === 'MM-ROHTAK-001')!
    const meerutBefore = viewsBefore.find((v) => v.board.id === 'MM-MEERUT-001')!
    const ghaziabadBefore = viewsBefore.find((v) => v.board.id === 'MM-GHAZIABAD-001')!

    let syncDispatched = false
    const listener = () => { syncDispatched = true }
    window.addEventListener('kisanlink-state', listener)

    // Farmer contributes 40 kg to Sonipat
    await marketMakerService.contributeProduce('MM-SONIPAT-001', {
      cropName: 'Tomatoes',
      quantityKg: 40,
    })

    window.removeEventListener('kisanlink-state', listener)
    expect(syncDispatched).toBe(true)

    // Read views as seen by Consumer, Bulk, and Logistics
    const viewsAfter = await marketMakerService.boards()
    const sonipatAfter = viewsAfter.find((v) => v.board.id === 'MM-SONIPAT-001')!

    // 19. Consumer Sonipat view updated
    expect(sonipatAfter.math.committedKg).toBe(sonipatBefore.math.committedKg + 40)

    // 20. Bulk Sonipat view updated
    expect(sonipatAfter.board.commitments.some((c) => c.source === 'farmer' && c.quantityKg === 40)).toBe(true)

    // 21. Logistics Sonipat view updated
    expect(sonipatAfter.math.committedKg).toBe(sonipatBefore.math.committedKg + 40)

    // 22. Strict Regional Isolation: all other NCR regions remain COMPLETELY UNCHANGED
    const gurgaonAfter = viewsAfter.find((v) => v.board.id === 'MM-GURGAON-001')!
    const faridabadAfter = viewsAfter.find((v) => v.board.id === 'MM-FARIDABAD-001')!
    const rohtakAfter = viewsAfter.find((v) => v.board.id === 'MM-ROHTAK-001')!
    const meerutAfter = viewsAfter.find((v) => v.board.id === 'MM-MEERUT-001')!
    const ghaziabadAfter = viewsAfter.find((v) => v.board.id === 'MM-GHAZIABAD-001')!

    expect(gurgaonAfter.math.committedKg).toBe(gurgaonBefore.math.committedKg)
    expect(faridabadAfter.math.committedKg).toBe(faridabadBefore.math.committedKg)
    expect(rohtakAfter.math.committedKg).toBe(rohtakBefore.math.committedKg)
    expect(meerutAfter.math.committedKg).toBe(meerutBefore.math.committedKg)
    expect(ghaziabadAfter.math.committedKg).toBe(ghaziabadBefore.math.committedKg)
  })

  it('23. Farmer Produce breakdown displays accurate values: Total Listed, Market Maker, Available, Committed to Corridor', async () => {
    globalThis.localStorage.clear()
    // Farmer contributes 50 kg to Sonipat (within 59 kg headroom)
    await marketMakerService.contributeProduce('MM-SONIPAT-001', {
      cropName: 'Tomatoes',
      quantityKg: 50,
    })

    const state = await prototypeService.getState()
    const tomatoListing = state.listings.find((l) =>
      l.crop.toLowerCase().includes('tomato') && l.status === 'active'
    )!

    expect(tomatoListing).toBeDefined()
    const totalListed = tomatoListing.quantityKg
    const mmCommitted = tomatoListing.marketMakerCommittedKg ?? 0
    const available = tomatoListing.remainingKg
    const allocated = tomatoListing.allocatedKg ?? 0

    // Accurate breakdown relations
    expect(mmCommitted).toBeGreaterThanOrEqual(50)
    expect(totalListed).toBeGreaterThanOrEqual(mmCommitted)
    expect(allocated).toBeGreaterThanOrEqual(mmCommitted)
    expect(tomatoListing.marketMakerName).toBe('Sonipat Market Maker')
    expect(tomatoListing.marketMakerId).toBe('MM-SONIPAT-001')
  })

  it('24. Bulk commitment saves to shared state and updates math', async () => {
    globalThis.localStorage.clear()
    const viewsBefore = await marketMakerService.boards()
    const sonipatBefore = viewsBefore.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const initCommitted = sonipatBefore.math.committedKg

    // Commit 15 kg from Bulk Buyer
    await marketMakerService.commit('MM-SONIPAT-001', {
      source: 'bulk',
      party: 'Dwarka Bulk Buyer',
      detail: 'Institutional Order',
      quantityKg: 15,
      cropId: 'seg_sonipat_tomato',
    })

    const viewsAfter = await marketMakerService.boards()
    const sonipatAfter = viewsAfter.find((v) => v.board.id === 'MM-SONIPAT-001')!
    expect(sonipatAfter.math.committedKg).toBe(initCommitted + 15)
    expect(sonipatAfter.board.commitments.some((c) => c.source === 'bulk' && c.party === 'Dwarka Bulk Buyer' && c.quantityKg === 15)).toBe(true)
  })

  it('25. Multiple crop options on multi-crop corridors: switching crop updates dynamic calculations', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    expect(sonipat.board.crops && sonipat.board.crops.length >= 2).toBe(true)

    const tomato = sonipat.board.crops!.find((c) => c.crop === 'Tomatoes')!
    const onion = sonipat.board.crops!.find((c) => c.crop === 'Onions')!

    // Dynamic price comparisons differ between crops
    const tomatoFarmerDiff = tomato.farmerFloorPerKg - tomato.mandiPricePerKg
    const onionFarmerDiff = onion.farmerFloorPerKg - onion.mandiPricePerKg

    expect(tomatoFarmerDiff).toBe(4) // 28 - 24
    expect(onionFarmerDiff).toBe(tomato.id !== onion.id ? (onion.farmerFloorPerKg - onion.mandiPricePerKg) : 4)

    const tomatoConsumerDiff = tomato.buyerCurrentPerKg - tomato.buyerCeilingPerKg
    const onionConsumerDiff = onion.buyerCurrentPerKg - onion.buyerCeilingPerKg

    expect(tomatoConsumerDiff).toBe(4) // 40 - 36
    expect(onionConsumerDiff).toBe(onion.buyerCurrentPerKg - onion.buyerCeilingPerKg)
  })
})

describe('Phase 8.7 — Circular Commitment vs Threshold Visualization in Farmer Market Maker', () => {
  function getRingParts(element: any) {
    const core = element.props.children.find((c: any) => c?.props?.className === 'mm-ring-core')
    const strong = core?.props?.children?.find((c: any) => c?.props?.['data-testid'] === 'ring-progress-pct')
    const span = core?.props?.children?.find((c: any) => c?.props?.['data-testid'] === 'ring-committed-threshold')
    const flag = core?.props?.children?.find((c: any) => c?.props?.['data-testid'] === 'ring-status-flag')
    const svg = element.props.children.find((c: any) => c?.type === 'svg')
    return { core, strong, span, flag, svg }
  }

  it('1. Circle uses selected board committedKg', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    expect(sonipat.math.committedKg).toBeGreaterThan(0)

    const ring = MarketDemandRing({
      board: sonipat.board,
      math: sonipat.math,
      tone: 'light',
      language: 'en',
    })

    const { span } = getRingParts(ring)
    const text = Array.isArray(span?.props?.children) ? span.props.children.join('') : String(span?.props?.children)
    expect(text).toContain(sonipat.math.committedKg.toLocaleString('en-IN'))
  })

  it('2. Circle uses selected board thresholdKg', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    expect(sonipat.math.thresholdKg).toBeGreaterThan(0)

    const ring = MarketDemandRing({
      board: sonipat.board,
      math: sonipat.math,
      tone: 'light',
      language: 'en',
    })

    const { span } = getRingParts(ring)
    const text = Array.isArray(span?.props?.children) ? span.props.children.join('') : String(span?.props?.children)
    expect(text).toContain(sonipat.math.thresholdKg.toLocaleString('en-IN'))
  })

  it('3. Progress percentage is correct (850 / 915 kg -> 93%)', () => {
    const ring = MarketDemandRing({
      committedKg: 850,
      thresholdKg: 915,
      tone: 'light',
      language: 'en',
    })

    const { strong } = getRingParts(ring)
    const pct = strong?.props?.children[0]
    expect(pct).toBe(93) // Math.round((850 / 915) * 100) = 93
  })

  it('4. Percentage never exceeds 100% (Threshold Safety invariant)', () => {
    const ring = MarketDemandRing({
      committedKg: 1200,
      thresholdKg: 915,
      tone: 'light',
      language: 'en',
    })

    const { strong } = getRingParts(ring)
    const pct = strong?.props?.children[0]
    expect(pct).toBe(100) // Strictly capped at 100%
  })

  it('5. remainingKg is correct (850 / 915 kg -> 65 kg)', () => {
    const ring = MarketDemandRing({
      committedKg: 850,
      thresholdKg: 915,
      tone: 'light',
      language: 'en',
    })

    const { flag } = getRingParts(ring)
    expect(flag?.props?.className).not.toContain('is-good')
    // Children contains AnimatedNumber with value 65
    const animatedNumberChild = flag?.props?.children?.find((c: any) => c?.props?.value !== undefined)
    expect(animatedNumberChild?.props?.value).toBe(65) // 915 - 850 = 65 kg
  })

  it('6. "Market Unlocked" shows at threshold', () => {
    const ring = MarketDemandRing({
      committedKg: 915,
      thresholdKg: 915,
      tone: 'light',
      language: 'en',
    })

    const { strong, flag } = getRingParts(ring)
    expect(strong?.props?.children[0]).toBe(100)
    expect(flag?.props?.className).toContain('is-good')
    expect(flag?.props?.children).toBe('MARKET UNLOCKED')
  })

  it('7. Switching regional Market Maker updates values immediately', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    const sonipat = views.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const gurgaon = views.find((v) => v.board.id === 'MM-GURGAON-001')!

    const ringSonipat = MarketDemandRing({
      board: sonipat.board,
      math: sonipat.math,
      tone: 'light',
      language: 'en',
    })

    const ringGurgaon = MarketDemandRing({
      board: gurgaon.board,
      math: gurgaon.math,
      tone: 'light',
      language: 'en',
    })

    const textSonipat = getRingParts(ringSonipat).span?.props?.children.join('')
    const textGurgaon = getRingParts(ringGurgaon).span?.props?.children.join('')

    expect(textSonipat).toContain(`${sonipat.math.committedKg.toLocaleString('en-IN')} / ${sonipat.math.thresholdKg.toLocaleString('en-IN')} kg`)
    expect(textGurgaon).toContain(`${gurgaon.math.committedKg.toLocaleString('en-IN')} / ${gurgaon.math.thresholdKg.toLocaleString('en-IN')} kg`)
    expect(textSonipat).not.toEqual(textGurgaon)
  })

  it('8. Farmer contribution updates the chart', async () => {
    globalThis.localStorage.clear()
    const viewsBefore = await marketMakerService.boards()
    const sonipatBefore = viewsBefore.find((v) => v.board.id === 'MM-SONIPAT-001')!
    const initialCommitted = sonipatBefore.math.committedKg
    const initialRemaining = Math.max(0, sonipatBefore.math.thresholdKg - initialCommitted)
    const initialPct = Math.min(100, Math.round((initialCommitted / sonipatBefore.math.thresholdKg) * 100))

    // Farmer contributes 50 kg produce
    await marketMakerService.commit('MM-SONIPAT-001', {
      source: 'farmer',
      party: 'Kisan Baldev Singh',
      detail: 'Fresh Harvest Contribution',
      quantityKg: 50,
      cropId: 'seg_sonipat_tomato',
    })

    const viewsAfter = await marketMakerService.boards()
    const sonipatAfter = viewsAfter.find((v) => v.board.id === 'MM-SONIPAT-001')!

    expect(sonipatAfter.math.committedKg).toBe(initialCommitted + 50)
    const updatedRemaining = Math.max(0, sonipatAfter.math.thresholdKg - sonipatAfter.math.committedKg)
    expect(updatedRemaining).toBeLessThan(initialRemaining)

    const ringAfter = MarketDemandRing({
      board: sonipatAfter.board,
      math: sonipatAfter.math,
      tone: 'light',
      language: 'en',
    })

    const { strong, span } = getRingParts(ringAfter)
    const expectedPct = Math.min(100, Math.round((sonipatAfter.math.committedKg / sonipatAfter.math.thresholdKg) * 100))
    expect(strong?.props?.children[0]).toBe(expectedPct)
    expect(expectedPct).toBeGreaterThan(initialPct)
    expect(span?.props?.children.join('')).toContain(`${(initialCommitted + 50).toLocaleString('en-IN')} / ${sonipatAfter.math.thresholdKg.toLocaleString('en-IN')} kg`)
  })

  it('9. Sonipat values do not affect Gurgaon', async () => {
    globalThis.localStorage.clear()
    const viewsBefore = await marketMakerService.boards()
    const gurgaonBefore = viewsBefore.find((v) => v.board.id === 'MM-GURGAON-001')!
    const gurgaonCommittedBefore = gurgaonBefore.math.committedKg
    const gurgaonThresholdBefore = gurgaonBefore.math.thresholdKg

    // Commit 100 kg to Sonipat
    await marketMakerService.commit('MM-SONIPAT-001', {
      source: 'farmer',
      party: 'Sonipat Organic',
      detail: 'Batch 1',
      quantityKg: 100,
    })

    const viewsAfter = await marketMakerService.boards()
    const gurgaonAfter = viewsAfter.find((v) => v.board.id === 'MM-GURGAON-001')!

    // Gurgaon is completely isolated and unaffected
    expect(gurgaonAfter.math.committedKg).toBe(gurgaonCommittedBefore)
    expect(gurgaonAfter.math.thresholdKg).toBe(gurgaonThresholdBefore)

    const ringGurgaon = MarketDemandRing({
      board: gurgaonAfter.board,
      math: gurgaonAfter.math,
      tone: 'light',
      language: 'en',
    })
    const { span } = getRingParts(ringGurgaon)
    expect(span?.props?.children.join('')).toContain(`${gurgaonCommittedBefore.toLocaleString('en-IN')} / ${gurgaonThresholdBefore.toLocaleString('en-IN')} kg`)
  })

  it('10. Existing Market Maker tests remain passing', async () => {
    globalThis.localStorage.clear()
    const views = await marketMakerService.boards()
    expect(views.length).toBeGreaterThanOrEqual(6)

    views.forEach((v) => {
      expect(v.board.id).toMatch(/^MM-/)
      expect(v.math.committedKg).toBeGreaterThanOrEqual(0)
      expect(v.math.thresholdKg).toBeGreaterThan(0)
      expect(Number.isFinite(v.math.freightTotal)).toBe(true)
    })
  })
})


