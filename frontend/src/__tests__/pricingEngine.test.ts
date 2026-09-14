import { describe, expect, it } from 'vitest'
import vectors from './fixtures/pricingLadder.vectors.json'
import {
  checkInvariants,
  commodityKey,
  consumerAiContext,
  derivePriceLadder,
  farmerAiContext,
  farmerPriceOptions,
  indicativeSeries,
  localReferenceFromNormal,
  MIN_GAP,
  regularPriceSplit,
  rescuePrice,
  roundMoney,
  seedBenchmark,
  stableUnit,
} from '../services/pricingEngine'

const REPRESENTATIVE: Record<string, number> = {
  tomato: 28.5, potato: 11.5, onion: 40.25, spinach: 35, wheat: 28.7, carrot: 30,
  capsicum: 55, cauliflower: 45, cucumber: 28, apple: 112, rice: 36.38, mustard: 77,
}

describe('pricing engine — hierarchy invariants', () => {
  for (const [crop, mandi] of Object.entries(REPRESENTATIVE)) {
    it(`farmer: mandi < normal < market maker (${crop} @ ₹${mandi})`, () => {
      const ladder = derivePriceLadder(mandi, crop)
      expect(ladder.mandiPerKg).toBeLessThan(ladder.kisanlinkNormalPerKg)
      expect(ladder.kisanlinkNormalPerKg + MIN_GAP).toBeLessThanOrEqual(ladder.marketMakerFarmerPerKg)
    })
    it(`consumer: market maker < normal < local reference (${crop})`, () => {
      const ladder = derivePriceLadder(mandi, crop)
      expect(ladder.marketMakerConsumerPerKg + MIN_GAP).toBeLessThanOrEqual(ladder.kisanlinkNormalConsumerPerKg)
      expect(ladder.kisanlinkNormalConsumerPerKg + MIN_GAP).toBeLessThanOrEqual(ladder.localReferencePerKg)
    })
    it(`market maker is best on both sides and its two prices differ (${crop})`, () => {
      const ladder = derivePriceLadder(mandi, crop)
      expect(ladder.marketMakerFarmerPerKg).toBeGreaterThan(ladder.kisanlinkNormalPerKg)
      expect(ladder.marketMakerConsumerPerKg).toBeLessThan(ladder.kisanlinkNormalConsumerPerKg)
      expect(ladder.marketMakerConsumerPerKg).toBeGreaterThan(ladder.marketMakerFarmerPerKg)
    })
  }

  it('holds for 3000 random anchors', () => {
    let seed = 7
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
    for (let i = 0; i < 3000; i += 1) {
      const ladder = derivePriceLadder(Math.round((1 + rand() * 399) * 100) / 100, `crop${i % 41}`)
      expect(checkInvariants(ladder)).toEqual([])
    }
  })

  it('never alters the government anchor', () => {
    for (const mandi of [28.5, 40.25, 36.38, 27.99]) expect(derivePriceLadder(mandi, 'x').mandiPerKg).toBe(mandi)
  })

  it('is deterministic for the same benchmark and key', () => {
    expect(derivePriceLadder(28.5, 'tomato')).toEqual(derivePriceLadder(28.5, 'tomato'))
  })

  it('keeps uplifts realistic and bounded', () => {
    for (const [crop, mandi] of Object.entries(REPRESENTATIVE)) {
      const ladder = derivePriceLadder(mandi, crop)
      expect(ladder.kisanlinkNormalPerKg / mandi).toBeGreaterThanOrEqual(1.05)
      expect(ladder.kisanlinkNormalPerKg / mandi).toBeLessThanOrEqual(1.2)
      expect(ladder.marketMakerFarmerPerKg / mandi).toBeLessThanOrEqual(1.3)
      expect(ladder.localReferencePerKg / mandi).toBeLessThanOrEqual(mandi < 15 ? 2.2 : 2)
    }
  })

  it('rejects an invalid anchor', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => derivePriceLadder(bad, 'tomato')).toThrow()
  })
})

describe('pricing engine — parity with the Python engine', () => {
  it('reproduces every fixture vector exactly', () => {
    for (const vector of vectors.vectors) {
      const ladder = derivePriceLadder(vector.mandi_per_kg, vector.seed_key)
      const expected = vector.ladder
      expect(ladder).toEqual({
        mandiPerKg: expected.mandi_per_kg,
        kisanlinkNormalPerKg: expected.kisanlink_normal_per_kg,
        marketMakerFarmerPerKg: expected.market_maker_farmer_per_kg,
        marketMakerConsumerPerKg: expected.market_maker_consumer_per_kg,
        kisanlinkNormalConsumerPerKg: expected.kisanlink_normal_consumer_per_kg,
        localReferencePerKg: expected.local_reference_per_kg,
        farmerPremiumPerKg: expected.farmer_premium_per_kg,
        farmerPremiumPct: expected.farmer_premium_pct,
        normalOverMandiPerKg: expected.normal_over_mandi_per_kg,
        consumerSavingPerKg: expected.consumer_saving_per_kg,
        consumerSavingPct: expected.consumer_saving_pct,
        pooledPlatformFeePerKg: expected.pooled_platform_fee_per_kg,
        pooledFreightAllowancePerKg: expected.pooled_freight_allowance_per_kg,
        unpooledLogisticsPerKg: expected.unpooled_logistics_per_kg,
      })
    }
  })

  it('hashes like the Python FNV-1a', () => {
    expect(stableUnit('')).toBe(0x811c9dc5 / 0x100000000)
    expect(stableUnit('Tomato|normal')).toBe(stableUnit('tomato|normal'))
  })
})

describe('pricing engine — rounding & helpers', () => {
  it('rounds half up and keeps a whole-rupee gap after rounding', () => {
    expect(roundMoney(2.5)).toBe(3)
    expect(roundMoney(0.125, 2)).toBe(0.13)
    const ladder = derivePriceLadder(27.99, 'tomato')
    expect(Number.isInteger(ladder.kisanlinkNormalPerKg)).toBe(true)
    expect(ladder.marketMakerFarmerPerKg - ladder.kisanlinkNormalPerKg).toBeGreaterThanOrEqual(1)
  })

  it('price options follow the ladder', () => {
    const ladder = derivePriceLadder(28.5, 'tomato')
    const [fast, balanced, high] = farmerPriceOptions(ladder, 'Grade A+')
    expect(fast.price).toBe(ladder.kisanlinkNormalPerKg)
    expect(balanced.price).toBe(ladder.marketMakerFarmerPerKg)
    expect(high.price).toBeGreaterThan(balanced.price)
    expect(fast.saleChancePct).toBeGreaterThanOrEqual(balanced.saleChancePct)
    expect(balanced.saleChancePct).toBeGreaterThanOrEqual(high.saleChancePct)
  })

  it('AI contexts carry the engine values verbatim', () => {
    const ladder = derivePriceLadder(28.5, 'tomato')
    const farmer = farmerAiContext(ladder, { source: 'agmarknet', arrivalDate: '2026-09-14', market: 'Ganaur APMC' })
    expect(farmer).toEqual({
      mandiPrice: 28.5, kisanlinkNormalPrice: ladder.kisanlinkNormalPerKg, marketMakerFarmerPrice: ladder.marketMakerFarmerPerKg,
      difference: ladder.farmerPremiumPerKg, percentagePremium: ladder.farmerPremiumPct, source: 'agmarknet', date: '2026-09-14', market: 'Ganaur APMC',
    })
    const consumer = consumerAiContext(ladder)
    expect(consumer.marketMakerConsumerPrice).toBe(ladder.marketMakerConsumerPerKg)
    expect(consumer.localMarketReference).toBe(ladder.localReferencePerKg)
    expect(consumer.savings).toBe(ladder.consumerSavingPerKg)
    expect(consumer.percentageSavings).toBe(ladder.consumerSavingPct)
  })

  it('indicative series ends on the live anchor and is labelled by the caller', () => {
    const series = indicativeSeries(28.5)
    expect(series.historical).toHaveLength(7)
    expect(series.forecast).toHaveLength(3)
    expect(series.historical.at(-1)).toBe(28.5)
  })

  it('legacy helpers stay on the same ladder', () => {
    expect(localReferenceFromNormal(31)).toBeGreaterThan(31)
    expect(rescuePrice(31)).toBe(23)
    const split = regularPriceSplit(26)
    expect(split.farmer + split.platform).toBe(26)
  })
})

describe('pricing engine — commodity normalization', () => {
  it.each([
    ['Fresh Tomatoes', 'tomato'], ['टमाटर', 'tomato'], ['New Potatoes', 'potato'], ['Red Onions', 'onion'], ['Red Onion', 'onion'],
    ['Baby Spinach', 'spinach'], ['Sharbati Wheat', 'wheat'], ['Sweet Carrots', 'carrot'], ['Green Capsicum', 'capsicum'],
    ['Snow Cauliflower', 'cauliflower'], ['Crisp Cucumbers', 'cucumber'], ['Himachali Apples', 'apple'], ['Basmati Rice', 'rice'],
    ['Yellow Mustard', 'mustard'], ['Tomatoes', 'tomato'], ['Bottle gourd', 'bottle gourd'], ['Lentils', 'lentils'],
  ])('%s -> %s', (name, key) => {
    expect(commodityKey(name)).toBe(key)
  })

  it('returns null for crops KisanLink does not price', () => {
    expect(commodityKey('Unknownium')).toBeNull()
    expect(seedBenchmark('Unknownium')).toBeNull()
  })

  it('labels the seed fallback honestly', () => {
    const seed = seedBenchmark('Fresh Tomatoes')!
    expect(seed.source).toBe('seed')
    expect(seed.matchLevel).toBe('seed')
    expect(seed.stale).toBe(true)
    expect(seed.arrivalDate).toBeNull()
  })
})
