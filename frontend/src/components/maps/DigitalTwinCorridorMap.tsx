import { useEffect, useRef, useState, type FC } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Activity, ShieldCheck } from 'lucide-react'
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
  farmerCoords: [number, number]
  buyerCoords: [number, number]
}

interface DigitalTwinCorridorMapProps {
  nodes?: CorridorNode[]
  routes?: CorridorRoute[]
  height?: string
}

// Representative Delhi-NCR sourcing corridor shown until real shipment/order geometry
// is wired in — same "deterministic demo" convention used elsewhere on this page.
const defaultNodes: CorridorNode[] = [
  { id: 'node-1', type: 'FARMER', name: 'Ramesh Kumar (Karnal Cluster)', locationName: 'Karnal, Haryana', cropName: 'Tomato (Grade A)', quantityKg: 1200, latitude: 29.6857, longitude: 76.9905 },
  { id: 'node-2', type: 'FARMER', name: 'Suresh Patel (Sonipat Sourcing)', locationName: 'Sonipat, Haryana', cropName: 'Spinach / Greens', quantityKg: 850, latitude: 28.9931, longitude: 77.0198 },
  { id: 'node-3', type: 'BUYER', name: 'Azadpur Mandi Hub & Bulk Mart', locationName: 'Azadpur, New Delhi', cropName: 'Consolidated produce', quantityKg: 2050, latitude: 28.7041, longitude: 77.1725 },
]

const defaultRoutes: CorridorRoute[] = [
  { id: 'route-1', shipmentCode: 'SHP-2026-KR01', originName: 'Karnal Farmers Hub', destinationName: 'Azadpur Bulk Procurement Hub', cropName: 'Tomato', quantityKg: 1200, distanceKm: 128.4, status: 'IN_TRANSIT', farmerCoords: [76.9905, 29.6857], buyerCoords: [77.1725, 28.7041] },
  { id: 'route-2', shipmentCode: 'SHP-2026-SN02', originName: 'Sonipat Organic Group', destinationName: 'Azadpur Bulk Procurement Hub', cropName: 'Spinach', quantityKg: 850, distanceKm: 52.1, status: 'ASSIGNED', farmerCoords: [77.0198, 28.9931], buyerCoords: [77.1725, 28.7041] },
]

export const DigitalTwinCorridorMap: FC<DigitalTwinCorridorMapProps> = ({ nodes = [], routes = [], height = '380px' }) => {
  const { language } = useLanguage()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedItem, setSelectedItem] = useState<{ type: 'NODE' | 'ROUTE'; data: CorridorNode | CorridorRoute } | null>(null)
  const [webGlSupported, setWebGlSupported] = useState(true)

  const activeNodes = nodes.length > 0 ? nodes : defaultNodes
  const activeRoutes = routes.length > 0 ? routes : defaultRoutes

  useEffect(() => {
    if (!mapContainerRef.current) return

    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebGlSupported(false)
        return
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [77.1025, 28.9],
        zoom: 8.5,
        attributionControl: false,
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      requestAnimationFrame(() => map.resize())

      let contentLoaded = false
      const setup = () => {
        if (contentLoaded) return
        contentLoaded = true
        map.resize()

        activeRoutes.forEach((route) => {
          const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            properties: { id: route.id },
            geometry: { type: 'LineString', coordinates: [route.farmerCoords, route.buyerCoords] },
          }
          if (!map.getSource(`route-source-${route.id}`)) {
            map.addSource(`route-source-${route.id}`, { type: 'geojson', data: geojson })
          }
          if (!map.getLayer(`route-layer-${route.id}`)) {
            map.addLayer({
              id: `route-layer-${route.id}`,
              type: 'line',
              source: `route-source-${route.id}`,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#236747', 'line-width': 4, 'line-dasharray': route.status === 'ASSIGNED' ? [2, 2] : [1, 0] },
            })
            map.on('click', `route-layer-${route.id}`, () => setSelectedItem({ type: 'ROUTE', data: route }))
          }
        })

        activeNodes.forEach((node) => {
          const el = document.createElement('div')
          el.className = 'corridor-node-dot'
          el.style.width = '18px'
          el.style.height = '18px'
          el.style.border = '2px solid #ffffff'
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,.25)'
          el.style.cursor = 'pointer'
          el.style.backgroundColor = node.type === 'FARMER' ? '#236747' : '#4a76a8'
          new maplibregl.Marker({ element: el }).setLngLat([node.longitude, node.latitude]).addTo(map)
          el.addEventListener('click', () => setSelectedItem({ type: 'NODE', data: node }))
        })
      }

      map.on('style.load', setup)
      map.on('load', setup)
      if (map.isStyleLoaded()) setup()
      mapRef.current = map

      return () => map.remove()
    } catch {
      setWebGlSupported(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, routes])

  return (
    <div className="corridor-map-card">
      <div className="corridor-map-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="corridor-map-icon"><Activity size={16} /></span>
          <div>
            <h3>{language === 'hi' ? 'डिजिटल ट्विन कॉरिडोर मैप' : 'Digital twin corridor map'}</h3>
            <p>{language === 'hi' ? 'सांकेतिक सोर्सिंग मार्ग व शिपमेंट स्थिति' : 'Representative sourcing corridor & shipment status'}</p>
          </div>
        </div>
        <div className="corridor-legend">
          <span><i style={{ background: '#236747' }} />{language === 'hi' ? 'किसान' : 'Farmer'}</span>
          <span><i style={{ background: '#4a76a8' }} />{language === 'hi' ? 'खरीदार / हब' : 'Buyer / hub'}</span>
        </div>
      </div>

      <div className="corridor-map-canvas" style={{ height }}>
        {webGlSupported ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="corridor-map-fallback">
            {activeNodes.map((node) => (
              <div key={node.id} className={`corridor-node-card ${node.type === 'FARMER' ? 'farmer' : 'buyer'}`} onClick={() => setSelectedItem({ type: 'NODE', data: node })}>
                <span className="corridor-node-dot" style={{ background: node.type === 'FARMER' ? '#236747' : '#4a76a8' }} />
                <strong>{node.name}</strong>
                <p>{node.locationName} · {node.cropName} · {node.quantityKg.toLocaleString()} kg</p>
              </div>
            ))}
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
