import type { EarningsTransaction, FarmerListing, FarmerOrder, FarmerProfileData, ListingStatus, OrderStatus, Pickup, PrototypeNotification } from '../types'

interface PrototypeState {
  listings: FarmerListing[]
  orders: FarmerOrder[]
  pickups: Pickup[]
  earnings: EarningsTransaction[]
  notifications: PrototypeNotification[]
  profile: FarmerProfileData
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
  ],
  profile: { name: 'Ramesh Kumar', phone: '9876543210', language: 'en', farmName: 'Green Field Farm', village: 'Murthal', district: 'Sonipat', state: 'Haryana', farmSizeAcres: 7.5, mainCrops: 'Tomato, spinach, wheat', pickupLocation: 'Gate 1, Green Field Farm, Murthal', payoutMethod: 'UPI', payoutMasked: 'ramesh•••@upi', farmerVerified: true, farmVerified: true, identityStatus: 'Verified' },
}

const cloneSeed = () => JSON.parse(JSON.stringify(seedState)) as PrototypeState
const readLocal = (): PrototypeState => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as PrototypeState } catch { const state = cloneSeed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state }
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
  try { const remote = await api<PrototypeState>('/state'); writeLocal(remote); return remote } catch { return readLocal() }
}
async function persist(state: PrototypeState) {
  writeLocal(state)
  try { return await api<PrototypeState>('/state', { method: 'PUT', body: JSON.stringify(state) }) } catch { return state }
}

export const prototypeService = {
  getState: readState,
  async getListings() { return (await readState()).listings },
  async getListing(id: string) { return (await readState()).listings.find((item) => item.id === id) },
  async saveListing(input: FarmerListing) { const state = await readState(); const index = state.listings.findIndex((item) => item.id === input.id); if (index >= 0) state.listings[index] = input; else state.listings.unshift(input); await persist(state); return input },
  async patchListing(id: string, patch: Partial<FarmerListing>) { const state = await readState(); const item = state.listings.find((entry) => entry.id === id); if (!item) throw new Error('Listing not found'); Object.assign(item, patch); await persist(state); return item },
  async deleteListing(id: string) { const state = await readState(); state.listings = state.listings.filter((item) => item.id !== id); await persist(state) },
  async duplicateListing(id: string) { const state = await readState(); const source = state.listings.find((item) => item.id === id); if (!source) throw new Error('Listing not found'); const copy = { ...source, id: `listing_${Date.now()}`, status: 'draft' as ListingStatus, views: 0, inquiries: 0, createdAt: iso(0) }; state.listings.unshift(copy); await persist(state); return copy },
  async getOrders() { return (await readState()).orders },
  async getOrder(id: string) { return (await readState()).orders.find((item) => item.id === id) },
  async updateOrder(id: string, status: OrderStatus) { const state = await readState(); const order = state.orders.find((item) => item.id === id); if (!order) throw new Error('Order not found'); order.status = status; if (status === 'accepted' && !order.pickupId) { const pickupId = `PK-${Date.now().toString().slice(-4)}`; order.pickupId = pickupId; state.pickups.unshift({ id: pickupId, orderId: order.id, crop: order.crop, cropHi: order.cropHi, quantityKg: order.quantityKg, date: iso(1), timeWindow: 'Morning · 7–10 AM', driver: 'Assigning shortly', vehicle: 'To be assigned', farmAddress: state.profile.pickupLocation, status: 'scheduled' }); state.notifications.unshift({ id: `note_${Date.now()}`, role: 'farmer', title: 'Pickup request created', titleHi: 'पिकअप अनुरोध बना', body: `Pickup ${pickupId} is scheduled for tomorrow.`, bodyHi: `पिकअप ${pickupId} कल के लिए तय है।`, timestamp: new Date().toISOString(), read: false, href: '/farmer/pickups' }) } await persist(state); return order },
  async getPickups() { return (await readState()).pickups },
  async getEarnings() { return (await readState()).earnings },
  async getProfile() { return (await readState()).profile },
  async saveProfile(profile: FarmerProfileData) { const state = await readState(); state.profile = profile; await persist(state); return profile },
  async getNotifications(role: 'farmer' | 'consumer' | 'bulk') { return (await readState()).notifications.filter((item) => item.role === role) },
  async markNotificationsRead(role: 'farmer' | 'consumer' | 'bulk') { const state = await readState(); state.notifications.forEach((item) => { if (item.role === role) item.read = true }); await persist(state) },
  reset() { writeLocal(cloneSeed()) },
}
