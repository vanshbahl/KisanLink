import { ArrowRight, Boxes, CheckCircle2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import type { CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'

export function NcrBulkProcurementCard() {
  const [view, setView] = useState<MarketView | null>(null)
  const [selectedCropId, setSelectedCropId] = useState<string>('seg_tomato')
  const [quantityKg, setQuantityKg] = useState<number>(50)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

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

  const { board, math } = view
  const gapKg = Math.max(0, math.thresholdKg - math.committedKg)
  const isUnlocked = math.viable || gapKg === 0
  const cropMaths: CropSegmentMath[] = math.multiCropMath?.cropMaths ?? []

  const handleCommit = async () => {
    if (quantityKg < 1) return
    setSubmitting(true)
    try {
      const selectedCrop = board.crops?.find((c) => c.id === selectedCropId)
      const cropName = selectedCrop ? selectedCrop.crop : 'Produce'

      const result = await marketMakerService.commit(board.id, {
        source: 'bulk',
        party: 'FreshKart Foods',
        detail: 'NCR Bulk Procurement Pool',
        quantityKg,
        own: true,
        cropId: selectedCropId,
      })

      showToast(`Successfully committed ${quantityKg} kg ${cropName} to NCR Pool!`)
      setView({ ...view, board: result.board, math: result.math })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add commitment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-block ncr-bulk-procurement-card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Boxes size={14} /> NCR POOL PROCUREMENT
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            NCR Shared Produce Corridor · Multi-Crop Direct Sourcing
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Combine bulk retail & wholesale demand to unlock consolidated vehicle transport across Sonipat, Rohtak, Meerut & Ghaziabad.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Pooled Volume</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#047857' }}>
              {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg
            </div>
          </div>
          <div style={{ height: '30px', width: '1px', background: '#e5e7eb' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isUnlocked ? '#059669' : '#d97706' }}>
              {isUnlocked ? '✓ Market Unlocked' : `${gapKg} kg remaining`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
              <th style={{ padding: '0.75rem' }}>Crop</th>
              <th style={{ padding: '0.75rem' }}>Origins</th>
              <th style={{ padding: '0.75rem' }}>Offered</th>
              <th style={{ padding: '0.75rem' }}>Committed</th>
              <th style={{ padding: '0.75rem' }}>Pooled Landed Price</th>
              <th style={{ padding: '0.75rem' }}>Mandi Ref</th>
              <th style={{ padding: '0.75rem' }}>Est. Savings</th>
            </tr>
          </thead>
          <tbody>
            {cropMaths.map((cm) => {
              const origins = cm.segment.lots.map((l) => l.regionName || l.location.split(',')[1] || 'Sonipat').filter((v, i, a) => a.indexOf(v) === i).join(', ')
              const pooledPrice = cm.deliveredPerKg || cm.segment.buyerCeilingPerKg
              const savings = Math.max(0, cm.buyerSavingPerKg)

              return (
                <tr key={cm.segment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#111827' }}>{cm.segment.crop}</td>
                  <td style={{ padding: '0.75rem', color: '#4b5563' }}>{origins}</td>
                  <td style={{ padding: '0.75rem', color: '#4b5563' }}>{cm.offeredKg.toLocaleString('en-IN')} kg</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#047857' }}>{cm.committedKg.toLocaleString('en-IN')} kg</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#059669' }}>₹{pooledPrice.toFixed(2)}/kg</td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>₹{cm.segment.mandiPricePerKg.toFixed(2)}/kg</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#047857' }}>Save ₹{savings.toFixed(2)}/kg</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>Commit Procurement Demand:</span>
          <select
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
          >
            {cropMaths.map((cm) => (
              <option key={cm.segment.id} value={cm.segment.id}>
                {cm.segment.crop} (₹{(cm.deliveredPerKg || cm.segment.buyerCeilingPerKg).toFixed(2)}/kg)
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            max={gapKg || 500}
            value={quantityKg}
            onChange={(e) => setQuantityKg(Math.max(1, parseInt(e.target.value) || 0))}
            style={{ width: '90px', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>kg</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {gapKg > 0 ? (
            <button
              onClick={handleCommit}
              disabled={submitting}
              style={{ background: '#047857', color: '#ffffff', border: 'none', padding: '0.5rem 1.15rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> {submitting ? 'Committing…' : `Commit ${quantityKg} kg to NCR Pool`}
            </button>
          ) : (
            <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={18} /> Break-Even Volume Met
            </span>
          )}

          <Link to="/bulk/market" style={{ color: '#047857', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            Full Details <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
