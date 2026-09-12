import { beforeEach, describe, expect, it } from 'vitest'
import { marketMakerService } from '../services/marketMakerService'
import { matchNcrRegion, rankMarketMakerOpportunities } from '../services/marketRankingService'
import { phase2Service, consumerCartCosts } from '../services/phase2Service'
import { prototypeService } from '../services/prototypeService'

beforeEach(async () => {
  localStorage.clear()
  await prototypeService.seedScenario('market')
})

describe('regional Market Maker', () => {
  it('adds the six Arshdeep NCR boards without replacing the main board', async () => {
    const views = await marketMakerService.boards()
    expect(views[0].board.id).toBe('MM-TOM-SONIPAT')
    const regional = views.filter((view) => view.board.isMultiCrop)
    expect(regional.map((view) => view.board.regions?.[0]?.name)).toEqual(['Sonipat', 'Gurgaon', 'Faridabad', 'Rohtak', 'Meerut', 'Ghaziabad'])
  })

  it('ranks a matched region first while retaining every other corridor', async () => {
    const regional = (await marketMakerService.boards()).filter((view) => view.board.isMultiCrop)
    const ranking = rankMarketMakerOpportunities(regional, 'Warehouse, Meerut, Uttar Pradesh')
    expect(matchNcrRegion('Gurugram depot')).toBe('Gurgaon')
    expect(ranking.hero.board.id).toBe('MM-MEERUT-001')
    expect(ranking.others).toHaveLength(5)
  })

  it('targets one crop without changing another region', async () => {
    const sonipatBefore = await marketMakerService.board('MM-SONIPAT-001')
    const meerutBefore = await marketMakerService.board('MM-MEERUT-001')
    const crop = sonipatBefore!.board.crops![0]
    const priorCropKg = sonipatBefore!.math.multiCropMath!.cropMaths[0].committedKg
    await marketMakerService.commit('MM-SONIPAT-001', { source: 'bulk', party: 'Test buyer', detail: 'Sonipat only', quantityKg: 10, cropId: crop.id })
    const sonipatAfter = await marketMakerService.board('MM-SONIPAT-001')
    const meerutAfter = await marketMakerService.board('MM-MEERUT-001')
    expect(sonipatAfter!.math.multiCropMath!.cropMaths[0].committedKg).toBe(priorCropKg + 10)
    expect(meerutAfter!.math.committedKg).toBe(meerutBefore!.math.committedKg)
  })

  it('retains pooled cart identity and computes the advertised delivered total', async () => {
    const listing = (await phase2Service.listings()).find((item) => item.status === 'active')!
    phase2Service.addPooledToCart({ listingId: listing.id, quantityKg: 5, pooledPricePerKg: 30, regularPricePerKg: 36, savingsPerKg: 6, farmerGatePerKg: 28, platformFeePerKg: 0.56, freightPerKg: 1.44, boardId: 'MM-SONIPAT-001', cropId: 'seg_sonipat_tomato', regionId: 'reg_sonipat' })
    const item = phase2Service.cart()[0]
    expect(item).toMatchObject({ isPooled: true, boardId: 'MM-SONIPAT-001', regionId: 'reg_sonipat', cropId: 'seg_sonipat_tomato' })
    expect(consumerCartCosts([{ ...item, listing }]).total).toBe(150)
  })

  it('recomputes RFQ matches and procurement economics after an inline edit', async () => {
    const created = (await phase2Service.rfqs()).find((rfq) => !['converted', 'closed'].includes(rfq.status))!
    const updated = await phase2Service.updateRfq(created.id, { requiredQuantityKg: 700, targetPrice: 34, deliveryLocation: 'Gurugram Cold Store, Sector 37', notes: 'Updated requirement' })
    expect(updated.requiredQuantityKg).toBe(700)
    expect(updated.plan?.requiredKg).toBe(700)
    expect(updated.matches).toEqual(updated.plan?.stops.map((stop) => expect.objectContaining({ listingId: stop.listingId, quantityKg: stop.quantityKg })))
  })
})
