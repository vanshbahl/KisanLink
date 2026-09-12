import { ArrowRight, MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import type { CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { extractUserRegion, rankMarketMakerOpportunities } from '../../services/marketRankingService'
import { phase2Service } from '../../services/phase2Service'
import type { BulkProfileData } from '../../types'

export function NcrBulkProcurementCard() {
  const [views, setViews] = useState<MarketView[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string>('')
  const [bulkProfile, setBulkProfile] = useState<BulkProfileData | null>(null)
  const [selectedCropId, setSelectedCropId] = useState<string>('')
  const [quantityKg, setQuantityKg] = useState<number>(500)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  const loadData = async () => {
    const [marketViews, profile] = await Promise.all([
      marketMakerService.boards(),
      phase2Service.bulkProfile(),
    ])
    const regionalViews = marketViews.filter((view) => view.board.isMultiCrop)
    if (regionalViews.length > 0) {
      setViews(regionalViews)
      setBulkProfile(profile)
    }
  }

  useEffect(() => {
    loadData()
    const handleSync = () => loadData()
    window.addEventListener('kisanlink-state', handleSync)
    return () => window.removeEventListener('kisanlink-state', handleSync)
  }, [])

  if (!views.length) return null

  // Deterministic regional ranking using buyer's procurement locations
  const userRegion = extractUserRegion('bulk', { bulkProfile })
  const ranking = rankMarketMakerOpportunities(views, userRegion)
  const currentView = (activeBoardId ? views.find((v) => v.board.id === activeBoardId) : null) || ranking.hero
  const otherViews = views.filter((v) => v.board.id !== currentView.board.id)

  const { board, math } = currentView
  const cropMaths: CropSegmentMath[] = math.multiCropMath?.cropMaths ?? []

  // Active crop segment
  const activeCropMath: CropSegmentMath | undefined = cropMaths.length > 0
    ? (selectedCropId ? cropMaths.find((cm) => cm.segment.id === selectedCropId) : cropMaths[0]) || cropMaths[0]
    : undefined

  const regionName = board.regions?.[0]?.name ?? 'NCR'
  const isRegionMatched = ranking.userRegionMatched && ranking.matchedRegionName?.toLowerCase() === regionName.toLowerCase()

  // Real economics for Bulk Buyer
  const standardLandedCost = activeCropMath
    ? activeCropMath.segment.buyerCurrentPerKg
    : board.buyerCurrentPerKg
  const marketMakerLandedCost = activeCropMath
    ? (activeCropMath.deliveredPerKg || activeCropMath.segment.buyerCeilingPerKg)
    : (math.deliveredPerKg || board.buyerCeilingPerKg)

  const savingsPerKg = Math.max(0, standardLandedCost - marketMakerLandedCost)
  const hasSavings = savingsPerKg > 0

  const gapKg = Math.max(0, math.thresholdKg - math.committedKg)
  const isUnlocked = math.viable || gapKg === 0

  const validQty = Math.max(1, Number(quantityKg) || 1)
  const totalStandardCost = Math.round(validQty * standardLandedCost)
  const totalMarketMakerCost = Math.round(validQty * marketMakerLandedCost)
  const totalSavings = Math.round(savingsPerKg * validQty)
  const isCapExceeded = validQty > gapKg && gapKg > 0

  const handleCommit = async () => {
    if (validQty < 1) return
    if (gapKg <= 0) {
      showToast('Corridor break-even threshold has already been reached.')
      return
    }
    if (isCapExceeded) {
      showToast(`Maximum ${gapKg} kg can currently be added to this opportunity.`)
      return
    }

    setSubmitting(true)
    try {
      const cropSegmentId = activeCropMath?.segment.id || board.crops?.[0]?.id
      const cropName = activeCropMath?.segment.crop || board.crop

      await marketMakerService.commit(board.id, {
        source: 'bulk',
        party: bulkProfile?.businessName || 'FreshKart Foods',
        detail: `${regionName} Bulk Procurement Pool · ${cropName}`,
        quantityKg: validQty,
        own: true,
        cropId: cropSegmentId,
      })

      showToast(`Successfully committed ${validQty} kg ${cropName} to ${regionName} Pool! Saved ₹${totalSavings}!`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add commitment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="section-block ncr-bulk-procurement-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '1.75rem',
        marginBottom: '2rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* 1. BENEFIT HERO HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <MapPin size={14} />
            <span>
              {isRegionMatched
                ? `BEST PROCUREMENT OPPORTUNITY · ${regionName.toUpperCase()} MARKET MAKER`
                : `NCR PROCUREMENT OPPORTUNITY · ${regionName.toUpperCase()} MARKET MAKER`}
            </span>
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
            {hasSavings ? (
              <span style={{ color: '#047857' }}>
                SAVE ₹{savingsPerKg.toFixed(2)}/kg ON LANDED COST
              </span>
            ) : (
              <span>Farm-Direct Pooled Procurement</span>
            )}
          </h2>

          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {board.corridor} → {board.destination} · Direct aggregate farm sourcing.
          </p>
        </div>

        {/* Status indicator */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Pooled Volume</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#047857' }}>
            {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.15rem', color: isUnlocked ? '#059669' : '#d97706', fontWeight: 600 }}>
            {isUnlocked ? '✓ Market Viable' : `${gapKg} kg remaining to break-even`}
          </div>
        </div>
      </div>

      {/* 2. ACTION: SIMPLE CROP & QUANTITY INPUT WITH PROCUREMENT SAVINGS */}
      <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
        {/* Crop Selection Tabs */}
        {cropMaths.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {cropMaths.map((cm) => {
              const isSelected = activeCropMath?.segment.id === cm.segment.id
              const icon = cm.segment.crop.toLowerCase().includes('tomato') ? '🍅' : cm.segment.crop.toLowerCase().includes('onion') ? '🧅' : '🥔'
              const cropSave = Math.max(0, cm.segment.buyerCurrentPerKg - (cm.deliveredPerKg || cm.segment.buyerCeilingPerKg))

              return (
                <button
                  key={cm.segment.id}
                  type="button"
                  onClick={() => setSelectedCropId(cm.segment.id)}
                  style={{
                    background: isSelected ? '#047857' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    border: isSelected ? '1px solid #047857' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.45rem 0.8rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{icon}</span>
                  <span>{cm.segment.crop}</span>
                  {cropSave > 0 && (
                    <span style={{ fontSize: '0.75rem', background: isSelected ? 'rgba(255,255,255,0.2)' : '#ecfdf5', color: isSelected ? '#ffffff' : '#047857', padding: '1px 5px', borderRadius: '4px' }}>
                      -₹{cropSave.toFixed(1)}/kg
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Cost Comparison & Quantity Input Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Standard Landed Cost</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#64748b', textDecoration: 'line-through', marginTop: '0.15rem' }}>
              ₹{standardLandedCost.toFixed(2)}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Traditional Mandi + Agent fee</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>Market Maker Landed Cost</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857', marginTop: '0.15rem' }}>
              ₹{marketMakerLandedCost.toFixed(2)}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669' }}>Farm Gate + Pooled Freight</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#1e293b', textTransform: 'uppercase', fontWeight: 600 }}>Quantity (kg)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <input
                type="number"
                min={1}
                max={gapKg || 1000}
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(1, parseInt(e.target.value) || 0))}
                style={{
                  width: '100px',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: isCapExceeded ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              />
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>kg</span>
              {gapKg > 0 && gapKg < 1000 && (
                <button
                  type="button"
                  onClick={() => setQuantityKg(gapKg)}
                  style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cap ({gapKg} kg)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Validation cap feedback */}
        {isCapExceeded && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Maximum {gapKg} kg can currently be added to this opportunity.
          </div>
        )}

        {/* Total Financial Saving Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Standard Landed Total</div>
            <strong style={{ fontSize: '1.15rem', color: '#64748b' }}>₹{totalStandardCost.toLocaleString('en-IN')}</strong>
          </div>

          <div style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase' }}>Market Maker Total</div>
            <strong style={{ fontSize: '1.15rem', color: '#047857' }}>₹{totalMarketMakerCost.toLocaleString('en-IN')}</strong>
          </div>

          <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>TOTAL SAVING</div>
            <strong style={{ fontSize: '1.4rem', color: '#059669', fontWeight: 900 }}>₹{totalSavings.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {/* Primary CTA: COMMIT DEMAND */}
        <button
          type="button"
          onClick={handleCommit}
          disabled={submitting || isCapExceeded || gapKg <= 0}
          style={{
            width: '100%',
            background: isCapExceeded || gapKg <= 0 ? '#9ca3af' : '#047857',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '0.9rem 1.5rem',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: isCapExceeded || gapKg <= 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
          }}
        >
          <Plus size={18} />
          <span>
            {submitting
              ? 'Committing…'
              : gapKg <= 0
                ? 'Corridor Threshold Reached'
                : `COMMIT ${validQty.toLocaleString('en-IN')} KG DEMAND · SAVE ₹${totalSavings.toLocaleString('en-IN')}`}
          </span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 3. OTHER NCR PROCUREMENT OPPORTUNITIES */}
      {otherViews.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem' }}>
            OTHER NCR PROCUREMENT OPPORTUNITIES
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
            {otherViews.map((ov) => {
              const otherRegion = ov.board.regions?.[0]?.name ?? ov.board.crop.split(' ')[0]
              const otherCrop = ov.board.crops?.[0]
              const otherStd = otherCrop ? otherCrop.buyerCurrentPerKg : ov.board.buyerCurrentPerKg
              const otherMm = otherCrop ? (otherCrop.buyerCeilingPerKg || otherCrop.farmerFloorPerKg + 6) : (ov.math.deliveredPerKg || ov.board.buyerCeilingPerKg)
              const otherSave = Math.max(0, otherStd - otherMm)

              return (
                <div
                  key={ov.board.id}
                  onClick={() => {
                    setActiveBoardId(ov.board.id)
                    setSelectedCropId('')
                  }}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                      📍 {otherRegion}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {otherCrop ? otherCrop.crop : ov.board.crop}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', marginTop: '0.2rem' }}>
                      {otherSave > 0 ? `Save ₹${otherSave.toFixed(1)}/kg` : 'Pooled Landed'}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#334155', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Select
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Link */}
      <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <span>Destination: <strong>{board.destination}</strong></span>
        <Link to={`/bulk/market?boardId=${board.id}`} style={{ color: '#047857', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Open Full Procurement Market Maker <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
