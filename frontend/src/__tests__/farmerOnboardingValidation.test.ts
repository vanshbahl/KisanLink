import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../services/apiClient'
import { parseFarmArea, parseOnboardingAnswer } from '../services/onboardingVoice'
import { canonicalFarmerProfile } from '../services/farmerProfileValidation'
import { placeLabel } from '../data/indiaLocations'
import type { FarmerProfileData } from '../types'
vi.mock('../services/apiClient', () => ({ apiClient: { parseOnboardingVoice: vi.fn() } }))
const parse = vi.mocked(apiClient.parseOnboardingVoice)
beforeEach(() => { parse.mockRejectedValue(new Error('offline')) })
export const profile: FarmerProfileData = {
  name: 'वन्श शर्मा', phone: '9876543210', language: 'hi', farmName: 'Green Field Farm',
  village: 'Murthal', district: 'सोनीपत', state: 'हरियाणा', farmSizeAcres: 2.5, mainCrops: 'पालक, गेहूं',
  pickupLocation: '', payoutMethod: 'UPI', payoutMasked: '', farmerVerified: false,
  farmVerified: false, identityStatus: 'Pending', onboardingComplete: true,
}
describe('farm area validation', () => {
  it.each(['-2 acres', 'negative two acres', 'minus 3 acres', '0 acres', 'zero acres', '501 acres', '100000 acres', 'one thousand acres', 'six hundred acres', 'few acres', 'two three acres', '2 or 3 acres', 'ten bigha', 'दस बीघा', '-२ एकड़', '2 square metres'])('rejects %s even if Gemini invents a valid value', async text => {
    parse.mockResolvedValue({ ai_used: true, farm_size_acres: 2, confidence: 'high' })
    expect((await parseOnboardingAnswer('farmSize', text, 'en')).recognized).toBe(false)
  })
  it.each([['2.75 acres', 2.75], ['०.५ एकड़', 0.5], ['two point five acres', 2.5], ['डेढ़ एकड़', 1.5], ['2 hectares', 4.94], ['8 kanal', 1], ['five hundred acres', 500]] as const)('preserves %s', async (text, acres) => {
    expect(parseFarmArea(text)).toBeCloseTo(acres)
    expect((await parseOnboardingAnswer('farmSize', text, 'en')).farmSizeAcres).toBeCloseTo(acres)
  })
})
describe('canonical answers and persistence', () => {
  it.each(['pata nahi', 'nahi pata', "don't know", 'skip', ''])('never supplies a value for %s', async text => {
    const result = await parseOnboardingAnswer('state', text, 'en')
    expect(result.value).toBeUndefined()
  })
  it('rejects ambiguous states and districts from another state despite AI', async () => {
    parse.mockResolvedValue({ ai_used: true, value: 'Haryana', confidence: 'high' })
    expect((await parseOnboardingAnswer('state', 'Haryana or Punjab', 'en')).recognized).toBe(false)
    parse.mockResolvedValue({ ai_used: true, value: 'Sonipat', confidence: 'high' })
    expect((await parseOnboardingAnswer('district', 'Lucknow', 'en', { state: 'Haryana' })).recognized).toBe(false)
  })
  it.each([null, [], { ai_used: true, value: 12 }, { ai_used: true, crops: 'Spinach' }, { ai_used: true, crops: [null] }, { ai_used: true, farm_size_acres: -5 }])('handles malformed output %j without advancing uncertain text', async output => {
    parse.mockResolvedValue(output as never)
    expect((await parseOnboardingAnswer('crops', 'not a crop', 'en')).recognized).toBe(false)
  })
  it('canonicalizes aliases without changing names or mutating input', () => {
    const saved = canonicalFarmerProfile(profile)
    expect(saved.name).toBe(profile.name)
    expect(saved.state).toBe('Haryana')
    expect(saved.district).toBe('Sonipat')
    expect(saved.mainCrops).toBe('Spinach, Wheat')
    expect(placeLabel('hi', saved.state)).toBe('हरियाणा')
    expect(saved.state).toBe('Haryana')
    expect(profile.state).toBe('हरियाणा')
  })
  it.each([{ farmSizeAcres: 0 }, { farmSizeAcres: Infinity }, { farmSizeAcres: -1 }, { farmSizeAcres: 501 }, { district: 'Lucknow' }, { state: 'Narnia' }, { mainCrops: 'made up crop' }])('rejects invalid profile edits %j', patch => {
    expect(() => canonicalFarmerProfile({ ...profile, ...patch })).toThrow()
  })
  it('keeps the supplied name script despite Gemini transliteration', async () => {
    parse.mockResolvedValue({ ai_used: true, value: 'Sunita Devi', confidence: 'high' })
    expect((await parseOnboardingAnswer('name', 'मेरा नाम सुनीता देवी है', 'hi')).value).toBe('सुनीता देवी')
  })
  it('rejects incomplete speech and uncertain AI', async () => {
    expect((await parseOnboardingAnswer('village', 'my village is', 'en')).recognized).toBe(false)
    parse.mockResolvedValue({ ai_used: true, value: 'Murthal', confidence: 'low' })
    expect((await parseOnboardingAnswer('village', 'maybe Murthal', 'en')).recognized).toBe(false)
  })
})
