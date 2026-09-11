import { ArrowRight, CheckCircle2, MapPin, Route, Truck, Warehouse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { computeRegionContributions, type RegionContribution } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'

export function NcrLogisticsCorridorCard() {
  const [view, setView] = useState<MarketView | null>(null)

  const loadMarket = async () => {
    const data = await marketMakerService.board('MM-MULTI-SONIPAT')
    if (data) setView(data)
  }

  useEffect(() => {
    loadMarket()
    const handleSync = () => loadMarket()
    window.addEventListener('kisanlink-state', handleSync)
    return () => window.removeEventListener('kisanlink-state', handleSync)
  }, [])

  if (!view || !view.board.isMultiCrop || !view.board.crops) return null

  const { board, math, assignedVehicle } = view
  const regions: RegionContribution[] = computeRegionContributions(board)
  const capacityKg = math.capacityKg || 2000
  const utilizationPct = Math.round((math.committedKg / capacityKg) * 100)
  const gapKg = Math.max(0, math.thresholdKg - math.committedKg)

  return (
    <section className="section-block ncr-logistics-corridor-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Route size={14} /> OPERATIONAL DISPATCH · SHARED CORRIDOR
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            NCR Shared Produce Corridor
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Multi-origin pickup route serving Sonipat, Rohtak, Meerut & Ghaziabad farm clusters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Vehicle Capacity Load</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
              {math.committedKg.toLocaleString('en-IN')} / {capacityKg.toLocaleString('en-IN')} kg ({utilizationPct}%)
            </div>
          </div>
          <div style={{ height: '30px', width: '1px', background: '#cbd5e1' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Logistics Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: math.viable ? '#059669' : '#d97706' }}>
              {math.viable ? '✓ Route Viable' : `Forming (${gapKg} kg gap)`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.88rem' }}>
        <span style={{ color: '#166534', fontWeight: 600 }}>
          🚚 Estimated shared multi-region logistics · Distance: {board.routeDistanceKm ?? 95} km
        </span>
        <span style={{ color: '#15803d', fontSize: '0.82rem' }}>
          Assigned Fleet: <strong>{assignedVehicle ? `${assignedVehicle.registration} (${assignedVehicle.type})` : 'VEH-02 (Medium truck)'}</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {regions.map((reg: RegionContribution) => (
          <div key={reg.regionId} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 700, fontSize: '0.95rem' }}>
              <MapPin size={15} color="#0284c7" /> {reg.regionName}
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>
              Offered: <strong>{reg.offeredKg.toLocaleString('en-IN')} kg</strong>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600 }}>
              Pooled Load: {reg.committedKg.toLocaleString('en-IN')} kg
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
              Crops: {reg.crops.join(', ')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', fontSize: '0.88rem', color: '#64748b' }}>
        <div>
          Destination Hub: <strong style={{ color: '#1e293b' }}>{board.destination}</strong>
        </div>
        <Link to="/logistics/market" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Full Logistics Lever Controls <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
