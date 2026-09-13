import { describe, expect, it } from 'vitest'
import { regionForCoordinates } from '../services/localeDiscovery'

describe('regionForCoordinates', () => {
  it('resolves Delhi to Hindi before the enclosing Haryana box', () => {
    expect(regionForCoordinates(28.6139, 77.2090)).toEqual({ state: 'Delhi', language: 'hi' })
  })
  it('resolves nearby demo farms in Haryana to Hindi', () => {
    expect(regionForCoordinates(29.0330, 77.0700)?.language).toBe('hi')
  })
  it('resolves other states to their primary language', () => {
    expect(regionForCoordinates(13.0827, 80.2707)).toEqual({ state: 'Tamil Nadu', language: 'ta' })
    expect(regionForCoordinates(30.7333, 76.7794)).toEqual({ state: 'Chandigarh', language: 'pa' })
    expect(regionForCoordinates(22.5726, 88.3639)).toEqual({ state: 'West Bengal', language: 'bn' })
  })
  it('returns null outside India so the caller falls back to Hindi', () => {
    expect(regionForCoordinates(51.5, -0.12)).toBeNull()
  })
})
