import { beforeEach, describe, expect, it } from 'vitest'
import { assessFreshness, isUrgentFreshness, sellingWindowFor } from '../services/cropFreshness'
import { cropDealFrom, getCropDeals } from '../services/farmerDeal'
import { marketMakerService } from '../services/marketMakerService'
import { prototypeService } from '../services/prototypeService'
import { localDay } from '../utils/dates'

const listing = (crop: string, harvestOffset: number, extra: Record<string, unknown> = {}) => ({
  crop, harvestDate: localDay(harvestOffset), createdAt: localDay(harvestOffset), category: 'Vegetables' as const, ...extra,
})

describe('crop freshness — recommended selling window', () => {
  it('orders windows by perishability: leafy < tomato < root < tuber < grain', () => {
    const days = (crop: string) => sellingWindowFor(crop).days
    expect(days('Baby Spinach')).toBeLessThan(days('Fresh Tomatoes'))
    expect(days('Fresh Tomatoes')).toBeLessThan(days('Sweet Carrots'))
    expect(days('Sweet Carrots')).toBeLessThan(days('New Potatoes'))
    expect(days('New Potatoes')).toBeLessThan(days('Sharbati Wheat'))
    expect(days('Red Onion')).toBe(days('New Potatoes'))
  })

  it('matches Hindi crop names and falls back to the category', () => {
    expect(sellingWindowFor('टमाटर').days).toBe(sellingWindowFor('Tomatoes').days)
    expect(sellingWindowFor('Unknown thing', 'Grains').days).toBeGreaterThan(sellingWindowFor('Unknown thing', 'Vegetables').days)
  })

  it('moves a tomato through the stages as days pass', () => {
    expect(assessFreshness(listing('Fresh Tomatoes', 0)).stage).toBe('FRESH')
    expect(assessFreshness(listing('Fresh Tomatoes', -2)).stage).toBe('GOOD')
    expect(assessFreshness(listing('Fresh Tomatoes', -3)).stage).toBe('SELL_SOON')
    expect(assessFreshness(listing('Fresh Tomatoes', -4)).stage).toBe('URGENT')
    expect(assessFreshness(listing('Fresh Tomatoes', -5)).stage).toBe('WINDOW_OVER')
  })

  it('reports days left and a sell-by date derived from the harvest date', () => {
    const fresh = assessFreshness(listing('Fresh Tomatoes', -1))
    expect(fresh.windowDays).toBe(5)
    expect(fresh.daysSinceHarvest).toBe(1)
    expect(fresh.daysLeft).toBe(3)
    expect(fresh.sellBy).toBe(localDay(3))
    expect(fresh.approximate).toBe(false)
  })

  it('walks spinach from sell-soon on harvest day to urgent the next', () => {
    expect(assessFreshness(listing('Baby Spinach', 0)).stage).toBe('SELL_SOON')
    expect(isUrgentFreshness(assessFreshness(listing('Baby Spinach', -1)))).toBe(true)
    expect(assessFreshness(listing('Baby Spinach', -2)).stage).toBe('WINDOW_OVER')
  })

  it('keeps wheat fresh for weeks', () => {
    const fresh = assessFreshness({ ...listing('Sharbati Wheat', -8), category: 'Grains' })
    expect(fresh.stage).toBe('FRESH')
    expect(fresh.daysLeft).toBeGreaterThan(100)
  })

  it('falls back to the listing date, flagged approximate, when no harvest date exists', () => {
    const fresh = assessFreshness({ crop: 'Fresh Tomatoes', harvestDate: '', createdAt: localDay(-1) })
    expect(fresh.approximate).toBe(true)
    expect(fresh.daysSinceHarvest).toBe(1)
  })

  it('counts a future (pre-harvest) date as harvest day', () => {
    expect(assessFreshness(listing('Fresh Tomatoes', 2)).daysSinceHarvest).toBe(0)
  })
})

describe('per-crop Market Maker read', () => {
  beforeEach(async () => {
    localStorage.clear()
    await prototypeService.seedScenario('market')
  })

  it('answers every crop from a board, a corridor segment or the intelligence table', async () => {
    const listings = await prototypeService.getMyListings()
    const deals = await getCropDeals(listings)
    const tomato = deals['listing_001']!
    expect(tomato.source).toBe('board')
    expect(tomato.boardId).toBe('MM-TOM-SONIPAT')
    expect(tomato.pricePerKg).toBeGreaterThan(tomato.mandiPerKg)
    expect(tomato.freshness.stage).toBeDefined()

    // Wheat has no single-crop board but the Rohtak pool carries a wheat segment.
    const wheat = deals['listing_draft_1']!
    expect(wheat.source).toBe('board')
    expect(wheat.boardId).not.toBe('MM-TOM-SONIPAT')

    // Carrots are on no corridor at all, so the intelligence table answers.
    const [any] = listings
    const carrot = cropDealFrom({ ...any, id: 'c', crop: 'Sweet Carrots', cropHi: 'गाजर', mandiPricePerKg: 29 }, await marketMakerService.boards())
    expect(carrot?.source).toBe('intel')
    expect(carrot!.pricePerKg).toBeGreaterThan(0)
  })

  it('returns null rather than a fabricated price for an unknown crop', async () => {
    const views = await marketMakerService.boards()
    const [any] = await prototypeService.getMyListings()
    expect(cropDealFrom({ ...any, crop: 'Dragon Fruit', cropHi: 'ड्रैगन फ्रूट' }, views)).toBeNull()
  })

  it('reads onion from the regional multi-crop corridor segment', async () => {
    const views = await marketMakerService.boards()
    const [any] = await prototypeService.getMyListings()
    const deal = cropDealFrom({ ...any, id: 'x', crop: 'Red Onion', cropHi: 'प्याज़', mandiPricePerKg: 18 }, views)
    expect(deal?.source).toBe('board')
    expect(deal?.boardId).not.toBe('MM-TOM-SONIPAT')
  })
})

describe('freshness across the farmer surfaces', () => {
  it('raises a home task and an urgent insight for a crop on its last day', async () => {
    const { buildFarmerTasks } = await import('../services/farmerTasks')
    const { homeInsight } = await import('../services/farmerInsight')
    const [base] = await prototypeService.getMyListings()
    const lastDay = { ...base, id: 'urgent', crop: 'Fresh Tomatoes', cropHi: 'टमाटर', harvestDate: localDay(-4), status: 'active' as const, isUrgentRescue: false, rescueStatus: undefined }
    const tasks = buildFarmerTasks({ listings: [lastDay], orders: [], pickups: [], earnings: [] }, 'hi')
    expect(tasks[0]).toMatchObject({ kind: 'fresh', titleKey: 'freshUrgentTask', actionKey: 'freshUrgentTaskAction', to: '/farmer/fasal/urgent' })

    const deals = await getCropDeals([lastDay])
    const insight = homeInsight([lastDay], deals, (en) => en)
    expect(insight).toMatchObject({ key: 'aiHomeUrgent', urgent: true })
  })

  it('does not nag about a crop already on a rescue sale', async () => {
    const { buildFarmerTasks } = await import('../services/farmerTasks')
    const [base] = await prototypeService.getMyListings()
    const rescued = { ...base, id: 'r', harvestDate: localDay(-4), status: 'active' as const, isUrgentRescue: true }
    expect(buildFarmerTasks({ listings: [rescued], orders: [], pickups: [], earnings: [] }, 'en').some((task) => task.kind === 'fresh')).toBe(false)
  })
})
