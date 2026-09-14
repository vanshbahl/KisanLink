import { cropByName } from '../data/crops'
import { matchDistrict, matchState } from '../data/indiaLocations'
import type { FarmerProfileData, Language } from '../types'

export const FARMER_FALLBACK_NAME = 'Vansh'
export const MAX_FARM_ACRES = 500
export const validFarmArea = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_FARM_ACRES
export const retryProfileMessage = (language: Language) => language === 'hi'
  ? 'कृपया सही नाम, राज्य, उसका जिला, फसल और 0 से अधिक, 500 एकड़ तक ज़मीन भरें। अनजान जगह का नाम अंग्रेज़ी में लिखें।'
  : 'Check your name, state, its district, crops and land area (above 0, up to 500 acres). Enter unlisted place names in English.'

/** Used at the persistence boundary, including typed edits. Labels never enter storage. */
export function canonicalFarmerProfile(profile: FarmerProfileData): FarmerProfileData {
  const state = profile.state.trim() ? matchState(profile.state) : null
  const district = profile.district.trim() ? matchDistrict(state?.value ?? '', profile.district) : null
  const crops = profile.mainCrops.split(',').map(value => value.trim()).filter(Boolean).map(value => cropByName(value)?.en)
  if (!profile.name.trim() || !/^[\p{L}\p{M} .’'-]{2,80}$/u.test(profile.name.trim()) ||
      (profile.state.trim() && !state?.confident) || (profile.district.trim() && !district?.confident) ||
      !validFarmArea(profile.farmSizeAcres) || crops.some(value => !value) ||
      [profile.village, profile.locality ?? ''].some(value => value && !/^[A-Za-z0-9 .,'’()-]+$/.test(value))) {
    throw new Error(retryProfileMessage(profile.language))
  }
  return { ...profile, name: profile.name.trim(), state: state?.value ?? '', district: district?.value ?? '',
    village: profile.village.trim(), locality: profile.locality?.trim() ?? '', mainCrops: [...new Set(crops)].join(', ') }
}
