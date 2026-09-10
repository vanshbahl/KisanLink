import type { BulkOrder, BulkProfileData, BulkRfq, ConsumerOrder, ConsumerProfileData, Delivery, DemoScenario, EarningsTransaction, FarmerListing, FarmerOrder, FarmerProfileData, ListingStatus, LogisticsPickup, LogisticsProfileData, LogisticsRoute, MarketMakerBoard, OrderStatus, Pickup, PrototypeNotification, Role, Vehicle } from '../types'
import { apiClient } from './apiClient'
import { localDay } from '../utils/dates'

export interface PrototypeState {
  /** Written by the seed; see SEED_VERSION. Absent or stale payloads are discarded. */
  seedVersion?: number
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
  markets: MarketMakerBoard[]
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const iso = localDay

/**
 * Seed version. Bumping it invalidates any previously persisted snapshot — local or
 * remote — so a demo build never boots into a half-updated story from an older run.
 */
const SEED_VERSION = 4

/**
 * ONE STORY, TOLD FOUR TIMES.
 *
 * Every record below belongs to the same narrative, so a judge switching roles sees the same
 * transaction from four sides rather than four unrelated demos:
 *
 *   FreshKart needed 1,600 kg of Grade A+ tomatoes for its Okhla DC. No single farm in the
 *   corridor had that. KisanLink assembled it from three — Sunehri Khet (Karnal, 500 kg),
 *   Yadav Fresh Fields (Panipat, 800 kg) and Green Field Farm (Murthal, 300 kg) — priced it
 *   at each farmer's own asking rate, and put all three on one southbound truck that drops
 *   at the Sonipat hub and then at Okhla.
 *
 *   Farmer sees   KL-ORD-1042 (their 300 kg leg) and its payout.
 *   Bulk sees     RFQ-2412 -> KL-B-2412, 100% matched across three farms.
 *   Logistics see RTE-POOL-01: three farm stops, one hub, one buyer drop, VEH-02.
 *   Consumer      lives on the same listings, at retail-comparison prices.
 *
 * Quantities reconcile: a listing's allocatedKg equals the sum of the orders drawn from it.
 */
const seedState: PrototypeState = {
  seedVersion: SEED_VERSION,
  listings: [
    // --- Green Field Farm · Ramesh Kumar · the demo farmer's own produce ---
    { id: 'listing_001', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', category: 'Vegetables', imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', quantityKg: 900, remainingKg: 600, allocatedKg: 300, unit: 'kg', grade: 'Grade A+', harvestDate: iso(-1), availableFrom: iso(0), farmingMethod: 'Natural farming', notes: 'Firm, hand-sorted tomatoes.', pricePerKg: 31, mandiPricePerKg: 24, retailPricePerKg: 38, farmerId: 'farmer_001', farm: 'Green Field Farm', pickupDate: iso(1), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: false, views: 126, inquiries: 9, createdAt: iso(-5) },
    { id: 'listing_011', crop: 'Baby Spinach', cropHi: 'बेबी पालक', category: 'Vegetables', imageSrc: '/assets/produce/spinach.webp', visual: 'leafy', quantityKg: 140, remainingKg: 126, allocatedKg: 14, unit: 'kg', grade: 'Grade A+', harvestDate: iso(0), availableFrom: iso(0), farmingMethod: 'Organic', notes: 'Washed and bundled.', pricePerKg: 42, mandiPricePerKg: 35, retailPricePerKg: 52, farmerId: 'farmer_001', farm: 'Green Field Farm', pickupDate: iso(2), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: true, views: 83, inquiries: 5, createdAt: iso(-2) },
    { id: 'listing_draft_1', crop: 'Sharbati Wheat', cropHi: 'शरबती गेहूं', category: 'Grains', imageSrc: '/assets/produce/wheat.webp', visual: 'grain', quantityKg: 900, remainingKg: 900, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: iso(-8), availableFrom: iso(3), farmingMethod: 'Conventional', notes: '', pricePerKg: 36, mandiPricePerKg: 31, retailPricePerKg: 44, farmerId: 'farmer_001', farm: 'Green Field Farm', pickupDate: iso(4), pickupWindow: 'Afternoon · 1–4 PM', fulfillment: 'pickup', status: 'draft', assisted: false, views: 0, inquiries: 0, createdAt: iso(-1) },
    { id: 'listing_sold_1', crop: 'New Potatoes', cropHi: 'नए आलू', category: 'Staples', imageSrc: '/assets/produce/potato.webp', visual: 'potato', quantityKg: 500, remainingKg: 0, allocatedKg: 500, unit: 'kg', grade: 'Grade A', harvestDate: iso(-18), availableFrom: iso(-17), farmingMethod: 'Conventional', notes: '', pricePerKg: 25, mandiPricePerKg: 21, retailPricePerKg: 32, farmerId: 'farmer_001', farm: 'Green Field Farm', pickupDate: iso(-12), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'sold', assisted: false, views: 210, inquiries: 18, createdAt: iso(-20) },

    // --- Network farms. Same corridor, other growers: this is the supply the Market Maker
    //     assembles from, and the reason the consumer marketplace is not a one-farm shop. ---
    { id: 'listing_101', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', category: 'Vegetables', imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', quantityKg: 1000, remainingKg: 500, allocatedKg: 500, unit: 'kg', grade: 'Grade A+', harvestDate: iso(-1), availableFrom: iso(0), farmingMethod: 'Natural farming', notes: 'Machine-graded, retail sorted.', pricePerKg: 29, mandiPricePerKg: 24, retailPricePerKg: 36, farmerId: 'farmer_002', farm: 'Sunehri Khet', pickupDate: iso(1), pickupWindow: 'Afternoon · 4–5 PM', fulfillment: 'pickup', status: 'active', assisted: false, views: 94, inquiries: 7, createdAt: iso(-4) },
    { id: 'listing_102', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', category: 'Vegetables', imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', quantityKg: 1300, remainingKg: 500, allocatedKg: 800, unit: 'kg', grade: 'Grade A+', harvestDate: iso(0), availableFrom: iso(0), farmingMethod: 'Conventional', notes: 'Large-lot supplier, crate packed.', pricePerKg: 30, mandiPricePerKg: 24, retailPricePerKg: 37, farmerId: 'farmer_003', farm: 'Yadav Fresh Fields', pickupDate: iso(1), pickupWindow: 'Evening · 5–6 PM', fulfillment: 'pickup', status: 'active', assisted: false, views: 141, inquiries: 12, createdAt: iso(-3) },
    { id: 'listing_103', crop: 'Red Onions', cropHi: 'लाल प्याज़', category: 'Staples', imageSrc: '/assets/produce/onion.webp', visual: 'onion', quantityKg: 540, remainingKg: 540, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: iso(-2), availableFrom: iso(0), farmingMethod: 'Conventional', notes: 'Cured and bagged.', pricePerKg: 29, mandiPricePerKg: 23, retailPricePerKg: 36, farmerId: 'farmer_004', farm: 'Malik Family Farm', pickupDate: iso(2), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: false, views: 67, inquiries: 4, createdAt: iso(-6) },
    { id: 'listing_104', crop: 'Sweet Carrots', cropHi: 'मीठी गाजर', category: 'Vegetables', imageSrc: '/assets/produce/carrot.webp', visual: 'root', quantityKg: 260, remainingKg: 260, allocatedKg: 0, unit: 'kg', grade: 'Grade A+', harvestDate: iso(-1), availableFrom: iso(0), farmingMethod: 'Organic', notes: 'Topped and washed.', pricePerKg: 36, mandiPricePerKg: 29, retailPricePerKg: 45, farmerId: 'farmer_005', farm: 'Doaba Harvests', pickupDate: iso(2), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: false, views: 58, inquiries: 3, createdAt: iso(-3) },
    { id: 'listing_105', crop: 'Green Capsicum', cropHi: 'हरी शिमला मिर्च', category: 'Vegetables', imageSrc: '/assets/produce/capsicum.webp', visual: 'green', quantityKg: 180, remainingKg: 180, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: iso(0), availableFrom: iso(0), farmingMethod: 'Natural farming', notes: 'Picked this morning.', pricePerKg: 52, mandiPricePerKg: 44, retailPricePerKg: 64, farmerId: 'farmer_006', farm: 'Ganga Plains Farm', pickupDate: iso(1), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'active', assisted: false, views: 45, inquiries: 2, createdAt: iso(-1) },
    { id: 'listing_106', crop: 'Crisp Cucumbers', cropHi: 'खीरा', category: 'Vegetables', imageSrc: '/assets/produce/cucumber.webp', visual: 'green', quantityKg: 380, remainingKg: 380, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: iso(0), availableFrom: iso(0), farmingMethod: 'Conventional', notes: 'Straight, uniform size.', pricePerKg: 28, mandiPricePerKg: 22, retailPricePerKg: 35, farmerId: 'farmer_007', farm: 'Rana Vegetable Farm', pickupDate: iso(1), pickupWindow: 'Afternoon · 1–4 PM', fulfillment: 'pickup', status: 'active', assisted: false, views: 72, inquiries: 5, createdAt: iso(-2) },
  ],
  orders: [
    // The demo farmer's 300 kg leg of the pooled FreshKart procurement order.
    { id: 'KL-ORD-1042', buyerName: 'FreshKart Foods Pvt. Ltd.', buyerType: 'Bulk Buyer', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', listingId: 'listing_001', quantityKg: 300, ratePerKg: 31, total: 9300, farmerPayout: 8370, platformFee: 279, logisticsFee: 651, orderedAt: iso(0), status: 'pickup_scheduled', paymentStatus: 'processing', pickupId: 'PK-2051' },
    // The one order still waiting on the farmer — the action the farmer demo opens with.
    { id: 'KL-C-2204-1', buyerName: 'Aarav Mehta', buyerType: 'Consumer', crop: 'Baby Spinach', cropHi: 'बेबी पालक', listingId: 'listing_011', quantityKg: 6, ratePerKg: 42, total: 252, farmerPayout: 245, platformFee: 7, logisticsFee: 35, orderedAt: iso(0), status: 'new', paymentStatus: 'paid' },
    { id: 'KL-C-2201-1', buyerName: 'Aarav Mehta', buyerType: 'Consumer', crop: 'Baby Spinach', cropHi: 'बेबी पालक', listingId: 'listing_011', quantityKg: 8, ratePerKg: 42, total: 336, farmerPayout: 326, platformFee: 10, logisticsFee: 35, orderedAt: iso(-1), status: 'pickup_scheduled', paymentStatus: 'paid', pickupId: 'PK-2048' },
    { id: 'KL-ORD-1019', buyerName: 'Dwarka Foods', buyerType: 'Bulk Buyer', crop: 'New Potatoes', cropHi: 'नए आलू', listingId: 'listing_sold_1', quantityKg: 500, ratePerKg: 25, total: 12500, farmerPayout: 11250, platformFee: 375, logisticsFee: 875, orderedAt: iso(-14), status: 'delivered', paymentStatus: 'paid', pickupId: 'PK-2011' },
  ],
  pickups: [
    { id: 'PK-2048', orderId: 'KL-C-2201-1', crop: 'Baby Spinach', cropHi: 'बेबी पालक', quantityKg: 8, date: iso(1), timeWindow: 'Morning · 7–10 AM', driver: 'Suresh Kumar', vehicle: 'HR 10 AK 4821 · Refrigerated mini truck', farmAddress: 'Green Field Farm, Murthal, Sonipat', status: 'driver_assigned' },
    { id: 'PK-2051', orderId: 'KL-ORD-1042', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 300, date: iso(0), timeWindow: 'Evening · 6–7 PM', driver: 'Imran Khan', vehicle: 'DL 1L AC 9082 · Medium truck', farmAddress: 'Green Field Farm, Murthal, Sonipat', status: 'driver_assigned' },
    { id: 'PK-2011', orderId: 'KL-ORD-1019', crop: 'New Potatoes', cropHi: 'नए आलू', quantityKg: 500, date: iso(-12), timeWindow: 'Morning · 7–10 AM', driver: 'Imran Khan', vehicle: 'DL 1L AC 9082 · Medium truck', farmAddress: 'Green Field Farm, Murthal, Sonipat', status: 'completed' },
  ],
  earnings: [
    { id: 'TX-901', orderId: 'KL-ORD-1019', crop: 'New Potatoes', cropHi: 'नए आलू', gross: 12500, deductions: 1250, net: 11250, mandiEquivalent: 10500, date: iso(-11), status: 'paid' },
    { id: 'TX-914', orderId: 'KL-C-2201-1', crop: 'Baby Spinach', cropHi: 'बेबी पालक', gross: 336, deductions: 10, net: 326, mandiEquivalent: 280, date: iso(-1), status: 'pending' },
    { id: 'TX-921', orderId: 'KL-ORD-1042', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', gross: 9300, deductions: 930, net: 8370, mandiEquivalent: 7200, date: iso(0), status: 'pending' },
    { id: 'TX-926', orderId: 'KL-C-2204-1', crop: 'Baby Spinach', cropHi: 'बेबी पालक', gross: 252, deductions: 7, net: 245, mandiEquivalent: 210, date: iso(0), status: 'pending' },
  ],
  notifications: [
    { id: 'note_1', role: 'farmer', title: 'New consumer order to accept', titleHi: 'नया ग्राहक ऑर्डर स्वीकार करें', body: 'Aarav Mehta ordered 6 kg Baby Spinach.', bodyHi: 'आरव मेहता ने 6 किलो बेबी पालक मंगवाई है।', timestamp: new Date().toISOString(), read: false, href: '/farmer/orders/KL-C-2204-1' },
    { id: 'note_2', role: 'farmer', title: 'Pooled pickup confirmed', titleHi: 'साझा पिकअप पक्का हुआ', body: 'Imran Khan collects 300 kg tomatoes this evening.', bodyHi: 'इमरान खान आज शाम 300 किलो टमाटर लेने आएंगे।', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false, href: '/farmer/pickups' },
    { id: 'note_3', role: 'consumer', title: 'Fresh produce nearby', titleHi: 'पास में ताज़ी फसल', body: 'Tomatoes from Sonipat are ₹7/kg below local retail.', bodyHi: 'सोनीपत के टमाटर खुदरा से ₹7/किलो सस्ते हैं।', timestamp: new Date(Date.now() - 7200000).toISOString(), read: false, href: '/consumer#marketplace' },
    { id: 'note_4', role: 'bulk', title: '1,600 kg matched across 3 farms', titleHi: '3 खेतों से 1,600 किलो मिले', body: 'KL-B-2412 is on a pooled collection run to Okhla.', bodyHi: 'KL-B-2412 ओखला के लिए साझा रूट पर है।', timestamp: new Date(Date.now() - 5400000).toISOString(), read: false, href: '/bulk/orders/KL-B-2412' },
    { id: 'note_5', role: 'bulk', title: 'Red Onion requirement is 60% matched', titleHi: 'प्याज़ की मांग 60% पूरी', body: 'RFQ-2418 needs 360 kg more before it can convert.', bodyHi: 'RFQ-2418 को 360 किलो और चाहिए।', timestamp: new Date(Date.now() - 9000000).toISOString(), read: false, href: '/bulk/requests/RFQ-2418' },
    { id: 'note_6', role: 'logistics', title: 'Pooled run in progress', titleHi: 'साझा रूट चल रहा है', body: 'RTE-POOL-01 · stop 2 of 3 · 800 kg at Yadav Fresh Fields.', bodyHi: 'RTE-POOL-01 · 3 में से स्टॉप 2।', timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups/PK-POOL-C' },
  ],
  profile: { name: 'Ramesh Kumar', phone: '9876543210', language: 'en', farmName: 'Green Field Farm', village: 'Murthal', district: 'Sonipat', state: 'Haryana', farmSizeAcres: 7.5, mainCrops: 'Tomato, spinach, wheat', pickupLocation: 'Gate 1, Green Field Farm, Murthal', payoutMethod: 'UPI', payoutMasked: 'ramesh•••@upi', farmerVerified: true, farmVerified: true, identityStatus: 'Verified' },
  consumerOrders: [
    { id: 'KL-C-2204', items: [{ listingId: 'listing_011', crop: 'Baby Spinach', cropHi: 'बेबी पालक', farm: 'Green Field Farm', imageSrc: '/assets/produce/spinach.webp', quantityKg: 6, ratePerKg: 42 }], subtotal: 252, logisticsFee: 35, platformFee: 7, farmerShare: 245, total: 287, address: { id: 'addr_home', label: 'Home', recipient: 'Aarav Mehta', phone: '9811122233', line1: 'Sector 12, Dwarka', city: 'New Delhi', pincode: '110078', isDefault: true }, deliverySlot: 'Tomorrow · 8–11 AM', eta: iso(1), note: '', paymentMethod: 'UPI', paymentStatus: 'Mock paid', status: 'confirmed', orderedAt: new Date().toISOString(), timeline: [{ status: 'confirmed', label: 'Order confirmed', at: new Date().toISOString() }] },
    { id: 'KL-C-2201', items: [{ listingId: 'listing_011', crop: 'Baby Spinach', cropHi: 'बेबी पालक', farm: 'Green Field Farm', imageSrc: '/assets/produce/spinach.webp', quantityKg: 8, ratePerKg: 42 }], subtotal: 336, logisticsFee: 35, platformFee: 10, farmerShare: 326, total: 371, address: { id: 'addr_home', label: 'Home', recipient: 'Aarav Mehta', phone: '9811122233', line1: 'Sector 12, Dwarka', city: 'New Delhi', pincode: '110078', isDefault: true }, deliverySlot: 'Tomorrow · 8–11 AM', eta: iso(1), note: 'Leave with the guard if I am out.', paymentMethod: 'UPI', paymentStatus: 'Mock paid', status: 'pickup_scheduled', orderedAt: new Date(Date.now() - 86400000).toISOString(), timeline: [{ status: 'confirmed', label: 'Order confirmed', at: new Date(Date.now() - 86400000).toISOString() }, { status: 'farmer_preparing', label: 'Farmer accepted', at: new Date(Date.now() - 82800000).toISOString() }, { status: 'pickup_scheduled', label: 'Pickup scheduled', at: new Date(Date.now() - 79200000).toISOString() }] },
  ],
  rfqs: [
    {
      id: 'RFQ-2412', crop: 'Fresh Tomatoes', grade: 'Grade A+', requiredQuantityKg: 1600, targetPrice: 34,
      deliveryLocation: 'Okhla Distribution Centre, New Delhi', deliveryWindow: `${iso(1)} · 6–10 AM`, requiredBy: iso(1), deliverySlot: 'Morning · 6–10 AM',
      packaging: '25 kg crates', recurring: false, frequency: 'one-time', notes: 'Firm produce, sorted for retail distribution.',
      status: 'converted', createdAt: new Date(Date.now() - 172800000).toISOString(),
      matches: [
        { farmer: 'Harpreet Singh', farm: 'Sunehri Khet', listingId: 'listing_101', quantityKg: 500, ratePerKg: 29 },
        { farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', listingId: 'listing_102', quantityKg: 800, ratePerKg: 30 },
        { farmer: 'Ramesh Kumar', farm: 'Green Field Farm', listingId: 'listing_001', quantityKg: 300, ratePerKg: 31 },
      ],
    },
    {
      id: 'RFQ-2418', crop: 'Red Onions', grade: 'Grade A', requiredQuantityKg: 900, targetPrice: 31,
      deliveryLocation: 'Gurugram Cold Store, Sector 37', deliveryWindow: `${iso(3)} · 6–10 AM`, requiredBy: iso(3), deliverySlot: 'Morning · 6–10 AM',
      packaging: '50 kg jute sacks', recurring: true, frequency: 'weekly', notes: 'Weekly standing requirement for the Gurugram stores.',
      status: 'partially_matched', createdAt: new Date(Date.now() - 43200000).toISOString(),
      matches: [{ farmer: 'Suresh Malik', farm: 'Malik Family Farm', listingId: 'listing_103', quantityKg: 540, ratePerKg: 29 }],
    },
  ],
  bulkOrders: [
    {
      id: 'KL-B-2412', rfqId: 'RFQ-2412', crop: 'Fresh Tomatoes', grade: 'Grade A+', orderedQuantityKg: 1600, suppliedQuantityKg: 1600,
      contributions: [
        { farmer: 'Harpreet Singh', farm: 'Sunehri Khet', listingId: 'listing_101', quantityKg: 500, ratePerKg: 29 },
        { farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', listingId: 'listing_102', quantityKg: 800, ratePerKg: 30 },
        { farmer: 'Ramesh Kumar', farm: 'Green Field Farm', listingId: 'listing_001', quantityKg: 300, ratePerKg: 31 },
      ],
      produceValue: 47800, logisticsFee: 4715, platformFee: 956, total: 53471, traditionalEstimate: 59520,
      deliveryLocation: 'Okhla Distribution Centre, New Delhi', deliveryWindow: `${iso(1)} · 6–10 AM`,
      status: 'pickup_scheduled', invoiceStatus: 'Mock invoice generated', orderedAt: new Date(Date.now() - 158400000).toISOString(),
    },
  ],
  consumerProfile: { name: 'Aarav Mehta', phone: '9811122233', language: 'en', defaultLocation: 'Dwarka, New Delhi', addresses: [{ id: 'addr_home', label: 'Home', recipient: 'Aarav Mehta', phone: '9811122233', line1: 'Sector 12, Dwarka', city: 'New Delhi', pincode: '110078', isDefault: true }], notifications: { orders: true, freshness: true, offers: false } },
  bulkProfile: { businessName: 'FreshKart Foods Pvt. Ltd.', representative: 'Neha Kapoor', phone: '9899001122', gst: '07AABCF1234M1Z5 (mock)', language: 'en', procurementLocations: ['Delhi NCR', 'Gurugram'], deliveryAddresses: ['Okhla Distribution Centre, New Delhi', 'Gurugram Cold Store, Sector 37'], notifications: { matches: true, orders: true, deliveries: true } },
  logisticsPickups: [
    // The pooled run, in the order the truck drives it: Karnal -> Panipat -> Murthal -> hub.
    { id: 'PK-POOL-B', farmer: 'Harpreet Singh', farm: 'Sunehri Khet', farmLocation: 'Karnal, Haryana', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 500, pickupWindow: 'Today · 4–5 PM', orderRefs: ['KL-B-2412'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'completed', notes: 'Stop 1 of 3 · 25 kg crates, 20 crates.', routeId: 'RTE-POOL-01', checklist: { arrived: true, quantityVerified: true, qualityChecked: true, loadSecured: true, pickupCompleted: true }, timeline: [{ label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: new Date(Date.now() - 14400000).toISOString() }, { label: 'Driver arrived', labelHi: 'ड्राइवर पहुंच गया', at: new Date(Date.now() - 9000000).toISOString() }, { label: 'Pickup completed', labelHi: 'पिकअप पूरा हुआ', at: new Date(Date.now() - 7200000).toISOString() }] },
    { id: 'PK-POOL-C', farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', farmLocation: 'Panipat, Haryana', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 800, pickupWindow: 'Today · 5–6 PM', orderRefs: ['KL-B-2412'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'en_route', notes: 'Stop 2 of 3 · 32 crates, verify count against manifest.', routeId: 'RTE-POOL-01', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: new Date(Date.now() - 14400000).toISOString() }, { label: 'Driver en route', labelHi: 'ड्राइवर रास्ते में', at: new Date(Date.now() - 3600000).toISOString() }] },
    { id: 'PK-2051', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 300, pickupWindow: 'Today · 6–7 PM', orderRefs: ['KL-ORD-1042'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'assigned', notes: 'Stop 3 of 3 · Grade A+ crates. Verify count before loading.', routeId: 'RTE-POOL-01', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date(Date.now() - 18000000).toISOString() }, { label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: new Date(Date.now() - 14400000).toISOString() }] },
    { id: 'PK-2048', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Baby Spinach', cropHi: 'बेबी पालक', quantityKg: 8, pickupWindow: 'Tomorrow · 7–10 AM', orderRefs: ['KL-C-2201-1'], vehicleId: 'VEH-01', driver: 'Suresh Kumar', status: 'assigned', notes: 'Use ventilated crates.', routeId: 'RTE-101', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date(Date.now() - 7200000).toISOString() }, { label: 'Vehicle assigned', labelHi: 'वाहन सौंपा गया', at: new Date(Date.now() - 3600000).toISOString() }] },
  ],
  deliveries: [
    { id: 'DLV-302', origin: 'KisanLink Sonipat Hub', destination: 'Okhla Distribution Centre, New Delhi', buyer: 'FreshKart Foods Pvt. Ltd.', buyerType: 'Bulk Buyer', shipment: 'Pooled tomato lot B-2412', produce: 'Fresh Tomatoes', produceHi: 'ताज़े टमाटर', quantityKg: 1600, eta: `${iso(1)} · 6–10 AM`, vehicleId: 'VEH-02', orderRefs: ['KL-B-2412'], status: 'scheduled', handlingNotes: 'Do not stack above four crates.', issues: [], timeline: [{ label: 'Delivery scheduled', labelHi: 'डिलीवरी तय हुई', at: new Date(Date.now() - 18000000).toISOString() }] },
    { id: 'DLV-301', origin: 'KisanLink Sonipat Hub', destination: 'Sector 12, Dwarka, New Delhi', buyer: 'Aarav Mehta', buyerType: 'Consumer', shipment: 'Fresh crate C-301', produce: 'Baby Spinach', produceHi: 'बेबी पालक', quantityKg: 8, eta: `${iso(1)} · 8–11 AM`, vehicleId: 'VEH-01', orderRefs: ['KL-C-2201'], status: 'scheduled', handlingNotes: 'Keep shaded and ventilated.', issues: [], timeline: [{ label: 'Delivery scheduled', labelHi: 'डिलीवरी तय हुई', at: new Date(Date.now() - 7200000).toISOString() }] },
  ],
  logisticsRoutes: [
    {
      id: 'RTE-POOL-01', name: 'Karnal–Sonipat pooled tomato run', nameHi: 'करनाल–सोनीपत साझा टमाटर रूट', vehicleId: 'VEH-02',
      pickups: ['PK-POOL-B', 'PK-POOL-C', 'PK-2051'], deliveries: ['DLV-302'],
      stops: ['Sunehri Khet · Karnal', 'Yadav Fresh Fields · Panipat', 'Green Field Farm · Murthal', 'KisanLink Sonipat Hub', 'FreshKart Okhla DC'],
      routeStops: [
        { placeId: 'sunehri_khet', label: 'Sunehri Khet', kind: 'pickup', refId: 'PK-POOL-B', quantityKg: 500, window: 'Today · 4–5 PM', status: 'done' },
        { placeId: 'yadav_fresh_fields', label: 'Yadav Fresh Fields', kind: 'pickup', refId: 'PK-POOL-C', quantityKg: 800, window: 'Today · 5–6 PM', status: 'current' },
        { placeId: 'green_field_farm', label: 'Green Field Farm', kind: 'pickup', refId: 'PK-2051', quantityKg: 300, window: 'Today · 6–7 PM', status: 'upcoming' },
        { placeId: 'sonipat_hub', label: 'Sonipat consolidation hub', kind: 'hub', quantityKg: 1600, window: 'Today · 8 PM', status: 'upcoming' },
        { placeId: 'okhla_dc', label: 'FreshKart Okhla DC', kind: 'drop', refId: 'DLV-302', quantityKg: 1600, window: 'Tomorrow · 6–10 AM', status: 'upcoming' },
      ],
      distanceKm: 152, durationMinutes: 265, capacityKg: 2000, loadKg: 1600, status: 'active', pooled: true,
    },
    {
      id: 'RTE-101', name: 'Sonipat to Dwarka household run', nameHi: 'सोनीपत से द्वारका घरेलू रूट', vehicleId: 'VEH-01',
      pickups: ['PK-2048'], deliveries: ['DLV-301'],
      stops: ['Green Field Farm · Murthal', 'KisanLink Sonipat Hub', 'Dwarka Sector 12'],
      routeStops: [
        { placeId: 'green_field_farm', label: 'Green Field Farm', kind: 'pickup', refId: 'PK-2048', quantityKg: 8, window: 'Tomorrow · 7–10 AM', status: 'upcoming' },
        { placeId: 'sonipat_hub', label: 'Sonipat consolidation hub', kind: 'hub', quantityKg: 96, window: 'Tomorrow · 7:30 AM', status: 'upcoming' },
        { placeId: 'dwarka_12', label: 'Dwarka Sector 12', kind: 'drop', refId: 'DLV-301', quantityKg: 96, window: 'Tomorrow · 8–11 AM', status: 'upcoming' },
      ],
      distanceKm: 72, durationMinutes: 135, capacityKg: 750, loadKg: 96, status: 'planned', pooled: false,
    },
  ],
  vehicles: [
    { id: 'VEH-01', registration: 'HR 10 AK 4821', type: 'Refrigerated mini truck', typeHi: 'रेफ्रिजरेटेड मिनी ट्रक', capacityKg: 750, driver: 'Suresh Kumar', currentAssignment: 'RTE-101', status: 'assigned' },
    { id: 'VEH-02', registration: 'DL 1L AC 9082', type: 'Medium truck', typeHi: 'मध्यम ट्रक', capacityKg: 2000, driver: 'Imran Khan', currentAssignment: 'RTE-POOL-01', status: 'in_transit' },
    { id: 'VEH-03', registration: 'HR 69 D 3104', type: 'Pickup', typeHi: 'पिकअप', capacityKg: 900, driver: 'Meena Devi', status: 'available' },
    { id: 'VEH-04', registration: 'UP 17 BT 6610', type: 'Electric cargo van', typeHi: 'इलेक्ट्रिक कार्गो वैन', capacityKg: 600, driver: 'Amit Pal', status: 'maintenance' },
    { id: 'VEH-05', registration: 'HR 26 CX 7741', type: 'Light tempo', typeHi: 'छोटा टेम्पो', capacityKg: 400, driver: 'Balwinder Singh', status: 'available' },
  ],
  logisticsProfile: { name: 'Kavita Sharma', phone: '9877004455', hub: 'KisanLink Sonipat Hub', shift: 'Morning · 6 AM–3 PM', language: 'en', notifications: { pickups: true, deliveries: true, issues: true, delays: true } },
  savedListingIds: ['listing_011'],
  savedFarmNames: ['Green Field Farm'],
  markets: [
    {
      id: 'MM-TOM-SONIPAT',
      crop: 'Fresh Tomatoes',
      cropHi: 'ताज़े टमाटर',
      grade: 'Grade A+',
      corridor: 'Sonipat → Delhi NCR',
      corridorHi: 'सोनीपत → दिल्ली NCR',
      destination: 'Dwarka & Okhla, New Delhi',
      deliveryWindow: 'Tomorrow · 6–10 AM',
      imageSrc: '/assets/produce/tomato.webp',
      visual: 'tomato',
      farmerFloorPerKg: 31,
      mandiPricePerKg: 24,
      buyerCeilingPerKg: 38,
      buyerCurrentPerKg: 42,
      platformFeePct: 0.02,
      routeDistanceKm: 92,
      vehicleId: 'VEH-05',
      lots: [
        { id: 'lot_green_field', listingId: 'listing_001', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', location: 'Murthal, Sonipat', offeredKg: 180, detourKm: 0, own: true },
        { id: 'lot_nandi', farmer: 'Sunita Devi', farm: 'Nandi Organic Plot', location: 'Bahalgarh, Sonipat', offeredKg: 84, detourKm: 5 },
        { id: 'lot_rana', farmer: 'Jaswant Rana', farm: 'Rana Vegetable Farm', location: 'Kharkhoda, Sonipat', offeredKg: 96, detourKm: 9 },
      ],
      commitments: [
        { id: 'mmc_freshkart', source: 'bulk', party: 'FreshKart Foods', detail: 'Okhla Distribution Centre', quantityKg: 200, committedAt: iso(-1) },
        { id: 'mmc_dwarka12', source: 'consumer', party: 'Dwarka Sector 12 pool', detail: '11 households', quantityKg: 62, committedAt: iso(-1) },
        { id: 'mmc_dwarka19', source: 'consumer', party: 'Dwarka Sector 19 pool', detail: '7 households', quantityKg: 38, committedAt: iso(0) },
        { id: 'mmc_aarav', source: 'consumer', party: 'Aarav Mehta', detail: 'Sector 12, Dwarka', quantityKg: 15, committedAt: iso(0), own: true },
      ],
      status: 'forming',
      createdAt: iso(-2),
    },
  ],
}
const STORAGE_KEY = `kisanlink_state_v${SEED_VERSION}`
const cloneSeed = () => JSON.parse(JSON.stringify(seedState)) as PrototypeState
const normalize = (value: Partial<PrototypeState>): PrototypeState => {
  const base = cloneSeed()
  // A payload from an older story (a previous build, or the backend's own mirror) would
  // contradict the current one — quantities, order ids and route stops all moved. Judging
  // reliability beats preserving it, so it is dropped rather than merged.
  if (value.seedVersion !== SEED_VERSION) return base
  const state: PrototypeState = {
    ...base,
    ...value,
    consumerProfile: value.consumerProfile?.addresses ? value.consumerProfile : base.consumerProfile,
    bulkProfile: value.bulkProfile?.businessName ? value.bulkProfile : base.bulkProfile,
    // A payload that predates Market Maker (older localStorage, or a backend that dropped the
    // key) must fall back to the seeded board rather than leaving the module with no market.
    markets: Array.isArray(value.markets) && value.markets.length ? value.markets : base.markets,
    // The corridor vehicle is part of feasibility, so an older fleet payload is topped up
    // rather than silently leaving the market with nothing to quote against.
    vehicles: value.vehicles?.length
      ? [...value.vehicles, ...base.vehicles.filter((vehicle) => !value.vehicles!.some((item) => item.id === vehicle.id))]
      : base.vehicles,
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
/**
 * Persists shared state and announces it only when it actually changed. `readState()` also
 * writes through this (it caches the remote snapshot locally), so announcing unconditionally
 * would make any live subscriber re-read, re-write and re-announce forever.
 */
const writeLocal = (state: PrototypeState) => {
  const serialized = JSON.stringify(state)
  const changed = localStorage.getItem(STORAGE_KEY) !== serialized
  localStorage.setItem(STORAGE_KEY, serialized)
  if (changed) window.dispatchEvent(new Event('kisanlink-state'))
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 900)
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, signal: controller.signal })
    if (!response.ok) throw new Error(`API ${response.status}`)
    return await response.json() as T
  } finally { window.clearTimeout(timer) }
}

/**
 * Shared state is read from localStorage and only mirrored to the backend.
 *
 * It used to be the other way round: every screen awaited `GET /api/state` behind a 900 ms
 * abort before it could render. During a live demo that turns one unavailable service into a
 * visible stall on every navigation, and the backend's own envelope silently drops fields it
 * does not know about. The browser now owns the story; the backend gets a copy when it can.
 */
async function readState() {
  return readLocal()
}
async function persist(state: PrototypeState) {
  const synchronized = normalize(state)
  writeLocal(synchronized)
  // Fire-and-forget: a failed mirror must never surface as a failed user action.
  void api<PrototypeState>('/state', { method: 'PUT', body: JSON.stringify(synchronized) }).catch(() => undefined)
  return synchronized
}

export const prototypeService = {
  getState: readState,
  async replaceState(state: PrototypeState) { return persist(state) },
  /**
   * Shared prototype state is authoritative for everything the demo narrative depends on.
   *
   * The canonical backend carries its own seed — different farms, different quantities, its
   * own grades — so preferring it made the consumer marketplace, the procurement matcher and
   * the logistics route describe three different worlds. Writes are still mirrored upstream
   * (see `saveListing` and friends); reads come from one place so the four roles agree.
   */
  async getListings() {
    return (await readState()).listings
  },
  /**
   * Only the signed-in farmer's own produce. `getListings()` returns the whole network
   * (the consumer marketplace and the procurement matcher both need that), so the farmer's
   * own screens filter to their farm rather than showing every grower's stock as theirs.
   */
  async getMyListings() {
    const state = await readState()
    const mine = (await this.getListings()).filter((item) => item.farm === state.profile.farmName)
    return mine.length ? mine : state.listings.filter((item) => item.farm === state.profile.farmName)
  },
  async getListing(id: string) {
    return (await readState()).listings.find((item) => item.id === id)
  },
  async saveListing(input: FarmerListing) {
    try {
      const saved = await apiClient.createListing(input)
      if (saved) input.id = saved.id
    } catch (e) {
      console.warn('Backend save listing fallback:', e)
    }
    const state = await readState(); const index = state.listings.findIndex((item) => item.id === input.id); if (index >= 0) state.listings[index] = input; else state.listings.unshift(input); await persist(state); return input
  },
  async patchListing(id: string, patch: Partial<FarmerListing>) {
    try {
      await apiClient.updateListing(id, patch)
    } catch (e) {
      console.warn('Backend patch listing fallback:', e)
    }
    const state = await readState(); const item = state.listings.find((entry) => entry.id === id); if (!item) throw new Error('Listing not found'); Object.assign(item, patch); await persist(state); return item
  },
  async deleteListing(id: string) {
    try {
      await apiClient.deleteListing(id)
    } catch (e) {
      console.warn('Backend delete listing fallback:', e)
    }
    const state = await readState(); state.listings = state.listings.filter((item) => item.id !== id); await persist(state)
  },
  async duplicateListing(id: string) { const state = await readState(); const source = state.listings.find((item) => item.id === id); if (!source) throw new Error('Listing not found'); const copy = { ...source, id: `listing_${Date.now()}`, status: 'draft' as ListingStatus, views: 0, inquiries: 0, createdAt: iso(0) }; state.listings.unshift(copy); await persist(state); return copy },
  async getOrders() {
    return (await readState()).orders
  },
  async getOrder(id: string) {
    return (await readState()).orders.find((item) => item.id === id)
  },
  async updateOrder(id: string, status: OrderStatus) {
    try {
      await apiClient.updateOrderStatus(id, status)
    } catch (e) {
      console.warn('Backend order status update fallback:', e)
    }
    const state = await readState(); const order = state.orders.find((item) => item.id === id); if (!order) throw new Error('Order not found'); order.status = status; if (status === 'accepted' && !order.pickupId) { const pickupId = `PK-${Date.now().toString().slice(-4)}`; order.pickupId = pickupId; state.pickups.unshift({ id: pickupId, orderId: order.id, crop: order.crop, cropHi: order.cropHi, quantityKg: order.quantityKg, date: iso(1), timeWindow: 'Morning · 7–10 AM', driver: 'Assigning shortly', vehicle: 'To be assigned', farmAddress: state.profile.pickupLocation, status: 'scheduled' }); state.notifications.unshift({ id: `note_${Date.now()}`, role: 'farmer', title: 'Pickup request created', titleHi: 'पिकअप अनुरोध बना', body: `Pickup ${pickupId} is scheduled for tomorrow.`, bodyHi: `पिकअप ${pickupId} कल के लिए तय है।`, timestamp: new Date().toISOString(), read: false, href: '/farmer/pickups' }) }
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
  async getPickups() {
    return (await readState()).pickups
  },
  async getEarnings() {
    return (await readState()).earnings
  },
  async getProfile() { return (await readState()).profile },
  async saveProfile(profile: FarmerProfileData) { const state = await readState(); state.profile = profile; await persist(state); return profile },
  async getNotifications(role: Role) { return (await readState()).notifications.filter((item) => item.role === role) },
  async markNotificationsRead(role: Role) { const state = await readState(); state.notifications.forEach((item) => { if (item.role === role) item.read = true }); await persist(state) },
  async reset() { const state = cloneSeed(); writeLocal(state); void api<PrototypeState>('/reset', { method: 'POST' }).catch(() => undefined); return state },
  /**
   * Demo presets. The default seed already tells the full four-role story, so a scenario is
   * only ever a deliberate *departure* from it — an empty account, a consumer-only account,
   * a corridor rewound before viability, or an exception on the floor.
   */
  async seedScenario(scenario: DemoScenario) {
    const state = cloneSeed()
    if (scenario === 'empty') { state.orders = []; state.pickups = []; state.earnings = []; state.consumerOrders = []; state.rfqs = []; state.bulkOrders = []; state.logisticsPickups = []; state.deliveries = []; state.logisticsRoutes = []; state.notifications = [] }
    if (scenario === 'consumer') {
      // A single household order, with nothing else competing for attention.
      state.rfqs = []; state.bulkOrders = []
      state.orders = state.orders.filter((item) => item.id.startsWith('KL-C-'))
      state.logisticsPickups = state.logisticsPickups.filter((item) => item.routeId === 'RTE-101')
      state.deliveries = state.deliveries.filter((item) => item.id === 'DLV-301')
      state.logisticsRoutes = state.logisticsRoutes.filter((item) => item.id === 'RTE-101')
      state.notifications = state.notifications.filter((item) => item.role === 'consumer' || item.role === 'farmer')
    }
    if (scenario === 'market') {
      // Rewinds the flagship corridor to the moment before it becomes viable, and points
      // every role at it. Deliberately leaves the rest of the prototype untouched.
      const board = state.markets[0]
      const note = (role: Role, title: string, titleHi: string, body: string, bodyHi: string, href: string) => state.notifications.unshift({ id: `note_mm_${role}_${Date.now()}`, role, title, titleHi, body, bodyHi, timestamp: new Date().toISOString(), read: false, href })
      note('farmer', 'Your tomatoes are close to a direct market', 'आपके टमाटर सीधे बाज़ार के करीब हैं', `${board.crop} in ${board.corridor} needs a little more demand.`, 'थोड़ी और मांग चाहिए।', '/farmer/market')
      note('consumer', 'A farm-direct market is nearly open', 'सीधा बाज़ार लगभग खुल गया है', `${board.crop} from ${board.corridor} is close to unlocking.`, 'सीधा बाज़ार खुलने वाला है।', '/consumer/market')
      note('bulk', 'Pooled corridor is close to viable', 'साझा कॉरिडोर लगभग व्यवहार्य है', `${board.crop} · ${board.destination}`, 'साझा कॉरिडोर लगभग तैयार है।', '/bulk/market')
      note('logistics', 'Corridor waiting on demand', 'कॉरिडोर मांग का इंतज़ार कर रहा है', `${board.corridor} · ${board.routeDistanceKm} km · vehicle held`, 'कॉरिडोर मांग का इंतज़ार कर रहा है।', '/logistics/market')
    }
    if (scenario === 'issue') {
      const pickup = state.logisticsPickups.find((item) => item.id === 'PK-POOL-C')
      if (pickup) { pickup.status = 'issue'; pickup.notes = 'Crate count differs from the manifest by 2 crates (50 kg).' }
      const delivery = state.deliveries.find((item) => item.id === 'DLV-302')
      if (delivery) { delivery.status = 'issue'; delivery.issues = ['Traffic delay near Kundli · ETA +25 min'] }
      state.notifications.unshift({ id: 'note-logistics-issue', role: 'logistics', title: 'Priority issue requires action', titleHi: 'ज़रूरी समस्या पर कार्रवाई चाहिए', body: 'PK-POOL-C crate count needs verification before loading.', bodyHi: 'PK-POOL-C के क्रेट की संख्या जांचें।', timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups/PK-POOL-C' })
    }
    await persist(normalize(state)); return state
  },
}
