import type {
  BulkOrder,
  BulkRfq,
  FarmerListing,
  FarmerOrder,
  OrderStatus,
  Pickup,
  EarningsTransaction,
  SupplyContribution,
  Role,
  PaymentsLedgerEntry,
  Review,
  Dispute,
  OperatorAuditLog,
} from '../types'

const API_BASE = '/api/v1'

const HINDI_CROP_NAMES: Record<string, string> = {
  tomato: 'टमाटर', tomatoes: 'टमाटर', 'fresh tomatoes': 'ताज़े टमाटर',
  spinach: 'पालक', 'baby spinach': 'बेबी पालक', onion: 'प्याज', potato: 'आलू', potatoes: 'आलू', 'new potatoes': 'नए आलू',
  cauliflower: 'फूलगोभी', capsicum: 'शिमला मिर्च', 'green capsicum': 'हरी शिमला मिर्च', carrot: 'गाजर', carrots: 'गाजर', 'sweet carrots': 'मीठी गाजर',
  cucumber: 'खीरा', cucumbers: 'खीरा', wheat: 'गेहूं', 'sharbati wheat': 'शरबती गेहूं', rice: 'चावल', 'basmati rice': 'बासमती चावल',
  apple: 'सेब', apples: 'सेब', mustard: 'सरसों', 'yellow mustard': 'पीली सरसों',
}

function cropNameHi(name: string, supplied?: unknown): string {
  if (typeof supplied === 'string' && /[\u0900-\u097F]/.test(supplied)) return supplied
  return HINDI_CROP_NAMES[name.trim().toLowerCase()] ?? name
}

const ROLE_PHONE_MAP: Record<string, { phone: string; preferred_role: string }> = {
  farmer: { phone: '+919876543210', preferred_role: 'FARMER' },
  bulk: { phone: '+919899001122', preferred_role: 'BUYER' },
  consumer: { phone: '+919811122233', preferred_role: 'BUYER' },
  operator: { phone: '+919800011122', preferred_role: 'OPERATOR_PROXY' },
}

class ApiClient {
  private tokenCache: Record<string, string> = {}

  async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/v1/intelligence/impact-summary', { method: 'GET', signal: AbortSignal.timeout(1500) })
      return res.ok
    } catch {
      return false
    }
  }

  private async ensureToken(role: 'farmer' | 'consumer' | 'bulk' | 'operator' = 'farmer'): Promise<string> {
    const cached = this.tokenCache[role] || localStorage.getItem(`kisanlink_jwt_${role}`)
    if (cached) {
      this.tokenCache[role] = cached
      return cached
    }

    const cfg = ROLE_PHONE_MAP[role] || ROLE_PHONE_MAP.farmer
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cfg.phone,
          otp: '123456',
          preferred_role: cfg.preferred_role,
        }),
      })
      if (!res.ok) {
        throw new Error(`Auth failed with status ${res.status}`)
      }
      const data = await res.json()
      const token = data.data?.access_token
      if (token) {
        this.tokenCache[role] = token
        localStorage.setItem(`kisanlink_jwt_${role}`, token)
        return token
      }
    } catch (err) {
      console.warn(`Could not authenticate role ${role}, proceeding without token:`, err)
    }
    return ''
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    role: 'farmer' | 'consumer' | 'bulk' | 'operator' = 'farmer'
  ): Promise<T> {
    const token = await this.ensureToken(role)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      let detail = `Request failed: ${res.status}`
      try {
        const errJson = await res.json()
        detail = errJson.detail || detail
      } catch {
        // use default detail
      }
      throw new Error(detail)
    }

    if (res.status === 204) {
      return {} as T
    }

    return (await res.json()) as T
  }

  // --- Listings API ---
  async getListings(params?: { crop?: string; status?: string }): Promise<FarmerListing[]> {
    const q = new URLSearchParams()
    if (params?.crop) q.set('crop', params.crop)
    if (params?.status) q.set('status', params.status)
    const raw = await this.request<any[]>(`/listings?${q.toString()}`, {}, 'farmer')
    return raw.map((item) => this.mapBackendListing(item))
  }

  async getListing(id: string): Promise<FarmerListing | null> {
    try {
      const raw = await this.request<any>(`/listings/${id}`, {}, 'farmer')
      return this.mapBackendListing(raw)
    } catch {
      return null
    }
  }

  async createListing(listing: Partial<FarmerListing>): Promise<FarmerListing> {
    const payload = {
      crop_name: listing.crop || 'Tomato',
      crop_name_hi: listing.cropHi || listing.crop,
      category: listing.category || 'Vegetables',
      variety: listing.farmingMethod || 'Desi',
      quantity_kg: listing.quantityKg || 100,
      expected_price_per_kg: listing.pricePerKg || 30,
      quality_grade: listing.grade === 'Grade A+' ? 'GRADE_A' : 'GRADE_A',
      is_pre_harvest: false,
      harvest_date: listing.harvestDate || new Date().toISOString().slice(0, 10),
      photos: listing.imageSrc ? [listing.imageSrc] : [],
    }
    const raw = await this.request<any>('/listings', { method: 'POST', body: JSON.stringify(payload) }, 'farmer')
    return this.mapBackendListing(raw)
  }

  async updateListing(id: string, patch: Partial<FarmerListing>): Promise<FarmerListing> {
    const payload: Record<string, any> = {}
    if (patch.quantityKg !== undefined) payload.quantity_kg = patch.quantityKg
    if (patch.remainingKg !== undefined) payload.available_quantity_kg = patch.remainingKg
    if (patch.pricePerKg !== undefined) payload.expected_price_per_kg = patch.pricePerKg
    if (patch.status) {
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        sold: 'SOLD',
        draft: 'ACTIVE',
        unavailable: 'CANCELLED',
      }
      payload.status = statusMap[patch.status] || 'ACTIVE'
    }
    const raw = await this.request<any>(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, 'farmer')
    return this.mapBackendListing(raw)
  }

  async deleteListing(id: string): Promise<void> {
    await this.request(`/listings/${id}`, { method: 'DELETE' }, 'farmer')
  }

  // --- Wastage Rescue API ---
  async tagUrgentRescue(listingId: string, urgencyLevel: string = 'HIGH'): Promise<{
    listing_id: string
    is_urgent_rescue: boolean
    normal_price_per_kg: number
    rescue_price_per_kg: number
    discount_percentage: number
    status: string
  }> {
    return this.request(
      '/rescue/tag-urgent',
      {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId, urgency_level: urgencyLevel }),
      },
      'farmer'
    )
  }

  // --- Voice NLP Listing Parser API ---
  async parseVoiceListing(
    transcript: string,
    language: string = 'hi'
  ): Promise<{
    crop_name?: string | null
    crop_name_hi?: string
    category?: string
    quantity_kg?: number | null
    unit?: string
    price_per_kg?: number | null
    pickup_location?: string | null
    availability_date?: string | null
    harvest_date?: string | null
    pickup_date?: string | null
    pickup_window?: string | null
    fulfillment?: 'pickup' | 'self_delivery' | string | null
    notes?: string | null
    confidence_score?: number
    missing_fields?: string[]
    ai_used?: boolean
    warning?: string | null
  }> {

    const response = await fetch(`${API_BASE}/listings/parse-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, language }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const detail =
        payload.detail ||
        (response.status === 500
          ? 'Server parsing error. Please check backend connection or type details manually.'
          : `Voice analysis failed: ${response.status}`)
      throw new Error(detail)
    }
    return response.json()

  }

  // --- Logistics & Route Optimization API ---
  async getShipments(): Promise<any[]> {
    return this.request<any[]>('/logistics/shipments', {}, 'farmer')
  }

  async getShipment(id: string): Promise<any> {
    return this.request<any>(`/logistics/shipments/${id}`, {}, 'farmer')
  }

  async optimizeRoute(orderIds?: string[], vehicleCapacityKg: number = 1500): Promise<any> {
    return this.request<any>(
      '/logistics/routes/optimize',
      { method: 'POST', body: JSON.stringify({ order_ids: orderIds, vehicle_capacity_kg: vehicleCapacityKg }) },
      'farmer'
    )
  }

  async verifyPickupOtp(otp: string, allocationId?: string): Promise<{ success: boolean; message: string }> {
    return this.request(
      '/logistics/pickups/verify-otp',
      { method: 'POST', body: JSON.stringify({ otp, allocation_id: allocationId }) },
      'farmer'
    )
  }

  async verifyDeliveryOtp(orderId: string, otp: string): Promise<{ success: boolean; message: string }> {
    return this.request(
      '/logistics/deliveries/verify-otp',
      { method: 'POST', body: JSON.stringify({ order_id: orderId, otp }) },
      'farmer'
    )
  }

  async updateShipmentStatus(shipmentId: string, statusValue: string): Promise<any> {
    return this.request<any>(
      `/logistics/shipments/${shipmentId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: statusValue }) },
      'farmer'
    )
  }

  // --- Dynamic Pricing & Demand Forecasting API ---
  async getCropPrices(cropName?: string): Promise<any[]> {
    const q = cropName ? `?crop_name=${encodeURIComponent(cropName)}` : ''
    return this.request<any[]>(`/intelligence/prices${q}`, {}, 'farmer')
  }

  async getCropForecast(cropName: string): Promise<any> {
    return this.request<any>(`/intelligence/forecast/${encodeURIComponent(cropName)}`, {}, 'farmer')
  }

  async getRecommendPrice(cropName: string, quantityKg: number = 100, grade: string = 'Grade A', mandiPrice?: number): Promise<any> {
    return this.request<any>(
      '/intelligence/recommend-price',
      {
        method: 'POST',
        body: JSON.stringify({ crop_name: cropName, quantity_kg: quantityKg, grade, mandi_price_per_kg: mandiPrice }),
      },
      'farmer'
    )
  }

  async getImpactSummary(): Promise<any> {
    return this.request<any>('/intelligence/impact-summary', {}, 'farmer')
  }

  // --- Payments Ledger, Reviews, Disputes & Operator Audit API ---
  async getPaymentsLedger(orderId: string): Promise<PaymentsLedgerEntry[]> {
    return this.request<PaymentsLedgerEntry[]>(`/payments/ledger/${orderId}`, {}, 'farmer')
  }

  async createReview(payload: {
    order_id: string
    target_farmer_id?: string
    rating_score: number
    feedback_text?: string
  }): Promise<Review> {
    return this.request<Review>('/reviews', { method: 'POST', body: JSON.stringify(payload) }, 'farmer')
  }

  async getReviewsForUser(userId: string): Promise<Review[]> {
    return this.request<Review[]>(`/reviews/user/${userId}`, {}, 'farmer')
  }

  async createDispute(payload: {
    order_id: string
    dispute_reason: string
    withheld_amount_rupees?: number
  }): Promise<Dispute> {
    return this.request<Dispute>('/disputes', { method: 'POST', body: JSON.stringify(payload) }, 'farmer')
  }

  async resolveDispute(
    id: string,
    payload: { resolution_notes: string; settlement_action: 'REFUND' | 'FARMER_PAYOUT' }
  ): Promise<Dispute> {
    return this.request<Dispute>(`/disputes/${id}/resolve`, { method: 'PUT', body: JSON.stringify(payload) }, 'farmer')
  }

  async createOperatorAuditLog(payload: {
    farmer_user_id: string
    action_type: string
    entity_id?: string
  }): Promise<OperatorAuditLog> {
    return this.request<OperatorAuditLog>('/audit/operator-logs', { method: 'POST', body: JSON.stringify(payload) }, 'operator')
  }

  async getOperatorAuditLogs(): Promise<OperatorAuditLog[]> {
    return this.request<OperatorAuditLog[]>('/audit/operator-logs', {}, 'operator')
  }

  // --- Farmer Operational API ---
  async getFarmerDashboard() {
    return this.request<{
      earnings: number
      pending: number
      active_listings: number
      new_orders: number
      upcoming_pickup?: {
        id: string
        order_id: string
        crop: string
        crop_hi?: string
        quantity_kg: number
        date: string
        status: string
      }
    }>('/farmers/dashboard', {}, 'farmer')
  }

  async getFarmerEarnings(): Promise<EarningsTransaction[]> {
    const raw = await this.request<any[]>('/farmers/earnings', {}, 'farmer')
    return raw.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      crop: item.crop,
      cropHi: item.crop_hi || item.crop,
      gross: item.gross,
      deductions: item.deductions,
      net: item.net,
      mandiEquivalent: item.mandi_equivalent,
      date: item.date,
      status: item.status as 'pending' | 'paid',
    }))
  }

  async getFarmerPickups(): Promise<Pickup[]> {
    const raw = await this.request<any[]>('/farmers/pickups', {}, 'farmer')
    return raw.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      crop: item.crop,
      cropHi: item.crop_hi || item.crop,
      quantityKg: item.quantity_kg,
      date: item.date,
      timeWindow: item.time_window,
      driver: item.driver,
      vehicle: item.vehicle,
      farmAddress: item.farm_address,
      status: item.status as any,
    }))
  }

  // --- Orders API (Direct / B2C & Farmer View) ---
  async placeDirectOrder(
    items: Array<{ listingId: string; quantityKg: number }>,
    deliveryAddress: string
  ): Promise<any[]> {
    const payload = {
      items: items.map((i) => ({ listing_id: i.listingId, quantity_kg: i.quantityKg })),
      delivery_address: deliveryAddress,
    }
    return this.request<any[]>('/orders/direct', { method: 'POST', body: JSON.stringify(payload) }, 'consumer')
  }

  async getMyOrders(role: 'farmer' | 'consumer' | 'bulk' = 'farmer'): Promise<FarmerOrder[]> {
    const raw = await this.request<any[]>('/orders/my-orders', {}, role)
    return raw.map((ord) => this.mapBackendOrder(ord))
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const backendStatusMap: Record<OrderStatus, string> = {
      new: 'CONFIRMED',
      accepted: 'PICKUP_SCHEDULED',
      preparing: 'PICKUP_SCHEDULED',
      pickup_scheduled: 'PICKUP_SCHEDULED',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
    }
    await this.request(
      `/orders/${orderId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: backendStatusMap[status] || 'CONFIRMED' }) },
      'farmer'
    )
  }

  // --- Bulk Buyer Procurement, Matching & Escrow API ---
  async getRequirements(): Promise<any[]> {
    return this.request<any[]>('/requirements', {}, 'bulk')
  }

  async createRequirement(rfq: {
    crop: string
    requiredQuantityKg: number
    targetPrice: number
    deliveryLocation: string
    deliveryLatitude?: number
    deliveryLongitude?: number
  }): Promise<any> {
    const payload = {
      crop_name: rfq.crop,
      target_quantity_kg: rfq.requiredQuantityKg,
      max_price_per_kg: rfq.targetPrice,
      acceptable_grades: ['GRADE_A', 'GRADE_B'],
      delivery_deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      delivery_latitude: rfq.deliveryLatitude || 28.6139,
      delivery_longitude: rfq.deliveryLongitude || 77.2090,
    }
    return this.request<any>('/requirements', { method: 'POST', body: JSON.stringify(payload) }, 'bulk')
  }

  async generateMatches(requirementId: string): Promise<any> {
    return this.request<any>(`/requirements/${requirementId}/generate-matches`, { method: 'POST' }, 'bulk')
  }

  async createOrderFromCluster(clusterId: string): Promise<any> {
    return this.request<any>(`/orders/from-cluster/${clusterId}`, { method: 'POST' }, 'bulk')
  }

  async lockEscrow(orderId: string, amountRupees: number): Promise<any> {
    return this.request<any>(
      `/orders/${orderId}/lock-escrow`,
      { method: 'POST', body: JSON.stringify({ amount_rupees: amountRupees }) },
      'bulk'
    )
  }

  // --- Internal Mappers ---
  private mapBackendListing(item: any): FarmerListing {
    const cropName = item.crop_name || 'Produce'
    const visual = this.resolveVisual(cropName)
    const imageSrc = `/assets/produce/${visual === 'leafy' ? 'spinach' : visual}.webp`

    return {
      id: item.id,
      crop: cropName,
      cropHi: cropNameHi(cropName, item.crop_name_hi),
      category: (item.category || 'Vegetables') as any,
      imageSrc,
      visual,
      quantityKg: Number(item.quantity_kg),
      remainingKg: Number(item.available_quantity_kg),
      allocatedKg: Math.max(0, Number(item.quantity_kg) - Number(item.available_quantity_kg)),
      unit: 'kg',
      grade: item.quality_grade === 'GRADE_A' ? 'Grade A' : 'Grade A+',
      harvestDate: item.harvest_date ? String(item.harvest_date) : new Date().toISOString().slice(0, 10),
      availableFrom: 'Today',
      farmingMethod: item.variety || 'Hydroponic / Open Field',
      notes: item.variety || '',
      pricePerKg: Number(item.expected_price_per_kg),
      mandiPricePerKg: item.mandi_price_per_kg ? Number(item.mandi_price_per_kg) : Math.round(Number(item.expected_price_per_kg) * 0.8),
      farm: item.farmer_name ? `${item.farmer_name}'s Farm` : 'Green Field Farm',
      pickupDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      pickupWindow: 'Morning · 7–10 AM',
      fulfillment: 'pickup',
      status: item.status === 'RESCUE_ACTIVE' ? 'active' : item.status === 'ACTIVE' ? 'active' : item.status === 'SOLD' ? 'sold' : 'draft',
      assisted: false,
      views: 24,
      inquiries: 4,
      isUrgentRescue: Boolean(item.is_urgent_rescue),
      rescueDiscountPricePerKg: item.rescue_discount_price_per_kg ? Number(item.rescue_discount_price_per_kg) : undefined,
      rescueStatus: String(item.status || ''),
      createdAt: item.created_at ? String(item.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    }
  }

  private mapBackendOrder(ord: any): FarmerOrder {
    const alloc = ord.allocations?.[0]
    const qty = alloc ? Number(alloc.allocated_kg) : Number(ord.total_quantity_kg)
    const rate = alloc?.unit_price ? Number(alloc.unit_price) : roundRate(Number(ord.gross_amount_rupees), Number(ord.total_quantity_kg))
    const gross = Math.round(qty * rate)
    const payout = alloc ? Number(alloc.farmer_payout_amount_rupees) : Math.round(gross * 0.95)
    const deductions = Math.max(0, gross - payout)

    const statusMap: Record<string, OrderStatus> = {
      CONFIRMED: 'new',
      ESCROW_LOCKED: 'accepted',
      PICKUP_SCHEDULED: 'pickup_scheduled',
      IN_TRANSIT: 'in_transit',
      DELIVERED: 'delivered',
      SETTLED: 'delivered',
      CANCELLED: 'cancelled',
    }

    return {
      id: ord.order_code || ord.id,
      db_id: ord.id,
      buyerUserId: ord.buyer_user_id || ord.buyer_id,
      buyerName: ord.buyer_name || 'Verified Buyer',
      buyerType: ord.cluster_id ? 'Bulk Buyer' : 'Consumer',
      crop: ord.crop_name || 'Produce',
      cropHi: cropNameHi(ord.crop_name || 'Crop', ord.crop_name_hi),
      listingId: alloc?.listing_id || ord.id,
      quantityKg: qty,
      ratePerKg: rate,
      total: gross,
      farmerPayout: payout,
      platformFee: Math.round(deductions * 0.3),
      logisticsFee: deductions - Math.round(deductions * 0.3),
      orderedAt: ord.created_at ? String(ord.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: statusMap[ord.status] || 'new',
      paymentStatus: ord.status === 'DELIVERED' || ord.status === 'SETTLED' ? 'paid' : 'processing',
      pickupId: alloc?.pickup_verification_otp ? `PK-${alloc.pickup_verification_otp}` : undefined,
    }
  }

  // ---------------------------------------------------------------------------
  // Intelligence & Logistics API Endpoints (Phase 8)
  // ---------------------------------------------------------------------------

  async generateRequirementMatches(requirementId: string): Promise<any> {
    return this.request<any>(`/requirements/${requirementId}/generate-matches`, { method: 'POST' }, 'bulk')
  }

  private resolveVisual(name: string): any {
    const lower = name.toLowerCase()
    if (lower.includes('tomato')) return 'tomato'
    if (lower.includes('spinach') || lower.includes('palak')) return 'leafy'
    if (lower.includes('potato') || lower.includes('aloo')) return 'potato'
    if (lower.includes('onion') || lower.includes('pyaz')) return 'onion'
    if (lower.includes('carrot') || lower.includes('gajar')) return 'root'
    return 'green'
  }
}

function roundRate(gross: number, qty: number): number {
  return qty > 0 ? Math.round(gross / qty) : 30
}

export const apiClient = new ApiClient()


