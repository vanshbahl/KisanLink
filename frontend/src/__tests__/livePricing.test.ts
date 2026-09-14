/**
 * Live AGMARKNET benchmarks flowing through the one pricing engine into every module:
 * listings, Market Maker boards, consumer cards, bulk quotes, price advisor and AI context.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mandiBenchmarkService, benchmarkDateLabel } from '../services/mandiBenchmarkService'
import { evaluateMarket } from '../services/marketMakerEngine'
import { prototypeService } from '../services/prototypeService'
import { getCropIntel, getFarmOpportunity, getPriceOptions } from '../services/farmerAiService'
import { getCropDeal, getFarmerDeal, suggestedPriceFor } from '../services/farmerDeal'
import { buildProcurementPlan } from '../services/procurementEngine'
import { consumerPrice } from '../components/ConsumerPrice'
import { targetPriceOptions } from '../services/bulkIntelligenceService'
import { marketplaceService } from '../services/marketplaceService'
import { checkInvariants, derivePriceLadder, MIN_GAP } from '../services/pricingEngine'
import { localDay } from '../utils/dates'

const backendBenchmark = (crop_key: string, commodity: string, modal_per_kg: number, extra: Record<string, unknown> = {}) => ({
  benchmark: {
    crop_key, commodity, variety: commodity, market: null, district: 'Sonipat', state: 'Haryana',
    modal_per_kg, min_per_kg: modal_per_kg - 3, max_per_kg: modal_per_kg + 3, arrival_date: '2026-09-14',
    source: 'agmarknet', match_level: 'district', record_count: 2, stale: false, fetched_at: '2026-09-14T15:00:00Z', ...extra,
  },
})

const LIVE = {
  fetched_at: '2026-09-14T15:00:00Z', state: 'Haryana', district: 'Sonipat', live_available: true,
  items: {
    tomato: backendBenchmark('tomato', 'Tomato', 28.5),
    potato: backendBenchmark('potato', 'Potato', 11.5),
    onion: backendBenchmark('onion', 'Onion', 40.25),
    spinach: backendBenchmark('spinach', 'Spinach', 35, { market: 'Ganaur APMC', record_count: 1 }),
    wheat: backendBenchmark('wheat', 'Wheat', 28.7, { district: null, state: null, match_level: 'national', variety: 'Sharbati' }),
    carrot: backendBenchmark('carrot', 'Carrot', 30, { district: null, match_level: 'state' }),
    capsicum: backendBenchmark('capsicum', 'Capsicum', 55),
    cauliflower: backendBenchmark('cauliflower', 'Cauliflower', 45),
    cucumber: backendBenchmark('cucumber', 'Cucumbar(Kheera)', 28),
    apple: backendBenchmark('apple', 'Apple', 112),
    rice: backendBenchmark('rice', 'Rice', 36.38, { match_level: 'national', district: null, state: null }),
    mustard: backendBenchmark('mustard', 'Mustard', 77, { match_level: 'state', district: null }),
  },
  unresolved: [],
}

function mockFetch(handler: () => Promise<Response> | Response) {
  const spy = vi.fn(handler)
  vi.stubGlobal('fetch', spy)
  return spy
}
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  localStorage.clear()
  mandiBenchmarkService.__setSnapshot(null)
})
afterEach(() => { vi.unstubAllGlobals() })

async function primeLive() {
  mockFetch(() => ok(LIVE))
  await mandiBenchmarkService.prime(1000)
}

describe('mandiBenchmarkService', () => {
  it('loads live benchmarks from the backend and exposes them with provenance', async () => {
    await primeLive()
    const pricing = mandiBenchmarkService.pricingFor('Fresh Tomatoes')!
    expect(pricing.benchmark.source).toBe('agmarknet')
    expect(pricing.benchmark.modalPerKg).toBe(28.5)
    expect(pricing.benchmark.district).toBe('Sonipat')
    expect(pricing.ladder).toEqual(derivePriceLadder(28.5, 'tomato'))
    expect(mandiBenchmarkService.liveAvailable).toBe(true)
  })

  it('falls back to the labelled seed when the API is unavailable', async () => {
    mockFetch(() => { throw new TypeError('Failed to fetch') })
    await mandiBenchmarkService.prime(500)
    const pricing = mandiBenchmarkService.pricingFor('Fresh Tomatoes')!
    expect(pricing.benchmark.source).toBe('seed')
    expect(pricing.benchmark.stale).toBe(true)
    expect(mandiBenchmarkService.liveAvailable).toBe(false)
    expect(checkInvariants(pricing.ladder)).toEqual([])
  })

  it('falls back to seed on a non-OK response and never throws', async () => {
    mockFetch(() => new Response('down', { status: 503 }))
    await expect(mandiBenchmarkService.prime(500)).resolves.toBeUndefined()
    expect(mandiBenchmarkService.pricingFor('New Potatoes')!.benchmark.source).toBe('seed')
  })

  it('returns null for a commodity KisanLink does not price', async () => {
    await primeLive()
    expect(mandiBenchmarkService.pricingFor('Unknownium')).toBeNull()
  })

  it('formats the benchmark date for the source note', () => {
    expect(benchmarkDateLabel({ arrivalDate: '2026-09-14' })).toMatch(/14/)
    expect(benchmarkDateLabel({ arrivalDate: null })).toBeNull()
  })
})

describe('live benchmark applied across the prototype state', () => {
  it('re-derives every listing and board from the live anchor with provenance', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    for (const listing of state.listings) {
      const ladder = mandiBenchmarkService.pricingFor(listing.crop)!.ladder
      expect(listing.mandiPricePerKg).toBe(ladder.mandiPerKg)
      expect(listing.pricePerKg).toBe(ladder.kisanlinkNormalPerKg)
      expect(listing.retailPricePerKg).toBe(ladder.localReferencePerKg)
      expect(listing.mandiSource?.source).toBe('agmarknet')
      expect(listing.mandiPricePerKg).toBeLessThan(listing.pricePerKg)
      expect(listing.pricePerKg).toBeLessThan(listing.retailPricePerKg)
    }
    for (const board of state.markets.filter((item) => item.status !== 'created')) {
      const segments = board.crops?.length ? board.crops : [board]
      for (const segment of segments) {
        const ladder = mandiBenchmarkService.pricingFor(segment.benchmarkCrop ?? segment.crop)!.ladder
        expect(segment.mandiPricePerKg).toBe(ladder.mandiPerKg)
        expect(segment.farmerFloorPerKg).toBe(ladder.marketMakerFarmerPerKg)
        expect(segment.buyerCeilingPerKg).toBe(ladder.marketMakerConsumerPerKg)
        expect(segment.buyerCurrentPerKg).toBe(ladder.localReferencePerKg)
        expect(segment.mandiSource?.source).toBe('agmarknet')
      }
    }
  })

  it('tomato board and tomato listings quote the same mandi and the farmer ladder holds', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!
    const listing = state.listings.find((item) => item.id === 'listing_001')!
    expect(board.mandiPricePerKg).toBe(listing.mandiPricePerKg)
    // farmer: mandi < normal listing < Market Maker floor
    expect(listing.mandiPricePerKg).toBeLessThan(listing.pricePerKg)
    expect(listing.pricePerKg + MIN_GAP).toBeLessThanOrEqual(board.farmerFloorPerKg)
    // consumer: Market Maker cap < regular delivered < local reference (what the card strikes through)
    const ladder = mandiBenchmarkService.pricingFor('Fresh Tomatoes')!.ladder
    expect(board.buyerCeilingPerKg + MIN_GAP).toBeLessThanOrEqual(ladder.kisanlinkNormalConsumerPerKg)
    expect(ladder.kisanlinkNormalConsumerPerKg).toBeLessThan(listing.retailPricePerKg)
    expect(board.buyerCurrentPerKg).toBe(listing.retailPricePerKg)
  })

  it('a viable Market Maker delivers at or below its cap, which stays under the regular delivered price', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    for (const board of state.markets.filter((item) => item.status !== 'created' && !item.isMultiCrop)) {
      const math = evaluateMarket(board, state.listings, state.vehicles)
      const ladder = mandiBenchmarkService.pricingFor(board.benchmarkCrop ?? board.crop)!.ladder
      if (Number.isFinite(math.thresholdKg)) expect(math.deliveredAtThresholdPerKg).toBeLessThanOrEqual(board.buyerCeilingPerKg + 0.01)
      expect(board.buyerCeilingPerKg).toBeLessThan(ladder.kisanlinkNormalConsumerPerKg)
      expect(math.farmerGatePerKg).toBeGreaterThan(board.mandiPricePerKg)
    }
  })

  it('keeps the Sonipat tomato board near viability so the golden demo still needs "a few kg more"', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!
    const math = evaluateMarket(board, state.listings, state.vehicles)
    expect(math.thresholdKg).toBeLessThanOrEqual(math.capacityKg)
    expect(math.thresholdKg - math.committedKg).toBeGreaterThan(0)
    expect(math.thresholdKg - math.committedKg).toBeLessThan(120)
  })

  it('respects a farmer-typed ask and freezes a created market', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    const own = state.listings.find((item) => item.id === 'listing_001')!
    await prototypeService.patchListing(own.id, { pricePerKg: 40, priceLocked: true })
    const board = (await prototypeService.getState()).markets.find((item) => item.id === 'MM-TOM-SONIPAT')!
    const frozenFloor = board.farmerFloorPerKg + 5
    const next = await prototypeService.getState()
    next.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!.status = 'created'
    next.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!.farmerFloorPerKg = frozenFloor
    await prototypeService.replaceState(next)
    const after = await prototypeService.getState()
    expect(after.listings.find((item) => item.id === 'listing_001')!.pricePerKg).toBe(40)
    expect(after.listings.find((item) => item.id === 'listing_001')!.mandiPricePerKg).toBe(28.5)
    expect(after.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!.farmerFloorPerKg).toBe(frozenFloor)
  })

  it('is deterministic: two reads of the same benchmark give identical prices', async () => {
    await primeLive()
    const a = await prototypeService.getState()
    const b = await prototypeService.getState()
    expect(a.listings.map((item) => [item.pricePerKg, item.mandiPricePerKg, item.retailPricePerKg]))
      .toEqual(b.listings.map((item) => [item.pricePerKg, item.mandiPricePerKg, item.retailPricePerKg]))
  })
})

describe('modules read the same ladder', () => {
  it('consumer card: local reference is the struck-through price, never the mandi', async () => {
    await primeLive()
    const items = await marketplaceService.getListings()
    for (const item of items) {
      const ladder = mandiBenchmarkService.pricingFor(item.product)!.ladder
      expect(item.marketPricePerKg).toBe(ladder.localReferencePerKg)
      expect(item.marketPricePerKg).not.toBe(ladder.mandiPerKg)
      const figures = consumerPrice({ pricePerKg: item.pricePerKg, retailPricePerKg: item.marketPricePerKg })
      expect(figures.retail).toBe(ladder.localReferencePerKg)
      expect(figures.savingPerKg).toBeGreaterThan(0)
    }
  })

  it('bulk: landed cost beats the local-market benchmark and the benchmark is the engine reference', async () => {
    await primeLive()
    const state = await prototypeService.getState()
    const plan = buildProcurementPlan({
      crop: 'Fresh Tomatoes', grade: 'Grade A+', requiredQuantityKg: 900, targetPrice: 999,
      deliveryLocation: 'Okhla Distribution Centre, New Delhi', requiredBy: localDay(2), deliverySlot: 'Morning · 6–10 AM', packaging: '25 kg crates',
    }, state.listings, state.vehicles)
    const ladder = mandiBenchmarkService.pricingFor('Fresh Tomatoes')!.ladder
    expect(plan.matchedKg).toBeGreaterThan(0)
    expect(plan.benchmarkPerKg).toBe(ladder.localReferencePerKg)
    expect(plan.landedPerKg).toBeLessThan(plan.benchmarkPerKg)
    expect(plan.farmerUpliftPerKg).toBeGreaterThan(0)
  })

  it('bulk target price advisor never targets at or below the mandi', async () => {
    await primeLive()
    const ladder = mandiBenchmarkService.pricingFor('Tomatoes')!.ladder
    for (const option of targetPriceOptions('Fresh Tomatoes', 1600, 34)) expect(option.price).toBeGreaterThan(ladder.mandiPerKg)
    expect(targetPriceOptions('Fresh Tomatoes', 1600, 34).find((item) => item.id === 'recommended')!.price).toBe(ladder.kisanlinkNormalPerKg)
  })

  it('farmer intelligence, price advisor, suggested price and AI context all derive from the live anchor', async () => {
    await primeLive()
    const intel = getCropIntel('Tomatoes')
    const ladder = mandiBenchmarkService.pricingFor('Tomatoes')!.ladder
    expect(intel.mandi).toBe(28.5)
    expect(intel.recommendedMin).toBe(ladder.kisanlinkNormalPerKg)
    expect(intel.recommendedMax).toBe(ladder.marketMakerFarmerPerKg)
    expect(intel.historical.at(-1)).toBe(28.5)
    expect(intel.benchmark?.source).toBe('agmarknet')
    expect(intel.aiContext).toMatchObject({ mandiPrice: 28.5, kisanlinkNormalPrice: ladder.kisanlinkNormalPerKg, marketMakerFarmerPrice: ladder.marketMakerFarmerPerKg, source: 'agmarknet', date: '2026-09-14' })

    const [fast, balanced] = getPriceOptions({ crop: 'Fresh Tomatoes', mandiPricePerKg: 28.5, grade: 'Grade A+' })
    expect(fast.price).toBe(ladder.kisanlinkNormalPerKg)
    expect(balanced.price).toBe(ladder.marketMakerFarmerPerKg)

    const opportunity = getFarmOpportunity((await prototypeService.getState()).listings)
    expect(opportunity.gainPerKg).toBe(ladder.kisanlinkNormalPerKg - 28.5)

    const state = await prototypeService.getState()
    const listing = state.listings.find((item) => item.id === 'listing_001')!
    const deal = await getCropDeal(listing)
    expect(deal).not.toBeNull()
    expect(deal!.mandiPerKg).toBe(28.5)
    expect(deal!.pricePerKg).toBeGreaterThan(listing.pricePerKg)
    expect(deal!.mandiSource?.source).toBe('agmarknet')
    // The normal ask is already the engine's normal price, so only a real deal beats it.
    expect(suggestedPriceFor(listing, null)).toBeNull()
    const farmerDeal = await getFarmerDeal([listing])
    expect(farmerDeal && suggestedPriceFor(listing, farmerDeal)).toBe(ladder.marketMakerFarmerPerKg)
  })

  it('offline: the same modules still agree, on a benchmark labelled seed', async () => {
    mockFetch(() => { throw new TypeError('Failed to fetch') })
    await mandiBenchmarkService.prime(200)
    const state = await prototypeService.getState()
    const listing = state.listings.find((item) => item.id === 'listing_001')!
    const board = state.markets.find((item) => item.id === 'MM-TOM-SONIPAT')!
    expect(listing.mandiSource?.source).toBe('seed')
    expect(board.mandiPricePerKg).toBe(listing.mandiPricePerKg)
    expect(listing.mandiPricePerKg).toBeLessThan(listing.pricePerKg)
    expect(listing.pricePerKg).toBeLessThan(board.farmerFloorPerKg)
    expect(getCropIntel('Tomatoes').mandi).toBe(listing.mandiPricePerKg)
  })
})
