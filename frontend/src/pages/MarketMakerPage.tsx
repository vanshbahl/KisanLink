import {
  ArrowRight, Check, ChevronDown, ChevronUp, CircleAlert, Info, Layers, MapPin, MapPinned,
  Radar, RotateCcw, ShoppingCart, Sparkles, Sprout, TrendingUp, Truck, Zap
} from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FarmerMarketMaker } from '../components/market/FarmerMarketMaker'
import { MarketCommitPanel } from '../components/market/MarketCommitPanel'
import { MarketConvergence } from '../components/market/MarketConvergence'
import { MarketDemandRing } from '../components/market/MarketDemandRing'
import { MarketFreightCurve } from '../components/market/MarketFreightCurve'
import { MarketHowItWorks } from '../components/market/MarketHowItWorks'
import { MarketInfographics } from '../components/market/MarketInfographics'
import { MarketUnlockReveal, type MarketCreationResult } from '../components/market/MarketUnlockReveal'
import { MarketValueSplit } from '../components/market/MarketValueSplit'
import { MarketWhyPanel } from '../components/market/MarketWhyPanel'
import { MultiCropCorridorCard } from '../components/market/MultiCropCorridorCard'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { logisticsService } from '../services/logisticsService'
import { marketMakerService, type MarketView } from '../services/marketMakerService'
import { extractUserRegion, rankMarketMakerOpportunities } from '../services/marketRankingService'
import { phase2Service } from '../services/phase2Service'
import { prototypeService } from '../services/prototypeService'
import type { Role, Vehicle } from '../types'

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

export function MarketMakerPage() {
  const { session } = useAuth()
  const { language } = useLanguage()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryBoardId = searchParams.get('boardId') || ''
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<MarketCreationResult | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [selectedCropId, setSelectedCropId] = useState<string>('')
  const [consumerQty, setConsumerQty] = useState<number>(5)
  const [bulkQty, setBulkQty] = useState<number>(500)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false)

  const role = (session?.role ?? 'consumer') as Role
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const { data, loading, refresh } = useAsyncData(async () => {
    const [views, consumerProfile, bulkProfile, farmerProfile, state] = await Promise.all([
      marketMakerService.boards(),
      phase2Service.consumerProfile(),
      phase2Service.bulkProfile(),
      prototypeService.getProfile(),
      prototypeService.getState(),
    ])
    return {
      views,
      consumerProfile,
      bulkProfile,
      farmerProfile,
      logisticsProfile: state.logisticsProfile,
    }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data?.views || data.views.length === 0) {
    return (
      <div className="error-panel">
        <h2>No market corridor is open</h2>
        <p>Seed the Market Maker scenario from the logistics demo controls to restore it.</p>
      </div>
    )
  }

  // 1. Determine user region deterministically from active profile fields
  const userRegion = extractUserRegion(role, {
    farmerProfile: data.farmerProfile,
    consumerProfile: data.consumerProfile,
    bulkProfile: data.bulkProfile,
    logisticsProfile: data.logisticsProfile,
  })

  // 2. Rank opportunities deterministically: user's region first
  const ranking = rankMarketMakerOpportunities(data.views, userRegion)
  const effectiveBoardId = selectedBoardId || queryBoardId
  const currentView = (effectiveBoardId ? data.views.find((v) => v.board.id === effectiveBoardId) : null) || ranking.hero
  const otherViews = data.views.filter((v) => v.board.id !== currentView.board.id)

  const { board, math } = currentView
  const regionName = board.regions?.[0]?.name ?? 'NCR'
  const isRegionMatched = ranking.userRegionMatched && ranking.matchedRegionName?.toLowerCase() === regionName.toLowerCase()

  const handleSelectBoard = (boardId: string) => {
    setSelectedBoardId(boardId)
    setSelectedCropId('')
    setSearchParams({ boardId })
  }

  const guard = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      showToast(success)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'That change could not be applied.')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const handleConsumerAddToCart = () => {
    const cropSegment = board.crops?.find((c) => c.id === selectedCropId) || board.crops?.[0]
    const cropTitle = cropSegment ? cropSegment.crop : board.crop
    const cropMath = math.multiCropMath?.cropMaths?.find((cm) => cropSegment ? cm.segment.id === cropSegment.id : true)
    const regPrice = cropSegment ? cropSegment.buyerCurrentPerKg : board.buyerCurrentPerKg
    const poolPrice = cropMath ? (cropMath.deliveredPerKg || cropSegment?.buyerCeilingPerKg || 28) : (math.deliveredPerKg || board.buyerCeilingPerKg)
    const savePerKg = Math.max(0, regPrice - poolPrice)
    const listingId = cropSegment?.id?.includes('tomato') ? 'listing_001' : cropSegment?.id?.includes('onion') ? 'listing_draft_1' : 'listing_sold_1'
    const regionId = board.regions?.[0]?.id ?? 'reg_ncr'

    phase2Service.addPooledToCart({
      listingId,
      quantityKg: consumerQty,
      pooledPricePerKg: poolPrice,
      regularPricePerKg: regPrice,
      savingsPerKg: savePerKg,
      boardId: board.id,
      cropId: cropSegment?.id || 'seg_default',
      regionId,
    })

    const totalSaved = Math.round(savePerKg * consumerQty)
    showToast(l(
      `Added ${consumerQty} kg ${cropTitle} to cart · Saved ₹${totalSaved}!`,
      `${consumerQty} किलो ${cropTitle} कार्ट में जोड़ा गया · ₹${totalSaved} की बचत!`
    ))
  }

  const handleBulkCommit = () => {
    const cropSegment = board.crops?.find((c) => c.id === selectedCropId) || board.crops?.[0]
    const cropTitle = cropSegment ? cropSegment.crop : board.crop
    const cropMath = math.multiCropMath?.cropMaths?.find((cm) => cropSegment ? cm.segment.id === cropSegment.id : true)
    const stdLanded = cropSegment ? cropSegment.buyerCurrentPerKg : board.buyerCurrentPerKg
    const mmLanded = cropMath ? (cropMath.deliveredPerKg || cropSegment?.buyerCeilingPerKg || 27) : (math.deliveredPerKg || board.buyerCeilingPerKg)
    const savePerKg = Math.max(0, stdLanded - mmLanded)
    const totalSaved = Math.round(savePerKg * bulkQty)

    guard(async () => {
      await marketMakerService.commit(board.id, {
        source: 'bulk',
        party: data.bulkProfile.businessName,
        detail: `${regionName} Bulk Procurement · ${cropTitle}`,
        quantityKg: bulkQty,
        own: true,
        cropId: cropSegment?.id,
      })
    }, `Committed ${bulkQty} kg ${cropTitle} to ${regionName} Pool · Saved ₹${totalSaved}!`)
  }

  const create = async () => {
    setBusy(true)
    try {
      const result = await marketMakerService.createMarket(board.id)
      setReveal({
        routeId: result.routeId,
        farmerOrderIds: result.farmerOrderIds,
        bulkOrderId: result.bulkOrderId,
        consumerOrderId: result.consumerOrderId,
        pickupIds: result.pickupIds,
        deliveryIds: result.deliveryIds,
      })
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'This market could not be created.')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  // Active crop segment for Consumer and Bulk views
  const activeCropSegment = board.crops?.find((c) => c.id === selectedCropId) || board.crops?.[0]
  const activeCropMath = math.multiCropMath?.cropMaths?.find((cm) =>
    activeCropSegment ? cm.segment.id === activeCropSegment.id : true
  )

  const gapKg = Math.max(0, math.thresholdKg - math.committedKg)
  const isUnlocked = math.viable || gapKg === 0

  // Consumer calculations
  const consumerRegularPrice = activeCropSegment ? activeCropSegment.buyerCurrentPerKg : board.buyerCurrentPerKg
  const consumerPooledPrice = activeCropMath ? (activeCropMath.deliveredPerKg || activeCropSegment?.buyerCeilingPerKg || 28) : (math.deliveredPerKg || board.buyerCeilingPerKg)
  const consumerSavingsPerKg = Math.max(0, consumerRegularPrice - consumerPooledPrice)
  const consumerTotalSavings = Math.round(consumerSavingsPerKg * consumerQty)

  // Bulk calculations
  const bulkStdLanded = activeCropSegment ? activeCropSegment.buyerCurrentPerKg : board.buyerCurrentPerKg
  const bulkMmLanded = activeCropMath ? (activeCropMath.deliveredPerKg || activeCropSegment?.buyerCeilingPerKg || 27) : (math.deliveredPerKg || board.buyerCeilingPerKg)
  const bulkSavingsPerKg = Math.max(0, bulkStdLanded - bulkMmLanded)
  const bulkTotalSavings = Math.round(bulkSavingsPerKg * bulkQty)

  return (
    <div className={`page mm-page mm-page-${role}`} style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Role-Specific Simple Experience */}
      {role === 'farmer' ? (
        <FarmerMarketMaker
          views={data.views}
          activeBoardId={currentView.board.id}
          onSelectBoard={handleSelectBoard}
          userRegion={userRegion}
          onRefresh={refresh}
        />
      ) : role === 'consumer' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* CONSUMER BENEFIT-FIRST HERO */}
          <section
            style={{
              background: 'linear-gradient(145deg, #022c22 0%, #064e3b 60%, #065f46 100%)',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 12px 32px -8px rgba(6, 78, 59, 0.45)',
              border: '1px solid #047857',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: isRegionMatched ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#6ee7b7', padding: '0.3rem 0.85rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700 }}>
                <MapPin size={14} />
                <span>
                  {isRegionMatched
                    ? l(`BEST DISCOUNT FOR YOUR REGION · ${regionName.toUpperCase()} GROUP BUY`, `आपके क्षेत्र के लिए सर्वश्रेष्ठ छूट · ${regionName.toUpperCase()} ग्रुप बाय`)
                    : l(`NCR MARKET MAKER DISCOUNTS · ${regionName.toUpperCase()} GROUP BUY`, `एनसीआर मार्केट मेकर छूट · ${regionName.toUpperCase()} ग्रुप बाय`)}
                </span>
              </div>
              <StatusBadge tone={isUnlocked ? 'green' : 'amber'}>
                {isUnlocked ? l('Market Unlocked', 'बाज़ार खुल गया') : l('Opportunity Building', 'अवसर बन रहा है')}
              </StatusBadge>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0.25rem 0', color: '#ffffff' }}>
                {consumerSavingsPerKg > 0 ? (
                  <span style={{ color: '#34d399' }}>
                    {l(`SAVE ₹${consumerSavingsPerKg.toFixed(2)}/kg`, `प्रति किलो ₹${consumerSavingsPerKg.toFixed(2)} बचाएं`)}
                  </span>
                ) : (
                  <span>{l('Farm-Direct Group Buy', 'खेत से सीधा ग्रुप बाय')}</span>
                )}
              </h1>
              <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.92rem' }}>
                {board.corridor} · {l('Buy together directly from farm clusters at wholesale freight rates.', 'थोक मालभाड़ा दरों पर सीधे खेत समूहों से मिलकर खरीदें।')}
              </p>
            </div>

            {/* Price Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>{l('Regular Price', 'सामान्य खुदरा भाव')}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#9ca3af', textDecoration: 'line-through' }}>₹{consumerRegularPrice.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{l('Retail shop / market', 'दुकान का भाव')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 600 }}>{l('Market Maker Price', 'मार्केट मेकर भाव')}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>₹{consumerPooledPrice.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>{l('Direct farm-gate pool', 'सीधा खेत पूल भाव')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 600 }}>{l('Your Savings', 'आपकी बचत')}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>₹{consumerSavingsPerKg.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>{l('Direct savings per kg', 'प्रति किलो सीधी बचत')}</div>
              </div>
            </div>

            {/* Action Box */}
            <div style={{ background: '#ffffff', color: '#111827', borderRadius: '16px', padding: '1.25rem' }}>
              {board.crops && board.crops.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {board.crops.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCropId(c.id)}
                      style={{
                        background: (activeCropSegment?.id === c.id) ? '#047857' : '#f3f4f6',
                        color: (activeCropSegment?.id === c.id) ? '#ffffff' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '0.45rem 0.8rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {c.crop}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#4b5563' }}>{l('Quantity:', 'मात्रा:')}</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={consumerQty}
                  onChange={(e) => setConsumerQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '80px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                />
                <span style={{ fontWeight: 600, color: '#6b7280' }}>kg {activeCropSegment?.crop || board.crop}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', textAlign: 'center', marginBottom: '1.15rem' }}>
                <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{l('Normal Price', 'सामान्य कीमत')}</div>
                  <strong style={{ fontSize: '1.1rem', color: '#64748b' }}>₹{Math.round(consumerRegularPrice * consumerQty)}</strong>
                </div>
                <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase' }}>{l('KisanLink Price', 'किसानलिंक कीमत')}</div>
                  <strong style={{ fontSize: '1.1rem', color: '#047857' }}>₹{Math.round(consumerPooledPrice * consumerQty)}</strong>
                </div>
                <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>{l('YOU SAVE', 'आपकी बचत')}</div>
                  <strong style={{ fontSize: '1.4rem', color: '#059669', fontWeight: 900 }}>₹{consumerTotalSavings}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConsumerAddToCart}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.9rem 1.5rem',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShoppingCart size={18} />
                <span>{l(`ADD ${consumerQty} KG TO CART · SAVE ₹${consumerTotalSavings}`, `${consumerQty} किलो कार्ट में जोड़ें · ₹${consumerTotalSavings} बचाएं`)}</span>
              </button>
            </div>
          </section>

          {/* PROGRESS */}
          <section style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <span>{l('Market Progress', 'बाज़ार प्रगति')}</span>
              <span style={{ color: isUnlocked ? '#059669' : '#2563eb' }}>{math.committedKg} / {math.thresholdKg} kg {l('ready', 'तैयार')}</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((math.committedKg / (math.thresholdKg || 1)) * 100))}%`, height: '100%', background: isUnlocked ? '#059669' : '#2563eb' }} />
            </div>
          </section>

          {/* OTHER REGIONS */}
          {otherViews.length > 0 && (
            <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                {l('OTHER NCR MARKET MAKER DISCOUNTS', 'अन्य एनसीआर मार्केट मेकर छूट')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                {otherViews.map((ov) => (
                  <div
                    key={ov.board.id}
                    onClick={() => handleSelectBoard(ov.board.id)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>📍 {ov.board.regions?.[0]?.name ?? ov.board.crop.split(' ')[0]}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ov.board.crop}</div>
                    </div>
                    <button type="button" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      {l('View', 'देखें')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : role === 'bulk' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* BULK BUYER BENEFIT-FIRST HERO */}
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <MapPin size={14} />
                  <span>
                    {isRegionMatched
                      ? `BEST PROCUREMENT OPPORTUNITY · ${regionName.toUpperCase()} MARKET MAKER`
                      : `NCR PROCUREMENT OPPORTUNITY · ${regionName.toUpperCase()} MARKET MAKER`}
                  </span>
                </div>
                <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {bulkSavingsPerKg > 0 ? (
                    <span style={{ color: '#047857' }}>
                      SAVE ₹{bulkSavingsPerKg.toFixed(2)}/kg ON LANDED COST
                    </span>
                  ) : (
                    <span>Direct Farm Pooled Sourcing</span>
                  )}
                </h1>
                <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.92rem' }}>
                  {board.corridor} → {board.destination} · Direct aggregate farm sourcing.
                </p>
              </div>

              <StatusBadge tone={isUnlocked ? 'green' : 'amber'}>
                {isUnlocked ? 'Market Viable' : `${gapKg} kg remaining`}
              </StatusBadge>
            </div>

            {/* Landed Cost Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Standard Landed Cost</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#64748b', textDecoration: 'line-through' }}>₹{bulkStdLanded.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mandi + Trader commission</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>Market Maker Landed Cost</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>₹{bulkMmLanded.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#059669' }}>Farm Gate + Pooled Freight</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>Landed Saving</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>₹{bulkSavingsPerKg.toFixed(2)}/kg</div>
                <div style={{ fontSize: '0.75rem', color: '#059669' }}>Net margin gain</div>
              </div>
            </div>

            {/* Input and Commit */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Procurement Demand:</span>
                <input
                  type="number"
                  min={1}
                  max={gapKg || 1000}
                  value={bulkQty}
                  onChange={(e) => setBulkQty(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{ width: '100px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '1rem' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>kg</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', textAlign: 'center', marginBottom: '1.15rem' }}>
                <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Standard Total</div>
                  <strong style={{ fontSize: '1.15rem', color: '#64748b' }}>₹{Math.round(bulkStdLanded * bulkQty).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase' }}>Market Maker Total</div>
                  <strong style={{ fontSize: '1.15rem', color: '#047857' }}>₹{Math.round(bulkMmLanded * bulkQty).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>TOTAL SAVING</div>
                  <strong style={{ fontSize: '1.4rem', color: '#059669', fontWeight: 900 }}>₹{bulkTotalSavings.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBulkCommit}
                disabled={busy || bulkQty <= 0 || gapKg <= 0}
                style={{
                  width: '100%',
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.9rem 1.5rem',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>COMMIT {bulkQty.toLocaleString('en-IN')} KG DEMAND · SAVE ₹{bulkTotalSavings.toLocaleString('en-IN')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {/* PROGRESS */}
          <section style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <span>Market Progress</span>
              <span style={{ color: isUnlocked ? '#059669' : '#047857' }}>{math.committedKg} / {math.thresholdKg} kg ready</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((math.committedKg / (math.thresholdKg || 1)) * 100))}%`, height: '100%', background: '#047857' }} />
            </div>
          </section>

          {/* OTHER REGIONS */}
          {otherViews.length > 0 && (
            <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                OTHER NCR PROCUREMENT OPPORTUNITIES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                {otherViews.map((ov) => (
                  <div
                    key={ov.board.id}
                    onClick={() => handleSelectBoard(ov.board.id)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>📍 {ov.board.regions?.[0]?.name ?? ov.board.crop.split(' ')[0]}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ov.board.crop}</div>
                    </div>
                    <button type="button" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* LOGISTICS VIEW (Part L - keeps operational dispatch & vehicle utilization focus) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                  LOGISTICS DISPATCH · SHARED CORRIDOR
                </span>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0', color: '#0f172a' }}>
                  {board.corridor}
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Pooled Load: <strong>{math.committedKg} / {math.capacityKg} kg</strong> · Vehicle Utilization: <strong>{math.utilisationPct}%</strong>
                </p>
              </div>
              <StatusBadge tone={math.viable ? 'green' : 'amber'}>
                {math.viable ? 'Viable for Route Creation' : 'Load Forming'}
              </StatusBadge>
            </div>

            {math.viable && board.status !== 'created' && (
              <button type="button" className="btn btn-primary btn-large" onClick={create} disabled={busy} style={{ width: '100%', marginBottom: '1rem' }}>
                <Zap size={18} /> Create Pooled Dispatch Route
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned Fleet</div>
                <strong>{math.vehicle?.registration ?? 'VEH-02'} ({math.vehicle?.type ?? 'Medium truck'})</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Threshold Volume</div>
                <strong>{math.thresholdKg} kg break-even</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pooled Route Distance</div>
                <strong>{board.routeDistanceKm} km</strong>
              </div>
            </div>
          </section>

          {/* OTHER CORRIDORS FOR LOGISTICS */}
          {otherViews.length > 0 && (
            <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                OTHER NCR CORRIDORS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                {otherViews.map((ov) => (
                  <div
                    key={ov.board.id}
                    onClick={() => handleSelectBoard(ov.board.id)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>{ov.board.corridor}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ov.math.committedKg} / {ov.math.capacityKg} kg ({ov.math.utilisationPct}%)</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      View
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 5. COLLAPSIBLE TECHNICAL DETAILS SECTION FOR ALL ROLES */}
      <section style={{ marginTop: '1.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={16} color="#059669" />
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                {l('See Market Details & Underlying Economics', 'बाज़ार विवरण एवं अंतर्निहित अर्थशास्त्र देखें')}
              </strong>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {l('Infographics, freight curve, floor/ceiling calculations, and shared logistics', 'इन्फोग्राफिक्स, भाड़ा वक्र, फ्लोर/सीलिंग गणना और साझा परिवहन')}
              </div>
            </div>
          </div>
          {showTechnicalDetails ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </button>

        {showTechnicalDetails && (
          <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {board.isMultiCrop && math.multiCropMath && (
              <MultiCropCorridorCard board={board} math={math} onSelectCrop={(cropId) => setSelectedCropId(cropId)} />
            )}

            <MarketInfographics role={role} board={board} math={math} />

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{role === 'consumer' ? 'Who benefits' : role === 'bulk' ? 'What is being combined' : 'Why volume matters'}</span>
                  <h2>{role === 'consumer' ? 'Where the price actually goes' : role === 'bulk' ? 'Where the supply is coming from' : 'Delivered price against committed volume'}</h2>
                </div>
              </div>
              {role === 'consumer' ? (
                <MarketValueSplit board={board} math={math} />
              ) : role === 'bulk' ? (
                <MarketConvergence board={board} math={math} />
              ) : (
                <MarketFreightCurve board={board} math={math} />
              )}
            </section>

            <MarketHowItWorks board={board} math={math} />
            <MarketWhyPanel board={board} math={math} defaultOpen={false} />

            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <span>Market Maker calculations are strictly deterministic and based on live fleet and listing data.</span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.78rem' }}
                onClick={() => guard(() => prototypeService.seedScenario('market'), 'Corridor reset to forming state')}
              >
                <RotateCcw size={13} /> Reset Scenario
              </button>
            </div>
          </div>
        )}
      </section>

      {reveal && (
        <MarketUnlockReveal
          board={board}
          math={math}
          result={reveal}
          role={role}
          onClose={() => {
            setReveal(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
