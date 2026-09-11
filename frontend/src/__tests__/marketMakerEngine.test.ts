import { describe, expect, it, beforeAll } from 'vitest'
import type { MarketCropSegment, MarketMakerBoard, Vehicle } from '../types'
import {
  checkCropCompatibility,
  evaluateMarket,
  explainMarket,
} from '../services/marketMakerEngine'
import { marketMakerService } from '../services/marketMakerService'
import { prototypeService } from '../services/prototypeService'
import { phase2Service } from '../services/phase2Service'

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

const sampleVehicles: Vehicle[] = [
  { id: 'VEH-01', registration: 'HR 10 AK 4821', type: 'Refrigerated mini truck', typeHi: 'रेफ्रिजरेटेड मिनी ट्रक', capacityKg: 750, driver: 'Suresh Kumar', status: 'available' },
  { id: 'VEH-02', registration: 'DL 1L AC 9082', type: 'Medium truck', typeHi: 'मध्यम ट्रक', capacityKg: 2000, driver: 'Imran Khan', status: 'available' },
]

describe('Market Maker Engine — Comprehensive Hardening & Validation Test Suite (14 Scenarios)', () => {
  it('1. Single-crop corridor backward compatibility', () => {
    const singleBoard: MarketMakerBoard = {
      id: 'MM-TOM-TEST',
      crop: 'Fresh Tomatoes',
      cropHi: 'ताज़े टमाटर',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '/assets/produce/tomato.webp',
      visual: 'tomato',
      farmerFloorPerKg: 30,
      mandiPricePerKg: 22,
      buyerCeilingPerKg: 38,
      buyerCurrentPerKg: 42,
      platformFeePct: 0.02,
      routeDistanceKm: 90,
      vehicleId: 'VEH-01',
      lots: [
        { id: 'lot1', farmer: 'Ramesh', farm: 'Farm 1', location: 'Sonipat', offeredKg: 500, detourKm: 0 },
      ],
      commitments: [
        { id: 'c1', source: 'bulk', party: 'FreshKart', detail: 'Okhla', quantityKg: 400, committedAt: new Date().toISOString() },
      ],
      status: 'forming',
      createdAt: new Date().toISOString(),
    }

    const math = evaluateMarket(singleBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(400)
    expect(math.offeredKg).toBe(500)
    expect(math.viable).toBe(true)
    expect(math.multiCropMath).toBeDefined()
    expect(math.multiCropMath?.isMultiCrop).toBe(false)
  })

  it('2. Two compatible crops (Tomatoes + Onions) pooled transport', () => {
    const twoCropBoard: MarketMakerBoard = {
      id: 'MM-2CROP-TEST',
      isMultiCrop: true,
      crop: 'Mixed Vegetables',
      cropHi: 'मिश्रित उपज़',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi Corridor',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 95,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c_tom',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'Farm 1', location: 'Sonipat', offeredKg: 800, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c_oni',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'onion',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 28,
          buyerCurrentPerKg: 32,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'Farm 2', location: 'Sonipat', offeredKg: 600, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 400, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(twoCropBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(900)
    expect(math.multiCropMath?.cropMaths.length).toBe(2)
    expect(math.multiCropMath?.compatibility.compatible).toBe(true)
    expect(math.viable).toBe(true)
  })

  it('3. Three compatible crops (Tomatoes + Onions + Potatoes) pooled transport', () => {
    const threeCropBoard: MarketMakerBoard = {
      id: 'MM-3CROP-TEST',
      isMultiCrop: true,
      crop: 'Sonipat Mixed Produce',
      cropHi: 'सोनीपत मिश्रित उपज़',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi Corridor',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c_tom',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'Farm 1', location: 'Sonipat', offeredKg: 800, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 600, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c_oni',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'onion',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 28,
          buyerCurrentPerKg: 32,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'Farm 2', location: 'Sonipat', offeredKg: 600, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 400, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c_pot',
          crop: 'Potatoes',
          cropHi: 'आलू',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'potato',
          farmerFloorPerKg: 18,
          mandiPricePerKg: 14,
          buyerCeilingPerKg: 25,
          buyerCurrentPerKg: 28,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l3', farmer: 'F3', farm: 'Farm 3', location: 'Sonipat', offeredKg: 600, detourKm: 0 }],
          commitments: [{ id: 'cm3', source: 'bulk', party: 'B3', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(threeCropBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(1500)
    expect(math.multiCropMath?.cropMaths.length).toBe(3)
    expect(math.viable).toBe(true)
  })

  it('4. Flags incompatible crops (Ambient Vegetables + Cold Chain Milk)', () => {
    const incompatibleCrops: MarketCropSegment[] = [
      {
        id: 'c1',
        crop: 'Tomatoes',
        cropHi: 'टमाटर',
        grade: 'Grade A+',
        imageSrc: '',
        farmerFloorPerKg: 28,
        mandiPricePerKg: 24,
        buyerCeilingPerKg: 36,
        buyerCurrentPerKg: 40,
        platformFeePct: 0.02,
        storageType: 'ambient',
        lots: [],
        commitments: [],
      },
      {
        id: 'c2',
        crop: 'Fresh Milk',
        cropHi: 'दूध',
        grade: 'Grade A+',
        imageSrc: '',
        farmerFloorPerKg: 45,
        mandiPricePerKg: 40,
        buyerCeilingPerKg: 55,
        buyerCurrentPerKg: 60,
        platformFeePct: 0.02,
        storageType: 'cold_chain',
        lots: [],
        commitments: [],
      },
    ]

    const compat = checkCropCompatibility(incompatibleCrops)
    expect(compat.compatible).toBe(false)
    expect(compat.reason).toContain('Handling/storage requirements are incompatible')
  })

  it('5. Enforces vehicle capacity constraint for combined load', () => {
    const overCapacityBoard: MarketMakerBoard = {
      id: 'MM-OVERCAP',
      isMultiCrop: true,
      crop: 'Overcapacity Corridor',
      cropHi: 'ओवरकैपेसिटी',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-01',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'Farm 1', location: 'Sonipat', offeredKg: 2500, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'Buyer 1', detail: 'Delhi', quantityKg: 2500, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(overCapacityBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(2500)
    expect(math.viable).toBe(false)
    expect(math.blockers.some((b) => b.kind === 'capacity')).toBe(true)
  })

  it('6. Supports crop-specific commitment targeting', async () => {
    const state = await prototypeService.getState()
    const multiBoard = state.markets.find((m) => m.isMultiCrop)
    if (!multiBoard || !multiBoard.crops) return

    const initialTomatoKg = multiBoard.crops[0].commitments.reduce((sum, c) => sum + c.quantityKg, 0)
    
    await marketMakerService.commit(multiBoard.id, {
      source: 'consumer',
      party: 'Test Buyer',
      detail: 'Delhi',
      quantityKg: 50,
      own: true,
      cropId: 'seg_tomato',
    })

    const updatedState = await prototypeService.getState()
    const updatedBoard = updatedState.markets.find((m) => m.id === multiBoard.id)
    const updatedTomatoSegment = updatedBoard?.crops?.find((c) => c.id === 'seg_tomato')
    const updatedTomatoKg = updatedTomatoSegment?.commitments.reduce((sum, c) => sum + c.quantityKg, 0) ?? 0

    expect(updatedTomatoKg).toBe(initialTomatoKg + 50)
  })

  it('7. Throws error on invalid crop ID', async () => {
    const state = await prototypeService.getState()
    const multiBoard = state.markets.find((m) => m.isMultiCrop)
    if (!multiBoard) return

    await expect(
      marketMakerService.commit(multiBoard.id, {
        source: 'consumer',
        party: 'Test Buyer',
        detail: 'Delhi',
        quantityKg: 50,
        own: true,
        cropId: 'non_existent_crop_999',
      })
    ).rejects.toThrow('Specified crop is not part of this multi-crop corridor.')
  })

  it('8. Independent crop pricing (Floors, Ceilings, Mandi benchmarks)', () => {
    const multiBoard: MarketMakerBoard = {
      id: 'MM-INDEP-PRICING',
      isMultiCrop: true,
      crop: 'Sonipat Mixed',
      cropHi: 'सोनीपत मिश्रित',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 30,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 40,
          buyerCurrentPerKg: 45,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 400, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c2',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'onion',
          farmerFloorPerKg: 18,
          mandiPricePerKg: 14,
          buyerCeilingPerKg: 26,
          buyerCurrentPerKg: 29,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'F2', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 400, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(multiBoard, [], sampleVehicles)
    const tom = math.multiCropMath?.cropMaths[0]
    const oni = math.multiCropMath?.cropMaths[1]

    expect(tom?.farmerFloorPerKg).toBe(30)
    expect(oni?.farmerFloorPerKg).toBe(18)
    expect(tom?.buyerCeilingPerKg).toBe(40)
    expect(oni?.buyerCeilingPerKg).toBe(26)
  })

  it('9. Shared freight allocation logic (sum of shares equals total trip freight)', () => {
    const multiBoard: MarketMakerBoard = {
      id: 'MM-FREIGHT-SUM',
      isMultiCrop: true,
      crop: 'Sonipat Mixed',
      cropHi: 'सोनीपत मिश्रित',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 1000, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 600, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c2',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'onion',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 28,
          buyerCurrentPerKg: 32,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'F2', location: 'Sonipat', offeredKg: 1000, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 400, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(multiBoard, [], sampleVehicles)
    const freightTotal = math.freightTotal
    const sumFreightShare = math.multiCropMath?.cropMaths.reduce((sum, c) => sum + c.allocatedFreightShare, 0) ?? 0

    expect(Math.abs(sumFreightShare - freightTotal)).toBeLessThanOrEqual(2)
  })

  it('10. Pooled vs Standalone freight savings calculation', () => {
    const multiBoard: MarketMakerBoard = {
      id: 'MM-SAVINGS-TEST',
      isMultiCrop: true,
      crop: 'Sonipat Mixed',
      cropHi: 'सोनीपत मिश्रित',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 800, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c2',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'onion',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 28,
          buyerCurrentPerKg: 32,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'Farm 2', location: 'Sonipat', offeredKg: 600, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(multiBoard, [], sampleVehicles)
    const tom = math.multiCropMath?.cropMaths[0]
    expect(tom?.standaloneFreightTotal).toBeGreaterThan(tom?.allocatedFreightShare ?? 0)
    expect(tom?.freightSavingsTotal).toBe((tom?.standaloneFreightTotal ?? 0) - (tom?.allocatedFreightShare ?? 0))
  })

  it('11. Low-margin crop edge case (Low headroom crop cannot be cross-subsidized)', () => {
    const lowMarginBoard: MarketMakerBoard = {
      id: 'MM-LOW-MARGIN',
      isMultiCrop: true,
      crop: 'Mixed Corridor',
      cropHi: 'मिश्रित कॉरिडोर',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c_high',
          crop: 'High Margin Herb',
          cropHi: 'हर्ब',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'spinach',
          farmerFloorPerKg: 50,
          mandiPricePerKg: 40,
          buyerCeilingPerKg: 100,
          buyerCurrentPerKg: 110,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
        {
          id: 'c_low',
          crop: 'Low Margin Commodity Crop',
          cropHi: 'कम मार्जिन फसल',
          grade: 'Grade A',
          imageSrc: '',
          visual: 'potato',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 18,
          buyerCeilingPerKg: 20.20,
          buyerCurrentPerKg: 22,
          platformFeePct: 0.01,
          storageType: 'ambient',
          lots: [{ id: 'l2', farmer: 'F2', farm: 'F2', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
          commitments: [{ id: 'cm2', source: 'bulk', party: 'B2', detail: 'Delhi', quantityKg: 500, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math = evaluateMarket(lowMarginBoard, [], sampleVehicles)
    const lowCropMath = math.multiCropMath?.cropMaths[1]
    
    expect(lowCropMath?.deliveredPerKg).toBeGreaterThan(lowCropMath?.buyerCeilingPerKg ?? 0)
    expect(lowCropMath?.viable).toBe(false)
    expect(math.viable).toBe(false)
  })

  it('12. Handles empty/zero commitment corridor state safely', () => {
    const emptyBoard: MarketMakerBoard = {
      id: 'MM-EMPTY-TEST',
      isMultiCrop: true,
      crop: 'Empty Corridor',
      cropHi: 'खाली कॉरिडोर',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
          commitments: [],
        },
      ],
    }

    const math = evaluateMarket(emptyBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(0)
    expect(math.viable).toBe(false)
    expect(math.multiCropMath?.corridorStatus).toBe('forming')
  })

  it('13. Corridor viability transition when volume threshold is reached', () => {
    const formingBoard: MarketMakerBoard = {
      id: 'MM-TRANSITION',
      isMultiCrop: true,
      crop: 'Transition Corridor',
      cropHi: 'ट्रांसमिशन',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 35,
      buyerCurrentPerKg: 40,
      platformFeePct: 0.02,
      routeDistanceKm: 100,
      vehicleId: 'VEH-01',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'F1', location: 'Sonipat', offeredKg: 750, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 50, committedAt: new Date().toISOString() }],
        },
      ],
    }

    const math1 = evaluateMarket(formingBoard, [], sampleVehicles)
    expect(math1.viable).toBe(false)

    // With 550 kg committed, freight per kg drops to ~₹5.76/kg -> Delivered price <= Ceiling -> Viable!
    formingBoard.crops[0].commitments[0].quantityKg = 550
    const math2 = evaluateMarket(formingBoard, [], sampleVehicles)
    expect(math2.viable).toBe(true)
  })

  it('15. Commitment below threshold (State A: 875 kg committed vs 915 kg threshold)', async () => {
    const state = await prototypeService.getState()
    const board = state.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')
    if (!board) return

    const math = evaluateMarket(board, state.listings, sampleVehicles)
    const headroomToThreshold = Math.max(0, math.thresholdKg - math.committedKg)

    expect(math.committedKg).toBeLessThan(math.thresholdKg)
    expect(headroomToThreshold).toBeGreaterThan(0)
  })

  it('16. Attempt to exceed threshold caps commitment at threshold (State C prevention)', async () => {
    const state = await prototypeService.getState()
    const board = state.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')
    if (!board) return

    const beforeMath = evaluateMarket(board, state.listings, sampleVehicles)
    const headroomToThreshold = Math.max(0, beforeMath.thresholdKg - beforeMath.committedKg)

    // Attempt to commit 100 kg when only headroomToThreshold is needed
    await marketMakerService.commit(board.id, {
      source: 'consumer',
      party: 'Test Buyer Capped',
      detail: 'Delhi',
      quantityKg: 100,
      own: true,
      cropId: 'seg_tomato',
    })

    const afterState = await prototypeService.getState()
    const afterBoard = afterState.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')!
    const afterMath = evaluateMarket(afterBoard, afterState.listings, sampleVehicles)

    // Final committed weight must equal threshold (capped at threshold, NOT 850 + 100 = 950 kg)
    expect(afterMath.committedKg).toBe(afterMath.thresholdKg)
    expect(afterMath.committedKg).toBeLessThanOrEqual(afterMath.thresholdKg)
  })

  it('17. Multi-region NCR corridor aggregates supply across origins (Sonipat, Rohtak, Meerut, Ghaziabad)', async () => {
    const s = await prototypeService.getState()
    const board = s.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')
    if (!board) return

    const math = evaluateMarket(board, s.listings, sampleVehicles)
    expect(math.regionContributions).toBeDefined()
    expect(math.regionContributions!.length).toBeGreaterThanOrEqual(3)
    const regionNames = math.regionContributions!.map((r) => r.regionName)
    expect(regionNames).toContain('Sonipat')
    expect(regionNames).toContain('Rohtak')
  })

  it('18. Consumer group buy pooled pricing is derived deterministically from Market Maker economics', async () => {
    const s = await prototypeService.getState()
    const board = s.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')!
    const math = evaluateMarket(board, s.listings, sampleVehicles)

    const tomatoMath = math.multiCropMath!.cropMaths.find((c) => c.segment.id === 'seg_tomato')!
    expect(tomatoMath.deliveredPerKg).toBeLessThan(tomatoMath.segment.buyerCurrentPerKg)
    expect(tomatoMath.buyerSavingPerKg).toBeGreaterThan(0)
    expect(tomatoMath.buyerSavingPerKg).toBeCloseTo(tomatoMath.segment.buyerCurrentPerKg - tomatoMath.deliveredPerKg, 2)
  })

  it('19. Adding pooled crop to cart preserves pooled price and calculates total savings correctly', () => {
    const cart = phase2Service.addPooledToCart({
      listingId: 'listing_001',
      quantityKg: 5,
      pooledPricePerKg: 31.10,
      regularPricePerKg: 40.00,
      savingsPerKg: 8.90,
      boardId: 'MM-MULTI-SONIPAT',
      cropId: 'seg_tomato',
    })

    const item = cart.find((i) => i.listingId === 'listing_001' && i.isPooled)!
    expect(item.isPooled).toBe(true)
    expect(item.pooledPricePerKg).toBe(31.10)
    expect(item.quantityKg).toBeGreaterThanOrEqual(5)
    expect(item.savingsPerKg).toBe(8.90)

    // Clean up test item
    phase2Service.saveCart(cart.filter((i) => !i.isPooled))
  })

  it('20. Bulk Buyer procurement commitment updates shared Market Maker state', async () => {
    const beforeState = await prototypeService.getState()
    const board = beforeState.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')!
    const beforeMath = evaluateMarket(board, beforeState.listings, sampleVehicles)
    const headroom = Math.max(0, beforeMath.thresholdKg - beforeMath.committedKg)

    if (headroom > 0) {
      const commitQty = Math.min(20, headroom)
      const initialCommitted = beforeMath.committedKg

      await marketMakerService.commit(board.id, {
        source: 'bulk',
        party: 'Bulk Test Buyer',
        detail: 'NCR Retail Supply',
        quantityKg: commitQty,
        cropId: 'seg_onion',
      })

      const afterState = await prototypeService.getState()
      const afterBoard = afterState.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')!
      const afterMath = evaluateMarket(afterBoard, afterState.listings, sampleVehicles)

      expect(afterMath.committedKg).toBe(initialCommitted + commitQty)
    } else {
      expect(beforeMath.committedKg).toBe(beforeMath.thresholdKg)
    }
  })

  it('21. Cross-role synchronization: Farmer, Consumer, Bulk, and Logistics read the SAME shared state', async () => {
    const views = await marketMakerService.boards()
    const multiView = views.find((v) => v.board.id === 'MM-MULTI-SONIPAT')!

    // All roles reference multiView.math
    expect(multiView.board.isMultiRegion).toBe(true)
    expect(multiView.math.committedKg).toBeLessThanOrEqual(multiView.math.thresholdKg)
    expect(multiView.math.vehicle?.capacityKg).toBe(2000)
  })

  it('22. Logistics view tracks regional origins and vehicle load utilization accurately', async () => {
    const state = await prototypeService.getState()
    const board = state.markets.find((m) => m.id === 'MM-MULTI-SONIPAT')!
    const math = evaluateMarket(board, state.listings, sampleVehicles)

    const regions = math.regionContributions!
    const totalRegionalOffered = regions.reduce((sum, r) => sum + r.offeredKg, 0)

    expect(totalRegionalOffered).toBe(math.offeredKg)
    expect(math.utilisationPct).toBeGreaterThan(0)
    expect(math.utilisationPct).toBeLessThanOrEqual(100)
  })

  it('23. Safety: No crop cross-subsidization across shared transport segments', () => {
    const unviableCrop: MarketCropSegment = {
      id: 'seg_unviable',
      crop: 'Exotic Berries',
      cropHi: 'बेरी',
      grade: 'Grade A+',
      imageSrc: '',
      visual: 'fruit',
      farmerFloorPerKg: 100, // Very high floor
      mandiPricePerKg: 90,
      buyerCeilingPerKg: 95, // Ceiling LOWER than floor + fees -> Impossible to be viable!
      buyerCurrentPerKg: 110,
      platformFeePct: 0.02,
      storageType: 'ambient',
      lots: [{ id: 'l_berry', farmer: 'F_Berry', farm: 'Farm Berry', location: 'Sonipat', offeredKg: 500, detourKm: 0 }],
      commitments: [{ id: 'cm_berry', source: 'bulk', party: 'Buyer', detail: 'Delhi', quantityKg: 200, committedAt: new Date().toISOString() }],
    }

    const mixedBoard: MarketMakerBoard = {
      id: 'MM-CROSS-SUB-TEST',
      isMultiCrop: true,
      crop: 'Mixed',
      cropHi: 'मिश्रित',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi',
      corridorHi: 'सोनीपत → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 20,
      mandiPricePerKg: 15,
      buyerCeilingPerKg: 40,
      buyerCurrentPerKg: 45,
      platformFeePct: 0.02,
      routeDistanceKm: 90,
      vehicleId: 'VEH-02',
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [unviableCrop],
    }

    const math = evaluateMarket(mixedBoard, [], sampleVehicles)
    const berrySegmentMath = math.multiCropMath!.cropMaths.find((c) => c.segment.id === 'seg_unviable')!

    // Unviable crop MUST remain unviable regardless of other corridor conditions
    expect(berrySegmentMath.viable).toBe(false)
  })

  it('24. Safety: Enforces vehicle capacity constraint for multi-region combined load', () => {
    const overCapacityBoard: MarketMakerBoard = {
      id: 'MM-OVERCAP-TEST',
      isMultiCrop: true,
      crop: 'NCR Multi-Region',
      cropHi: 'NCR multi',
      grade: 'Grade A+',
      corridor: 'NCR → Delhi',
      corridorHi: 'NCR → दिल्ली',
      destination: 'Delhi',
      deliveryWindow: 'Tomorrow',
      imageSrc: '',
      visual: 'tomato',
      farmerFloorPerKg: 20,
      mandiPricePerKg: 15,
      buyerCeilingPerKg: 40,
      buyerCurrentPerKg: 45,
      platformFeePct: 0.02,
      routeDistanceKm: 90,
      vehicleId: 'VEH-02', // Capacity 2,000 kg
      lots: [],
      commitments: [],
      status: 'forming',
      createdAt: new Date().toISOString(),
      crops: [
        {
          id: 'c1',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '',
          visual: 'tomato',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 15,
          buyerCeilingPerKg: 40,
          buyerCurrentPerKg: 45,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'l1', farmer: 'F1', farm: 'Farm1', location: 'Sonipat', offeredKg: 3000, detourKm: 0 }],
          commitments: [{ id: 'cm1', source: 'bulk', party: 'B1', detail: 'Delhi', quantityKg: 2500, committedAt: new Date().toISOString() }], // 2,500 > 2,000 kg capacity!
        },
      ],
    }

    const math = evaluateMarket(overCapacityBoard, [], sampleVehicles)
    expect(math.committedKg).toBe(2500)
    expect(math.viable).toBe(false)
    expect(math.blockers.some((b) => b.kind === 'capacity')).toBe(true)
  })

  it('25. Safety: Invariant committedKg <= thresholdKg is maintained', async () => {
    const state = await prototypeService.getState()
    state.markets.forEach((board) => {
      const math = evaluateMarket(board, state.listings, sampleVehicles)
      expect(math.committedKg).toBeLessThanOrEqual(math.thresholdKg)
    })
  })

  it('26. Single-crop Sonipat Fresh Tomatoes corridor backward compatibility', async () => {
    const state = await prototypeService.getState()
    const singleBoard = state.markets.find((m) => m.id === 'MM-TOM-SONIPAT')!

    expect(singleBoard).toBeDefined()
    expect(singleBoard.crop).toBe('Fresh Tomatoes')
    const math = evaluateMarket(singleBoard, state.listings, sampleVehicles)
    expect(math.committedKg).toBeGreaterThan(0)
    expect(math.thresholdKg).toBeGreaterThan(0)
  })
})
