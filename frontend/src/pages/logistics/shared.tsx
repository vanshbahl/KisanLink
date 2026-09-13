import { Check, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { resolvePlace } from '../../data/geo'
import type {
  RouteStop,
  Delivery,
  DeliveryStatus,
  LogisticsPickup,
  LogisticsPickupStatus,
  VehicleStatus,
} from '../../types'
export function stopsForRoute(
  route:
    | {
        routeStops?: RouteStop[]
        stops: string[]
        pickups: string[]
        loadKg: number
      }
    | undefined,
  pickups: LogisticsPickup[],
  deliveries: Delivery[],
): RouteStop[] {
  if (!route) return []
  if (route.routeStops?.length) {
    // Statuses live on the pickup records, which the operator is actively changing.
    return route.routeStops.map((stop) => {
      const pickup = stop.refId
        ? pickups.find((item) => item.id === stop.refId)
        : undefined
      if (!pickup) {
        const delivery = stop.refId
          ? deliveries.find((item) => item.id === stop.refId)
          : undefined
        return delivery
          ? {
              ...stop,
              quantityKg: delivery.quantityKg,
              status:
                delivery.status === 'delivered'
                  ? 'done'
                  : ['in_transit', 'at_hub', 'out_for_delivery'].includes(
                        delivery.status,
                      )
                    ? 'current'
                    : 'upcoming',
            }
          : stop
      }
      const status: RouteStop['status'] = ['completed', 'loaded'].includes(
        pickup.status,
      )
        ? 'done'
        : pickup.status === 'en_route' || pickup.status === 'arrived'
          ? 'current'
          : 'upcoming'
      return { ...stop, status, quantityKg: pickup.quantityKg }
    })
  }
  const derived: RouteStop[] = []
  for (const name of route.stops) {
    const place = resolvePlace(name)
    if (!place) continue
    const pickup = pickups.find(
      (item) => resolvePlace(item.farm)?.id === place.id,
    )
    const delivery = deliveries.find(
      (item) => resolvePlace(item.destination)?.id === place.id,
    )
    derived.push({
      placeId: place.id,
      label: place.label,
      kind: place.id === 'sonipat_hub' ? 'hub' : delivery ? 'drop' : 'pickup',
      refId: pickup?.id ?? delivery?.id,
      quantityKg: pickup?.quantityKg ?? delivery?.quantityKg ?? route.loadKg,
      window: pickup?.pickupWindow ?? delivery?.eta,
      status:
        delivery?.status === 'delivered'
          ? 'done'
          : pickup && ['completed', 'loaded'].includes(pickup.status)
            ? 'done'
            : 'upcoming',
    })
  }
  return derived
}

export const pickupSteps: LogisticsPickupStatus[] = [
  'unassigned',
  'assigned',
  'en_route',
  'arrived',
  'loaded',
  'completed',
  'issue',
]
export const deliverySteps: DeliveryStatus[] = [
  'scheduled',
  'loaded',
  'in_transit',
  'at_hub',
  'out_for_delivery',
  'delivered',
  'issue',
]
export const labels = {
  pickup: {
    unassigned: ['Unassigned', 'वाहन तय नहीं'],
    assigned: ['Assigned', 'वाहन तय'],
    en_route: ['En Route', 'रास्ते में'],
    arrived: ['Arrived', 'पहुंच गया'],
    loaded: ['Loaded', 'लोड हुआ'],
    completed: ['Completed', 'पूरा हुआ'],
    issue: ['Issue', 'समस्या'],
  } as Record<LogisticsPickupStatus, [string, string]>,
  delivery: {
    scheduled: ['Scheduled', 'तय हुई'],
    loaded: ['Loaded', 'लोड हुआ'],
    in_transit: ['In Transit', 'रास्ते में'],
    at_hub: ['At Hub', 'हब पर'],
    out_for_delivery: ['Out for Delivery', 'डिलीवरी के लिए निकला'],
    delivered: ['Delivered', 'डिलीवरी हुई'],
    issue: ['Issue', 'समस्या'],
  } as Record<DeliveryStatus, [string, string]>,
  vehicle: {
    available: ['Available', 'उपलब्ध'],
    assigned: ['Assigned', 'असाइन किया'],
    in_transit: ['In Transit', 'रास्ते में'],
    maintenance: ['Maintenance', 'रखरखाव'],
  } as Record<VehicleStatus, [string, string]>,
}

/** Compact stop progress that sits inside the live route card. */
export function RouteProgress({ stops }: { stops: RouteStop[] }) {
  const { l } = useCopy()
  const done = stops.filter((s) => s.status === 'done').length
  const next =
    stops.find((s) => s.status === 'current') ??
    stops.find((s) => s.status !== 'done')
  return (
    <div className="route-progress">
      <ol
        className="route-progress-track"
        aria-label={l('Route progress', 'रूट प्रगति')}
      >
        {stops.map((s, i) => (
          <li
            key={`${s.placeId}-${i}`}
            className={s.status ?? 'upcoming'}
            title={s.label}
          />
        ))}
      </ol>
      <p>
        <strong>
          {done} {l('of', 'में से')} {stops.length}{' '}
          {l('stops completed', 'स्टॉप पूरे')}
        </strong>
        {next && (
          <>
            <span aria-hidden="true">•</span>
            {l('Next', 'अगला')}: {next.label}
          </>
        )}
      </p>
      <small>
        {l(
          'Recorded operational state. Map is a corridor schematic.',
          'दर्ज संचालन स्थिति। मानचित्र कॉरिडोर का आरेख है।',
        )}
      </small>
    </div>
  )
}
export function useCopy() {
  const { language } = useLanguage()
  return {
    language,
    l: (en: string, hi: string) => (language === 'hi' ? hi : en),
  }
}
export const tone = (status: string) =>
  status === 'issue'
    ? 'red'
    : ['completed', 'delivered', 'available'].includes(status)
      ? 'green'
      : 'amber'

export function InfoGrid({ items }: { items: string[][] }) {
  return (
    <div className="logistics-info-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}
export function Timeline({
  items,
  language,
}: {
  items: LogisticsPickup['timeline']
  language: 'en' | 'hi'
}) {
  return (
    <div className="operation-timeline">
      <h2>{language === 'hi' ? 'समयरेखा' : 'Timeline'}</h2>
      {items.map((item, index) => (
        <div key={`${item.at}-${index}`}>
          <span>
            <Check size={13} />
          </span>
          <div>
            <strong>{language === 'hi' ? item.labelHi : item.label}</strong>
            <small>
              {new Date(item.at).toLocaleString(
                language === 'hi' ? 'hi-IN' : 'en-IN',
                { dateStyle: 'medium', timeStyle: 'short' },
              )}
            </small>
          </div>
        </div>
      ))}
    </div>
  )
}
export function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...(type === 'tel'
          ? { inputMode: 'tel' as const, autoComplete: 'tel', maxLength: 10 }
          : {})}
      />
    </label>
  )
}
export function ErrorState({
  title = 'Unable to load operations',
}: {
  title?: string
}) {
  return (
    <div className="error-panel">
      <RefreshCw size={25} />
      <h2>{title}</h2>
      <button
        className="btn btn-primary"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  )
}
