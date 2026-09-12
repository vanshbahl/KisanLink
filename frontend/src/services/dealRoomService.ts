import { prototypeService } from './prototypeService'
import type { Delivery, FarmerOrder, LogisticsPickup } from '../types'

export interface DealRoomConditions {
  afternoonDelivery: boolean
  sharedTransport: boolean
  volumeTolerance: boolean
}

export interface DealEvaluationResult {
  isFeasible: boolean
  status: 'INFEASIBLE' | 'FEASIBLE' | 'CONFIRMED'
  farmerPricePerKg: number
  buyerMaxPricePerKg: number
  logisticsCostPerKg: number
  deliveredPricePerKg: number
  priceGapPerKg: number
  quantityKg: number
  cropName: string
  cropHi: string
  farmerName: string
  buyerName: string
  deliveryWindow: string
  transportMode: string
  whatChanged: {
    deliveryWindow: string
    transportMode: string
    logisticsSavings: string
    farmerProtection: string
  }
  candidateCombinationsEvaluated: number
  solverNotes: string[]
}

export interface DealRoomState {
  dealId: string
  cropName: string
  cropHi: string
  quantityKg: number
  farmerMinimumPrice: number
  buyerMaxDeliveredPrice: number
  currentDeliveredCost: number
  conditions: DealRoomConditions
  farmerAccepted: boolean
  buyerAccepted: boolean
  confirmedAt?: string
  status: 'INFEASIBLE' | 'FEASIBLE' | 'CONFIRMED'
}

const INITIAL_DEAL_STATE: DealRoomState = {
  dealId: 'DEAL-2026-MUR01',
  cropName: 'Fresh Tomatoes (Grade A+)',
  cropHi: 'ताज़े टमाटर (ग्रेड A+)',
  quantityKg: 500,
  farmerMinimumPrice: 28, // Hard protected constraint
  buyerMaxDeliveredPrice: 30, // Buyer ceiling
  currentDeliveredCost: 32, // Farmer 28 + Logistics 4 = 32
  conditions: {
    afternoonDelivery: false,
    sharedTransport: false,
    volumeTolerance: false,
  },
  farmerAccepted: false,
  buyerAccepted: false,
  status: 'INFEASIBLE',
}

const STORAGE_KEY = 'kisanlink_deal_room_state_v1'

class DealRoomService {
  private state: DealRoomState

  constructor() {
    this.state = this.loadState()
  }

  private loadState(): DealRoomState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }
    return { ...INITIAL_DEAL_STATE }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kisanlink:dealroom_updated', { detail: this.state }))
    }
  }

  getState(): DealRoomState {
    return { ...this.state }
  }

  resetDemoScenario() {
    this.state = { ...INITIAL_DEAL_STATE, conditions: { afternoonDelivery: false, sharedTransport: false, volumeTolerance: false }, farmerAccepted: false, buyerAccepted: false, status: 'INFEASIBLE' }
    this.saveState()
    return this.getState()
  }

  updateConditions(conditions: Partial<DealRoomConditions>): DealRoomState {
    this.state.conditions = { ...this.state.conditions, ...conditions }
    const evalResult = this.evaluate(this.state.conditions)
    this.state.status = evalResult.status
    this.state.currentDeliveredCost = evalResult.deliveredPricePerKg
    if (!evalResult.isFeasible) {
      this.state.farmerAccepted = false
      this.state.buyerAccepted = false
    }
    this.saveState()
    return this.getState()
  }

  /**
   * Deterministic Deal Room Solver:
   * Evaluates flexible conditions while keeping the Farmer Minimum strictly locked.
   */
  evaluate(conditions: DealRoomConditions): DealEvaluationResult {
    const farmerPrice = this.state.farmerMinimumPrice // STRICTLY PROTECTED: NEVER LOWERED
    const buyerMax = this.state.buyerMaxDeliveredPrice
    let logisticsCost = 4.0 // Dedicated morning freight base rate

    if (conditions.sharedTransport && conditions.afternoonDelivery) {
      logisticsCost = 2.0 // Pooled corridor transport in off-peak afternoon slot
    } else if (conditions.sharedTransport) {
      logisticsCost = 2.5 // Pooled corridor transport during morning slot
    } else if (conditions.afternoonDelivery) {
      logisticsCost = 3.0 // Dedicated transport in off-peak afternoon slot
    }

    const deliveredCost = farmerPrice + logisticsCost
    const priceGap = deliveredCost - buyerMax
    const isFeasible = deliveredCost <= buyerMax

    const deliveryWindow = conditions.afternoonDelivery
      ? 'Afternoon Window · 1–4 PM (Flexible)'
      : 'Morning Peak · 7–10 AM (Dedicated)'

    const transportMode = conditions.sharedTransport
      ? 'Pooled Corridor Logistics (Shared Truck)'
      : 'Dedicated Vehicle Dispatch'

    const solverNotes: string[] = [
      `Farmer minimum protected at ₹${farmerPrice}/kg (Locked Invariant: ₹0 reduction)`,
      `Buyer maximum delivered ceiling: ₹${buyerMax}/kg`,
      conditions.sharedTransport
        ? 'Shared transport corridor enabled: Freight reduced by ₹2.0/kg'
        : 'Dedicated direct freight: ₹4.0/kg baseline',
      conditions.afternoonDelivery
        ? 'Flexible afternoon window accepted: Frees up corridor route capacity'
        : 'Morning peak window requested',
      isFeasible
        ? `Feasible transaction unlocked: ₹${deliveredCost}/kg delivered fits buyer ceiling of ₹${buyerMax}/kg`
        : `Deficit of ₹${priceGap.toFixed(1)}/kg: Enable flexible conditions to bridge gap without reducing farmer earnings`,
    ]

    return {
      isFeasible,
      status: this.state.status === 'CONFIRMED' ? 'CONFIRMED' : isFeasible ? 'FEASIBLE' : 'INFEASIBLE',
      farmerPricePerKg: farmerPrice,
      buyerMaxPricePerKg: buyerMax,
      logisticsCostPerKg: logisticsCost,
      deliveredPricePerKg: deliveredCost,
      priceGapPerKg: Math.max(0, priceGap),
      quantityKg: this.state.quantityKg,
      cropName: this.state.cropName,
      cropHi: this.state.cropHi,
      farmerName: 'Ramesh Kumar (Murthal Plot)',
      buyerName: 'FreshKart Procurement (Okhla Hub)',
      deliveryWindow,
      transportMode,
      whatChanged: {
        deliveryWindow: conditions.afternoonDelivery ? 'Morning (7–10 AM) → Afternoon (1–4 PM)' : 'Morning (Unchanged)',
        transportMode: conditions.sharedTransport ? 'Dedicated Van → Pooled Corridor Logistics' : 'Dedicated (Unchanged)',
        logisticsSavings: conditions.sharedTransport || conditions.afternoonDelivery
          ? `₹4.0/kg → ₹${logisticsCost.toFixed(1)}/kg (₹${(4.0 - logisticsCost).toFixed(1)}/kg saved)`
          : '₹0 (Standard Rate)',
        farmerProtection: `🔒 Protected at ₹${farmerPrice}/kg (Zero farmer concessions)`,
      },
      candidateCombinationsEvaluated: 8,
      solverNotes,
    }
  }

  async setPartyAcceptance(party: 'farmer' | 'buyer', accepted: boolean): Promise<DealRoomState> {
    if (party === 'farmer') {
      this.state.farmerAccepted = accepted
    } else {
      this.state.buyerAccepted = accepted
    }

    if (this.state.farmerAccepted && this.state.buyerAccepted) {
      this.state.status = 'CONFIRMED'
      this.state.confirmedAt = new Date().toISOString()
      await this.syncDealToSharedState()
    } else {
      const evalResult = this.evaluate(this.state.conditions)
      this.state.status = evalResult.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'
    }

    this.saveState()
    return this.getState()
  }

  /**
   * Synchronizes confirmed deal into prototype orders, pickups, and deliveries
   */
  private async syncDealToSharedState() {
    try {
      const evalResult = this.evaluate(this.state.conditions)
      const now = new Date()
      const todayIso = now.toISOString().slice(0, 10)

      // Create Confirmed Farmer Order
      const newOrder: FarmerOrder = {
        id: `ORD-DEAL-${now.getFullYear()}-01`,
        buyerName: 'FreshKart Procurement',
        buyerType: 'Bulk Buyer',
        crop: this.state.cropName,
        cropHi: this.state.cropHi,
        listingId: 'listing_001',
        quantityKg: this.state.quantityKg,
        ratePerKg: evalResult.farmerPricePerKg,
        total: evalResult.farmerPricePerKg * this.state.quantityKg,
        farmerPayout: evalResult.farmerPricePerKg * this.state.quantityKg,
        platformFee: Math.round(evalResult.farmerPricePerKg * this.state.quantityKg * 0.02),
        logisticsFee: Math.round(evalResult.logisticsCostPerKg * this.state.quantityKg),
        orderedAt: todayIso,
        status: 'accepted',
        paymentStatus: 'paid',
        pickupId: `PK-DEAL-01`,
      }

      // Create Logistics Pickup
      const newPickup: LogisticsPickup = {
        id: `PK-DEAL-01`,
        farmer: 'Ramesh Kumar',
        farm: 'Green Field Farm',
        farmLocation: 'Murthal, Sonipat, Haryana',
        crop: this.state.cropName,
        cropHi: this.state.cropHi,
        quantityKg: this.state.quantityKg,
        pickupWindow: evalResult.deliveryWindow,
        orderRefs: [newOrder.id],
        vehicleId: 'VEH-02',
        driver: 'Imran Khan',
        status: 'assigned',
        notes: `Smart Deal Room Transaction #${this.state.dealId} · Shared Corridor Pooled Dispatch`,
        routeId: 'RTE-POOL-01',
        otp: '739104',
        checklist: {
          arrived: false,
          quantityVerified: true,
          qualityChecked: true,
          loadSecured: true,
          pickupCompleted: false,
        },
        timeline: [
          { label: 'Deal confirmed in Deal Room', labelHi: 'डील रूम में सौदा पक्का हुआ', at: now.toISOString() },
          { label: 'Pooled corridor pickup scheduled', labelHi: 'साझा कॉरिडोर पिकअप तय हुआ', at: now.toISOString() },
        ],
      }

      // Create Delivery Record
      const newDelivery: Delivery = {
        id: `DLV-DEAL-01`,
        origin: 'KisanLink Sonipat Hub',
        destination: 'FreshKart Okhla Distribution Centre, New Delhi',
        buyer: 'FreshKart Foods Pvt. Ltd.',
        buyerType: 'Bulk Buyer',
        shipment: `Deal Room Lot #${this.state.dealId}`,
        produce: this.state.cropName,
        produceHi: this.state.cropHi,
        quantityKg: this.state.quantityKg,
        eta: todayIso,
        vehicleId: 'VEH-02',
        orderRefs: [newOrder.id],
        status: 'scheduled',
        handlingNotes: 'Smart Deal Room agreed terms · Verified farmer minimum guaranteed.',
        issues: [],
        otp: '654321',
        timeline: [
          { label: 'Delivery generated from Deal Room', labelHi: 'डील रूम से डिलीवरी बनी', at: now.toISOString() },
        ],
      }

      const pState = await prototypeService.getState()
      const updatedOrders = [newOrder, ...pState.orders.filter((o) => o.id !== newOrder.id)]
      const updatedPickups = [newPickup, ...pState.logisticsPickups.filter((p) => p.id !== newPickup.id)]
      const updatedDeliveries = [newDelivery, ...pState.deliveries.filter((d) => d.id !== newDelivery.id)]

      await prototypeService.replaceState({
        ...pState,
        orders: updatedOrders,
        logisticsPickups: updatedPickups,
        deliveries: updatedDeliveries,
      })
    } catch (err) {
      console.warn('[DealRoomService] Could not sync deal to prototype service:', err)
    }
  }
}

export const dealRoomService = new DealRoomService()
