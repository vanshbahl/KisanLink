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
} from '../types'

const API_BASE = '/api/v1'

const ROLE_PHONE_MAP: Record<string, { phone: string; preferred_role: string }> = {
  farmer: { phone: '+919876543210', preferred_role: 'FARMER' },
  bulk: { phone: '+919899001122', preferred_role: 'BUYER' },
  consumer: { phone: '+919811122233', preferred_role: 'BUYER' },
}

class ApiClient {
  private tokenCache: Record<string, string> = {}

  private async ensureToken(role: 'farmer' | 'consumer' | 'bulk'): Promise<string> {
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
    role: 'farmer' | 'consumer' | 'bulk' = 'farmer'
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
      cropHi: item.crop_name_hi || cropName,
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
      status: item.status === 'ACTIVE' ? 'active' : item.status === 'SOLD' ? 'sold' : 'draft',
      assisted: false,
      views: 24,
      inquiries: 4,
      createdAt: item.created_at ? String(item.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    }
  }

  private mapBackendOrder(ord: any): FarmerOrder {
    const alloc = ord.allocations?.[0]
    const qty = alloc ? Number(alloc.allocated_kg) : Number(ord.total_quantity_kg)
    const rate = alloc?.unit_price ? Number(alloc.unit_price) : roundRate(Number(ord.gross_amount_rupees), Number(ord.total_quantity_kg))
    const gross = Math.round(qty * rate)
    const payout = alloc ? Number(alloc.farmer_payout_amount_rupees) : Math.round(gross * 0.95)

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
      buyerName: ord.buyer_name || 'Verified Buyer',
      buyerType: ord.cluster_id ? 'Bulk Buyer' : 'Consumer',
      crop: ord.crop_name || 'Produce',
      cropHi: ord.crop_name || 'फसल',
      listingId: alloc?.listing_id || ord.id,
      quantityKg: qty,
      ratePerKg: rate,
      total: gross,
      farmerPayout: payout,
      platformFee: Math.round(gross * 0.03),
      logisticsFee: Math.round(gross * 0.04),
      orderedAt: ord.created_at ? String(ord.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: statusMap[ord.status] || 'new',
      paymentStatus: ord.status === 'DELIVERED' || ord.status === 'SETTLED' ? 'paid' : 'processing',
      pickupId: alloc?.pickup_verification_otp ? `PK-${alloc.pickup_verification_otp}` : undefined,
    }
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
