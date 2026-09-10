import type { FC } from 'react'
import { CorridorRouteMap } from './CorridorRouteMap'
import type { RouteStop } from '../../types'

/**
 * Compatibility shim.
 *
 * The corridor view used to be a maplibre-gl map against a CDN basemap. Its tiles never
 * loaded in practice, so the drawing surface is now `CorridorRouteMap`, which renders the
 * same corridor from the coordinates in `data/geo.ts` and needs no network at all. This
 * wrapper keeps the old import path working for anything still reaching for it.
 */
export const DigitalTwinCorridorMap: FC<{ stops?: RouteStop[]; title?: string; subtitle?: string }> = ({ stops, title, subtitle }) => (
  <CorridorRouteMap title={title} subtitle={subtitle} stops={stops ?? fallbackStops} />
)

/** Shown only when no route has been passed in — the flagship pooled run. */
const fallbackStops: RouteStop[] = [
  { placeId: 'sunehri_khet', label: 'Sunehri Khet', kind: 'pickup', quantityKg: 500, window: 'Today · 4–5 PM', status: 'done' },
  { placeId: 'yadav_fresh_fields', label: 'Yadav Fresh Fields', kind: 'pickup', quantityKg: 800, window: 'Today · 5–6 PM', status: 'current' },
  { placeId: 'green_field_farm', label: 'Green Field Farm', kind: 'pickup', quantityKg: 300, window: 'Today · 6–7 PM', status: 'upcoming' },
  { placeId: 'sonipat_hub', label: 'Sonipat hub', kind: 'hub', quantityKg: 1600, window: 'Today · 8 PM', status: 'upcoming' },
  { placeId: 'okhla_dc', label: 'FreshKart Okhla DC', kind: 'drop', quantityKg: 1600, window: 'Tomorrow · 6–10 AM', status: 'upcoming' },
]
