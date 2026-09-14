import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prototypeService } from '../services/prototypeService'
import { authService } from '../services/authService'
import { farmersById } from '../data/farmers'
beforeEach(() => {
  localStorage.clear()
  const data = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  localStorage.setItem('kisanlink_session', JSON.stringify({ authenticated: true, role: 'farmer', userId: 'farmer_001' }))
})
describe('central farmer profile', () => {
  it('updates auth identity, listing growers and contribution names together', async () => {
    expect(authService.getCurrentUser()?.name).toBe('Vansh')
    const notify = vi.fn()
    window.addEventListener('kisanlink-state', notify)
    await prototypeService.saveProfile({ ...prototypeService.getProfileSnapshot(), name: 'Sunita Devi', onboardingComplete: true })
    expect(authService.getCurrentUser()?.name).toBe('Sunita Devi')
    expect(authService.getCurrentUser()?.avatarInitials).toBe('SD')
    expect(farmersById.farmer_001.name).toBe('Sunita Devi')
    const state = await prototypeService.getState()
    expect(state.bulkOrders[0].contributions.find(item => item.listingId === 'listing_001')?.farmer).toBe('Sunita Devi')
    expect(notify).toHaveBeenCalled()
    window.removeEventListener('kisanlink-state', notify)
  })
  it('resets farmer onboarding on logout without resetting transactions', async () => {
    await prototypeService.saveProfile({ ...prototypeService.getProfileSnapshot(), name: 'Sunita Devi', onboardingComplete: true })
    const orders = (await prototypeService.getState()).orders
    expect(authService.postLoginPath('farmer')).toBe('/farmer')
    authService.logout()
    expect(authService.getSession()).toBeNull()
    expect(prototypeService.getProfileSnapshot().name).toBe('Vansh')
    expect(authService.postLoginPath('farmer')).toBe('/farmer/onboarding')
    expect((await prototypeService.getState()).orders).toEqual(orders)
  })
  it('does not reset farmer onboarding when another role logs out', async () => {
    await prototypeService.saveProfile({ ...prototypeService.getProfileSnapshot(), name: 'Sunita Devi', onboardingComplete: true })
    localStorage.setItem('kisanlink_session', JSON.stringify({ authenticated: true, role: 'consumer', userId: 'consumer_001' }))
    authService.logout()
    expect(prototypeService.farmerNeedsOnboarding()).toBe(false)
    expect(authService.postLoginPath('consumer')).toBe('/consumer')
  })
  it('rejects invalid profile data before emitting or writing state', async () => {
    const before = prototypeService.getProfileSnapshot()
    await expect(prototypeService.saveProfile({ ...before, farmSizeAcres: -5 })).rejects.toThrow()
    expect(prototypeService.getProfileSnapshot()).toEqual(before)
  })
})
