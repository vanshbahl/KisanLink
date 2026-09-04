import { farmers } from '../data/farmers'
import { bulkSupplies } from '../data/insights'
import type { Address, BulkOrder, BulkProfileData, BulkRfq, CartItem, ConsumerOrder, ConsumerProfileData, FarmerListing, SupplyContribution } from '../types'
import { prototypeService } from './prototypeService'
import { apiClient } from './apiClient'

const CART_KEY = 'kisanlink_consumer_cart_v1'
const now = () => new Date().toISOString()
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString()
const id = (prefix: string) => `${prefix}-${Date.now().toString().slice(-7)}`
const pause = () => new Promise((resolve) => window.setTimeout(resolve, 180))

export const phase2Service = {
  async listings() {
    try {
      const canonical = await apiClient.getListings()
      if (canonical && canonical.length > 0) {
        return canonical.filter((item) => item.status === 'active' || item.status === 'sold')
      }
    } catch (e) {
      console.warn('API listings query fallback:', e)
    }
    await pause()
    return (await prototypeService.getListings()).filter((item) => item.status === 'active' || item.status === 'sold')
  },
  async listing(listingId: string) {
    try {
      const canonical = await apiClient.getListing(listingId)
      if (canonical) return canonical
    } catch (e) {
      console.warn('API listing fallback:', e)
    }
    await pause()
    return prototypeService.getListing(listingId)
  },
  cart(): CartItem[] { try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[] } catch { return [] } },
  saveCart(items: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(items)); window.dispatchEvent(new Event('kisanlink-cart')); return items },
  addToCart(listingId: string, quantityKg: number) { const cart = this.cart(); const found = cart.find((item) => item.listingId === listingId); if (found) found.quantityKg += quantityKg; else cart.push({ listingId, quantityKg }); return this.saveCart(cart) },
  clearCart() { return this.saveCart([]) },
  async saved() { const state = await prototypeService.getState(); return { listingIds: state.savedListingIds, farmNames: state.savedFarmNames } },
  async toggleSavedListing(listingId: string) { const state = await prototypeService.getState(); state.savedListingIds = state.savedListingIds.includes(listingId) ? state.savedListingIds.filter((value) => value !== listingId) : [...state.savedListingIds, listingId]; await prototypeService.replaceState(state); return state.savedListingIds },
  async toggleSavedFarm(farm: string) { const state = await prototypeService.getState(); state.savedFarmNames = state.savedFarmNames.includes(farm) ? state.savedFarmNames.filter((value) => value !== farm) : [...state.savedFarmNames, farm]; await prototypeService.replaceState(state); return state.savedFarmNames },
  async consumerProfile() { return (await prototypeService.getState()).consumerProfile },
  async saveConsumerProfile(profile: ConsumerProfileData) { const state = await prototypeService.getState(); state.consumerProfile = profile; await prototypeService.replaceState(state); return profile },
  async placeConsumerOrder(input: { items: CartItem[]; address: Address; deliverySlot: string; note: string; paymentMethod: ConsumerOrder['paymentMethod'] }) {
    const state = await prototypeService.getState()
    if (!input.items.length) throw new Error('Your cart is empty.')

    // Place real order in canonical PostgreSQL backend
    try {
      const backendItems = input.items.map((i) => ({ listingId: i.listingId, quantityKg: i.quantityKg }))
      await apiClient.placeDirectOrder(backendItems, `${input.address.line1}, ${input.address.city}`)
    } catch (err) {
      console.warn('Direct order backend sync note:', err)
    }

    const resolved = input.items.map((item) => ({ item, listing: state.listings.find((listing) => listing.id === item.listingId) }))
    for (const entry of resolved) if (!entry.listing || entry.listing.status !== 'active' || entry.item.quantityKg < 1 || entry.item.quantityKg > entry.listing.remainingKg) throw new Error(`${entry.listing?.crop ?? 'An item'} is no longer available in that quantity.`)
    const subtotal = resolved.reduce((sum, entry) => sum + entry.item.quantityKg * entry.listing!.pricePerKg, 0)
    const logisticsFee = Math.max(35, Math.round(subtotal * .06)); const platformFee = Math.round(subtotal * .03); const farmerShare = subtotal - platformFee; const orderId = id('KL-C')
    const order: ConsumerOrder = { id: orderId, items: resolved.map(({ item, listing }) => ({ listingId: listing!.id, crop: listing!.crop, cropHi: listing!.cropHi, farm: listing!.farm, imageSrc: listing!.imageSrc, quantityKg: item.quantityKg, ratePerKg: listing!.pricePerKg })), subtotal, logisticsFee, platformFee, farmerShare, total: subtotal + logisticsFee, address: input.address, deliverySlot: input.deliverySlot, eta: day(2), note: input.note, paymentMethod: input.paymentMethod, paymentStatus: input.paymentMethod === 'Pay on Delivery' ? 'Pay on delivery' : 'Mock paid', status: 'confirmed', orderedAt: now(), timeline: [{ status: 'confirmed', label: 'Order confirmed', at: now() }] }
    state.consumerOrders.unshift(order)
    resolved.forEach(({ item, listing }, index) => {
      listing!.remainingKg -= item.quantityKg; listing!.allocatedKg += item.quantityKg; if (listing!.remainingKg === 0) listing!.status = 'sold'
      const farmerOrderId = `${orderId}-${index + 1}`; const platform = Math.round(item.quantityKg * listing!.pricePerKg * .03); const logistics = Math.round(item.quantityKg * listing!.pricePerKg * .06); const payout = item.quantityKg * listing!.pricePerKg - platform
      state.orders.unshift({ id: farmerOrderId, buyerName: state.consumerProfile.name, buyerType: 'Consumer', crop: listing!.crop, cropHi: listing!.cropHi, listingId: listing!.id, quantityKg: item.quantityKg, ratePerKg: listing!.pricePerKg, total: item.quantityKg * listing!.pricePerKg, farmerPayout: payout, platformFee: platform, logisticsFee: logistics, orderedAt: now().slice(0, 10), status: 'new', paymentStatus: input.paymentMethod === 'Pay on Delivery' ? 'pending' : 'paid', pickupId: `PK-${orderId.slice(-7)}-${index + 1}` })
      state.pickups.unshift({ id: `PK-${orderId.slice(-7)}-${index + 1}`, orderId: farmerOrderId, crop: listing!.crop, cropHi: listing!.cropHi, quantityKg: item.quantityKg, date: day(1).slice(0, 10), timeWindow: 'Morning · 7–10 AM', driver: 'Assigning shortly', vehicle: 'Pooled local route', farmAddress: listing!.farm, status: 'scheduled' })
      state.earnings.unshift({ id: `TX-${orderId.slice(-7)}-${index + 1}`, orderId: farmerOrderId, crop: listing!.crop, cropHi: listing!.cropHi, gross: item.quantityKg * listing!.pricePerKg, deductions: platform, net: payout, mandiEquivalent: item.quantityKg * listing!.mandiPricePerKg, date: now().slice(0, 10), status: 'pending' })
    })
    state.notifications.unshift({ id: id('note'), role: 'farmer', title: 'New consumer order received', titleHi: 'नया ग्राहक ऑर्डर मिला', body: `${state.consumerProfile.name} ordered ${order.items.reduce((sum, item) => sum + item.quantityKg, 0)} kg produce.`, bodyHi: 'नया ऑर्डर मिला है। तैयारी शुरू करें।', timestamp: now(), read: false, href: '/farmer/orders' }, { id: id('note'), role: 'consumer', title: 'Order confirmed', titleHi: 'ऑर्डर पक्का हुआ', body: `${orderId} is confirmed. Your farmer is preparing it.`, bodyHi: 'आपका ऑर्डर पक्का हो गया है।', timestamp: now(), read: false, href: `/consumer/orders/${orderId}` }, { id: id('note'), role: 'logistics', title: 'New consumer pickup and delivery', titleHi: 'नया ग्राहक पिकअप और डिलीवरी', body: `${orderId} is ready for logistics assignment.`, bodyHi: `${orderId} लॉजिस्टिक्स असाइनमेंट के लिए तैयार है।`, timestamp: now(), read: false, href: '/logistics/pickups' })
    await prototypeService.replaceState(state); this.clearCart(); return order
  },
  async consumerOrders() { await pause(); return (await prototypeService.getState()).consumerOrders },
  async consumerOrder(orderId: string) { return (await prototypeService.getState()).consumerOrders.find((order) => order.id === orderId) },
  async supplyPools() {
    const listings = (await this.listings()).filter((item) => item.remainingKg > 0)
    return bulkSupplies.map((pool) => ({ ...pool, grade: 'Grade A+' as const, totalQuantityKg: Math.round(pool.availableTonnes * 1000), priceMax: pool.startingPrice + 4, corridor: pool.locations, readiness: 'Ready in 24–48 hours', dispatch: day(2).slice(0, 10), matchingListings: listings.filter((listing) => pool.product.toLowerCase().includes(listing.crop.replace('Fresh ', '').replace('Baby ', '').toLowerCase().replace(/s$/, ''))) }))
  },
  async bulkProfile() { return (await prototypeService.getState()).bulkProfile },
  async saveBulkProfile(profile: BulkProfileData) { const state = await prototypeService.getState(); state.bulkProfile = profile; await prototypeService.replaceState(state); return profile },
  async rfqs() { await pause(); return (await prototypeService.getState()).rfqs },
  async rfq(rfqId: string) { return (await prototypeService.getState()).rfqs.find((rfq) => rfq.id === rfqId) },
  async createRfq(input: Omit<BulkRfq, 'id' | 'createdAt' | 'status' | 'matches'>) {
    const state = await prototypeService.getState()
    let matches: SupplyContribution[] = []
    let backendClusterId: string | undefined = undefined

    try {
      // 1. Post requirement to canonical backend
      const reqOut = await apiClient.createRequirement({
        crop: input.crop,
        requiredQuantityKg: input.requiredQuantityKg,
        targetPrice: input.targetPrice,
        deliveryLocation: input.deliveryLocation,
      })

      // 2. Generate matches using real 5-factor scoring and clustering engine
      const clusterOut = await apiClient.generateMatches(reqOut.id)
      if (clusterOut && clusterOut.farmers && clusterOut.farmers.length > 0) {
        backendClusterId = clusterOut.cluster_id
        matches = clusterOut.farmers.map((f: any) => ({
          farmer: f.name,
          farm: f.location || 'Sonipat Farm',
          listingId: f.listing_id,
          quantityKg: f.allocated_kg,
          ratePerKg: f.unit_price,
        }))
      }
    } catch (err) {
      console.warn('Canonical matching engine note:', err)
    }

    if (!matches.length) {
      const pools = await this.supplyPools(); const pool = pools.find((item) => item.product.toLowerCase().includes(input.crop.toLowerCase().replace(/s$/, '')))
      const names = farmers.slice(0, 3); let remaining = input.requiredQuantityKg
      matches = names.map((farmer, index) => { const quantityKg = Math.min(remaining, Math.max(0, Math.round(input.requiredQuantityKg * [.35, .25, .4][index]))); remaining -= quantityKg; return { farmer: farmer.name, farm: farmer.farmName, listingId: index === 0 && pool?.matchingListings[0] ? pool.matchingListings[0].id : `network_${input.crop}_${index}`, quantityKg, ratePerKg: (pool?.startingPrice ?? input.targetPrice) + index } }).filter((item) => item.quantityKg > 0)
    }

    const matched = matches.reduce((sum, item) => sum + item.quantityKg, 0)
    const rfq: BulkRfq & { clusterId?: string } = {
      ...input,
      id: id('RFQ'),
      createdAt: now(),
      matches,
      status: matched >= input.requiredQuantityKg ? 'fully_matched' : matched ? 'partially_matched' : 'matching',
      clusterId: backendClusterId,
    }
    state.rfqs.unshift(rfq)
    state.notifications.unshift({ id: id('note'), role: 'bulk', title: 'Requirement matches ready', titleHi: 'आवश्यकता के मैच तैयार हैं', body: `${matches.length} farmers can fulfil ${matched.toLocaleString('en-IN')} kg.`, bodyHi: 'आपकी आवश्यकता के लिए सप्लाई मिली है।', timestamp: now(), read: false, href: `/bulk/requests/${rfq.id}` }, { id: id('note'), role: 'farmer', title: 'New bulk requirement match', titleHi: 'नई थोक मांग मिली', body: `${input.requiredQuantityKg.toLocaleString('en-IN')} kg ${input.crop} requested for ${input.deliveryLocation}.`, bodyHi: 'नई थोक मांग आपकी फसल से मेल खाती है।', timestamp: now(), read: false, href: '/farmer/produce' })
    await prototypeService.replaceState(state); return rfq
  },
  async closeRfq(rfqId: string) { const state = await prototypeService.getState(); const rfq = state.rfqs.find((item) => item.id === rfqId); if (!rfq) throw new Error('Requirement not found'); rfq.status = 'closed'; await prototypeService.replaceState(state); return rfq },
  async convertRfq(rfqId: string) {
    const state = await prototypeService.getState(); const rfq = state.rfqs.find((item) => item.id === rfqId); if (!rfq || rfq.status === 'closed') throw new Error('Requirement cannot be converted.')

    let backendOrderId: string | undefined = undefined
    const clusterId = (rfq as any).clusterId
    if (clusterId) {
      try {
        const orderOut = await apiClient.createOrderFromCluster(clusterId)
        if (orderOut) {
          backendOrderId = orderOut.order_code || orderOut.id
          await apiClient.lockEscrow(orderOut.id, orderOut.gross_amount_rupees)
        }
      } catch (err) {
        console.warn('Canonical cluster order conversion note:', err)
      }
    }

    const supplied = Math.min(rfq.requiredQuantityKg, rfq.matches.reduce((sum, item) => sum + item.quantityKg, 0)); const produceValue = rfq.matches.reduce((sum, item) => sum + item.quantityKg * item.ratePerKg, 0); const logisticsFee = Math.round(produceValue * .045); const platformFee = Math.round(produceValue * .02); const orderId = backendOrderId || id('KL-B')
    const order: BulkOrder = { id: orderId, rfqId, crop: rfq.crop, grade: rfq.grade, orderedQuantityKg: rfq.requiredQuantityKg, suppliedQuantityKg: supplied, contributions: rfq.matches, produceValue, logisticsFee, platformFee, total: produceValue + logisticsFee + platformFee, traditionalEstimate: Math.round((produceValue + logisticsFee + platformFee) * 1.14), deliveryLocation: rfq.deliveryLocation, deliveryWindow: rfq.deliveryWindow, status: 'confirmed', invoiceStatus: 'Mock invoice generated', orderedAt: now() }
    state.bulkOrders.unshift(order); rfq.status = 'converted'
    const owned = rfq.matches.find((match) => state.listings.some((listing) => listing.id === match.listingId)); if (owned) { const listing = state.listings.find((item) => item.id === owned.listingId)!; const quantity = Math.min(owned.quantityKg, listing.remainingKg); const gross = quantity * owned.ratePerKg; const payout = Math.round(gross * .95); listing.remainingKg -= quantity; listing.allocatedKg += quantity; if (listing.remainingKg === 0) listing.status = 'sold'; state.orders.unshift({ id: `${orderId}-1`, buyerName: state.bulkProfile.businessName, buyerType: 'Bulk Buyer', crop: listing.crop, cropHi: listing.cropHi, listingId: listing.id, quantityKg: quantity, ratePerKg: owned.ratePerKg, total: gross, farmerPayout: payout, platformFee: Math.round(gross * .02), logisticsFee: Math.round(gross * .03), orderedAt: now().slice(0, 10), status: 'new', paymentStatus: 'processing', pickupId: `PK-${orderId.slice(-7)}` }); state.pickups.unshift({ id: `PK-${orderId.slice(-7)}`, orderId: `${orderId}-1`, crop: listing.crop, cropHi: listing.cropHi, quantityKg: quantity, date: day(2).slice(0, 10), timeWindow: 'Morning pooled route', driver: 'Consolidation partner assigning', vehicle: 'Pooled truck', farmAddress: listing.farm, status: 'scheduled' }); state.earnings.unshift({ id: `TX-${orderId.slice(-7)}`, orderId: `${orderId}-1`, crop: listing.crop, cropHi: listing.cropHi, gross, deductions: gross - payout, net: payout, mandiEquivalent: quantity * listing.mandiPricePerKg, date: now().slice(0, 10), status: 'pending' }) }
    state.notifications.unshift({ id: id('note'), role: 'farmer', title: 'Bulk allocation confirmed', titleHi: 'थोक आवंटन पक्का हुआ', body: `${order.id} allocation and pickup request created.`, bodyHi: 'थोक ऑर्डर और पिकअप अनुरोध बन गया है।', timestamp: now(), read: false, href: '/farmer/orders' }, { id: id('note'), role: 'bulk', title: 'Procurement order created', titleHi: 'खरीद ऑर्डर बन गया', body: `${order.id} is confirmed for pooled pickup.`, bodyHi: 'खरीद ऑर्डर पक्का हो गया है।', timestamp: now(), read: false, href: `/bulk/orders/${order.id}` }, { id: id('note'), role: 'logistics', title: 'New pooled procurement route', titleHi: 'नया साझा खरीद रूट', body: `${order.id} requires pooled collection and delivery.`, bodyHi: `${order.id} के लिए साझा पिकअप और डिलीवरी चाहिए।`, timestamp: now(), read: false, href: '/logistics/routes' })
    await prototypeService.replaceState(state); return order
  },
  async bulkOrders() { await pause(); return (await prototypeService.getState()).bulkOrders },
  async bulkOrder(orderId: string) { return (await prototypeService.getState()).bulkOrders.find((order) => order.id === orderId) },
}

export const orderCosts = (items: Array<{ quantityKg: number; pricePerKg: number }>) => { const subtotal = items.reduce((sum, item) => sum + item.quantityKg * item.pricePerKg, 0); const logistics = Math.max(35, Math.round(subtotal * .06)); const platform = Math.round(subtotal * .03); return { subtotal, logistics, platform, farmerShare: subtotal - platform, total: subtotal + logistics } }
export const availableForCart = (cart: CartItem[], listings: FarmerListing[]) => cart.map((item) => ({ ...item, listing: listings.find((listing) => listing.id === item.listingId) })).filter((item): item is CartItem & { listing: FarmerListing } => Boolean(item.listing))
