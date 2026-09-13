import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logisticsService } from '../services/logisticsService'
import { apiClient } from '../services/apiClient'
import { prototypeService } from '../services/prototypeService'
import { attentionJobs, dispatchJobs } from '../pages/logistics/jobsModel'
import { stopsForRoute } from '../pages/logistics/shared'

beforeEach(async () => {
  localStorage.clear()
  await prototypeService.seedScenario('market')
})
afterEach(() => vi.restoreAllMocks())

describe('dispatch queues and state', () => {
  it('retains every pickup and delivery and prioritizes issues before unassigned work', async () => {
    const state = await logisticsService.overview()
    const jobs = dispatchJobs(state.logisticsPickups, state.deliveries)
    expect(jobs).toHaveLength(
      state.logisticsPickups.length + state.deliveries.length,
    )
    const prioritized = attentionJobs([
      { ...jobs[0], status: 'completed' },
      { ...jobs[1], status: 'unassigned' },
      { ...jobs[2], status: 'issue' },
    ])
    expect(prioritized.map((j) => j.status)).toEqual(['issue', 'unassigned'])
    expect(jobs.find((j) => j.kind === 'deliveries')?.location).toBe(
      state.deliveries[0].destination,
    )
  })

  it('assigns the chosen pickup and preserves notification and audit propagation', async () => {
    const state = await logisticsService.overview()
    const pickup = state.logisticsPickups[0]
    const vehicle = state.vehicles.find((v) => v.status === 'available')!
    await logisticsService.assignPickup(pickup.id, vehicle.id)
    const after = await logisticsService.overview()
    expect(
      after.logisticsPickups.find((p) => p.id === pickup.id),
    ).toMatchObject({
      status: 'assigned',
      vehicleId: vehicle.id,
      driver: vehicle.driver,
    })
    expect(
      after.vehicles.find((v) => v.id === vehicle.id)?.currentAssignment,
    ).toBe(pickup.routeId ?? pickup.id)
    expect(after.notifications.length).toBeGreaterThan(
      state.notifications.length,
    )
    expect(
      after.logisticsPickups.find((p) => p.id === pickup.id)!.timeline.length,
    ).toBeGreaterThan(pickup.timeline.length)
  })

  it('maps delivery completion into the route stop progress', async () => {
    const state = await logisticsService.overview()
    const delivery = { ...state.deliveries[0], status: 'delivered' as const }
    const stops = stopsForRoute(
      {
        routeStops: [
          {
            placeId: 'sonipat_hub',
            label: 'Destination',
            kind: 'drop',
            refId: delivery.id,
            status: 'upcoming',
          },
        ],
        stops: [],
        pickups: [],
        loadKg: 50,
      },
      [],
      [delivery],
    )
    expect(stops[0].status).toBe('done')
  })
})

describe('backend integration and demo fallback', () => {
  it('retains optimizer response values and identifies their source', async () => {
    const response = {
      waypoints: [],
      total_distance_km: 37,
      estimated_duration_minutes: 61,
      utilization_pct: 72,
      trips_reduced: 1,
    }
    const request = vi
      .spyOn(apiClient, 'optimizeRoute')
      .mockResolvedValue(response)
    expect(await logisticsService.optimizeLiveRoute(800)).toEqual({
      ...response,
      source: 'backend',
    })
    expect(request).toHaveBeenCalledWith(undefined, 800)
  })
  it('labels the existing offline benchmark without inventing savings', async () => {
    vi.spyOn(apiClient, 'optimizeRoute').mockRejectedValue(new Error('offline'))
    const result = await logisticsService.optimizeLiveRoute()
    expect(result).toMatchObject({
      source: 'demo',
      total_distance_km: 64,
      trips_reduced: 2,
    })
    expect(result).not.toHaveProperty('distance_saved_km')
  })
  it('keeps OTP rejection for short offline input and leaves the pickup unchanged', async () => {
    vi.spyOn(apiClient, 'verifyPickupOtp').mockRejectedValue(
      new Error('offline'),
    )
    const pickup = (await logisticsService.pickups())[2]
    await expect(
      logisticsService.verifyPickupOtp(pickup.id, '12'),
    ).rejects.toThrow('valid 6-digit OTP')
    expect((await logisticsService.pickup(pickup.id))?.status).toBe(
      pickup.status,
    )
  })
  it('passes pickup and delivery OTPs through the existing API paths', async () => {
    const pickups = await logisticsService.pickups()
    const deliveries = await logisticsService.deliveries()
    const pickupApi = vi
      .spyOn(apiClient, 'verifyPickupOtp')
      .mockResolvedValue({ success: true, message: 'Verified' })
    const deliveryApi = vi
      .spyOn(apiClient, 'verifyDeliveryOtp')
      .mockResolvedValue({ success: true, message: 'Verified' })
    await logisticsService.verifyPickupOtp(pickups[0].id, '123456')
    await logisticsService.verifyDeliveryOtp(deliveries[0].id, '123456')
    expect(pickupApi).toHaveBeenCalledWith('123456')
    expect(deliveryApi).toHaveBeenCalledWith(deliveries[0].id, '123456')
    expect((await logisticsService.pickup(pickups[0].id))?.status).toBe(
      'completed',
    )
    expect((await logisticsService.delivery(deliveries[0].id))?.status).toBe(
      'delivered',
    )
  })
})
