import type { BulkProfileData, ConsumerProfileData, FarmerProfileData, LogisticsProfileData, MarketMakerBoard, Role } from '../types'

export interface RankedOpportunities<T> {
  hero: T
  others: T[]
  userRegionMatched: boolean
  matchedRegionName: string | null
}

const NCR_REGIONS = [
  { key: 'sonipat', name: 'Sonipat', boardId: 'MM-SONIPAT-001' },
  { key: 'gurgaon', name: 'Gurgaon', boardId: 'MM-GURGAON-001', aliases: ['gurugram'] },
  { key: 'faridabad', name: 'Faridabad', boardId: 'MM-FARIDABAD-001' },
  { key: 'rohtak', name: 'Rohtak', boardId: 'MM-ROHTAK-001' },
  { key: 'meerut', name: 'Meerut', boardId: 'MM-MEERUT-001' },
  { key: 'ghaziabad', name: 'Ghaziabad', boardId: 'MM-GHAZIABAD-001' },
]

/**
 * Extracts normalized user region string from active profile data.
 * Pure deterministic mapping based on existing fields. Never fakes GPS.
 */
export function extractUserRegion(
  role: Role,
  profiles: {
    farmerProfile?: FarmerProfileData | null
    consumerProfile?: ConsumerProfileData | null
    bulkProfile?: BulkProfileData | null
    logisticsProfile?: LogisticsProfileData | null
  }
): string | null {
  if (role === 'farmer' && profiles.farmerProfile) {
    const p = profiles.farmerProfile
    return p.district || p.village || p.pickupLocation || null
  }
  if (role === 'consumer' && profiles.consumerProfile) {
    const c = profiles.consumerProfile
    // Check default location first, then default address city/line
    if (c.defaultLocation) return c.defaultLocation
    const defAddr = c.addresses?.find((a) => a.isDefault) || c.addresses?.[0]
    if (defAddr) return `${defAddr.city} ${defAddr.line1}`
    return null
  }
  if (role === 'bulk' && profiles.bulkProfile) {
    const b = profiles.bulkProfile
    if (b.procurementLocations && b.procurementLocations.length > 0) {
      return b.procurementLocations.join(' ')
    }
    if (b.deliveryAddresses && b.deliveryAddresses.length > 0) {
      return b.deliveryAddresses.join(' ')
    }
    return null
  }
  if (role === 'logistics' && profiles.logisticsProfile) {
    return profiles.logisticsProfile.hub || null
  }
  return null
}

/**
 * Matches a freeform region string to one of the 6 NCR Market Maker regions.
 */
export function matchNcrRegion(regionString?: string | null): string | null {
  if (!regionString) return null
  const norm = regionString.toLowerCase()
  for (const reg of NCR_REGIONS) {
    if (norm.includes(reg.key)) return reg.name
    if (reg.aliases?.some((alias) => norm.includes(alias))) return reg.name
  }
  return null
}

/**
 * Deterministically ranks Market Maker opportunities:
 * 1. If userRegion matches an NCR board's region, that board is HERO (first).
 * 2. All other boards follow in stable order.
 * 3. If userRegion is unavailable or un-matched, the default canonical list is preserved
 *    without pretending to know the user's location.
 */
export function rankMarketMakerOpportunities<T extends { board: MarketMakerBoard }>(
  opportunities: T[],
  userRegion?: string | null
): RankedOpportunities<T> {
  if (!opportunities || opportunities.length === 0) {
    throw new Error('No opportunities provided to rankMarketMakerOpportunities')
  }

  const matchedRegion = matchNcrRegion(userRegion)

  if (matchedRegion) {
    const heroIndex = opportunities.findIndex((item) => {
      const b = item.board
      const bRegionName = b.regions?.[0]?.name?.toLowerCase() || ''
      const bCorridor = b.corridor?.toLowerCase() || ''
      const bCrop = b.crop?.toLowerCase() || ''
      const bId = b.id?.toLowerCase() || ''
      const target = matchedRegion.toLowerCase()
      return bRegionName.includes(target) || bCorridor.includes(target) || bCrop.includes(target) || bId.includes(target)
    })

    if (heroIndex !== -1) {
      const hero = opportunities[heroIndex]
      const others = opportunities.filter((_, idx) => idx !== heroIndex)
      return {
        hero,
        others,
        userRegionMatched: true,
        matchedRegionName: matchedRegion,
      }
    }
  }

  // Fallback: region not matched or unavailable -> canonical order
  return {
    hero: opportunities[0],
    others: opportunities.slice(1),
    userRegionMatched: false,
    matchedRegionName: null,
  }
}

