import type { ConsumerOrder, MarketCommitment, MarketCommitmentSource, MarketMakerBoard, Role, Vehicle } from '../types'
import { evaluateMarket, type MarketMath } from './marketMakerEngine'
import { prototypeService, type PrototypeState } from './prototypeService'

const now = () => new Date().toISOString()
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const perKg = (value: number) => `₹${value.toFixed(2)}/kg`

function note(state: PrototypeState, role: Role, title: string, titleHi: string, body: string, bodyHi: string, href: string) {
  state.notifications.unshift({ id: `note-mm-${role}-${Date.now()}-${state.notifications.length}`, role, title, titleHi, body, bodyHi, timestamp: now(), read: false, href })
}

/** Every module reads the same board through the same shared prototype state. */
export interface MarketView {
  board: MarketMakerBoard
  math: MarketMath
  /**
   * The vehicle the corridor was originally quoted against, whatever its current status.
   * `math.vehicle` is whichever vehicle the engine could actually use, which may be a costlier
   * fallback — the two differ exactly when logistics has pulled the corridor vehicle away.
   */
  corridorVehicle?: Vehicle
}

function viewsFrom(state: PrototypeState): MarketView[] {
  return state.markets.map((board) => ({
    board,
    math: evaluateMarket(board, state.listings, state.vehicles),
    corridorVehicle: state.vehicles.find((vehicle) => vehicle.id === board.vehicleId),
  }))
}

export const marketMakerService = {
  async boards(): Promise<MarketView[]> {
    return viewsFrom(await prototypeService.getState())
  },

  async board(id?: string): Promise<MarketView | undefined> {
    const views = await this.boards()
    return id ? views.find((view) => view.board.id === id) : views[0]
  },

  /**
   * Adds demand to a corridor from whichever module the user is in. The board is re-evaluated
   * immediately afterwards, so crossing the break-even volume flips its status to `viable` and
   * tells every role in the same write.
   */
  async commit(boardId: string, input: { source: MarketCommitmentSource; party: string; detail: string; quantityKg: number; own?: boolean }) {
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === boardId)
    if (!board) throw new Error('This market is no longer open.')
    if (board.status === 'created') throw new Error('This market has already been created.')
    if (input.quantityKg < 1) throw new Error('Commit at least 1 kg.')

    const before = evaluateMarket(board, state.listings, state.vehicles)
    const headroomKg = Math.max(0, before.ceilingKg - before.committedKg)
    if (input.quantityKg > headroomKg) throw new Error(`Only ${headroomKg} kg of headroom is left in this corridor.`)

    // Repeat commitments from the same party merge instead of stacking duplicate rows.
    const existing = board.commitments.find((item) => item.own && item.party === input.party && item.source === input.source)
    if (existing) existing.quantityKg += input.quantityKg
    else {
      const commitment: MarketCommitment = { id: `mmc_${Date.now()}`, source: input.source, party: input.party, detail: input.detail, quantityKg: input.quantityKg, committedAt: now(), own: input.own }
      board.commitments.push(commitment)
    }

    const after = evaluateMarket(board, state.listings, state.vehicles)
    board.status = after.viable ? 'viable' : 'forming'

    if (after.viable && !before.viable) {
      board.unlockedAt = now()
      note(state, 'farmer', 'Direct market is now viable', 'सीधा बाज़ार अब संभव है', `${board.crop} · ${after.committedKg} kg committed. Your lot can be sold at ${perKg(after.farmerGatePerKg)}.`, `${board.cropHi} · ${after.committedKg} किलो की मांग तैयार है।`, '/farmer/market')
      note(state, 'consumer', 'Farm-direct price unlocked', 'सीधा खेत भाव खुल गया', `${board.crop} delivered at ${perKg(after.deliveredPerKg)} instead of ${perKg(board.buyerCurrentPerKg)}.`, 'सीधा भाव खुल गया है।', '/consumer/market')
      note(state, 'bulk', 'Pooled corridor is viable', 'साझा कॉरिडोर व्यवहार्य है', `${board.destination} · ${after.committedKg} kg at ${perKg(after.deliveredPerKg)} landed.`, 'साझा कॉरिडोर व्यवहार्य हो गया है।', '/bulk/market')
      note(state, 'logistics', 'Corridor reached break-even load', 'कॉरिडोर ब्रेक-ईवन पर पहुंचा', `${board.corridor} · ${after.committedKg} kg of ${after.capacityKg} kg. Route can be created.`, `${board.corridorHi} अब चलाया जा सकता है।`, '/logistics/market')
    } else if (!after.viable) {
      note(state, 'farmer', 'New demand on your corridor', 'आपके कॉरिडोर पर नई मांग', `${input.quantityKg} kg added · ${after.gapKg} kg still needed.`, `${input.quantityKg} किलो जुड़ा · ${after.gapKg} किलो और चाहिए।`, '/farmer/market')
    }

    await prototypeService.replaceState(state)
    return { board, math: after }
  },

  /**
   * The farmer's lever: release more of an existing lot into the corridor. Capped by the live
   * listing, so a farmer can never offer produce they have already sold elsewhere.
   */
  async offerMore(boardId: string, lotId: string, extraKg: number) {
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === boardId)
    const lot = board?.lots.find((item) => item.id === lotId)
    if (!board || !lot) throw new Error('This lot is no longer part of the corridor.')
    if (board.status === 'created') throw new Error('This market has already been created.')
    const listing = lot.listingId ? state.listings.find((item) => item.id === lot.listingId) : undefined
    const ceiling = listing ? listing.remainingKg : lot.offeredKg + extraKg
    const next = Math.min(ceiling, lot.offeredKg + extraKg)
    if (next <= lot.offeredKg) throw new Error('No further stock is available on this lot.')
    lot.offeredKg = next
    const math = evaluateMarket(board, state.listings, state.vehicles)
    board.status = math.viable ? 'viable' : 'forming'
    note(state, 'bulk', 'More farm supply released', 'खेत से और सप्लाई मिली', `${lot.farm} raised its offer to ${lot.offeredKg} kg on ${board.corridor}.`, 'कॉरिडोर में और सप्लाई जुड़ी है।', '/bulk/market')
    note(state, 'logistics', 'Corridor supply increased', 'कॉरिडोर सप्लाई बढ़ी', `${lot.farm} · now ${lot.offeredKg} kg available for ${board.corridor}.`, `${lot.farm} · अब ${lot.offeredKg} किलो उपलब्ध।`, '/logistics/market')
    await prototypeService.replaceState(state)
    return { board, math }
  },

  /** Removes demand the demo user added, so a corridor can be walked back on stage. */
  async withdraw(boardId: string, commitmentId: string) {
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === boardId)
    if (!board || board.status === 'created') throw new Error('This market can no longer be changed.')
    board.commitments = board.commitments.filter((item) => item.id !== commitmentId)
    board.status = evaluateMarket(board, state.listings, state.vehicles).viable ? 'viable' : 'forming'
    await prototypeService.replaceState(state)
    return { board, math: evaluateMarket(board, state.listings, state.vehicles) }
  },

  /**
   * Turns a viable market into real prototype transactions using the structures every other
   * module already reads: farmer orders, earnings and pickups; a bulk procurement order; a
   * consumer order; one pooled logistics route with its pickups and deliveries.
   *
   * The farmer's floor is paid in full — the platform fee and freight are billed to the buyer,
   * which is exactly what the board promised while it was forming.
   */
  async createMarket(boardId: string) {
    const state = await prototypeService.getState()
    const board = state.markets.find((item) => item.id === boardId)
    if (!board) throw new Error('This market is no longer open.')
    if (board.status === 'created') throw new Error('This market has already been created.')

    const math = evaluateMarket(board, state.listings, state.vehicles)
    if (!math.viable || !math.vehicle) throw new Error(math.blockers[0]?.title ?? 'This market is not viable yet.')

    const stamp = Date.now().toString().slice(-5)
    const routeId = `RTE-MM-${stamp}`
    const allocations = math.allocations.filter((entry) => entry.allocatedKg > 0)
    const pickupIds: string[] = []
    const farmerOrderIds: string[] = []
    const stops: string[] = []

    // 1. Supply side — one pickup per contributing farm, plus a real order, earning and
    //    farmer-facing pickup for the lot that belongs to the signed-in farmer.
    allocations.forEach((entry, index) => {
      const pickupId = `PK-MM-${stamp}-${index + 1}`
      pickupIds.push(pickupId)
      stops.push(`${entry.lot.farm} · ${entry.lot.location}`)
      const orderRefs: string[] = []

      if (entry.lot.own) {
        const orderId = `KL-MM-${stamp}`
        farmerOrderIds.push(orderId)
        orderRefs.push(orderId)
        const gross = Math.round(entry.allocatedKg * math.farmerGatePerKg)
        const listing = board.lots.find((lot) => lot.id === entry.lot.id)?.listingId
        const stock = listing ? state.listings.find((item) => item.id === listing) : undefined
        if (stock) {
          stock.remainingKg = Math.max(0, stock.remainingKg - entry.allocatedKg)
          stock.allocatedKg += entry.allocatedKg
          if (stock.remainingKg === 0) stock.status = 'sold'
        }
        state.orders.unshift({
          id: orderId,
          buyerName: 'KisanLink Market Maker · pooled buyers',
          buyerType: 'Bulk Buyer',
          crop: board.crop,
          cropHi: board.cropHi,
          listingId: stock?.id ?? entry.lot.id,
          quantityKg: entry.allocatedKg,
          ratePerKg: math.farmerGatePerKg,
          total: gross,
          // Freight and platform fee are billed to the buyer on a Market Maker order, so the
          // farmer's protected floor is paid out whole.
          farmerPayout: gross,
          platformFee: 0,
          logisticsFee: 0,
          orderedAt: now().slice(0, 10),
          status: 'accepted',
          paymentStatus: 'processing',
          pickupId,
        })
        state.earnings.unshift({
          id: `TX-MM-${stamp}`,
          orderId,
          crop: board.crop,
          cropHi: board.cropHi,
          gross,
          deductions: 0,
          net: gross,
          mandiEquivalent: Math.round(entry.allocatedKg * board.mandiPricePerKg),
          date: now().slice(0, 10),
          status: 'pending',
        })
        state.pickups.unshift({
          id: pickupId,
          orderId,
          crop: board.crop,
          cropHi: board.cropHi,
          quantityKg: entry.allocatedKg,
          date: day(1),
          timeWindow: board.deliveryWindow,
          driver: math.vehicle!.driver,
          vehicle: `${math.vehicle!.registration} · ${math.vehicle!.type}`,
          farmAddress: `${entry.lot.farm}, ${entry.lot.location}`,
          status: 'driver_assigned',
        })
      }

      state.logisticsPickups.unshift({
        id: pickupId,
        farmer: entry.lot.farmer,
        farm: entry.lot.farm,
        farmLocation: entry.lot.location,
        crop: board.crop,
        cropHi: board.cropHi,
        quantityKg: entry.allocatedKg,
        pickupWindow: board.deliveryWindow,
        orderRefs,
        vehicleId: math.vehicle!.id,
        driver: math.vehicle!.driver,
        status: 'assigned',
        notes: `Market Maker corridor stop ${index + 1} of ${allocations.length}. Pooled ${board.grade} crates.`,
        routeId,
        checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false },
        timeline: [{ label: 'Created by Market Maker', labelHi: 'मार्केट मेकर से बना', at: now() }, { label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: now() }],
      })
    })

    // 2. Demand side — a procurement order for the bulk share and a consumer order for the
    //    household share the signed-in consumer owns.
    const deliveryIds: string[] = []
    const contributions = allocations.map((entry) => ({ farmer: entry.lot.farmer, farm: entry.lot.farm, listingId: entry.lot.listingId ?? entry.lot.id, quantityKg: entry.allocatedKg, ratePerKg: math.farmerGatePerKg }))

    let bulkOrderId: string | undefined
    if (math.bulkKg > 0) {
      bulkOrderId = `KL-B-MM-${stamp}`
      const produceValue = Math.round(math.bulkKg * math.farmerGatePerKg)
      const logisticsFee = Math.round(math.bulkKg * math.freightPerKg)
      const platformFee = Math.round(math.bulkKg * math.platformFeePerKg)
      const share = math.bulkKg / math.committedKg
      state.bulkOrders.unshift({
        id: bulkOrderId,
        rfqId: board.id,
        crop: board.crop,
        grade: board.grade,
        orderedQuantityKg: math.bulkKg,
        suppliedQuantityKg: math.bulkKg,
        contributions: contributions.map((item) => ({ ...item, quantityKg: Math.round(item.quantityKg * share) })),
        produceValue,
        logisticsFee,
        platformFee,
        total: produceValue + logisticsFee + platformFee,
        traditionalEstimate: Math.round(math.bulkKg * board.buyerCurrentPerKg),
        deliveryLocation: board.destination,
        deliveryWindow: board.deliveryWindow,
        status: 'pickup_scheduled',
        invoiceStatus: 'Mock invoice generated',
        orderedAt: now(),
      })
      const deliveryId = `DLV-MM-B-${stamp}`
      deliveryIds.push(deliveryId)
      state.deliveries.unshift({
        id: deliveryId,
        origin: 'KisanLink Sonipat Hub',
        destination: board.destination,
        buyer: state.bulkProfile.businessName,
        buyerType: 'Bulk Buyer',
        shipment: `Market Maker pooled lot ${board.id}`,
        produce: board.crop,
        produceHi: board.cropHi,
        quantityKg: math.bulkKg,
        eta: day(1),
        vehicleId: math.vehicle!.id,
        orderRefs: [bulkOrderId],
        status: 'scheduled',
        handlingNotes: `Pooled from ${allocations.length} farms. Do not stack above four crates.`,
        issues: [],
        timeline: [{ label: 'Created by Market Maker', labelHi: 'मार्केट मेकर से बना', at: now() }],
      })
    }

    let consumerOrderId: string | undefined
    const ownConsumer = board.commitments.find((item) => item.source === 'consumer' && item.own)
    if (math.consumerKg > 0) {
      const deliveryId = `DLV-MM-C-${stamp}`
      deliveryIds.push(deliveryId)
      const orderRefs: string[] = []
      if (ownConsumer) {
        consumerOrderId = `KL-C-MM-${stamp}`
        orderRefs.push(consumerOrderId)
        const subtotal = Math.round(ownConsumer.quantityKg * math.farmerGatePerKg)
        const logisticsFee = Math.round(ownConsumer.quantityKg * math.freightPerKg)
        const platformFee = Math.round(ownConsumer.quantityKg * math.platformFeePerKg)
        const address = state.consumerProfile.addresses.find((item) => item.isDefault) ?? state.consumerProfile.addresses[0]
        const order: ConsumerOrder = {
          id: consumerOrderId,
          items: [{ listingId: allocations[0]?.lot.listingId ?? board.id, crop: board.crop, cropHi: board.cropHi, farm: `${allocations.length} farms · ${board.corridor}`, imageSrc: board.imageSrc, quantityKg: ownConsumer.quantityKg, ratePerKg: math.farmerGatePerKg }],
          subtotal,
          logisticsFee,
          platformFee,
          farmerShare: subtotal,
          total: subtotal + logisticsFee + platformFee,
          address,
          deliverySlot: board.deliveryWindow,
          eta: day(1),
          note: `Market Maker corridor ${board.id} · pooled delivery with ${math.consumerParticipants - 1} other household groups.`,
          paymentMethod: 'UPI',
          paymentStatus: 'Mock paid',
          status: 'pickup_scheduled',
          orderedAt: now(),
          timeline: [
            { status: 'confirmed', label: 'Direct market created', at: now() },
            { status: 'pickup_scheduled', label: 'Pooled pickup scheduled', at: now() },
          ],
        }
        state.consumerOrders.unshift(order)
      }
      state.deliveries.unshift({
        id: deliveryId,
        origin: 'KisanLink Sonipat Hub',
        destination: ownConsumer ? `${state.consumerProfile.addresses[0]?.line1 ?? 'Dwarka'}, New Delhi` : 'Dwarka, New Delhi',
        buyer: `${math.consumerParticipants} household groups`,
        buyerType: 'Consumer',
        shipment: `Market Maker household pool ${board.id}`,
        produce: board.crop,
        produceHi: board.cropHi,
        quantityKg: math.consumerKg,
        eta: day(1),
        vehicleId: math.vehicle!.id,
        orderRefs,
        status: 'scheduled',
        handlingNotes: 'Split into household crates at the hub before the Dwarka drops.',
        issues: [],
        timeline: [{ label: 'Created by Market Maker', labelHi: 'मार्केट मेकर से बना', at: now() }],
      })
    }

    // 3. One pooled route carrying the whole corridor.
    state.logisticsRoutes.unshift({
      id: routeId,
      name: `Market Maker · ${board.corridor}`,
      nameHi: `मार्केट मेकर · ${board.corridorHi}`,
      vehicleId: math.vehicle.id,
      pickups: pickupIds,
      deliveries: deliveryIds,
      stops: [...stops, 'KisanLink Sonipat Hub', board.destination],
      distanceKm: board.routeDistanceKm,
      durationMinutes: Math.round(board.routeDistanceKm * 1.8 + allocations.length * 18),
      capacityKg: math.capacityKg,
      loadKg: math.committedKg,
      status: 'planned',
      pooled: true,
    })
    const vehicle = state.vehicles.find((item) => item.id === math.vehicle!.id)
    if (vehicle) { vehicle.status = 'assigned'; vehicle.currentAssignment = routeId }

    board.status = 'created'
    board.unlockedAt = board.unlockedAt ?? now()
    board.routeId = routeId
    board.farmerOrderIds = farmerOrderIds
    board.bulkOrderId = bulkOrderId
    board.consumerOrderId = consumerOrderId
    board.pickupIds = pickupIds
    board.deliveryIds = deliveryIds

    note(state, 'farmer', 'Direct market created', 'सीधा बाज़ार बन गया', `${farmerOrderIds[0] ?? board.id} · ${math.allocations.find((entry) => entry.lot.own)?.allocatedKg ?? 0} kg sold at ${perKg(math.farmerGatePerKg)} with no deductions.`, 'आपकी फसल सीधे बिक गई, कोई कटौती नहीं।', farmerOrderIds[0] ? `/farmer/orders/${farmerOrderIds[0]}` : '/farmer/market')
    note(state, 'consumer', 'Your farm-direct order is confirmed', 'आपका सीधा ऑर्डर पक्का हुआ', `${board.crop} at ${perKg(math.deliveredPerKg)} delivered, ${perKg(math.buyerSavingPerKg)} below the usual price.`, 'सीधा ऑर्डर पक्का हो गया।', consumerOrderId ? `/consumer/orders/${consumerOrderId}` : '/consumer/market')
    note(state, 'bulk', 'Procurement order created from pooled corridor', 'साझा कॉरिडोर से खरीद ऑर्डर बना', `${bulkOrderId ?? board.id} · ${money(math.buyerSavingTotal)} saved against the usual landed cost.`, 'साझा कॉरिडोर से खरीद ऑर्डर बन गया।', bulkOrderId ? `/bulk/orders/${bulkOrderId}` : '/bulk/market')
    note(state, 'logistics', 'New pooled route created', 'नया साझा रूट बना', `${routeId} · ${pickupIds.length} farm stops, ${math.committedKg} kg on ${math.vehicle.registration}.`, `${routeId} · ${pickupIds.length} खेत स्टॉप।`, `/logistics/routes`)

    await prototypeService.replaceState(state)
    return { board, math, routeId, farmerOrderIds, bulkOrderId, consumerOrderId, pickupIds, deliveryIds }
  },

  /** Puts the flagship corridor back to the moment before it becomes viable. */
  async resetBoards() {
    return prototypeService.seedScenario('market')
  },
}
