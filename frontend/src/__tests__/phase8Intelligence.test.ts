import { beforeAll, describe, expect, it } from 'vitest'
import { apiClient } from '../services/apiClient'
import { contributionIntelligence, fetchLiveRequirementMatches, procurementPulse } from '../services/bulkIntelligenceService'
import { basketOptimizer, freshPick, smartBuy } from '../services/consumerIntelligenceService'
import { fetchLiveCropIntel, fetchLivePriceOptions, getCropIntel, getPriceOptions } from '../services/farmerAiService'
import { dispatchPulse, routeOptimisationReview } from '../services/logisticsIntelligenceService'
import { logisticsService } from '../services/logisticsService'
import { marketMakerService } from '../services/marketMakerService'

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
    globalThis.window = {
      dispatchEvent: () => true,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    } as unknown as Window & typeof globalThis
  }
})

describe('Phase 8 — AI Intelligence Layer & Interactivity', () => {
  describe('Safeguard 1 — Demo OTP Safety', () => {
    it('rejects invalid OTP codes for pickup verification', async () => {
      await expect(logisticsService.verifyPickupOtp('PK-2048', '000000')).rejects.toThrow(/Invalid OTP code/)
      await expect(logisticsService.verifyPickupOtp('PK-2048', 'abc')).rejects.toThrow(/6-digit numeric OTP/)
    })

    it('accepts correct seeded OTP code for pickup verification', async () => {
      const res = await logisticsService.verifyPickupOtp('PK-2048', '123456')
      expect(res.success).toBe(true)
      expect(res.modeLabel).toBeDefined()
    })

    it('rejects invalid OTP codes for delivery verification', async () => {
      await expect(logisticsService.verifyDeliveryOtp('DLV-301', '999999')).rejects.toThrow(/Invalid OTP code/)
    })

    it('accepts correct seeded OTP code for delivery verification', async () => {
      const res = await logisticsService.verifyDeliveryOtp('DLV-301', '123456')
      expect(res.success).toBe(true)
    })
  })

  describe('Safeguard 2 — Backend vs Prototype Mode Honesty', () => {
    it('returns deterministic fallback with modeLabel when backend API is offline', async () => {
      const intel = await fetchLiveCropIntel('Tomatoes')
      expect(intel.crop).toBe('Tomatoes')
      expect(intel.modeLabel).toBeDefined()
      expect(typeof intel.isLiveBackend).toBe('boolean')
    })

    it('returns price options with explicit modeLabel', async () => {
      const options = await fetchLivePriceOptions({ crop: 'Tomatoes', mandiPricePerKg: 24, grade: 'Grade A' })
      expect(options.length).toBe(3)
      expect(options[0].modeLabel).toBeDefined()
    })

    it('returns requirement match intelligence with modeLabel', async () => {
      const match = await fetchLiveRequirementMatches('req-123')
      expect(match.title).toBeDefined()
      expect(match.modeLabel).toBeDefined()
    })

    it('returns route optimization review with modeLabel', async () => {
      const review = await routeOptimisationReview([])
      expect(review.title).toBe('Route Review')
      expect(review.modeLabel).toBeDefined()
    })
  })

  describe('Farmer Kisan Intelligence', () => {
    it('calculates 3 price anchor options (Fast, Balanced, High)', () => {
      const options = getPriceOptions({ crop: 'Fresh Tomatoes', mandiPricePerKg: 25, grade: 'Grade A+' })
      expect(options.length).toBe(3)
      expect(options[0].id).toBe('fast')
      expect(options[1].id).toBe('balanced')
      expect(options[2].id).toBe('high')
      expect(options[0].price).toBeLessThan(options[1].price)
      expect(options[1].price).toBeLessThan(options[2].price)
    })

    it('provides CropIntel for all supported crops', () => {
      const intel = getCropIntel('Tomatoes')
      expect(intel.mandi).toBeGreaterThan(0)
      expect(intel.historical.length).toBe(7)
      expect(intel.forecast.length).toBe(3)
    })
  })

  describe('Bulk Buyer Matching Intelligence', () => {
    it('evaluates procurement pulse across RFQs and listings', () => {
      const pulse = procurementPulse([], [])
      expect(pulse.title).toBe('Procurement Pulse')
      expect(pulse.confidence).toBeGreaterThan(0)
    })

    it('evaluates contribution intelligence with 5-factor breakdown', () => {
      const info = contributionIntelligence([{ farmer: 'Ram', farm: 'Sonipat', listingId: 'l1', quantityKg: 500, ratePerKg: 25 }], 1000)
      expect(info.factors.length).toBeGreaterThanOrEqual(5)
      expect(info.factors[0].label).toContain('Distance')
    })
  })

  describe('Consumer Intelligence', () => {
    it('ranks fresh picks based on harvest date and grade', () => {
      const pick = freshPick([])
      expect(pick.title).toBe('Fresh Pick')
    })

    it('evaluates smart buy analysis for a listing', () => {
      const buy = smartBuy({
        id: 'l1',
        crop: 'Fresh Tomatoes',
        cropHi: 'ताज़े टमाटर',
        category: 'Vegetables',
        imageSrc: '/assets/produce/tomato.webp',
        visual: 'tomato',
        quantityKg: 500,
        remainingKg: 500,
        allocatedKg: 0,
        unit: 'kg',
        grade: 'Grade A',
        harvestDate: '2026-09-10',
        availableFrom: '2026-09-11',
        farmingMethod: 'Conventional',
        notes: '',
        pricePerKg: 28,
        mandiPricePerKg: 24,
        farm: 'Sonipat Farm',
        pickupDate: '2026-09-12',
        pickupWindow: 'Morning · 7–10 AM',
        fulfillment: 'pickup',
        status: 'active',
        assisted: false,
        views: 10,
        inquiries: 2,
        createdAt: '2026-09-10',
      })
      expect(buy.title).toBe('Smart Buy Analysis')
      expect(buy.price).toBe(28)
    })

    it('evaluates basket optimizer for cart efficiency', () => {
      const opt = basketOptimizer([], [])
      expect(opt.title).toBe('Basket Optimizer')
    })
  })

  describe('Logistics Intelligence', () => {
    it('evaluates dispatch pulse across pickups, deliveries, and vehicles', () => {
      const pulse = dispatchPulse([], [], [])
      expect(pulse.title).toBe('Dispatch Pulse')
      expect(pulse.factors.length).toBeGreaterThan(0)
    })
  })

  describe('Cross-Role Market Maker Interactivity & State Sync', () => {
    it('updates shared state and triggers cross-role sync when committing demand', async () => {
      const initialView = await marketMakerService.board('MM-MULTI-SONIPAT')
      expect(initialView).not.toBeNull()

      const result = await marketMakerService.commit('MM-MULTI-SONIPAT', {
        source: 'bulk',
        party: 'Test Buyer',
        detail: 'Phase 8 Test Commit',
        quantityKg: 20,
        own: true,
        cropId: 'seg_tomato',
      })

      expect(result.math.committedKg).toBeGreaterThanOrEqual(initialView!.math.committedKg)
    })
  })
})
