import { useMemo, useState } from 'react'
import { Building2, Check, Clock3, Navigation, Sprout, Truck, Warehouse } from 'lucide-react'
import { distanceKm, placeById, type GeoPlace } from '../../data/geo'
import { useLanguage } from '../../contexts/LanguageContext'
import { usePrefersReducedMotion } from '../ai/useReducedMotion'
import type { RouteStop } from '../../types'
import { daysUntil } from '../../utils/dates'

/**
 * The corridor map.
 *
 * This deliberately does not use a tile service. The previous implementation loaded a vector
 * basemap from a CDN; its style resolved but its tiles never did, leaving an empty white
 * rectangle with a few markers floating in it — and, worse, an operations surface whose
 * correctness depended on a third party being reachable during a live demo.
 *
 * What an operator actually needs from this view is the shape of the run: which farms, in
 * what order, how far apart, where the load consolidates and where it lands. All of that is
 * geometry we already hold, so the map is drawn from real WGS84 coordinates projected into
 * an SVG. It renders identically offline, on a phone, and on a projector, and it can say
 * things a basemap cannot — leg distances, cumulative load, which stop the truck is at.
 */

export interface CorridorLeg {
  from: GeoPlace
  to: GeoPlace
  km: number
}

export interface MappedStop extends RouteStop {
  place: GeoPlace
  x: number
  y: number
  /** Kilograms on board after this stop. */
  cumulativeKg: number
  /** Vertical nudge applied to this stop's label to avoid its neighbour. */
  labelDy: number
  /** +1 draws the label to the right of the node, -1 to the left. */
  labelOutward: 1 | -1
}

interface Props {
  title?: string
  subtitle?: string
  stops: RouteStop[]
  /** Vehicle and route context shown above the drawing. */
  meta?: { routeId?: string; vehicle?: string; distanceKm?: number; durationMinutes?: number; loadKg?: number; capacityKg?: number; eta?: string }
  /** Compact form for a detail sidebar: drawing only, no stop list. */
  variant?: 'full' | 'compact'
}

const VIEW_W = 760
const VIEW_H = 460
const PAD_X = 96
const PAD_Y = 66

/** Web Mercator, which keeps the NCR corridor's north–south run visually honest. */
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2))

const KIND_ICON = { pickup: Sprout, hub: Warehouse, drop: Building2 } as const

/**
 * Operational records store a window as "2026-09-08 · 6–10 AM". A judge should read a day,
 * not an ISO date, so the leading date is humanised while the window is left alone.
 */
export function prettyWhen(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})/, (match) => {
    const date = new Date(`${match}T00:00:00`)
    if (!Number.isFinite(date.getTime())) return match
    const days = daysUntil(match)
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days === -1) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  })
}

export function CorridorRouteMap({ title, subtitle, stops, meta, variant = 'full' }: Props) {
  const { language } = useLanguage()
  const reduced = usePrefersReducedMotion()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [selected, setSelected] = useState<string | null>(null)

  const { mapped, legs, path, gridLats, gridLngs } = useMemo(() => {
    const resolved = stops
      .map((stop) => ({ stop, place: placeById(stop.placeId) }))
      .filter((entry): entry is { stop: RouteStop; place: GeoPlace } => Boolean(entry.place))

    if (resolved.length === 0) return { mapped: [] as MappedStop[], legs: [] as CorridorLeg[], path: '', gridLats: [] as number[], gridLngs: [] as number[] }

    const lats = resolved.map((entry) => entry.place.lat)
    const lngs = resolved.map((entry) => entry.place.lng)
    // A single-stop route would divide by zero; a minimum span also stops two nearby farms
    // from being drawn a screen apart.
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const spanLng = Math.max(0.25, maxLng - minLng)
    const spanLat = Math.max(0.25, maxLat - minLat)
    const midLng = (minLng + maxLng) / 2
    const midLat = (minLat + maxLat) / 2

    const x0 = midLng - spanLng / 2
    const x1 = midLng + spanLng / 2
    const y0 = mercatorY(midLat - spanLat / 2)
    const y1 = mercatorY(midLat + spanLat / 2)

    const project = (place: GeoPlace) => ({
      x: PAD_X + ((place.lng - x0) / (x1 - x0)) * (VIEW_W - PAD_X * 2),
      // SVG y grows downward; north must stay at the top.
      y: VIEW_H - PAD_Y - ((mercatorY(place.lat) - y0) / (y1 - y0)) * (VIEW_H - PAD_Y * 2),
    })

    let running = 0
    const mapped: MappedStop[] = resolved.map(({ stop, place }) => {
      if (stop.kind === 'pickup') running += stop.quantityKg ?? 0
      return { ...stop, place, ...project(place), cumulativeKg: stop.kind === 'pickup' ? running : (stop.quantityKg ?? running), labelDy: 0, labelOutward: 1 as 1 | -1 }
    })

    const legs: CorridorLeg[] = mapped.slice(0, -1).map((from, index) => ({
      from: from.place, to: mapped[index + 1].place, km: distanceKm(from.place, mapped[index + 1].place),
    }))

    // A gentle Catmull-Rom-ish smoothing: real roads are not polylines, and a softened path
    // reads as a route rather than as a chart.
    const path = mapped.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      const prev = mapped[index - 1]
      const cx = (prev.x + point.x) / 2
      return `${acc} C ${cx.toFixed(1)} ${prev.y.toFixed(1)} ${cx.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    }, '')

    // Nodes on a diagonal corridor can land close together. Nudging a label vertically when
    // its neighbour is nearby keeps every stop readable without moving the node itself.
    let lastLabel: { x: number; y: number; outward: 1 | -1 } | null = null
    for (const point of mapped) {
      let outward: 1 | -1 = point.x < VIEW_W / 2 ? 1 : -1
      let dy = 0
      if (lastLabel && Math.hypot(point.x - lastLabel.x, point.y - lastLabel.y) < 104) {
        // Push it clear vertically *and* to the opposite side, so a close pair separates on
        // both axes rather than merely sliding one label under the other.
        dy = 30
        outward = lastLabel.outward === 1 ? -1 : 1
      }
      // A flip must never push a label off the drawing. Nodes near an edge always label
      // inwards, whatever their neighbour did.
      if (point.x < PAD_X + 40) outward = 1
      else if (point.x > VIEW_W - PAD_X - 40) outward = -1
      point.labelDy = dy
      point.labelOutward = outward
      lastLabel = { x: point.x, y: point.y + dy, outward }
    }

    const step = (value: number) => Math.round(value * 4) / 4
    const gridLats = [step(minLat), step(midLat), step(maxLat)]
    const gridLngs = [step(minLng), step(midLng), step(maxLng)]
    return { mapped, legs, path, gridLats, gridLngs }
  }, [stops])

  if (mapped.length === 0) {
    return (
      <div className="corridor-card">
        <div className="corridor-empty"><Navigation size={22} /><strong>{l('No mapped stops on this route', 'इस रूट पर कोई स्टॉप नहीं')}</strong><p>{l('Stops appear here once a pickup or delivery is assigned.', 'पिकअप या डिलीवरी तय होते ही स्टॉप यहां दिखेंगे।')}</p></div>
      </div>
    )
  }

  const currentIndex = Math.max(0, mapped.findIndex((stop) => stop.status === 'current'))
  const totalKg = mapped.filter((stop) => stop.kind === 'pickup').reduce((sum, stop) => sum + (stop.quantityKg ?? 0), 0)
  const active = selected ? mapped.find((stop) => stop.placeId + stop.label === selected) ?? null : null

  return (
    <div className={`corridor-card is-${variant}`}>
      <div className="corridor-head">
        <div className="corridor-head-title">
          <span className="corridor-head-icon"><Navigation size={16} /></span>
          <div>
            <h3>{title ?? l('Collection corridor', 'संग्रह कॉरिडोर')}</h3>
            <p>{subtitle ?? l(`${mapped.filter((stop) => stop.kind === 'pickup').length} farm pickups → consolidation → buyer`, 'खेत पिकअप → एकत्रीकरण → खरीदार')}</p>
          </div>
        </div>
        <div className="corridor-legend">
          <span><i className="dot-pickup" />{l('Farm', 'खेत')}</span>
          <span><i className="dot-hub" />{l('Hub', 'हब')}</span>
          <span><i className="dot-drop" />{l('Buyer', 'खरीदार')}</span>
        </div>
      </div>

      {meta && (
        <div className="corridor-meta">
          {meta.routeId && <span><strong>{meta.routeId}</strong><small>{l('Route', 'रूट')}</small></span>}
          {meta.vehicle && <span><strong>{meta.vehicle}</strong><small>{l('Vehicle', 'वाहन')}</small></span>}
          {typeof meta.distanceKm === 'number' && <span><strong>{meta.distanceKm} km</strong><small>{l('Distance', 'दूरी')}</small></span>}
          {typeof meta.durationMinutes === 'number' && <span><strong>{Math.floor(meta.durationMinutes / 60)}h {meta.durationMinutes % 60}m</strong><small>{l('Driving', 'ड्राइविंग')}</small></span>}
          {typeof meta.loadKg === 'number' && <span><strong>{meta.loadKg.toLocaleString('en-IN')} kg{meta.capacityKg ? ` · ${Math.round((meta.loadKg / meta.capacityKg) * 100)}%` : ''}</strong><small>{l('Load', 'भार')}</small></span>}
          {meta.eta && <span><strong>{prettyWhen(meta.eta)}</strong><small>{l('ETA', 'ETA')}</small></span>}
        </div>
      )}

      <div className="corridor-canvas">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" preserveAspectRatio="xMidYMid meet"
          aria-label={l(
            `Route map: ${mapped.map((stop) => stop.label).join(' then ')}`,
            `रूट: ${mapped.map((stop) => stop.label).join(' फिर ')}`,
          )}>
          <defs>
            <linearGradient id="corridor-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3f7f2" />
              <stop offset="100%" stopColor="#eaf0ea" />
            </linearGradient>
            <linearGradient id="corridor-line" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f7d55" />
              <stop offset="100%" stopColor="#1d5238" />
            </linearGradient>
            <filter id="corridor-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1f2924" floodOpacity="0.22" />
            </filter>
          </defs>

          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} rx="16" fill="url(#corridor-ground)" />

          {/* Graticule: enough geography to orient, not enough to compete with the route. */}
          <g className="corridor-grid" aria-hidden="true">
            {gridLats.map((lat, index) => {
              const y = PAD_Y + ((gridLats.length - 1 - index) / Math.max(1, gridLats.length - 1)) * (VIEW_H - PAD_Y * 2)
              return <g key={`lat-${lat}-${index}`}><line x1={PAD_X - 34} y1={y} x2={VIEW_W - PAD_X + 34} y2={y} /><text x={PAD_X - 40} y={y + 3.5} textAnchor="end">{lat.toFixed(2)}°N</text></g>
            })}
            {gridLngs.map((lng, index) => {
              const x = PAD_X + (index / Math.max(1, gridLngs.length - 1)) * (VIEW_W - PAD_X * 2)
              return <g key={`lng-${lng}-${index}`}><line x1={x} y1={PAD_Y - 26} x2={x} y2={VIEW_H - PAD_Y + 26} /><text x={x} y={VIEW_H - PAD_Y + 42} textAnchor="middle">{lng.toFixed(2)}°E</text></g>
            })}
          </g>

          <text className="corridor-watermark" x={VIEW_W - 18} y={28} textAnchor="end">{l('Delhi NCR sourcing corridor', 'दिल्ली NCR सोर्सिंग कॉरिडोर')}</text>

          {/* The route: a solid spine, then a flowing overlay on the leg being driven. */}
          <path d={path} className="corridor-path-base" />
          {!reduced && <path d={path} className="corridor-path-flow" />}

          {legs.map((leg, index) => {
            const from = mapped[index]
            const to = mapped[index + 1]
            const dx = to.x - from.x
            const dy = to.y - from.y
            const length = Math.hypot(dx, dy)
            // A chip on a very short leg collides with both its own nodes; the stop list
            // below carries the same information, so it is simply omitted here.
            if (length < 74) return null
            // Offset perpendicular to the leg so the chip sits beside the road, not on it.
            const nx = (-dy / length) * 17
            const ny = (dx / length) * 17
            const mx = (from.x + to.x) / 2 + nx
            const my = (from.y + to.y) / 2 + ny
            return (
              <g key={`leg-${index}`} className="corridor-leg-label">
                <rect x={mx - 22} y={my - 9} width="44" height="18" rx="9" />
                <text x={mx} y={my + 4} textAnchor="middle">{leg.km} km</text>
              </g>
            )
          })}

          {mapped.map((stop, index) => {
            const isCurrent = stop.status === 'current'
            const isDone = stop.status === 'done'
            const key = stop.placeId + stop.label
            // Left of centre gets a right-hand label and vice versa, so no label is ever
            // drawn across the path or off the edge of the viewBox.
            const outward = stop.labelOutward
            const anchor = outward === 1 ? 'start' : 'end'
            // Glyphs are drawn as plain SVG rather than as nested icon components: a nested
            // <svg> inside a transformed <g> establishes its own viewport, which is exactly
            // the kind of thing that renders correctly in one browser and not the next.
            const seq = mapped.slice(0, index + 1).filter((entry) => entry.kind === 'pickup').length
            return (
              <g
                key={key}
                className={`corridor-stop is-${stop.kind} ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${active === stop ? 'is-selected' : ''}`}
                transform={`translate(${stop.x} ${stop.y})`}
                onClick={() => setSelected(selected === key ? null : key)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(selected === key ? null : key) } }}
                aria-label={`${stop.label}${stop.quantityKg ? `, ${stop.quantityKg} kg` : ''}`}
              >
                {isCurrent && !reduced && <circle className="corridor-pulse" r="15" />}
                {stop.kind === 'hub'
                  ? <rect className="corridor-node" x="-11" y="-11" width="22" height="22" rx="5" transform="rotate(45)" filter="url(#corridor-shadow)" />
                  : stop.kind === 'drop'
                    ? <rect className="corridor-node" x="-12" y="-12" width="24" height="24" rx="6" filter="url(#corridor-shadow)" />
                    : <circle className="corridor-node" r="13" filter="url(#corridor-shadow)" />}
                {isDone
                  ? <path className="corridor-node-tick" d="M -5 0 L -1.5 3.5 L 5 -3.5" />
                  : stop.kind === 'pickup'
                    ? <text className="corridor-node-glyph" y="4" textAnchor="middle">{seq}</text>
                    : stop.kind === 'hub'
                      ? <text className="corridor-node-glyph" y="4" textAnchor="middle">H</text>
                      : <text className="corridor-node-glyph" y="4" textAnchor="middle">B</text>}
                {/* The corridor runs diagonally, so labels are pushed sideways away from
                    the route rather than stacked above it, where they would sit on the
                    line and on each other. */}
                <g className="corridor-node-label" transform={`translate(${outward * 21} ${stop.labelDy})`}>
                  <text textAnchor={anchor} y="-2" className="corridor-node-name">{stop.label}</text>
                  <text textAnchor={anchor} y="12" className="corridor-node-sub">
                    {stop.place.district}{stop.quantityKg ? ` · ${stop.quantityKg.toLocaleString('en-IN')} kg` : ''}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {active && (
          <div className="corridor-popover" role="status">
            <div className="corridor-popover-head">
              <strong>{active.label}</strong>
              <button type="button" onClick={() => setSelected(null)} aria-label={l('Close', 'बंद करें')}>✕</button>
            </div>
            <p>{active.place.district}</p>
            {active.quantityKg ? <p><b>{l('Load at this stop', 'इस स्टॉप पर भार')}:</b> {active.quantityKg.toLocaleString('en-IN')} kg · {l('on board', 'गाड़ी में')} {active.cumulativeKg.toLocaleString('en-IN')} kg</p> : null}
            {active.window && <p><b>{l('Window', 'समय')}:</b> {active.window}</p>}
            {active.refId && <p><b>{l('Reference', 'संदर्भ')}:</b> {active.refId}</p>}
          </div>
        )}
      </div>

      {variant === 'full' && (
        <ol className="corridor-stoplist">
          {mapped.map((stop, index) => {
            const Icon = KIND_ICON[stop.kind]
            return (
              <li key={stop.placeId + stop.label} className={`is-${stop.kind} ${stop.status ? `is-${stop.status}` : ''}`}>
                <span className="corridor-stoplist-marker">{stop.status === 'done' ? <Check size={13} /> : <Icon size={13} />}</span>
                <div className="corridor-stoplist-body">
                  <strong>{stop.kind === 'pickup' ? `${index + 1}. ` : ''}{stop.label}</strong>
                  <small>{stop.place.district}{stop.refId ? ` · ${stop.refId}` : ''}</small>
                </div>
                <div className="corridor-stoplist-meta">
                  {stop.quantityKg ? <strong>{stop.quantityKg.toLocaleString('en-IN')} kg</strong> : <strong>—</strong>}
                  {stop.window && <small><Clock3 size={10} /> {prettyWhen(stop.window)}</small>}
                </div>
                <span className={`corridor-stoplist-state is-${stop.status ?? 'upcoming'}`}>
                  {stop.status === 'done' ? l('Done', 'पूरा') : stop.status === 'current' ? l('Now', 'अभी') : l('Next', 'अगला')}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {variant === 'full' && (
        <p className="corridor-foot">
          <Truck size={13} />
          {l(
            `${totalKg.toLocaleString('en-IN')} kg collected across ${mapped.filter((stop) => stop.kind === 'pickup').length} farms on one trip. Currently at stop ${currentIndex + 1} of ${mapped.length}.`,
            `${mapped.filter((stop) => stop.kind === 'pickup').length} खेतों से एक ही यात्रा में ${totalKg.toLocaleString('en-IN')} किलो। अभी ${mapped.length} में से स्टॉप ${currentIndex + 1}।`,
          )}
        </p>
      )}
    </div>
  )
}
