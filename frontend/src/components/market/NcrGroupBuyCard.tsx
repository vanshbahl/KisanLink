import { ArrowRight, MapPin, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import type { CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { extractUserRegion, rankMarketMakerOpportunities } from '../../services/marketRankingService'
import { phase2Service } from '../../services/phase2Service'
import type { ConsumerProfileData, FarmerListing } from '../../types'

export function NcrGroupBuyCard() {
  const [views, setViews] = useState<MarketView[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string>('')
  const [consumerProfile, setConsumerProfile] = useState<ConsumerProfileData | null>(null)
  const [listings, setListings] = useState<FarmerListing[]>([])
  const [selectedCropId, setSelectedCropId] = useState<string>('')
  const [quantityKg, setQuantityKg] = useState<number>(5)
  const { showToast } = useToast()

  const loadData = async () => {
    const [marketViews, profile, availableListings] = await Promise.all([
      marketMakerService.boards(),
      phase2Service.consumerProfile(),
      phase2Service.listings(),
    ])
    const regionalViews = marketViews.filter((view) => view.board.isMultiCrop)
    if (regionalViews.length > 0) {
      setViews(regionalViews)
      setConsumerProfile(profile)
      setListings(availableListings.filter((listing) => listing.status === 'active'))
    }
  }

  useEffect(() => {
    loadData()
    const handleSync = () => loadData()
    window.addEventListener('kisanlink-state', handleSync)
    return () => window.removeEventListener('kisanlink-state', handleSync)
  }, [])

  if (!views.length) return null

  // Deterministic regional ranking based on actual consumer profile
  const userRegion = extractUserRegion('consumer', { consumerProfile })
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

  // Real economics
  const regularPrice = activeCropMath
    ? activeCropMath.segment.buyerCurrentPerKg
    : board.buyerCurrentPerKg
  const pooledPrice = activeCropMath
    ? (activeCropMath.deliveredPerKg || activeCropMath.segment.buyerCeilingPerKg)
    : (math.deliveredPerKg || board.buyerCeilingPerKg)

  const savingsPerKg = Math.max(0, regularPrice - pooledPrice)
  const hasDiscount = savingsPerKg > 0

  const validQty = Math.max(1, Number(quantityKg) || 1)
  const normalPriceTotal = Math.round(validQty * regularPrice)
  const kisanlinkPriceTotal = Math.round(validQty * pooledPrice)
  const totalSavings = Math.round(savingsPerKg * validQty)

  const gapKg = Math.max(0, math.thresholdKg - math.committedKg)
  const isUnlocked = math.viable || gapKg === 0

  const handleAddToCart = async () => {
    const cropSegmentId = activeCropMath?.segment.id || board.crops?.[0]?.id || 'seg_tomato'
    const cropTitle = activeCropMath?.segment.crop || board.crop
    const listing = listings.find((item) => {
      if (cropSegmentId.includes('tomato')) return item.visual === 'tomato'
      if (cropSegmentId.includes('onion')) return item.visual === 'onion'
      if (cropSegmentId.includes('leaf')) return item.visual === 'leafy'
      if (cropSegmentId.includes('wheat')) return item.visual === 'grain'
      if (cropSegmentId.includes('potato')) return item.visual === 'potato'
      return item.crop.toLowerCase().includes(cropTitle.toLowerCase())
    })
    if (!listing) {
      showToast(`${cropTitle} is not currently available in the consumer marketplace.`)
      return
    }
    if (phase2Service.cart().some((item) => item.listingId === listing.id && !item.isPooled)) {
      showToast(`${cropTitle} is already in your cart at the regular rate. Remove it before joining the group buy.`)
      return
    }
    const regionId = board.regions?.[0]?.id ?? 'reg_ncr'

    try {
      await marketMakerService.commit(board.id, {
        source: 'consumer',
        party: consumerProfile?.name || 'Consumer group buy',
        detail: `${regionName} Group Buy · ${cropTitle}`,
        quantityKg: validQty,
        own: true,
        cropId: cropSegmentId,
      })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to join this group buy.')
      return
    }
    phase2Service.addPooledToCart({
      listingId: listing.id,
      quantityKg: validQty,
      pooledPricePerKg: pooledPrice,
      regularPricePerKg: regularPrice,
      savingsPerKg,
      farmerGatePerKg: activeCropMath?.farmerFloorPerKg ?? board.farmerFloorPerKg,
      platformFeePerKg: activeCropMath?.platformFeePerKg ?? math.platformFeePerKg,
      freightPerKg: activeCropMath?.allocatedFreightPerKg ?? math.freightPerKg,
      boardId: board.id,
      cropId: cropSegmentId,
      regionId,
    })

    showToast(`Added ${validQty} kg ${cropTitle} to cart · Saved ₹${totalSavings}!`)
  }

  return (
    <div
      className="card ncr-group-buy-card"
      style={{
        background: 'linear-gradient(145deg, #022c22 0%, #064e3b 60%, #065f46 100%)',
        color: '#ffffff',
        padding: '1.75rem',
        borderRadius: '20px',
        marginBottom: '2rem',
        boxShadow: '0 12px 30px -6px rgba(6, 78, 59, 0.45)',
        border: '1px solid #047857',
      }}
    >
      {/* 1. BENEFIT HERO HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: isRegionMatched ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '0.5rem' }}>
            <MapPin size={14} />
            <span>
              {isRegionMatched
                ? `BEST DISCOUNT FOR YOUR REGION · ${regionName.toUpperCase()} GROUP BUY`
                : `NCR MARKET MAKER DISCOUNTS · ${regionName.toUpperCase()} GROUP BUY`}
            </span>
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
            {hasDiscount ? (
              <span style={{ color: '#34d399' }}>
                SAVE ₹{savingsPerKg.toFixed(2)}/kg
              </span>
            ) : (
              <span>Farm-Direct Pooled Rate</span>
            )}
          </h2>

          <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.9rem', color: '#d1fae5' }}>
            {board.corridor} · Pooled household delivery without retail store markups.
          </p>
        </div>

        {/* Progress Badge */}
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 600 }}>Market Progress</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#6ee7b7' }}>
            {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.15rem', color: isUnlocked ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
            {isUnlocked ? '✓ Market Unlocked' : `${gapKg} kg more needed`}
          </div>
        </div>
      </div>

      {/* 2. ACTION: SIMPLE CROP & QUANTITY INPUT WITH SAVINGS BREAKDOWN */}
      <div style={{ background: '#ffffff', color: '#111827', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginBottom: '1.25rem' }}>
        {/* Crop Selection Tabs if multiple crops */}
        {cropMaths.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {cropMaths.map((cm) => {
              const isSelected = (activeCropMath?.segment.id === cm.segment.id)
              const icon = cm.segment.crop.toLowerCase().includes('tomato') ? '🍅' : cm.segment.crop.toLowerCase().includes('onion') ? '🧅' : '🥔'
              const cropSave = Math.max(0, cm.segment.buyerCurrentPerKg - (cm.deliveredPerKg || cm.segment.buyerCeilingPerKg))

              return (
                <button
                  key={cm.segment.id}
                  type="button"
                  onClick={() => setSelectedCropId(cm.segment.id)}
                  style={{
                    background: isSelected ? '#047857' : '#f3f4f6',
                    color: isSelected ? '#ffffff' : '#374151',
                    border: isSelected ? '1px solid #047857' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
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
                      -₹{cropSave.toFixed(0)}/kg
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Price & Quantity Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Regular Price</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748b', textDecoration: 'line-through' }}>
              ₹{regularPrice.toFixed(2)}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Retail / Mandi shop</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>Market Maker Price</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
              ₹{pooledPrice.toFixed(2)}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857' }}>Direct farm group buy</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', fontWeight: 600 }}>Quantity</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => setQuantityKg(Math.max(1, validQty - 1))}
                style={{ background: '#e2e8f0', border: 'none', borderRadius: '4px', width: '28px', height: '28px', fontWeight: 700, cursor: 'pointer' }}
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '55px', textAlign: 'center', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
              <button
                type="button"
                onClick={() => setQuantityKg(validQty + 1)}
                style={{ background: '#e2e8f0', border: 'none', borderRadius: '4px', width: '28px', height: '28px', fontWeight: 700, cursor: 'pointer' }}
              >
                +
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>kg</span>
            </div>
          </div>
        </div>

        {/* Big Savings Breakdown Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', textAlign: 'center', marginBottom: '1.15rem' }}>
          <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Normal Price</div>
            <strong style={{ fontSize: '1.1rem', color: '#475569' }}>₹{normalPriceTotal}</strong>
          </div>

          <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase' }}>KisanLink Price</div>
            <strong style={{ fontSize: '1.1rem', color: '#047857' }}>₹{kisanlinkPriceTotal}</strong>
          </div>

          <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>YOU SAVE</div>
            <strong style={{ fontSize: '1.35rem', color: '#059669', fontWeight: 900 }}>₹{totalSavings}</strong>
          </div>
        </div>

        {/* Primary CTA: ADD TO CART */}
        <button
          type="button"
          onClick={handleAddToCart}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '0.9rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
          }}
        >
          <ShoppingCart size={18} />
          <span>ADD {validQty} KG TO CART · SAVE ₹{totalSavings}</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 3. OTHER NCR DISCOUNTS (Compact Directory) */}
      {otherViews.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem' }}>
            OTHER NCR MARKET MAKER DISCOUNTS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
            {otherViews.map((ov) => {
              const otherRegion = ov.board.regions?.[0]?.name ?? ov.board.crop.split(' ')[0]
              const otherCrop = ov.board.crops?.[0]
              const otherReg = otherCrop ? otherCrop.buyerCurrentPerKg : ov.board.buyerCurrentPerKg
              const otherPool = otherCrop ? (otherCrop.buyerCeilingPerKg || otherCrop.farmerFloorPerKg + 6) : (ov.math.deliveredPerKg || ov.board.buyerCeilingPerKg)
              const otherSave = Math.max(0, otherReg - otherPool)

              return (
                <div
                  key={ov.board.id}
                  onClick={() => {
                    setActiveBoardId(ov.board.id)
                    setSelectedCropId('')
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                      📍 {otherRegion}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                      {otherCrop ? otherCrop.crop : ov.board.crop}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
                      {otherSave > 0 ? `Save ₹${otherSave.toFixed(0)}/kg` : 'Pooled Price'}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Select
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Link */}
      <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#d1d5db' }}>
        <span>Destination: <strong>{board.destination}</strong></span>
        <Link to={`/consumer/market?boardId=${board.id}`} style={{ color: '#34d399', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          See Market Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
