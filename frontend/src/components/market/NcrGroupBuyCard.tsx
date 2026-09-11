import { ArrowRight, Info, ShoppingCart, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import type { CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { phase2Service } from '../../services/phase2Service'

export function NcrGroupBuyCard() {
  const [view, setView] = useState<MarketView | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
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

  const handleAddToCart = (cropSegmentId: string, cropName: string, regularPrice: number, pooledPrice: number, savingsPerKg: number) => {
    const qty = quantities[cropSegmentId] || 2
    // Map to listing ID
    const listingId = cropSegmentId === 'seg_tomato' ? 'listing_001' : cropSegmentId === 'seg_onion' ? 'listing_draft_1' : 'listing_sold_1'
    
    phase2Service.addPooledToCart({
      listingId,
      quantityKg: qty,
      pooledPricePerKg: pooledPrice,
      regularPricePerKg: regularPrice,
      savingsPerKg: Math.max(0, savingsPerKg),
      boardId: board.id,
      cropId: cropSegmentId,
    })

    const totalSave = (Math.max(0, savingsPerKg) * qty).toFixed(2)
    showToast(`Added ${qty} kg ${cropName} to basket with ₹${totalSave} NCR Pool Savings!`)
  }

  return (
    <div className="card ncr-group-buy-card" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', color: '#ffffff', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, color: '#34d399', marginBottom: '0.5rem' }}>
            <Truck size={15} /> NCR POOL SAVINGS · GROUP BUY
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            Direct Farm Sourcing · Pooled Logistics
          </h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.9rem', maxWidth: '600px' }}>
            Pool your household produce demand across Sonipat, Rohtak, Meerut & Ghaziabad to unlock wholesale farm-gate prices.
          </p>
        </div>

        <div style={{ textAlign: 'right', background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corridor Progress</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6ee7b7' }}>
            {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: isUnlocked ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
            {isUnlocked ? '✓ Market Unlocked · Savings Live' : `⌛ ${gapKg} kg more needed`}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {cropMaths.map((cm: CropSegmentMath) => {
          const regularPrice = cm.segment.buyerCurrentPerKg
          const pooledPrice = cm.deliveredPerKg || cm.segment.buyerCeilingPerKg
          const savingsPerKg = Math.max(0, regularPrice - pooledPrice)
          const qty = quantities[cm.segment.id] || 2

          return (
            <div key={cm.segment.id} style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                    {cm.segment.crop}
                  </h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Save ₹{savingsPerKg.toFixed(2)}/kg
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0 0.5rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#6ee7b7' }}>
                    ₹{pooledPrice.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                    ₹{regularPrice.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#d1d5db' }}>/kg</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={13} /> Derived from pooled freight & zero middleman markup
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => setQuantities({ ...quantities, [cm.segment.id]: Math.max(1, qty - 1) })}
                    style={{ background: 'none', border: 'none', color: '#fff', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{qty} kg</span>
                  <button
                    onClick={() => setQuantities({ ...quantities, [cm.segment.id]: qty + 1 })}
                    style={{ background: 'none', border: 'none', color: '#fff', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleAddToCart(cm.segment.id, cm.segment.crop, regularPrice, pooledPrice, savingsPerKg)}
                  style={{ flex: 1, background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.75rem', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <ShoppingCart size={15} /> Add to Basket
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: '#d1d5db' }}>
        <div>
          📍 Origin Regions: <strong>Sonipat · Rohtak · Meerut · Ghaziabad</strong> → Destination: <strong>Delhi NCR Wholesale Hub</strong>
        </div>
        <Link to="/consumer/market" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          View Market Maker Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
