import { describe, expect, it } from 'vitest'
import { contributionIntelligence, procurementPulse } from '../services/bulkIntelligenceService'
import { basketOptimizer, freshPick } from '../services/consumerIntelligenceService'
import { getCropIntel, getPriceOptions } from '../services/farmerAiService'
import { dispatchPulse } from '../services/logisticsIntelligenceService'

describe('existing Phase 8 intelligence contracts', () => {
  it('keeps deterministic farmer anchors ordered and grounded', () => {
    const options = getPriceOptions({ crop: 'Fresh Tomatoes', mandiPricePerKg: 24, grade: 'Grade A+' })
    expect(options).toHaveLength(3)
    expect(options.map((option) => option.id)).toEqual(['fast', 'balanced', 'high'])
    expect(options[0].price).toBeLessThan(options[1].price)
    expect(getCropIntel('Tomatoes').historical).toHaveLength(7)
  })

  it('keeps current bulk, consumer, and logistics fallbacks usable', () => {
    expect(procurementPulse([], []).title).toBe('Procurement Pulse')
    expect(contributionIntelligence([{ farmer: 'Ram', farm: 'Sonipat', listingId: 'l1', quantityKg: 500, ratePerKg: 25 }], 1000).factors.length).toBeGreaterThanOrEqual(5)
    expect(freshPick([]).title).toBe('Fresh Pick')
    expect(basketOptimizer([], []).title).toBe('Basket Optimizer')
    expect(dispatchPulse([], [], []).title).toBe('Dispatch Pulse')
  })
})
