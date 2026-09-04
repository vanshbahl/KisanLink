import type { BulkOrder, BulkProfileData, BulkRfq, ConsumerOrder, ConsumerProfileData, Delivery, DemoScenario, EarningsTransaction, FarmerListing, FarmerOrder, FarmerProfileData, ListingStatus, LogisticsPickup, LogisticsProfileData, LogisticsRoute, OrderStatus, Pickup, PrototypeNotification, Role, Vehicle } from '../types'

export interface PrototypeState {
  listings: FarmerListing[]
  orders: FarmerOrder[]
  pickups: Pickup[]
  earnings: EarningsTransaction[]
  notifications: PrototypeNotification[]
  profile: FarmerProfileData
  consumerOrders: ConsumerOrder[]
  rfqs: BulkRfq[]
  bulkOrders: BulkOrder[]
  consumerProfile: ConsumerProfileData
  bulkProfile: BulkProfileData
  logisticsPickups: LogisticsPickup[]
  deliveries: Delivery[]
  logisticsRoutes: LogisticsRoute[]
  vehicles: Vehicle[]
  logisticsProfile: LogisticsProfileData
  savedListingIds: string[]
  savedFarmNames: string[]
}

const STORAGE_KEY = 'kisanlink_phase1_state_v1'
const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const today = new Date()
const iso = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).toISOString().slice(0, 10)

const seedState: PrototypeState = {
  listings: [
    { id: 'listing_001', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', category: 'Vegetables', imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', quantityKg: 720, remainingKg: 420, allocatedKg: 300, unit: 'kg', grade: 'Grade A+', harvestDate: iso(-1), availableFrom: iso(0), farmingMethod: 'Natural farming', notes: 'Firm, hand-sorted tomatoes.', pricePerKg: 31, mandiPricePerKg: 24, farm: 'Green Field Farm', pickupDate: iso(1), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: false, views: 126, inquiries: 9, createdAt: iso(-5) },
    { id: 'listing_011', crop: 'Baby Spinach', cropHi: 'बेबी पालक', category: 'Vegetables', imageSrc: '/assets/produce/spinach.webp', visual: 'leafy', quantityKg: 140, remainingKg: 140, allocatedKg: 0, unit: 'kg', grade: 'Grade A+', harvestDate: iso(0), availableFrom: iso(0), farmingMethod: 'Organic', notes: 'Washed and bundled.', pricePerKg: 42, mandiPricePerKg: 35, farm: 'Green Field Farm', pickupDate: iso(2), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: true, views: 83, inquiries: 5, createdAt: iso(-2) },
    { id: 'listing_draft_1', crop: 'Sharbati Wheat', cropHi: 'शरबती गेहूं', category: 'Grains', imageSrc: '/assets/produce/wheat.webp', visual: 'grain', quantityKg: 900, remainingKg: 900, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: iso(-8), availableFrom: iso(3), farmingMethod: 'Conventional', notes: '', pricePerKg: 36, mandiPricePerKg: 31, farm: 'Green Field Farm', pickupDate: iso(4), pickupWindow: 'Afternoon · 1–4 PM', fulfillment: 'pickup', status: 'draft', assisted: false, views: 0, inquiries: 0, createdAt: iso(-1) },
    { id: 'listing_sold_1', crop: 'New Potatoes', cropHi: 'नए आलू', category: 'Staples', imageSrc: '/assets/produce/potato.webp', visual: 'potato', quantityKg: 500, remainingKg: 0, allocatedKg: 500, unit: 'kg', grade: 'Grade A', harvestDate: iso(-18), availableFrom: iso(-17), farmingMethod: 'Conventional', notes: '', pricePerKg: 25, mandiPricePerKg: 21, farm: 'Green Field Farm', pickupDate: iso(-12), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'sold', assisted: false, views: 210, inquiries: 18, createdAt: iso(-20) },
  ],
  orders: [
    { id: 'KL-ORD-1042', buyerName: 'FreshKart Purchase Team', buyerType: 'Bulk Buyer', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', listingId: 'listing_001', quantityKg: 300, ratePerKg: 31, total: 9300, farmerPayout: 8370, platformFee: 279, logisticsFee: 651, orderedAt: iso(0), status: 'new', paymentStatus: 'processing' },
    { id: 'KL-ORD-1037', buyerName: 'Ananya Sharma', buyerType: 'Consumer', crop: 'Baby Spinach', cropHi: 'बेबी पालक', listingId: 'listing_011', quantityKg: 8, ratePerKg: 42, total: 336, farmerPayout: 302, platformFee: 10, logisticsFee: 24, orderedAt: iso(-1), status: 'accepted', paymentStatus: 'paid', pickupId: 'PK-2048' },
    { id: 'KL-ORD-1019', buyerName: 'Dwarka Foods', buyerType: 'Bulk Buyer', crop: 'New Potatoes', cropHi: 'नए आलू', listingId: 'listing_sold_1', quantityKg: 500, ratePerKg: 25, total: 12500, farmerPayout: 11250, platformFee: 375, logisticsFee: 875, orderedAt: iso(-14), status: 'delivered', paymentStatus: 'paid', pickupId: 'PK-2011' },
  ],
  pickups: [
    { id: 'PK-2048', orderId: 'KL-ORD-1037', crop: 'Baby Spinach', cropHi: 'बेबी पालक', quantityKg: 8, date: iso(1), timeWindow: 'Morning · 7–10 AM', driver: 'Suresh Kumar', vehicle: 'HR 10 AK 4821 · Mini truck', farmAddress: 'Green Field Farm, Sonipat, Haryana', status: 'driver_assigned' },
    { id: 'PK-2011', orderId: 'KL-ORD-1019', crop: 'New Potatoes', cropHi: 'नए आलू', quantityKg: 500, date: iso(-12), timeWindow: 'Morning · 7–10 AM', driver: 'Imran Khan', vehicle: 'DL 1L AC 9082 · Pickup', farmAddress: 'Green Field Farm, Sonipat, Haryana', status: 'completed' },
  ],
  earnings: [
    { id: 'TX-901', orderId: 'KL-ORD-1019', crop: 'New Potatoes', cropHi: 'नए आलू', gross: 12500, deductions: 1250, net: 11250, mandiEquivalent: 10500, date: iso(-11), status: 'paid' },
    { id: 'TX-914', orderId: 'KL-ORD-1037', crop: 'Baby Spinach', cropHi: 'बेबी पालक', gross: 336, deductions: 34, net: 302, mandiEquivalent: 280, date: iso(-1), status: 'paid' },
    { id: 'TX-921', orderId: 'KL-ORD-1042', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', gross: 9300, deductions: 930, net: 8370, mandiEquivalent: 7200, date: iso(0), status: 'pending' },
  ],
  notifications: [
    { id: 'note_1', role: 'farmer', title: 'New bulk order received', titleHi: 'नया थोक ऑर्डर मिला', body: 'FreshKart requested 300 kg tomatoes.', bodyHi: 'FreshKart ने 300 किलो टमाटर मांगे हैं।', timestamp: new Date().toISOString(), read: false, href: '/farmer/orders/KL-ORD-1042' },
    { id: 'note_2', role: 'farmer', title: 'Driver assigned', titleHi: 'ड्राइवर तय हुआ', body: 'Suresh will arrive tomorrow morning.', bodyHi: 'सुरेश कल सुबह पहुंचेंगे।', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false, href: '/farmer/pickups' },
    { id: 'note_3', role: 'consumer', title: 'Fresh produce nearby', titleHi: 'पास में ताज़ी फसल', body: 'Tomatoes from Sonipat are available.', bodyHi: 'सोनीपत के टमाटर उपलब्ध हैं।', timestamp: new Date(Date.now() - 7200000).toISOString(), read: false, href: '/consumer/explore' },
    { id: 'note_4', role: 'bulk', title: 'Supply match found', titleHi: 'सप्लाई मिल गई', body: '1.8 tonnes of tomatoes matched nearby.', bodyHi: 'पास में 1.8 टन टमाटर मिले हैं।', timestamp: new Date(Date.now() - 10800000).toISOString(), read: false, href: '/bulk/supply' },
    { id: 'note_5', role: 'logistics', title: 'New pickup needs assignment', titleHi: 'नए पिकअप को वाहन चाहिए', body: 'PK-2051 is ready for vehicle assignment.', bodyHi: 'PK-2051 के लिए वाहन तय करना है।', timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups/PK-2051' },
  ],
  profile: { name: 'Ramesh Kumar', phone: '9876543210', language: 'en', farmName: 'Green Field Farm', village: 'Murthal', district: 'Sonipat', state: 'Haryana', farmSizeAcres: 7.5, mainCrops: 'Tomato, spinach, wheat', pickupLocation: 'Gate 1, Green Field Farm, Murthal', payoutMethod: 'UPI', payoutMasked: 'ramesh•••@upi', farmerVerified: true, farmVerified: true, identityStatus: 'Verified' },
  consumerOrders: [],
  rfqs: [],
  bulkOrders: [],
  consumerProfile: { name: 'Aarav Mehta', phone: '9811122233', language: 'en', defaultLocation: 'Dwarka, New Delhi', addresses: [{ id: 'addr_home', label: 'Home', recipient: 'Aarav Mehta', phone: '9811122233', line1: 'Sector 12, Dwarka', city: 'New Delhi', pincode: '110078', isDefault: true }], notifications: { orders: true, freshness: true, offers: false } },
  bulkProfile: { businessName: 'FreshKart Foods Pvt. Ltd.', representative: 'Neha Kapoor', phone: '9899001122', gst: '07AABCF1234M1Z5 (mock)', language: 'en', procurementLocations: ['Delhi NCR', 'Gurugram'], deliveryAddresses: ['Okhla Distribution Centre, New Delhi'], notifications: { matches: true, orders: true, deliveries: true } },
  logisticsPickups: [
    { id: 'PK-2048', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Baby Spinach', cropHi: 'बेबी पालक', quantityKg: 8, pickupWindow: 'Tomorrow · 7–10 AM', orderRefs: ['KL-ORD-1037'], vehicleId: 'VEH-01', driver: 'Suresh Kumar', status: 'assigned', notes: 'Use ventilated crates.', routeId: 'RTE-101', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date(Date.now() - 3600000).toISOString() }, { label: 'Vehicle assigned', labelHi: 'वाहन सौंपा गया', at: new Date().toISOString() }] },
    { id: 'PK-2051', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 300, pickupWindow: 'Today · 2–4 PM', orderRefs: ['KL-ORD-1042'], status: 'unassigned', notes: 'Grade A+ crates. Verify count before loading.', routeId: 'RTE-POOL-01', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date().toISOString() }] },
    { id: 'PK-POOL-B', farmer: 'Harpreet Singh', farm: 'Sunehri Khet', farmLocation: 'Karnal, Haryana', crop: 'Tomatoes', cropHi: 'टमाटर', quantityKg: 500, pickupWindow: 'Today · 4–5 PM', orderRefs: ['KL-B-DEMO'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'en_route', notes: 'Pooled bulk route stop 2.', routeId: 'RTE-POOL-01', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Vehicle en route', labelHi: 'वाहन रास्ते में है', at: new Date().toISOString() }] },
    { id: 'PK-POOL-C', farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', farmLocation: 'Panipat, Haryana', crop: 'Tomatoes', cropHi: 'टमाटर', quantityKg: 800, pickupWindow: 'Today · 5–6 PM', orderRefs: ['KL-B-DEMO'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'assigned', notes: 'Pooled bulk route stop 3.', routeId: 'RTE-POOL-01', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: new Date().toISOString() }] },
  ],
  deliveries: [
    { id: 'DLV-301', origin: 'KisanLink Sonipat Hub', destination: 'Sector 12, Dwarka, New Delhi', buyer: 'Aarav Mehta', buyerType: 'Consumer', shipment: 'Fresh crate C-301', produce: 'Baby Spinach', produceHi: 'बेबी पालक', quantityKg: 8, eta: iso(1), vehicleId: 'VEH-01', orderRefs: ['KL-ORD-1037'], status: 'scheduled', handlingNotes: 'Keep shaded and ventilated.', issues: [], timeline: [{ label: 'Delivery scheduled', labelHi: 'डिलीवरी तय हुई', at: new Date().toISOString() }] },
    { id: 'DLV-302', origin: 'KisanLink Sonipat Hub', destination: 'Okhla Distribution Centre, New Delhi', buyer: 'FreshKart Foods', buyerType: 'Bulk Buyer', shipment: 'Pooled tomato lot B-302', produce: 'Tomatoes', produceHi: 'टमाटर', quantityKg: 1300, eta: iso(1), vehicleId: 'VEH-02', orderRefs: ['KL-B-DEMO'], status: 'in_transit', handlingNotes: 'Do not stack above four crates.', issues: [], timeline: [{ label: 'Shipment loaded', labelHi: 'माल लोड हुआ', at: new Date(Date.now() - 1800000).toISOString() }, { label: 'In transit', labelHi: 'रास्ते में', at: new Date().toISOString() }] },
  ],
  logisticsRoutes: [
    { id: 'RTE-POOL-01', name: 'Sonipat–Karnal pooled tomato run', nameHi: 'सोनीपत–करनाल साझा टमाटर रूट', vehicleId: 'VEH-02', pickups: ['PK-2051', 'PK-POOL-B', 'PK-POOL-C'], deliveries: ['DLV-302'], stops: ['Farm A · Murthal', 'Farm B · Karnal', 'Farm C · Panipat', 'FreshKart Okhla Hub'], distanceKm: 118, durationMinutes: 245, capacityKg: 2000, loadKg: 1800, status: 'active', pooled: true },
    { id: 'RTE-101', name: 'Sonipat to Dwarka fresh run', nameHi: 'सोनीपत से द्वारका ताज़ा रूट', vehicleId: 'VEH-01', pickups: ['PK-2048'], deliveries: ['DLV-301'], stops: ['Green Field Farm', 'KisanLink Sonipat Hub', 'Dwarka Sector 12'], distanceKm: 72, durationMinutes: 135, capacityKg: 750, loadKg: 360, status: 'planned', pooled: false },
  ],
  vehicles: [
    { id: 'VEH-01', registration: 'HR 10 AK 4821', type: 'Refrigerated mini truck', typeHi: 'रेफ्रिजरेटेड मिनी ट्रक', capacityKg: 750, driver: 'Suresh Kumar', currentAssignment: 'RTE-101', status: 'assigned' },
    { id: 'VEH-02', registration: 'DL 1L AC 9082', type: 'Medium truck', typeHi: 'मध्यम ट्रक', capacityKg: 2000, driver: 'Imran Khan', currentAssignment: 'RTE-POOL-01', status: 'in_transit' },
    { id: 'VEH-03', registration: 'HR 69 D 3104', type: 'Pickup', typeHi: 'पिकअप', capacityKg: 900, driver: 'Meena Devi', status: 'available' },
    { id: 'VEH-04', registration: 'UP 17 BT 6610', type: 'Electric cargo van', typeHi: 'इलेक्ट्रिक कार्गो वैन', capacityKg: 600, driver: 'Amit Pal', status: 'maintenance' },
  ],
  logisticsProfile: { name: 'Kavita Sharma', phone: '9877004455', hub: 'KisanLink Sonipat Hub', shift: 'Morning · 6 AM–3 PM', language: 'en', notifications: { pickups: true, deliveries: true, issues: true, delays: true } },
  savedListingIds: ['listing_011'],
  savedFarmNames: ['Green Field Farm'],
}

const cloneSeed = () => JSON.parse(JSON.stringify(seedState)) as PrototypeState
const normalize = (value: Partial<PrototypeState>): PrototypeState => {
  const base = cloneSeed()
  const state: PrototypeState = {
    ...base,
    ...value,
    consumerProfile: value.consumerProfile?.addresses ? value.consumerProfile : base.consumerProfile,
    bulkProfile: value.bulkProfile?.businessName ? value.bulkProfile : base.bulkProfile,
  }
  for (const pickup of state.pickups) if (!state.logisticsPickups.some((item) => item.id === pickup.id)) state.logisticsPickups.unshift({ id: pickup.id, farmer: state.profile.name, farm: state.profile.farmName, farmLocation: pickup.farmAddress, crop: pickup.crop, cropHi: pickup.cropHi, quantityKg: pickup.quantityKg, pickupWindow: `${pickup.date} · ${pickup.timeWindow}`, orderRefs: [pickup.orderId], status: pickup.status === 'driver_assigned' ? 'assigned' : pickup.status === 'arriving' ? 'en_route' : pickup.status === 'collected' ? 'loaded' : pickup.status === 'completed' ? 'completed' : 'unassigned', notes: '', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date().toISOString() }] })
  const addDelivery = (orderRef: string, buyer: string, buyerType: 'Consumer' | 'Bulk Buyer', destination: string, produce: string, produceHi: string, quantityKg: number, eta: string) => { if (!state.deliveries.some((item) => item.orderRefs.includes(orderRef))) state.deliveries.unshift({ id: `DLV-${orderRef.replace(/\D/g, '').slice(-5) || 'NEW'}`, origin: 'KisanLink Sonipat Hub', destination, buyer, buyerType, shipment: `${produce} shipment`, produce, produceHi, quantityKg, eta, orderRefs: [orderRef], status: 'scheduled', handlingNotes: 'Handle produce with care.', issues: [], timeline: [{ label: 'Delivery scheduled', labelHi: 'डिलीवरी तय हुई', at: new Date().toISOString() }] }) }
  state.consumerOrders.forEach((order) => addDelivery(order.id, state.consumerProfile.name, 'Consumer', `${order.address.line1}, ${order.address.city}`, order.items.map((item) => item.crop).join(', '), order.items.map((item) => item.cropHi).join(', '), order.items.reduce((sum, item) => sum + item.quantityKg, 0), order.eta))
  state.bulkOrders.forEach((order) => addDelivery(order.id, state.bulkProfile.businessName, 'Bulk Buyer', order.deliveryLocation, order.crop, order.crop, order.suppliedQuantityKg, order.deliveryWindow))
  return state
}
const readLocal = (): PrototypeState => {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<PrototypeState>) } catch { const state = cloneSeed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state }
}
const writeLocal = (state: PrototypeState) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); window.dispatchEvent(new Event('kisanlink-state')) }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 900)
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, signal: controller.signal })
    if (!response.ok) throw new Error(`API ${response.status}`)
    return await response.json() as T
  } finally { window.clearTimeout(timer) }
}

async function readState() {
  try { const remote = normalize(await api<PrototypeState>('/state')); writeLocal(remote); return remote } catch { return readLocal() }
}
async function persist(state: PrototypeState) {
  const synchronized = normalize(state)
  writeLocal(synchronized)
  try { return await api<PrototypeState>('/state', { method: 'PUT', body: JSON.stringify(synchronized) }) } catch { return synchronized }
}

export const prototypeService = {
  getState: readState,
  async replaceState(state: PrototypeState) { return persist(state) },
  async getListings() { return (await readState()).listings },
  async getListing(id: string) { return (await readState()).listings.find((item) => item.id === id) },
  async saveListing(input: FarmerListing) { const state = await readState(); const index = state.listings.findIndex((item) => item.id === input.id); if (index >= 0) state.listings[index] = input; else state.listings.unshift(input); await persist(state); return input },
  async patchListing(id: string, patch: Partial<FarmerListing>) { const state = await readState(); const item = state.listings.find((entry) => entry.id === id); if (!item) throw new Error('Listing not found'); Object.assign(item, patch); await persist(state); return item },
  async deleteListing(id: string) { const state = await readState(); state.listings = state.listings.filter((item) => item.id !== id); await persist(state) },
  async duplicateListing(id: string) { const state = await readState(); const source = state.listings.find((item) => item.id === id); if (!source) throw new Error('Listing not found'); const copy = { ...source, id: `listing_${Date.now()}`, status: 'draft' as ListingStatus, views: 0, inquiries: 0, createdAt: iso(0) }; state.listings.unshift(copy); await persist(state); return copy },
  async getOrders() { return (await readState()).orders },
  async getOrder(id: string) { return (await readState()).orders.find((item) => item.id === id) },
  async updateOrder(id: string, status: OrderStatus) { const state = await readState(); const order = state.orders.find((item) => item.id === id); if (!order) throw new Error('Order not found'); order.status = status; if (status === 'accepted' && !order.pickupId) { const pickupId = `PK-${Date.now().toString().slice(-4)}`; order.pickupId = pickupId; state.pickups.unshift({ id: pickupId, orderId: order.id, crop: order.crop, cropHi: order.cropHi, quantityKg: order.quantityKg, date: iso(1), timeWindow: 'Morning · 7–10 AM', driver: 'Assigning shortly', vehicle: 'To be assigned', farmAddress: state.profile.pickupLocation, status: 'scheduled' }); state.notifications.unshift({ id: `note_${Date.now()}`, role: 'farmer', title: 'Pickup request created', titleHi: 'पिकअप अनुरोध बना', body: `Pickup ${pickupId} is scheduled for tomorrow.`, bodyHi: `पिकअप ${pickupId} कल के लिए तय है।`, timestamp: new Date().toISOString(), read: false, href: '/farmer/pickups' }) }
    const parentId = order.id.replace(/-\d+$/, '')
    const consumerOrder = state.consumerOrders.find((item) => item.id === parentId)
    const consumerMap = { new: 'confirmed', accepted: 'farmer_preparing', preparing: 'farmer_preparing', pickup_scheduled: 'pickup_scheduled', in_transit: 'in_transit', delivered: 'delivered', cancelled: 'cancelled' } as const
    if (consumerOrder) { const next = consumerMap[status]; consumerOrder.status = next; if (!consumerOrder.timeline.some((item) => item.status === next)) consumerOrder.timeline.push({ status: next, label: next.replaceAll('_', ' '), at: new Date().toISOString() }); state.notifications.unshift({ id: `note_${Date.now()}`, role: 'consumer', title: `Order ${next.replaceAll('_', ' ')}`, titleHi: 'ऑर्डर की स्थिति बदली', body: `${consumerOrder.id} is now ${next.replaceAll('_', ' ')}.`, bodyHi: 'आपके ऑर्डर की स्थिति बदल गई है।', timestamp: new Date().toISOString(), read: false, href: `/consumer/orders/${consumerOrder.id}` }) }
    const bulkOrder = state.bulkOrders.find((item) => item.id === parentId)
    const bulkMap = { new: 'confirmed', accepted: 'farmers_preparing', preparing: 'farmers_preparing', pickup_scheduled: 'pickup_scheduled', in_transit: 'in_transit', delivered: 'delivered', cancelled: 'cancelled' } as const
    if (bulkOrder) { bulkOrder.status = bulkMap[status]; state.notifications.unshift({ id: `note_${Date.now()}`, role: 'bulk', title: `Procurement ${bulkMap[status].replaceAll('_', ' ')}`, titleHi: 'खरीद ऑर्डर की स्थिति बदली', body: `${bulkOrder.id} logistics status was updated.`, bodyHi: 'खरीद ऑर्डर की स्थिति बदल गई है।', timestamp: new Date().toISOString(), read: false, href: `/bulk/orders/${bulkOrder.id}` }) }
    if (status === 'preparing') state.notifications.unshift({ id: `note_logistics_${Date.now()}`, role: 'logistics', title: 'Produce ready for pickup', titleHi: 'फसल पिकअप के लिए तैयार', body: `${order.id} · ${order.quantityKg} kg ${order.crop} is ready.`, bodyHi: `${order.id} पिकअप के लिए तैयार है।`, timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups' })
    const pickup = state.pickups.find((item) => item.orderId === order.id); if (pickup) pickup.status = status === 'delivered' ? 'completed' : status === 'in_transit' ? 'in_transit' : status === 'pickup_scheduled' ? 'driver_assigned' : pickup.status
    if (status === 'delivered') { const earning = state.earnings.find((item) => item.orderId === order.id); if (earning) earning.status = 'paid' }
    await persist(state); return order },
  async getPickups() { return (await readState()).pickups },
  async getEarnings() { return (await readState()).earnings },
  async getProfile() { return (await readState()).profile },
  async saveProfile(profile: FarmerProfileData) { const state = await readState(); state.profile = profile; await persist(state); return profile },
  async getNotifications(role: Role) { return (await readState()).notifications.filter((item) => item.role === role) },
  async markNotificationsRead(role: Role) { const state = await readState(); state.notifications.forEach((item) => { if (item.role === role) item.read = true }); await persist(state) },
  async reset() { try { const state = normalize(await api<PrototypeState>('/reset', { method: 'POST' })); writeLocal(state); return state } catch { const state = cloneSeed(); writeLocal(state); return state } },
  async seedScenario(scenario: DemoScenario) {
    const state = cloneSeed()
    if (scenario === 'empty') { state.orders = []; state.pickups = []; state.earnings = []; state.consumerOrders = []; state.rfqs = []; state.bulkOrders = []; state.logisticsPickups = []; state.deliveries = []; state.logisticsRoutes = []; state.notifications = [] }
    if (scenario === 'consumer') { state.listings = [{ ...state.listings[0], id: 'listing_demo_tomato', quantityKg: 100, remainingKg: 90, allocatedKg: 10 }]; state.orders = [{ id: 'KL-C-DEMO-1', buyerName: state.consumerProfile.name, buyerType: 'Consumer', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', listingId: 'listing_demo_tomato', quantityKg: 10, ratePerKg: 31, total: 310, farmerPayout: 301, platformFee: 9, logisticsFee: 35, orderedAt: iso(0), status: 'accepted', paymentStatus: 'paid', pickupId: 'PK-C-DEMO' }]; state.pickups = [{ id: 'PK-C-DEMO', orderId: 'KL-C-DEMO-1', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 10, date: iso(0), timeWindow: '2–4 PM', driver: 'Assigning shortly', vehicle: 'To be assigned', farmAddress: 'Green Field Farm, Murthal', status: 'scheduled' }]; state.consumerOrders = [{ id: 'KL-C-DEMO', items: [{ listingId: 'listing_demo_tomato', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', farm: 'Green Field Farm', imageSrc: '/assets/produce/tomato.webp', quantityKg: 10, ratePerKg: 31 }], subtotal: 310, logisticsFee: 35, platformFee: 9, farmerShare: 301, total: 345, address: state.consumerProfile.addresses[0], deliverySlot: 'Tomorrow · 9–11 AM', eta: iso(1), note: '', paymentMethod: 'UPI', paymentStatus: 'Mock paid', status: 'farmer_preparing', orderedAt: new Date().toISOString(), timeline: [{ status: 'confirmed', label: 'Order confirmed', at: new Date().toISOString() }, { status: 'farmer_preparing', label: 'Farmer accepted', at: new Date().toISOString() }] }]; state.earnings = [{ id: 'TX-C-DEMO', orderId: 'KL-C-DEMO-1', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', gross: 310, deductions: 9, net: 301, mandiEquivalent: 240, date: iso(0), status: 'pending' }]; state.logisticsPickups = []; state.deliveries = []; state.logisticsRoutes = [] }
    if (scenario === 'bulk') { const contributions = [{ farmer: 'Ramesh Kumar', farm: 'Green Field Farm', listingId: 'listing_001', quantityKg: 700, ratePerKg: 30 }, { farmer: 'Harpreet Singh', farm: 'Sunehri Khet', listingId: 'network_tomato_1', quantityKg: 500, ratePerKg: 31 }, { farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', listingId: 'network_tomato_2', quantityKg: 800, ratePerKg: 32 }]; state.rfqs = [{ id: 'RFQ-DEMO-2T', crop: 'Tomatoes', grade: 'Grade A+', requiredQuantityKg: 2000, targetPrice: 32, deliveryLocation: 'Okhla Distribution Centre, New Delhi', deliveryWindow: 'Tomorrow · 4–6 PM', frequency: 'one-time', notes: 'Retail grade', status: 'converted', createdAt: new Date().toISOString(), matches: contributions }]; state.bulkOrders = [{ id: 'KL-B-DEMO', rfqId: 'RFQ-DEMO-2T', crop: 'Tomatoes', grade: 'Grade A+', orderedQuantityKg: 2000, suppliedQuantityKg: 2000, contributions, produceValue: 62600, logisticsFee: 2817, platformFee: 1252, total: 66669, traditionalEstimate: 76003, deliveryLocation: 'Okhla Distribution Centre, New Delhi', deliveryWindow: 'Tomorrow · 4–6 PM', status: 'pickup_scheduled', invoiceStatus: 'Mock invoice generated', orderedAt: new Date().toISOString() }]
      state.orders.unshift({ id: 'KL-B-DEMO-1', buyerName: state.bulkProfile.businessName, buyerType: 'Bulk Buyer', crop: 'Tomatoes', cropHi: 'टमाटर', listingId: 'listing_001', quantityKg: 700, ratePerKg: 30, total: 21000, farmerPayout: 19950, platformFee: 420, logisticsFee: 630, orderedAt: iso(0), status: 'pickup_scheduled', paymentStatus: 'processing', pickupId: 'PK-2051' }); state.earnings.unshift({ id: 'TX-B-DEMO-1', orderId: 'KL-B-DEMO-1', crop: 'Tomatoes', cropHi: 'टमाटर', gross: 21000, deductions: 1050, net: 19950, mandiEquivalent: 16800, date: iso(0), status: 'pending' }); const pickup = state.logisticsPickups.find((item) => item.id === 'PK-2051'); if (pickup) pickup.orderRefs = ['KL-B-DEMO-1']; const delivery = state.deliveries.find((item) => item.id === 'DLV-302'); if (delivery) delivery.orderRefs = ['KL-B-DEMO']
    }
    if (scenario === 'issue') { state.logisticsPickups[0].status = 'issue'; state.logisticsPickups[0].notes = 'Crate count differs from manifest by 2.'; state.deliveries[0].status = 'issue'; state.deliveries[0].issues = ['Traffic delay near Kundli · ETA +25 min']; state.notifications.unshift({ id: 'note-logistics-issue', role: 'logistics', title: 'Priority issue requires action', titleHi: 'ज़रूरी समस्या पर कार्रवाई चाहिए', body: 'PK-2048 crate count needs verification.', bodyHi: 'PK-2048 के क्रेट की संख्या जांचें।', timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups/PK-2048' }) }
    await persist(normalize(state)); return state
  },
}
