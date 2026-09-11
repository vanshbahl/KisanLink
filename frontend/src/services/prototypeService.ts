import type { BulkOrder, BulkProfileData, BulkRfq, ConsumerOrder, ConsumerProfileData, Delivery, DemoScenario, EarningsTransaction, FarmerListing, FarmerOrder, FarmerProfileData, ListingStatus, LogisticsPickup, LogisticsProfileData, LogisticsRoute, MarketMakerBoard, OrderStatus, Pickup, PrototypeNotification, Role, Vehicle } from '../types'
import { apiClient } from './apiClient'
import { evaluateMarket } from './marketMakerEngine'

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
  markets: MarketMakerBoard[]
}

const STORAGE_KEY = 'kisanlink_phase1_state_v2'
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
    { id: 'PK-2048', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Baby Spinach', cropHi: 'बेबी पालक', quantityKg: 8, pickupWindow: 'Tomorrow · 7–10 AM', orderRefs: ['KL-ORD-1037'], vehicleId: 'VEH-01', driver: 'Suresh Kumar', status: 'assigned', notes: 'Use ventilated crates.', routeId: 'RTE-101', otp: '123456', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date(Date.now() - 3600000).toISOString() }, { label: 'Vehicle assigned', labelHi: 'वाहन सौंपा गया', at: new Date().toISOString() }] },
    { id: 'PK-2051', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', farmLocation: 'Murthal, Sonipat, Haryana', crop: 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', quantityKg: 300, pickupWindow: 'Today · 2–4 PM', orderRefs: ['KL-ORD-1042'], status: 'unassigned', notes: 'Grade A+ crates. Verify count before loading.', routeId: 'RTE-POOL-01', otp: '884920', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Pickup created', labelHi: 'पिकअप बनाया गया', at: new Date().toISOString() }] },
    { id: 'PK-POOL-B', farmer: 'Harpreet Singh', farm: 'Sunehri Khet', farmLocation: 'Karnal, Haryana', crop: 'Tomatoes', cropHi: 'टमाटर', quantityKg: 500, pickupWindow: 'Today · 4–5 PM', orderRefs: ['KL-B-DEMO'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'en_route', notes: 'Pooled bulk route stop 2.', routeId: 'RTE-POOL-01', otp: '551203', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Vehicle en route', labelHi: 'वाहन रास्ते में है', at: new Date().toISOString() }] },
    { id: 'PK-POOL-C', farmer: 'Rajesh Yadav', farm: 'Yadav Fresh Fields', farmLocation: 'Panipat, Haryana', crop: 'Tomatoes', cropHi: 'टमाटर', quantityKg: 800, pickupWindow: 'Today · 5–6 PM', orderRefs: ['KL-B-DEMO'], vehicleId: 'VEH-02', driver: 'Imran Khan', status: 'assigned', notes: 'Pooled bulk route stop 3.', routeId: 'RTE-POOL-01', otp: '449102', checklist: { arrived: false, quantityVerified: false, qualityChecked: false, loadSecured: false, pickupCompleted: false }, timeline: [{ label: 'Vehicle assigned', labelHi: 'वाहन तय हुआ', at: new Date().toISOString() }] },
  ],
  deliveries: [
    { id: 'DLV-301', origin: 'KisanLink Sonipat Hub', destination: 'Sector 12, Dwarka, New Delhi', buyer: 'Aarav Mehta', buyerType: 'Consumer', shipment: 'Fresh crate C-301', produce: 'Baby Spinach', produceHi: 'बेबी पालक', quantityKg: 8, eta: iso(1), vehicleId: 'VEH-01', orderRefs: ['KL-ORD-1037'], status: 'scheduled', handlingNotes: 'Keep shaded and ventilated.', issues: [], otp: '123456', timeline: [{ label: 'Delivery scheduled', labelHi: 'डिलीवरी तय हुई', at: new Date().toISOString() }] },
    { id: 'DLV-302', origin: 'KisanLink Sonipat Hub', destination: 'Okhla Distribution Centre, New Delhi', buyer: 'FreshKart Foods', buyerType: 'Bulk Buyer', shipment: 'Pooled tomato lot B-302', produce: 'Tomatoes', produceHi: 'टमाटर', quantityKg: 1300, eta: iso(1), vehicleId: 'VEH-02', orderRefs: ['KL-B-DEMO'], status: 'in_transit', handlingNotes: 'Do not stack above four crates.', issues: [], otp: '654321', timeline: [{ label: 'Shipment loaded', labelHi: 'माल लोड हुआ', at: new Date(Date.now() - 1800000).toISOString() }, { label: 'In transit', labelHi: 'रास्ते में', at: new Date().toISOString() }] },
  ],
  logisticsRoutes: [
    { id: 'RTE-POOL-01', name: 'Sonipat–Karnal pooled tomato run', nameHi: 'सोनीपत–करनाल साझा टमाटर रूट', vehicleId: 'VEH-02', pickups: ['PK-2051', 'PK-POOL-B', 'PK-POOL-C'], deliveries: ['DLV-302'], stops: ['Farm A · Murthal', 'Farm B · Karnal', 'Farm C · Panipat', 'FreshKart Okhla Hub'], distanceKm: 118, durationMinutes: 245, capacityKg: 2000, loadKg: 1800, status: 'active', pooled: true },
    { id: 'RTE-101', name: 'Sonipat to Dwarka fresh run', nameHi: 'सोनीपत से द्वारका ताज़ा रूट', vehicleId: 'VEH-01', pickups: ['PK-2048'], deliveries: ['DLV-301'], stops: ['Green Field Farm', 'KisanLink Sonipat Hub', 'Dwarka Sector 12'], distanceKm: 72, durationMinutes: 135, capacityKg: 750, loadKg: 360, status: 'planned', pooled: false },
  ],
  vehicles: [
    { id: 'VEH-01', registration: 'HR 10 AK 4821', type: 'Refrigerated mini truck', typeHi: 'रेफ्रिजरेटेड मिनी ट्रक', capacityKg: 750, driver: 'Suresh Kumar', currentAssignment: 'RTE-101', status: 'assigned' },
    { id: 'VEH-02', registration: 'DL 1L AC 9082', type: 'Medium truck', typeHi: 'मध्यम ट्रक', capacityKg: 2000, driver: 'Imran Khan', status: 'available' },
    { id: 'VEH-03', registration: 'HR 69 D 3104', type: 'Pickup', typeHi: 'पिकअप', capacityKg: 900, driver: 'Meena Devi', status: 'available' },
    { id: 'VEH-04', registration: 'UP 17 BT 6610', type: 'Electric cargo van', typeHi: 'इलेक्ट्रिक कार्गो वैन', capacityKg: 600, driver: 'Amit Pal', status: 'maintenance' },
    { id: 'VEH-05', registration: 'HR 26 CX 7741', type: 'Light tempo', typeHi: 'छोटा टेम्पो', capacityKg: 400, driver: 'Balwinder Singh', status: 'available' },
  ],
  logisticsProfile: { name: 'Kavita Sharma', phone: '9877004455', hub: 'KisanLink Sonipat Hub', shift: 'Morning · 6 AM–3 PM', language: 'en', notifications: { pickups: true, deliveries: true, issues: true, delays: true } },
  savedListingIds: ['listing_011'],
  savedFarmNames: ['Green Field Farm'],
  markets: [
    {
      id: 'MM-SONIPAT-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Sonipat Fresh Produce Pool',
      cropHi: 'सोनीपत ताज़ा उपज पूल',
      grade: 'Grade A+',
      corridor: 'Sonipat → Azadpur Hub',
      corridorHi: 'सोनीपत → आज़ादपुर हब',
      destination: 'Azadpur Wholesale Hub, Delhi',
      deliveryWindow: 'Tomorrow · 6–10 AM',
      imageSrc: '/assets/produce/tomato.webp',
      visual: 'tomato',
      farmerFloorPerKg: 26,
      mandiPricePerKg: 22,
      buyerCeilingPerKg: 34,
      buyerCurrentPerKg: 38,
      platformFeePct: 0.02,
      routeDistanceKm: 54,
      vehicleId: 'VEH-02',
      regions: [{ id: 'reg_sonipat', name: 'Sonipat', district: 'Sonipat, Haryana' }],
      lots: [
        { id: 'lot_sonipat_1', farmer: 'Ramesh Kumar & Harpreet Singh', farm: 'Sonipat Cluster Farms', location: 'Murthal & Gannaur, Sonipat', offeredKg: 1200, detourKm: 2, regionId: 'reg_sonipat', regionName: 'Sonipat', own: true },
      ],
      commitments: [
        { id: 'mmc_sonipat_bulk1', source: 'bulk', party: 'FreshKart Foods', detail: 'Sonipat Procurement Pool', quantityKg: 300, committedAt: iso(-1) },
        { id: 'mmc_sonipat_cons1', source: 'consumer', party: 'Delhi Sector 12 Pool', detail: 'Sonipat Tomatoes & Onions Pool', quantityKg: 200, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_sonipat_tomato',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/tomato.webp',
          visual: 'tomato',
          farmerFloorPerKg: 28,
          mandiPricePerKg: 24,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_s_tom_1', farmer: 'Ramesh Kumar', farm: 'Green Field Farm', location: 'Murthal, Sonipat', offeredKg: 700, detourKm: 0, regionId: 'reg_sonipat', regionName: 'Sonipat', own: true },
          ],
          commitments: [
            { id: 'mmc_s_tom_1', source: 'bulk', party: 'FreshKart Foods', detail: 'Tomatoes for Retail', quantityKg: 180, committedAt: iso(-1) },
            { id: 'mmc_s_tom_2', source: 'consumer', party: 'Delhi Sector 12 Pool', detail: 'Tomatoes Pool', quantityKg: 120, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_sonipat_onion',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '/assets/produce/onion.webp',
          visual: 'onion',
          farmerFloorPerKg: 20,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 27,
          buyerCurrentPerKg: 30,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_s_oni_1', farmer: 'Harpreet Singh', farm: 'Sunehri Khet', location: 'Gannaur, Sonipat', offeredKg: 500, detourKm: 4, regionId: 'reg_sonipat', regionName: 'Sonipat' },
          ],
          commitments: [
            { id: 'mmc_s_oni_1', source: 'bulk', party: 'FreshKart Foods', detail: 'Onions Wholesale', quantityKg: 120, committedAt: iso(-1) },
            { id: 'mmc_s_oni_2', source: 'consumer', party: 'Community Pool', detail: 'Households Onions', quantityKg: 80, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_sonipat_potato',
          crop: 'Potatoes',
          cropHi: 'आलू',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/potato.webp',
          visual: 'potato',
          farmerFloorPerKg: 18,
          mandiPricePerKg: 14,
          buyerCeilingPerKg: 24,
          buyerCurrentPerKg: 27,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_s_pot_1', farmer: 'Jaipal Singh', farm: 'Jaipal Farm', location: 'Rai, Sonipat', offeredKg: 400, detourKm: 3, regionId: 'reg_sonipat', regionName: 'Sonipat' },
          ],
          commitments: [],
        },
      ],
    },
    {
      id: 'MM-GURGAON-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Gurgaon Fresh Produce Pool',
      cropHi: 'गुड़गांव ताज़ा उपज पूल',
      grade: 'Grade A+',
      corridor: 'Gurgaon → Gurgaon Hub',
      corridorHi: 'गुड़गांव → गुड़गांव हब',
      destination: 'Gurgaon NCR Buyer Hub',
      deliveryWindow: 'Tomorrow · 7–11 AM',
      imageSrc: '/assets/produce/onion.webp',
      visual: 'onion',
      farmerFloorPerKg: 21,
      mandiPricePerKg: 18,
      buyerCeilingPerKg: 29,
      buyerCurrentPerKg: 34,
      platformFeePct: 0.02,
      routeDistanceKm: 42,
      vehicleId: 'VEH-03',
      regions: [{ id: 'reg_gurgaon', name: 'Gurgaon', district: 'Gurugram, Haryana' }],
      lots: [
        { id: 'lot_gurgaon_1', farmer: 'Rajender Yadav', farm: 'Yadav Organic Farm', location: 'Sohna, Gurgaon', offeredKg: 900, detourKm: 3, regionId: 'reg_gurgaon', regionName: 'Gurgaon' },
      ],
      commitments: [
        { id: 'mmc_gurgaon_bulk1', source: 'bulk', party: 'CyberCity Fresh Hub', detail: 'Gurgaon Retail Procurement', quantityKg: 150, committedAt: iso(-1) },
        { id: 'mmc_gurgaon_cons1', source: 'consumer', party: 'DLF Phase 3 Pool', detail: 'Gurgaon Onions Group Buy', quantityKg: 100, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_gurgaon_onion',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/onion.webp',
          visual: 'onion',
          farmerFloorPerKg: 19,
          mandiPricePerKg: 18,
          buyerCeilingPerKg: 25,
          buyerCurrentPerKg: 32,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_g_oni_1', farmer: 'Rajender Yadav', farm: 'Yadav Organic Farm', location: 'Sohna, Gurgaon', offeredKg: 600, detourKm: 2, regionId: 'reg_gurgaon', regionName: 'Gurgaon' },
          ],
          commitments: [
            { id: 'mmc_g_oni_1', source: 'bulk', party: 'CyberCity Fresh Hub', detail: 'Onions Retail', quantityKg: 150, committedAt: iso(-1) },
            { id: 'mmc_g_oni_2', source: 'consumer', party: 'DLF Phase 3 Pool', detail: 'Household Onions', quantityKg: 100, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_gurgaon_tomato',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A',
          imageSrc: '/assets/produce/tomato.webp',
          visual: 'tomato',
          farmerFloorPerKg: 26,
          mandiPricePerKg: 22,
          buyerCeilingPerKg: 35,
          buyerCurrentPerKg: 38,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_g_tom_1', farmer: 'Mahesh Sharma', farm: 'Sharma Khet', location: 'Manesar, Gurgaon', offeredKg: 300, detourKm: 4, regionId: 'reg_gurgaon', regionName: 'Gurgaon' },
          ],
          commitments: [],
        },
        {
          id: 'seg_gurgaon_leafy',
          crop: 'Leafy Vegetables',
          cropHi: 'हरी पत्तेदार सब्जियां',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/spinach.webp',
          visual: 'leafy',
          farmerFloorPerKg: 30,
          mandiPricePerKg: 25,
          buyerCeilingPerKg: 40,
          buyerCurrentPerKg: 45,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_g_leaf_1', farmer: 'Brijesh Pal', farm: 'Green Greens Manesar', location: 'Manesar, Gurgaon', offeredKg: 200, detourKm: 5, regionId: 'reg_gurgaon', regionName: 'Gurgaon' },
          ],
          commitments: [],
        },
      ],
    },
    {
      id: 'MM-FARIDABAD-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Faridabad Farm Produce Pool',
      cropHi: 'फरीदाबाद कृषि उपज पूल',
      grade: 'Grade A',
      corridor: 'Faridabad → Okhla Hub',
      corridorHi: 'फरीदाबाद → ओखला हब',
      destination: 'Okhla / South-East Delhi Wholesale Hub',
      deliveryWindow: 'Tomorrow · 6–10 AM',
      imageSrc: '/assets/produce/potato.webp',
      visual: 'potato',
      farmerFloorPerKg: 17,
      mandiPricePerKg: 15,
      buyerCeilingPerKg: 24,
      buyerCurrentPerKg: 30,
      platformFeePct: 0.02,
      routeDistanceKm: 38,
      vehicleId: 'VEH-02',
      regions: [{ id: 'reg_faridabad', name: 'Faridabad', district: 'Faridabad, Haryana' }],
      lots: [
        { id: 'lot_faridabad_1', farmer: 'Devender Singh', farm: 'Ballabhgarh Farms', location: 'Ballabhgarh, Faridabad', offeredKg: 1100, detourKm: 3, regionId: 'reg_faridabad', regionName: 'Faridabad' },
      ],
      commitments: [
        { id: 'mmc_faridabad_bulk1', source: 'bulk', party: 'South Delhi Wholesale', detail: 'Faridabad Potato Pool', quantityKg: 200, committedAt: iso(-1) },
        { id: 'mmc_faridabad_cons1', source: 'consumer', party: 'Neelam Flyover Pool', detail: 'Household Potatoes', quantityKg: 150, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_faridabad_potato',
          crop: 'Potatoes',
          cropHi: 'आलू',
          grade: 'Grade A',
          imageSrc: '/assets/produce/potato.webp',
          visual: 'potato',
          farmerFloorPerKg: 16,
          mandiPricePerKg: 15,
          buyerCeilingPerKg: 24,
          buyerCurrentPerKg: 30,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_f_pot_1', farmer: 'Devender Singh', farm: 'Ballabhgarh Farms', location: 'Ballabhgarh, Faridabad', offeredKg: 700, detourKm: 2, regionId: 'reg_faridabad', regionName: 'Faridabad' },
          ],
          commitments: [
            { id: 'mmc_f_pot_1', source: 'bulk', party: 'South Delhi Wholesale', detail: 'Potatoes Retail', quantityKg: 200, committedAt: iso(-1) },
            { id: 'mmc_f_pot_2', source: 'consumer', party: 'Neelam Flyover Pool', detail: 'Household Potatoes', quantityKg: 150, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_faridabad_tomato',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A',
          imageSrc: '/assets/produce/tomato.webp',
          visual: 'tomato',
          farmerFloorPerKg: 27,
          mandiPricePerKg: 23,
          buyerCeilingPerKg: 36,
          buyerCurrentPerKg: 40,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [
            { id: 'lot_f_tom_1', farmer: 'Karan Singh', farm: 'Singh Green Plot', location: 'Palwal Border, Faridabad', offeredKg: 400, detourKm: 4, regionId: 'reg_faridabad', regionName: 'Faridabad' },
          ],
          commitments: [],
        },
      ],
    },
    {
      id: 'MM-ROHTAK-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Rohtak Grain & Vegetable Pool',
      cropHi: 'रोहतक अनाज और सब्जी पूल',
      grade: 'Grade A',
      corridor: 'Rohtak → Punjabi Bagh Hub',
      corridorHi: 'रोहतक → पंजाबी बाग हब',
      destination: 'Punjabi Bagh / West Delhi Hub',
      deliveryWindow: 'Tomorrow · 8–12 PM',
      imageSrc: '/assets/produce/wheat.webp',
      visual: 'grain',
      farmerFloorPerKg: 25,
      mandiPricePerKg: 20,
      buyerCeilingPerKg: 33,
      buyerCurrentPerKg: 37,
      platformFeePct: 0.02,
      routeDistanceKm: 72,
      vehicleId: 'VEH-01',
      regions: [{ id: 'reg_rohtak', name: 'Rohtak', district: 'Rohtak, Haryana' }],
      lots: [
        { id: 'lot_rohtak_1', farmer: 'Vikas Hooda', farm: 'Hooda Khet', location: 'Kalanaur, Rohtak', offeredKg: 750, detourKm: 5, regionId: 'reg_rohtak', regionName: 'Rohtak' },
      ],
      commitments: [
        { id: 'mmc_rohtak_bulk1', source: 'bulk', party: 'West Delhi Wholesale', detail: 'Wheat & Tomato Pool', quantityKg: 120, committedAt: iso(-1) },
        { id: 'mmc_rohtak_cons1', source: 'consumer', party: 'Paschim Vihar Pool', detail: 'Grain Group Buy', quantityKg: 80, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_rohtak_tomato',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A',
          imageSrc: '/assets/produce/tomato.webp',
          visual: 'tomato',
          farmerFloorPerKg: 27,
          mandiPricePerKg: 22,
          buyerCeilingPerKg: 35,
          buyerCurrentPerKg: 39,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'lot_r_tom_1', farmer: 'Vikas Hooda', farm: 'Hooda Khet', location: 'Kalanaur, Rohtak', offeredKg: 350, detourKm: 4, regionId: 'reg_rohtak', regionName: 'Rohtak' }],
          commitments: [{ id: 'mmc_r_tom_1', source: 'bulk', party: 'West Delhi Wholesale', detail: 'Tomatoes', quantityKg: 120, committedAt: iso(-1) }],
        },
        {
          id: 'seg_rohtak_wheat',
          crop: 'Wheat',
          cropHi: 'गेहूं',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/wheat.webp',
          visual: 'grain',
          farmerFloorPerKg: 24,
          mandiPricePerKg: 20,
          buyerCeilingPerKg: 31,
          buyerCurrentPerKg: 35,
          platformFeePct: 0.02,
          storageType: 'dry',
          lots: [{ id: 'lot_r_wht_1', farmer: 'Kuldeep Hooda', farm: 'Rohtak Grain Farm', location: 'Sampla, Rohtak', offeredKg: 400, detourKm: 3, regionId: 'reg_rohtak', regionName: 'Rohtak' }],
          commitments: [{ id: 'mmc_r_wht_1', source: 'consumer', party: 'Paschim Vihar Pool', detail: 'Household Wheat', quantityKg: 80, committedAt: iso(0) }],
        },
      ],
    },
    {
      id: 'MM-MEERUT-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Meerut Western UP Produce Pool',
      cropHi: 'मेरठ पश्चिमी यूपी उपज पूल',
      grade: 'Grade A+',
      corridor: 'Meerut → Ghazipur Hub',
      corridorHi: 'मेरठ → गाज़ीपुर हब',
      destination: 'Ghazipur / East Delhi Hub',
      deliveryWindow: 'Tomorrow · 5–9 AM',
      imageSrc: '/assets/produce/potato.webp',
      visual: 'root',
      farmerFloorPerKg: 17,
      mandiPricePerKg: 14,
      buyerCeilingPerKg: 23,
      buyerCurrentPerKg: 26,
      platformFeePct: 0.02,
      routeDistanceKm: 68,
      vehicleId: 'VEH-02',
      regions: [{ id: 'reg_meerut', name: 'Meerut', district: 'Meerut, UP' }],
      lots: [
        { id: 'lot_meerut_1', farmer: 'Satish Verma & Amit Tyagi', farm: 'Meerut Belt Farms', location: 'Hastinapur & Sardhana, Meerut', offeredKg: 1500, detourKm: 6, regionId: 'reg_meerut', regionName: 'Meerut' },
      ],
      commitments: [
        { id: 'mmc_meerut_bulk1', source: 'bulk', party: 'Ghazipur Mandi Buyer', detail: 'Meerut Potato & Onion Bulk', quantityKg: 120, committedAt: iso(-1) },
        { id: 'mmc_meerut_cons1', source: 'consumer', party: 'Mayur Vihar Pool', detail: 'East Delhi Pool', quantityKg: 80, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_meerut_potato',
          crop: 'Potatoes',
          cropHi: 'आलू',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/potato.webp',
          visual: 'potato',
          farmerFloorPerKg: 16,
          mandiPricePerKg: 13,
          buyerCeilingPerKg: 22,
          buyerCurrentPerKg: 25,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'lot_m_pot_1', farmer: 'Satish Verma', farm: 'Verma Farm', location: 'Hastinapur, Meerut', offeredKg: 800, detourKm: 5, regionId: 'reg_meerut', regionName: 'Meerut' }],
          commitments: [
            { id: 'mmc_m_pot_1', source: 'bulk', party: 'Ghazipur Mandi Buyer', detail: 'Potatoes Bulk', quantityKg: 80, committedAt: iso(-1) },
            { id: 'mmc_m_pot_2', source: 'consumer', party: 'Mayur Vihar Pool', detail: 'Potatoes Consumer', quantityKg: 40, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_meerut_onion',
          crop: 'Onions',
          cropHi: 'प्याज़',
          grade: 'Grade A',
          imageSrc: '/assets/produce/onion.webp',
          visual: 'onion',
          farmerFloorPerKg: 19,
          mandiPricePerKg: 16,
          buyerCeilingPerKg: 26,
          buyerCurrentPerKg: 29,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'lot_m_oni_1', farmer: 'Amit Tyagi', farm: 'Tyagi Agro', location: 'Sardhana, Meerut', offeredKg: 700, detourKm: 6, regionId: 'reg_meerut', regionName: 'Meerut' }],
          commitments: [
            { id: 'mmc_m_oni_1', source: 'bulk', party: 'Ghazipur Mandi Buyer', detail: 'Onions Bulk', quantityKg: 40, committedAt: iso(-1) },
            { id: 'mmc_m_oni_2', source: 'consumer', party: 'Mayur Vihar Pool', detail: 'Onions Consumer', quantityKg: 40, committedAt: iso(0) },
          ],
        },
      ],
    },
    {
      id: 'MM-GHAZIABAD-001',
      isMultiCrop: true,
      isMultiRegion: false,
      crop: 'Ghaziabad NCR Express Pool',
      cropHi: 'गाज़ियाबाद एनसीआर एक्सप्रेस पूल',
      grade: 'Grade A+',
      corridor: 'Ghaziabad → Sahibabad Hub',
      corridorHi: 'गाज़ियाबाद → साहिबाबाद हब',
      destination: 'Sahibabad / East Delhi Distribution Hub',
      deliveryWindow: 'Tomorrow · 6–9 AM',
      imageSrc: '/assets/produce/spinach.webp',
      visual: 'leafy',
      farmerFloorPerKg: 32,
      mandiPricePerKg: 26,
      buyerCeilingPerKg: 41,
      buyerCurrentPerKg: 46,
      platformFeePct: 0.02,
      routeDistanceKm: 28,
      vehicleId: 'VEH-04',
      regions: [{ id: 'reg_ghaziabad', name: 'Ghaziabad', district: 'Ghaziabad, UP' }],
      lots: [
        { id: 'lot_ghaziabad_1', farmer: 'Sunil Gurjar & Rekha Sharma', farm: 'NCR East Plots', location: 'Loni & Muradnagar, Ghaziabad', offeredKg: 800, detourKm: 4, regionId: 'reg_ghaziabad', regionName: 'Ghaziabad' },
      ],
      commitments: [
        { id: 'mmc_ghaziabad_bulk1', source: 'bulk', party: 'Indirapuram Retail Hub', detail: 'Fresh Greens Bulk', quantityKg: 70, committedAt: iso(-1) },
        { id: 'mmc_ghaziabad_cons1', source: 'consumer', party: 'Vasundhara Pool', detail: 'Leafy Veg Group Buy', quantityKg: 50, committedAt: iso(0) },
      ],
      status: 'forming',
      createdAt: iso(-2),
      crops: [
        {
          id: 'seg_ghaziabad_leafy',
          crop: 'Leafy Vegetables',
          cropHi: 'हरी पत्तेदार सब्जियां',
          grade: 'Grade A+',
          imageSrc: '/assets/produce/spinach.webp',
          visual: 'leafy',
          farmerFloorPerKg: 32,
          mandiPricePerKg: 26,
          buyerCeilingPerKg: 41,
          buyerCurrentPerKg: 46,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'lot_gh_leaf_1', farmer: 'Sunil Gurjar', farm: 'Gurjar Plot', location: 'Loni, Ghaziabad', offeredKg: 450, detourKm: 3, regionId: 'reg_ghaziabad', regionName: 'Ghaziabad' }],
          commitments: [
            { id: 'mmc_gh_leaf_1', source: 'bulk', party: 'Indirapuram Retail Hub', detail: 'Leafy Greens', quantityKg: 50, committedAt: iso(-1) },
            { id: 'mmc_gh_leaf_2', source: 'consumer', party: 'Vasundhara Pool', detail: 'Leafy Greens', quantityKg: 35, committedAt: iso(0) },
          ],
        },
        {
          id: 'seg_ghaziabad_tomato',
          crop: 'Tomatoes',
          cropHi: 'टमाटर',
          grade: 'Grade A',
          imageSrc: '/assets/produce/tomato.webp',
          visual: 'tomato',
          farmerFloorPerKg: 27,
          mandiPricePerKg: 23,
          buyerCeilingPerKg: 35,
          buyerCurrentPerKg: 39,
          platformFeePct: 0.02,
          storageType: 'ambient',
          lots: [{ id: 'lot_gh_tom_1', farmer: 'Rekha Sharma', farm: 'Sharma Farm', location: 'Murdadnagar, Ghaziabad', offeredKg: 350, detourKm: 4, regionId: 'reg_ghaziabad', regionName: 'Ghaziabad' }],
          commitments: [
            { id: 'mmc_gh_tom_1', source: 'bulk', party: 'Indirapuram Retail Hub', detail: 'Tomatoes', quantityKg: 40, committedAt: iso(-1) },
            { id: 'mmc_gh_tom_2', source: 'consumer', party: 'Vasundhara Pool', detail: 'Tomatoes', quantityKg: 40, committedAt: iso(0) },
          ],
        },
      ],
    },
  ],
}

const cloneSeed = () => JSON.parse(JSON.stringify(seedState)) as PrototypeState
const normalize = (value: Partial<PrototypeState>): PrototypeState => {
  const base = cloneSeed()
  const state: PrototypeState = {
    ...base,
    ...value,
    consumerProfile: value.consumerProfile?.addresses ? value.consumerProfile : base.consumerProfile,
    bulkProfile: value.bulkProfile?.businessName ? value.bulkProfile : base.bulkProfile,
    // A payload that predates a Market Maker seed board must top-up missing seed markets
    // by ID rather than hiding new multi-crop corridors or losing user's existing commitments.
    markets: value.markets?.length
      ? [...value.markets.map((m) => m.id === 'MM-MULTI-SONIPAT' ? { ...m, id: 'MM-SONIPAT-001' } : m), ...base.markets.filter((market) => !value.markets!.some((item) => item.id === market.id || (item.id === 'MM-MULTI-SONIPAT' && market.id === 'MM-SONIPAT-001')))]
      : base.markets,
    // The corridor vehicle is part of feasibility, so an older fleet payload is topped up
    // rather than silently leaving the market with nothing to quote against.
    vehicles: value.vehicles?.length
      ? [...value.vehicles, ...base.vehicles.filter((vehicle) => !value.vehicles!.some((item) => item.id === vehicle.id))]
      : base.vehicles,
  }

  // Normalize Market Maker boards:
  // 1. Sync updated seed titles/corridors
  // 2. Ensure total commitments DO NOT exceed break-even threshold (thresholdKg)
  state.markets.forEach((board) => {
    if (board.id === 'MM-MULTI-SONIPAT') {
      board.id = 'MM-SONIPAT-001'
    }
    if (board.id === 'MM-SONIPAT-001') {
      const baseSonipat = base.markets.find((m) => m.id === 'MM-SONIPAT-001')
      if (baseSonipat) {
        board.crop = baseSonipat.crop
        board.cropHi = baseSonipat.cropHi
        board.corridor = baseSonipat.corridor
        board.corridorHi = baseSonipat.corridorHi
        board.destination = baseSonipat.destination
      }
    }

    const math = evaluateMarket(board, state.listings, state.vehicles)
    if (math.committedKg > math.thresholdKg && Number.isFinite(math.thresholdKg) && math.thresholdKg > 0) {
      const scale = math.thresholdKg / math.committedKg
      board.commitments.forEach((c) => {
        c.quantityKg = Math.max(1, Math.floor(c.quantityKg * scale))
      })
      let curSum = board.commitments.reduce((sum, c) => sum + c.quantityKg, 0)
      while (curSum > math.thresholdKg) {
        const reducible = board.commitments.find((c) => c.quantityKg > 1)
        if (!reducible) break
        reducible.quantityKg -= 1
        curSum -= 1
      }
      if (board.crops) {
        board.crops.forEach((c) => {
          c.commitments.forEach((item) => {
            item.quantityKg = Math.max(1, Math.floor(item.quantityKg * scale))
          })
        })
      }
    }
  })
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

async function readState() {
  try { const remote = normalize(await api<PrototypeState>('/state')); writeLocal(remote); return remote } catch { return readLocal() }
}
async function persist(state: PrototypeState) {
  const synchronized = normalize(state)
  writeLocal(synchronized)
  try { return await api<PrototypeState>('/state', { method: 'PUT', body: JSON.stringify(synchronized) }) } catch { return synchronized }
}

/**
 * The canonical backend only knows about rows it created. Anything the prototype itself wrote
 * into shared state — a Market Maker order, its earning, its pickup — has no Postgres row, so
 * taking the canonical list verbatim would silently hide it. Merging by id keeps the canonical
 * records authoritative while local-only records stay visible.
 */
const mergeLocalOnly = <T extends { id: string }>(canonical: T[], local: T[]): T[] => {
  const known = new Set(canonical.map((item) => item.id))
  return [...local.filter((item) => !known.has(item.id)), ...canonical]
}

export const prototypeService = {
  getState: readState,
  async replaceState(state: PrototypeState) { return persist(state) },
  async getListings() {
    try {
      const canonical = await apiClient.getListings()
      if (canonical && canonical.length > 0) return canonical
    } catch (e) {
      console.warn('Backend listings fallback:', e)
    }
    return (await readState()).listings
  },
  async getListing(id: string) {
    try {
      const canonical = await apiClient.getListing(id)
      if (canonical) return canonical
    } catch (e) {
      console.warn('Backend listing fallback:', e)
    }
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
    try {
      const canonical = await apiClient.getMyOrders('farmer')
      if (canonical && canonical.length > 0) return mergeLocalOnly(canonical, (await readState()).orders)
    } catch (e) {
      console.warn('Backend orders fallback:', e)
    }
    return (await readState()).orders
  },
  async getOrder(id: string) {
    try {
      const canonical = await apiClient.getMyOrders('farmer')
      const live = canonical.find((item) => item.id === id || item.db_id === id)
      if (live) return live
    } catch (e) {
      console.warn('Backend order detail fallback:', e)
    }
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
    try {
      const canonical = await apiClient.getFarmerPickups()
      if (canonical && canonical.length > 0) return mergeLocalOnly(canonical, (await readState()).pickups)
    } catch (e) {
      console.warn('Backend pickups fallback:', e)
    }
    return (await readState()).pickups
  },
  async getEarnings() {
    try {
      const canonical = await apiClient.getFarmerEarnings()
      if (canonical && canonical.length > 0) return mergeLocalOnly(canonical, (await readState()).earnings)
    } catch (e) {
      console.warn('Backend earnings fallback:', e)
    }
    return (await readState()).earnings
  },
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
    if (scenario === 'issue') { state.logisticsPickups[0].status = 'issue'; state.logisticsPickups[0].notes = 'Crate count differs from manifest by 2.'; state.deliveries[0].status = 'issue'; state.deliveries[0].issues = ['Traffic delay near Kundli · ETA +25 min']; state.notifications.unshift({ id: 'note-logistics-issue', role: 'logistics', title: 'Priority issue requires action', titleHi: 'ज़रूरी समस्या पर कार्रवाई चाहिए', body: 'PK-2048 crate count needs verification.', bodyHi: 'PK-2048 के क्रेट की संख्या जांचें।', timestamp: new Date().toISOString(), read: false, href: '/logistics/pickups/PK-2048' }) }
    await persist(normalize(state)); return state
  },
}
