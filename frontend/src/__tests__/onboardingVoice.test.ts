import { describe, expect, it, vi } from 'vitest'

// The parser reaches Gemini through apiClient only as a fallback; keep it offline here.
vi.mock('../services/apiClient', () => ({ apiClient: { parseOnboardingVoice: vi.fn(async () => { throw new Error('offline') }) } }))

import { districtNamesOf, matchDistrict, matchState, placeLabel, similarity } from '../data/indiaLocations'
import { farmSizeBucket, isUnknownAnswer, matchCrops, parseConfirmation, parseFarmSizeText, parseOnboardingAnswer, parseYesNo } from '../services/onboardingVoice'

describe('parseOnboardingAnswer (deterministic, no backend)', () => {
  it('strips the sentence around a name in Hindi and English', async () => {
    expect((await parseOnboardingAnswer('name', 'मेरा नाम रमेश यादव है', 'hi')).value).toBe('रमेश यादव')
    expect((await parseOnboardingAnswer('name', 'my name is ramesh yadav', 'en')).value).toBe('Ramesh Yadav')
    expect((await parseOnboardingAnswer('name', 'Mera naam Sunita Devi hai', 'hi')).value).toBe('Sunita Devi')
  })
  it('keeps a plain name intact', async () => {
    expect((await parseOnboardingAnswer('name', 'Ramesh Yadav', 'en')).value).toBe('Ramesh Yadav')
    expect((await parseOnboardingAnswer('name', 'Sadhu Ram', 'en')).value).toBe('Sadhu Ram')
  })
  it('reads a village out of a sentence', async () => {
    expect((await parseOnboardingAnswer('village', 'खेड़ा गाँव', 'hi')).value).toBe('खेड़ा')
    expect((await parseOnboardingAnswer('village', 'mera gaon Murthal hai', 'hi')).value).toBe('Murthal')
    expect((await parseOnboardingAnswer('village', 'it is in Bahalgarh', 'en')).value).toBe('Bahalgarh')
  })
  it('normalises a spoken state to the canonical name the profile stores', async () => {
    expect((await parseOnboardingAnswer('state', 'हरियाणा', 'hi')).value).toBe('Haryana')
    expect((await parseOnboardingAnswer('state', 'main UP se hoon', 'hi')).value).toBe('Uttar Pradesh')
    const guess = await parseOnboardingAnswer('state', 'Narnia', 'en')
    expect(guess.value).toBe('Narnia')
    expect(guess.confident).toBe(false)
  })
  it('matches a district against the confirmed state only', async () => {
    expect((await parseOnboardingAnswer('district', 'गुड़गांव', 'hi', { state: 'Haryana' })).value).toBe('Gurugram')
    expect((await parseOnboardingAnswer('district', 'west delhi', 'en', { state: 'Delhi' })).value).toBe('West Delhi')
    const unlisted = await parseOnboardingAnswer('district', 'Nashik', 'en', { state: 'Maharashtra' })
    expect(unlisted.value).toBe('Nashik')
    expect(unlisted.confident).toBe(false)
  })
  it('treats "I do not know" as a skip, never a value', async () => {
    expect(isUnknownAnswer('नहीं पता')).toBe(true)
    expect(isUnknownAnswer('mujhe nahi malum ji')).toBe(true)
    expect(isUnknownAnswer('not sure')).toBe(true)
    expect(isUnknownAnswer('खेड़ा')).toBe(false)
    const shrug = await parseOnboardingAnswer('village', 'पता नहीं', 'hi')
    expect(shrug.unknown).toBe(true)
    expect(shrug.value).toBeUndefined()
    expect((await parseConfirmation('मुझे नहीं मालूम', 'hi', { expected: 'Delhi' })).unknown).toBe(true)
    expect((await parseConfirmation('हाँ जी', 'hi', { expected: 'Delhi' })).confirmed).toBe(true)
  })
  it('maps spoken land sizes to the five buckets', async () => {
    expect(parseFarmSizeText('करीब चार एकड़ है')).toBe('3to5')
    expect(parseFarmSizeText('डेढ़ एकड़')).toBe('1to3')
    expect(parseFarmSizeText('साढ़े पांच एकड़')).toBe('5to10')
    expect(parseFarmSizeText('about 12 acres')).toBe('10plus')
    expect(parseFarmSizeText('ek acre se kam')).toBe('under1')
    expect(parseFarmSizeText('दस बीघा')).toBe('1to3')
    expect(parseFarmSizeText('pata nahi')).toBeNull()
    expect((await parseOnboardingAnswer('farmSize', 'kuch nahi', 'hi')).recognized).toBe(false)
  })
  it('lists crops in the order they were said', async () => {
    expect(matchCrops('टमाटर, प्याज और पालक बेचता हूँ').map((crop) => crop.en)).toEqual(['Tomato', 'Onion', 'Spinach'])
    expect(matchCrops('tamatar aur aloo').map((crop) => crop.en)).toEqual(['Tomato', 'Potato'])
    expect((await parseOnboardingAnswer('crops', 'wheat and mustard', 'en')).crops).toEqual(['Wheat', 'Mustard'])
    expect((await parseOnboardingAnswer('crops', 'kuch bhi nahi', 'hi')).recognized).toBe(false)
  })
  it('understands yes and no', () => {
    expect(parseYesNo('हाँ जी सही है')).toBe(true)
    expect(parseYesNo('नहीं')).toBe(false)
    expect(parseYesNo('yes correct')).toBe(true)
    expect(parseYesNo('kuch aur')).toBeNull()
  })
  it('buckets acreage on the option boundaries', () => {
    expect(farmSizeBucket(0.9)).toBe('under1')
    expect(farmSizeBucket(1)).toBe('1to3')
    expect(farmSizeBucket(3)).toBe('3to5')
    expect(farmSizeBucket(5)).toBe('5to10')
    expect(farmSizeBucket(10)).toBe('10plus')
  })
})

describe('canonical Indian places', () => {
  it('resolves state aliases, scripts and nicknames', () => {
    for (const spoken of ['दिल्ली', 'Dilli', 'NCT Delhi', 'Delhi NCR', 'new delhi']) expect(matchState(spoken)?.value).toBe('Delhi')
    expect(matchState('हरयाणा')?.value).toBe('Haryana')
    expect(matchState('उत्तर प्रदेश')?.value).toBe('Uttar Pradesh')
    expect(matchState('UP')?.value).toBe('Uttar Pradesh')
    expect(matchState('Haryna')?.value).toBe('Haryana')
  })
  it('does not guess when nothing is close', () => {
    expect(matchState('Narnia')).toBeNull()
    expect(matchDistrict('Delhi', 'delhi')).toBeNull()
    expect(matchDistrict('Maharashtra', 'Nashik')).toBeNull()
  })
  it('resolves districts within a state, longest alias winning', () => {
    expect(matchDistrict('Haryana', 'गुड़गांव')?.value).toBe('Gurugram')
    expect(matchDistrict('Haryana', 'Gurgaon')?.value).toBe('Gurugram')
    expect(matchDistrict('Delhi', 'west delhi')?.value).toBe('West Delhi')
    expect(matchDistrict('Delhi', 'north west delhi')?.value).toBe('North West Delhi')
    expect(matchDistrict('Delhi', 'पश्चिमी दिल्ली')?.value).toBe('West Delhi')
    expect(matchDistrict('Uttar Pradesh', 'Allahabad')?.value).toBe('Prayagraj')
    expect(matchDistrict('Uttar Pradesh', 'kanpur')?.value).toBe('Kanpur Nagar')
    expect(districtNamesOf('Delhi')).toHaveLength(11)
  })
  it('has Hindi labels for speech', () => {
    expect(placeLabel('hi', 'Delhi')).toBe('दिल्ली')
    expect(placeLabel('hi', 'West Delhi', 'Delhi')).toBe('पश्चिमी दिल्ली')
    expect(placeLabel('en', 'Delhi')).toBe('Delhi')
    expect(similarity('haryana', 'haryana')).toBe(1)
  })
})
