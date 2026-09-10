/**
 * Every place the prototype can draw on a map, in one table.
 *
 * The corridor map is rendered from these coordinates rather than from a tile service, so a
 * place is only ever plotted if it is named here. Lookup is deliberately fuzzy (a pickup
 * stores "Murthal, Sonipat, Haryana", a route stop stores "Farm A · Murthal") because the
 * operational records were written for humans first.
 */
export interface GeoPlace {
  /** Canonical key, also used as the map label when no shorter one is given. */
  id: string
  label: string
  district: string
  lat: number
  lng: number
  /** Extra strings that should resolve to this place. */
  aliases?: string[]
}

export const places: GeoPlace[] = [
  { id: 'green_field_farm', label: 'Green Field Farm', district: 'Murthal, Sonipat', lat: 29.0330, lng: 77.0700, aliases: ['murthal', 'green field', 'ramesh'] },
  { id: 'sunehri_khet', label: 'Sunehri Khet', district: 'Karnal', lat: 29.6857, lng: 76.9905, aliases: ['karnal', 'sunehri', 'harpreet'] },
  { id: 'yadav_fresh_fields', label: 'Yadav Fresh Fields', district: 'Panipat', lat: 29.3909, lng: 76.9635, aliases: ['panipat', 'yadav', 'rajesh'] },
  { id: 'malik_family_farm', label: 'Malik Family Farm', district: 'Rohtak', lat: 28.8955, lng: 76.6066, aliases: ['rohtak', 'malik', 'suresh malik'] },
  { id: 'doaba_harvests', label: 'Doaba Harvests', district: 'Samalkha, Panipat', lat: 29.2380, lng: 77.0150, aliases: ['doaba', 'samalkha', 'gurpreet'] },
  { id: 'ganga_plains_farm', label: 'Ganga Plains Farm', district: 'Meerut', lat: 28.9845, lng: 77.7064, aliases: ['meerut', 'ganga plains', 'vikas'] },
  { id: 'nandi_organic_plot', label: 'Nandi Organic Plot', district: 'Bahalgarh, Sonipat', lat: 28.9600, lng: 77.0400, aliases: ['bahalgarh', 'nandi', 'sunita'] },
  { id: 'rana_vegetable_farm', label: 'Rana Vegetable Farm', district: 'Kharkhoda, Sonipat', lat: 28.8770, lng: 76.9130, aliases: ['kharkhoda', 'rana', 'jaswant'] },
  { id: 'sonipat_hub', label: 'KisanLink Sonipat Hub', district: 'Kundli, Sonipat', lat: 28.8628, lng: 77.1167, aliases: ['kundli', 'sonipat hub', 'consolidation'] },
  { id: 'okhla_dc', label: 'FreshKart Okhla DC', district: 'Okhla, New Delhi', lat: 28.5355, lng: 77.2730, aliases: ['okhla', 'freshkart', 'distribution centre'] },
  { id: 'dwarka_12', label: 'Dwarka Sector 12', district: 'Dwarka, New Delhi', lat: 28.5921, lng: 77.0460, aliases: ['dwarka', 'sector 12'] },
  { id: 'azadpur', label: 'Azadpur Mandi', district: 'Azadpur, New Delhi', lat: 28.7041, lng: 77.1725, aliases: ['azadpur', 'mandi hub'] },
]

const byId = new Map(places.map((place) => [place.id, place]))

/**
 * Resolves a free-text operational string to a place. Matches on the id, the label and any
 * alias, longest alias first so "sonipat hub" is never swallowed by a bare "sonipat".
 */
export function resolvePlace(value: string | undefined | null): GeoPlace | null {
  if (!value) return null
  const needle = value.toLowerCase()
  const direct = byId.get(needle.trim().replaceAll(/[^a-z0-9]+/g, '_'))
  if (direct) return direct
  let best: { place: GeoPlace; score: number } | null = null
  for (const place of places) {
    const keys = [place.label.toLowerCase(), ...(place.aliases ?? [])]
    for (const key of keys) {
      if (needle.includes(key) && (!best || key.length > best.score)) best = { place, score: key.length }
    }
  }
  return best?.place ?? null
}

export const placeById = (id: string) => byId.get(id) ?? null

/** Great-circle distance, used to label legs the seed does not measure itself. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  // Road factor: NCR farm roads are meaningfully longer than the straight line.
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.28)
}
