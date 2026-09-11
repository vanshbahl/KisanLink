import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Activity, MapPinOff, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export interface CorridorNode {
  id: string
  type: 'FARMER' | 'BUYER' | 'HUB'
  name: string
  locationName: string
  cropName: string
  quantityKg: number
  latitude: number
  longitude: number
}

export interface CorridorRoute {
  id: string
  shipmentCode: string
  originName: string
  destinationName: string
  cropName: string
  quantityKg: number
  distanceKm: number
  status: 'IN_TRANSIT' | 'ASSIGNED' | 'DELIVERED' | 'PICKUP_IN_PROGRESS'
  /** [lng, lat] — GeoJSON order, matching what maplibre expects. */
  farmerCoords: [number, number]
  buyerCoords: [number, number]
}

interface DigitalTwinCorridorMapProps {
  nodes?: CorridorNode[]
  routes?: CorridorRoute[]
  /** Optional override; by default the card sizes itself responsively from CSS. */
  height?: string
}

// Sourcing corridor nodes covering Murthal, Rai, Samalkha, Sonipat Hub & Delhi drops
const defaultNodes: CorridorNode[] = [
  { id: 'node-murthal', type: 'FARMER', name: 'Ramesh Sharma (Green Field Farm)', locationName: 'Murthal, Sonipat', cropName: 'Fresh Tomatoes (Grade A)', quantityKg: 1200, latitude: 28.9912, longitude: 77.0125 },
  { id: 'node-rai', type: 'FARMER', name: 'Suresh Kumar (Nandi Organic Plot)', locationName: 'Rai, Sonipat', cropName: 'Baby Spinach (Grade A+)', quantityKg: 800, latitude: 29.0200, longitude: 77.0500 },
  { id: 'node-samalkha', type: 'FARMER', name: 'Balbir Singh (Rana Veg Farm)', locationName: 'Samalkha, Panipat', cropName: 'Fresh Tomatoes (Grade A)', quantityKg: 1700, latitude: 29.3900, longitude: 76.9600 },
  { id: 'node-hub', type: 'HUB', name: 'Sonipat Consolidation Hub', locationName: 'Kundli, Sonipat', cropName: 'Pooled Multi-Crop Load', quantityKg: 3700, latitude: 28.8628, longitude: 77.1167 },
  { id: 'node-azadpur', type: 'BUYER', name: 'Azadpur Mandi Hub & Bulk Mart', locationName: 'Azadpur, New Delhi', cropName: 'Consolidated Produce', quantityKg: 2500, latitude: 28.7041, longitude: 77.1725 },
  { id: 'node-okhla', type: 'BUYER', name: 'The Imperial Hotel / Okhla Center', locationName: 'Connaught Place / Okhla, New Delhi', cropName: 'Direct Hotel & Group Buy Supply', quantityKg: 1200, latitude: 28.6315, longitude: 77.2167 },
]

const defaultRoutes: CorridorRoute[] = [
  { id: 'route-1', shipmentCode: 'SHP-2026-MUR01', originName: 'Murthal → Rai → Sonipat Hub', destinationName: 'Azadpur Wholesale Hub', cropName: 'Tomatoes & Spinach', quantityKg: 2000, distanceKm: 64.0, status: 'IN_TRANSIT', farmerCoords: [77.0125, 28.9912], buyerCoords: [77.1725, 28.7041] },
  { id: 'route-2', shipmentCode: 'SHP-2026-SAM02', originName: 'Samalkha Farmgate', destinationName: 'Okhla Distribution Center', cropName: 'Fresh Tomatoes', quantityKg: 1700, distanceKm: 92.5, status: 'ASSIGNED', farmerCoords: [76.9600, 29.3900], buyerCoords: [77.2167, 28.6315] },
]

const markerColor = (type: CorridorNode['type']) => type === 'FARMER' ? '#236747' : type === 'HUB' ? '#c2802a' : '#4a76a8'

/** Curves a straight A→B leg so overlapping corridors stay individually readable. */
function arc([ax, ay]: [number, number], [bx, by]: [number, number], steps = 48): [number, number][] {
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  // Perpendicular offset, scaled to leg length so short legs bend less than long ones.
  const dx = bx - ax
  const dy = by - ay
  const bend = 0.12
  const cx = mx - dy * bend
  const cy = my + dx * bend
  const points: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    points.push([u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by])
  }
  return points
}

export const DigitalTwinCorridorMap: FC<DigitalTwinCorridorMapProps> = ({ nodes, routes, height }) => {
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [selectedItem, setSelectedItem] = useState<{ type: 'NODE' | 'ROUTE'; data: CorridorNode | CorridorRoute } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  // Props default to `undefined` rather than `[]` so these identities are stable across
  // renders. The previous `= []` defaults produced a fresh array every render, which made
  // the init effect re-run — and tear the map down — on every state change, including the
  // one caused by clicking a marker.
  const activeNodes = useMemo(() => (nodes && nodes.length > 0 ? nodes : defaultNodes), [nodes])
  const activeRoutes = useMemo(() => (routes && routes.length > 0 ? routes : defaultRoutes), [routes])

  const fitToContent = useCallback((map: maplibregl.Map) => {
    const coords: [number, number][] = [
      ...activeNodes.map((node) => [node.longitude, node.latitude] as [number, number]),
      ...activeRoutes.flatMap((route) => [route.farmerCoords, route.buyerCoords]),
    ].filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    if (coords.length === 0) return
    const bounds = coords.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]))
    map.fitBounds(bounds, { padding: { top: 48, bottom: 56, left: 40, right: 40 }, maxZoom: 11, duration: 0 })
  }, [activeNodes, activeRoutes])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let map: maplibregl.Map
    try {
      const probe = document.createElement('canvas')
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { setStatus('failed'); return }
      map = new maplibregl.Map({
        container,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [77.1025, 29.0],
        zoom: 8,
        attributionControl: false,
      })
    } catch {
      setStatus('failed')
      return
    }

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    // React StrictMode mounts this effect twice in development. The first map is removed
    // immediately, but its in-flight style request still resolves — without this guard its
    // failure would be written into the state of the instance that is actually on screen.
    let disposed = false

    // A style that never loads (offline, blocked CDN) must surface the fallback rather than
    // leaving a grey canvas behind. A backgrounded tab is not a failure: browsers suspend
    // the animation frames maplibre loads on, so the clock only runs while visible.
    // `style.load` means "the style is parsed and addSource/addLayer are safe". That is the
    // real gate for drawing. `isStyleLoaded()` is stricter — it also waits on every source
    // and tile — and can stay false indefinitely, which is what previously stalled the map:
    // the draw pass kept early-returning, so markers, routes and the ready state never came.
    let styleReady = false
    let failTimer = 0
    const armFailTimer = () => {
      window.clearTimeout(failTimer)
      if (document.hidden) return
      failTimer = window.setTimeout(() => { if (!disposed && !styleReady) setStatus('failed') }, 12000)
    }
    armFailTimer()

    const onVisibility = () => {
      if (disposed) return
      armFailTimer()
      // Coming back to the tab: re-measure and, if the style did land while hidden, draw.
      if (!document.hidden) { map.resize(); safeDraw() }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Readiness is a property of the map, not of our drawing pass. Deriving it from `draw`
    // meant a single early return (or a throw) left the loading shimmer covering a map that
    // was rendering perfectly well underneath it.
    let ready = false
    const markReady = () => {
      if (disposed || ready) return
      ready = true
      window.clearTimeout(failTimer)
      setStatus('ready')
    }

    map.on('error', (event) => {
      // Once the map is up, a failed individual tile is not a failed map.
      if (disposed || ready || styleReady) return
      console.warn('[corridor-map]', event.error?.message ?? event)
      setStatus('failed')
    })

    const draw = () => {
      if (disposed || !styleReady) return
      activeRoutes.forEach((route) => {
        const sourceId = `route-source-${route.id}`
        const layerId = `route-layer-${route.id}`
        const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: { id: route.id },
          geometry: { type: 'LineString', coordinates: arc(route.farmerCoords, route.buyerCoords) },
        }
        if (map.getSource(sourceId)) {
          ;(map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson)
        } else {
          map.addSource(sourceId, { type: 'geojson', data: geojson })
        }
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': route.status === 'DELIVERED' ? '#8aa398' : '#236747',
              'line-width': 3.5,
              'line-opacity': .9,
              // A [1, 0] dash array is invalid (zero-length gap) and silently drops the
              // line on some GPUs — a solid line is expressed by omitting the property.
              ...(route.status === 'ASSIGNED' ? { 'line-dasharray': [2, 1.6] as [number, number] } : {}),
            },
          })
          map.on('click', layerId, () => setSelectedItem({ type: 'ROUTE', data: route }))
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
        }
      })

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = activeNodes
        .filter((node) => Number.isFinite(node.longitude) && Number.isFinite(node.latitude))
        .map((node) => {
          const el = document.createElement('button')
          el.type = 'button'
          // Deliberately not `.corridor-node-dot`: that class carries a `margin-right`
          // used by the text legend, which offsets a maplibre marker from its anchor.
          el.className = `corridor-marker corridor-marker-${node.type.toLowerCase()}`
          el.setAttribute('aria-label', node.name)
          el.style.backgroundColor = markerColor(node.type)
          el.addEventListener('click', (event) => { event.stopPropagation(); setSelectedItem({ type: 'NODE', data: node }) })
          return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([node.longitude, node.latitude]).addTo(map)
        })

      fitToContent(map)
      map.resize()
      markReady()
    }

    // `draw` is idempotent (it checks for existing sources and layers), so it is safe to
    // attach to every event that can mean "the style is usable now"; `idle` is kept as a
    // retry point in case the first pass ran before the container had its final size.
    const safeDraw = () => { try { draw() } catch (reason) { console.warn('[corridor-map] draw', reason); markReady() } }
    const onStyleReady = () => { styleReady = true; markReady(); safeDraw() }
    map.on('style.load', onStyleReady)
    map.on('load', onStyleReady)
    map.on('idle', safeDraw)

    // The card can be laid out (sidebar collapse, viewport resize, tab reveal) after the
    // map is created; without this the canvas keeps its first measured size and clips.
    const observer = new ResizeObserver(() => { map.resize() })
    observer.observe(container)

    return () => {
      disposed = true
      window.clearTimeout(failTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      mapRef.current = null
      map.remove()
    }
  }, [activeNodes, activeRoutes, fitToContent, attempt])

  const retry = () => { setStatus('loading'); setAttempt((value) => value + 1) }

  return (
    <div className="corridor-map-card">
      <div className="corridor-map-head">
        <div className="corridor-map-title">
          <span className="corridor-map-icon"><Activity size={16} /></span>
          <div>
            <h3>{language === 'hi' ? 'डिजिटल ट्विन कॉरिडोर मैप' : 'Digital twin corridor map'}</h3>
            <p>{language === 'hi' ? 'सांकेतिक सोर्सिंग मार्ग व शिपमेंट स्थिति' : 'Representative sourcing corridor & shipment status'}</p>
          </div>
        </div>
        <div className="corridor-legend">
          <span><i style={{ background: '#236747' }} />{language === 'hi' ? 'किसान' : 'Farmer'}</span>
          <span><i style={{ background: '#c2802a' }} />{language === 'hi' ? 'हब' : 'Hub'}</span>
          <span><i style={{ background: '#4a76a8' }} />{language === 'hi' ? 'खरीदार' : 'Buyer'}</span>
        </div>
      </div>

      <div className="corridor-map-canvas" style={height ? { height } : undefined}>
        <div ref={containerRef} className="corridor-map-surface" aria-hidden={status === 'failed'} />

        {status === 'loading' && <div className="corridor-map-loading" aria-hidden="true" />}

        {status === 'failed' && (
          <div className="corridor-map-fallback" role="status">
            <div className="corridor-fallback-head">
              <MapPinOff size={20} />
              <div>
                <strong>{language === 'hi' ? 'मैप उपलब्ध नहीं है' : 'Map unavailable'}</strong>
                <small>{language === 'hi' ? 'नीचे वही कॉरिडोर टेक्स्ट में दिया है।' : 'The same corridor is listed below in text.'}</small>
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={retry}><RefreshCw size={14} /> {language === 'hi' ? 'फिर कोशिश करें' : 'Retry'}</button>
            </div>
            <div className="corridor-fallback-list">
              {activeRoutes.map((route) => (
                <div key={route.id} className="corridor-node-card">
                  <strong>{route.originName} → {route.destinationName}</strong>
                  <p>{route.cropName} · {route.quantityKg.toLocaleString()} kg · {route.distanceKm} km · {route.status.replaceAll('_', ' ').toLowerCase()}</p>
                </div>
              ))}
              {activeNodes.map((node) => (
                <button key={node.id} type="button" className={`corridor-node-card ${node.type === 'FARMER' ? 'farmer' : 'buyer'}`} onClick={() => setSelectedItem({ type: 'NODE', data: node })}>
                  <span className="corridor-node-dot" style={{ background: markerColor(node.type) }} />
                  <strong>{node.name}</strong>
                  <p>{node.locationName} · {node.cropName} · {node.quantityKg.toLocaleString()} kg</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="corridor-popover">
            <div className="corridor-popover-head">
              <strong><ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{selectedItem.type === 'NODE' ? 'Node details' : 'Route details'}</strong>
              <button className="corridor-popover-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            {selectedItem.type === 'NODE' ? (
              <>
                <p><b>Name:</b> {(selectedItem.data as CorridorNode).name}</p>
                <p><b>Location:</b> {(selectedItem.data as CorridorNode).locationName}</p>
                <p><b>Crop:</b> {(selectedItem.data as CorridorNode).cropName} · {(selectedItem.data as CorridorNode).quantityKg.toLocaleString()} kg</p>
              </>
            ) : (
              <>
                <p><b>Shipment:</b> {(selectedItem.data as CorridorRoute).shipmentCode}</p>
                <p><b>Route:</b> {(selectedItem.data as CorridorRoute).originName} → {(selectedItem.data as CorridorRoute).destinationName}</p>
                <p><b>Distance:</b> {(selectedItem.data as CorridorRoute).distanceKm} km · {(selectedItem.data as CorridorRoute).status}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
