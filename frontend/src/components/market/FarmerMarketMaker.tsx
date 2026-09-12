import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronUp, CircleAlert, Info, MapPin, Sparkles, Sprout, TrendingUp, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import { type CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { rankMarketMakerOpportunities } from '../../services/marketRankingService'
import { MarketDemandRing } from './MarketDemandRing'
import { MarketFreightCurve } from './MarketFreightCurve'

interface FarmerMarketMakerProps {
  views: MarketView[]
  activeBoardId?: string
  onSelectBoard: (boardId: string) => void
  userRegion?: string | null
  onRefresh?: () => void
}

const formatRupee = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`

export function FarmerMarketMaker({
  views,
  activeBoardId,
  onSelectBoard,
  userRegion,
  onRefresh,
}: FarmerMarketMakerProps) {
  const { language } = useLanguage()
  const { showToast } = useToast()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  // Deterministically rank opportunities: user's region first
  const ranking = rankMarketMakerOpportunities(views, userRegion)
  const currentView = (activeBoardId ? views.find((v) => v.board.id === activeBoardId) : null) || ranking.hero
  const otherViews = views.filter((v) => v.board.id !== currentView.board.id)

  const { board, math } = currentView
  const cropSegments = board.crops && board.crops.length > 0 ? board.crops : null

  // Crop selection state
  const [selectedCropId, setSelectedCropId] = useState<string>(
    cropSegments ? cropSegments[0].id : ''
  )
  const [quantityKg, setQuantityKg] = useState<number>(100)
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Current crop segment economics
  const activeCropSegment = cropSegments
    ? cropSegments.find((c) => c.id === selectedCropId) || cropSegments[0]
    : null

  const activeCropMath: CropSegmentMath | undefined = math.multiCropMath?.cropMaths?.find((cm) =>
    activeCropSegment ? cm.segment.id === activeCropSegment.id : true
  )

  const cropName = activeCropSegment ? activeCropSegment.crop : board.crop
  const cropHi = activeCropSegment ? activeCropSegment.cropHi : board.cropHi

  // Deterministic financial metrics
  const mandiPricePerKg = activeCropSegment
    ? activeCropSegment.mandiPricePerKg
    : board.mandiPricePerKg
  const farmerPricePerKg = activeCropSegment
    ? activeCropSegment.farmerFloorPerKg
    : (math.farmerGatePerKg || board.farmerFloorPerKg)
  const extraEarningPerKg = farmerPricePerKg - mandiPricePerKg
  const hasPremium = extraEarningPerKg > 0

  // Calculation for the entered quantity
  const validQuantity = Math.max(0, Number(quantityKg) || 0)
  const mandiEarning = validQuantity * mandiPricePerKg
  const marketMakerEarning = validQuantity * farmerPricePerKg
  const extraEarning = marketMakerEarning - mandiEarning

  // Threshold headroom safeguard
  const headroomKg = Math.max(0, math.thresholdKg - math.committedKg)
  const isCapExceeded = validQuantity > headroomKg && headroomKg > 0
  const isUnlocked = math.viable || headroomKg === 0

  // User-facing simple status
  const simpleStatus = board.status === 'created'
    ? { title: l('Market Unlocked', 'बाज़ार खुल गया'), tone: '#059669', bg: '#ecfdf5', icon: Check }
    : math.viable
      ? { title: l('Ready to Trade', 'व्यापार के लिए तैयार'), tone: '#059669', bg: '#ecfdf5', icon: Sparkles }
      : headroomKg <= 100
        ? { title: l('Almost Ready', 'लगभग तैयार'), tone: '#d97706', bg: '#fffbeb', icon: TrendingUp }
        : { title: l('Opportunity Building', 'अवसर बन रहा है'), tone: '#2563eb', bg: '#eff6ff', icon: Sprout }

  const regionTitle = board.regions?.[0]?.name ?? 'NCR'
  const isHeroMatched = ranking.userRegionMatched && ranking.matchedRegionName?.toLowerCase() === regionTitle.toLowerCase()

  const handleAddProduce = async () => {
    if (validQuantity <= 0) {
      showToast(l('Please enter a quantity greater than 0 kg', 'कृपया 0 से अधिक मात्रा दर्ज करें'))
      return
    }
    if (headroomKg <= 0) {
      showToast(l('This market has already reached its threshold capacity', 'यह बाज़ार अपनी क्षमता सीमा तक पहुंच चुका है'))
      return
    }
    if (isCapExceeded) {
      showToast(l(`Maximum ${headroomKg} kg can currently be added to this opportunity.`, `वर्तमान में इस अवसर में अधिकतम ${headroomKg} किलो ही जोड़ा जा सकता है।`))
      return
    }

    setSubmitting(true)
    try {
      await marketMakerService.contributeProduce(board.id, {
        cropName,
        cropId: activeCropSegment?.id,
        quantityKg: validQuantity,
      })
      showToast(l(
        `Successfully added ${validQuantity} kg ${cropName} to ${regionTitle} Market Maker!`,
        `${regionTitle} मार्केट मेकर में ${validQuantity} किलो ${cropHi} सफलता से जोड़ दी गई!`
      ))
      if (onRefresh) onRefresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add produce.')
    } finally {
      setSubmitting(false)
    }
  }

  const setCappedQuantity = () => {
    if (headroomKg > 0) setQuantityKg(headroomKg)
  }

  return (
    <div className="farmer-market-maker-v2" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. BENEFIT-FIRST HERO OPPORTUNITY CARD */}
      <section
        style={{
          background: 'linear-gradient(145deg, #052e16 0%, #064e3b 50%, #022c22 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: '0 12px 32px -8px rgba(5, 46, 22, 0.45)',
          border: '1px solid #065f46',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow accent */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Top Eyebrow Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: isHeroMatched ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#6ee7b7', padding: '0.3rem 0.85rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            <span>🍅</span>
            <span>{isHeroMatched ? l('BEST OPPORTUNITY FOR YOU', 'आपके लिए सर्वोत्तम अवसर') : l('NCR MARKET MAKER OPPORTUNITY', 'एनसीआर मार्केट मेकर अवसर')}</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: simpleStatus.bg, color: simpleStatus.tone, padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
            <simpleStatus.icon size={14} />
            <span>{simpleStatus.title}</span>
          </div>
        </div>

        {/* Region & Dominant Premium Headline */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.9rem', color: '#a7f3d0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={15} /> {regionTitle.toUpperCase()} MARKET MAKER · {board.corridor}
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0.25rem 0', color: '#ffffff', letterSpacing: '-0.5px' }}>
            {hasPremium ? (
              <span style={{ color: '#34d399' }}>
                {l(`EARN ₹${extraEarningPerKg.toFixed(0)}/kg MORE`, `प्रति किलो ₹${extraEarningPerKg.toFixed(0)} अधिक कमाएं`)}
              </span>
            ) : (
              <span style={{ color: '#cbd5e1' }}>
                {l('No premium opportunity currently', 'वर्तमान में कोई अतिरिक्त प्रीमियम उपलब्ध नहीं')}
              </span>
            )}
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#d1fae5', opacity: 0.9 }}>
            {l(
              'Sell direct through pooled transport without paying mandi commission or middleman cuts.',
              'मंडी आढ़त और बिचौलियों के बिना सीधे साझा परिवहन के माध्यम से बेचें।'
            )}
          </p>
        </div>

        {/* Price Benchmark Comparison Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
              {l('Mandi Reference Price', 'मंडी संदर्भ भाव')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e5e7eb', marginTop: '0.15rem' }}>
              ₹{mandiPricePerKg}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{l('Traditional mandi rate', 'पारंपरिक मंडी दर')}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 600 }}>
              {l('KisanLink Market Maker', 'किसानलिंक मार्केट मेकर')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '0.15rem' }}>
              ₹{farmerPricePerKg}/kg
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>{l('Floor price guaranteed', 'सुरक्षित न्यूनतम भाव')}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 600 }}>
              {l('Net Premium Benefit', 'शुद्ध अतिरिक्त लाभ')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: hasPremium ? '#34d399' : '#9ca3af', marginTop: '0.15rem' }}>
              {hasPremium ? `+₹${extraEarningPerKg.toFixed(0)}/kg` : '₹0/kg'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>{l('Direct to your account', 'सीधे आपके बैंक खाते में')}</div>
          </div>
        </div>

        {/* 2. ACTION: SIMPLE CROP & QUANTITY INPUT */}
        <div style={{ background: '#ffffff', color: '#111827', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937', marginBottom: '0.75rem' }}>
            {l('Enter Produce to Add to this Market Maker:', 'इस मार्केट मेकर में जोड़ने के लिए फसल दर्ज करें:')}
          </div>

          {/* Crop Selector if multi-crop corridor */}
          {cropSegments && cropSegments.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {cropSegments.map((c) => {
                const isSelected = c.id === selectedCropId
                const icon = c.crop.toLowerCase().includes('tomato') ? '🍅' : c.crop.toLowerCase().includes('onion') ? '🧅' : '🥔'
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCropId(c.id)}
                    style={{
                      background: isSelected ? '#047857' : '#f3f4f6',
                      color: isSelected ? '#ffffff' : '#374151',
                      border: isSelected ? '1px solid #047857' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '0.5rem 0.85rem',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{icon}</span>
                    <span>{language === 'hi' ? c.cropHi : c.crop}</span>
                    <small style={{ opacity: 0.8, fontSize: '0.75rem' }}>₹{c.farmerFloorPerKg}/kg</small>
                  </button>
                )
              })}
            </div>
          )}

          {/* Quantity Input with inline cap feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563' }}>{l('Quantity:', 'मात्रा:')}</span>
              <input
                type="number"
                min={1}
                max={headroomKg || 500}
                value={quantityKg}
                onChange={(e) => setQuantityKg(Number(e.target.value))}
                style={{
                  width: '110px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: isCapExceeded ? '2px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: isCapExceeded ? '#dc2626' : '#111827',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontWeight: 600, color: '#6b7280' }}>kg {language === 'hi' ? cropHi : cropName}</span>
            </div>

            {/* Quick adjust pills */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[50, 100, 200].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setQuantityKg(step)}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  +{step} kg
                </button>
              ))}
              {headroomKg > 0 && headroomKg < 500 && (
                <button
                  type="button"
                  onClick={setCappedQuantity}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#92400e',
                  }}
                >
                  {l(`Max (${headroomKg} kg)`, `अधिकतम (${headroomKg} किलो)`)}
                </button>
              )}
            </div>
          </div>

          {/* Validation Warning when Cap Exceeded */}
          {isCapExceeded && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CircleAlert size={16} />
                <span>{l(`Maximum ${headroomKg} kg can currently be added to this opportunity.`, `वर्तमान में इस अवसर में अधिकतम ${headroomKg} किलो ही जोड़ा जा सकता है।`)}</span>
              </div>
              <button
                type="button"
                onClick={setCappedQuantity}
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {l('Adjust to Cap', 'सीमा पर सेट करें')}
              </button>
            </div>
          )}

          {/* Dynamic Earnings Projection Grid */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  {l('Normal Mandi Earning', 'सामान्य मंडी कमाई')}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#475569', marginTop: '0.2rem' }}>
                  {formatRupee(mandiEarning)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{validQuantity} kg × ₹{mandiPricePerKg}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>
                  {l('KisanLink Earning', 'किसानलिंक कमाई')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46', marginTop: '0.2rem' }}>
                  {formatRupee(marketMakerEarning)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669' }}>{validQuantity} kg × ₹{farmerPricePerKg}</div>
              </div>

              <div style={{ background: hasPremium ? '#ecfdf5' : '#f1f5f9', borderRadius: '8px', padding: '0.5rem', border: hasPremium ? '1px solid #a7f3d0' : '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.75rem', color: hasPremium ? '#047857' : '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                  {l('YOU EARN', 'आप कमाएंगे')}
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: hasPremium ? '#059669' : '#64748b', marginTop: '0.1rem' }}>
                  {hasPremium ? `${formatRupee(extraEarning)} MORE` : '₹0 EXTRA'}
                </div>
                <div style={{ fontSize: '0.75rem', color: hasPremium ? '#047857' : '#64748b' }}>
                  {hasPremium ? l('Direct extra profit', 'सीधा अतिरिक्त मुनाफा') : l('Matches mandi', 'मंडी के बराबर')}
                </div>
              </div>
            </div>
          </div>

          {/* 3. PRIMARY CTA BUTTON */}
          <button
            type="button"
            disabled={submitting || isCapExceeded || validQuantity <= 0 || headroomKg <= 0}
            onClick={handleAddProduce}
            style={{
              width: '100%',
              background: isCapExceeded || headroomKg <= 0 ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.95rem 1.5rem',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: isCapExceeded || headroomKg <= 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Sprout size={20} />
            <span>
              {submitting
                ? l('Adding to Market Maker…', 'मार्केट मेकर में जोड़ा जा रहा है…')
                : headroomKg <= 0
                  ? l('Threshold Reached (Fully Unlocked)', 'सीमा पूरी (पूर्णतः अनलॉक्ड)')
                  : l(
                      `ADD ${validQuantity} KG ${cropName.toUpperCase()}`,
                      `${validQuantity} किलो ${cropHi.toUpperCase()} जोड़ें`
                    )}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 4. SIMPLE MARKET PROGRESS */}
      <section style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {l('Market Progress', 'बाज़ार प्रगति')}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isUnlocked ? '#059669' : '#2563eb' }}>
            {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg {l('ready', 'तैयार')}
          </span>
        </div>

        {/* Big clean progress bar */}
        <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div
            style={{
              width: `${Math.min(100, Math.round((math.committedKg / (math.thresholdKg || 1)) * 100))}%`,
              height: '100%',
              background: isUnlocked ? '#059669' : '#2563eb',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
          <span>
            {isUnlocked
              ? l('✓ Break-even volume reached · corridor unlocked', '✓ ब्रेक-ईवन मात्रा पूरी · कॉरिडोर खुल गया')
              : l(`${headroomKg} kg more needed to trigger direct dispatch`, `सीधे प्रेषण के लिए ${headroomKg} किलो और चाहिए`)}
          </span>
          <Link to="/farmer/produce" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {l('View My Produce Listings', 'मेरी फसल लिस्टिंग देखें')} <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* 5. OTHER REGIONAL OPPORTUNITIES (Compact clickable secondary directory) */}
      {otherViews.length > 0 && (
        <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            {l('OTHER NCR MARKET MAKER OPPORTUNITIES', 'अन्य एनसीआर मार्केट मेकर अवसर')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {otherViews.map((ov) => {
              const otherCrop = ov.board.crops?.[0]
              const otherRegion = ov.board.regions?.[0]?.name ?? ov.board.crop.split(' ')[0]
              const otherMandi = otherCrop ? otherCrop.mandiPricePerKg : ov.board.mandiPricePerKg
              const otherPrice = otherCrop ? otherCrop.farmerFloorPerKg : (ov.math.farmerGatePerKg || ov.board.farmerFloorPerKg)
              const otherPrem = otherPrice - otherMandi
              const otherIcon = ov.board.crop.toLowerCase().includes('tomato') ? '🍅' : ov.board.crop.toLowerCase().includes('onion') ? '🧅' : '🥔'

              return (
                <div
                  key={ov.board.id}
                  onClick={() => onSelectBoard(ov.board.id)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      <MapPin size={13} color="#059669" /> {otherRegion}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{otherIcon}</span>
                      <span>{otherCrop ? otherCrop.crop : ov.board.crop}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: otherPrem > 0 ? '#059669' : '#64748b', marginTop: '0.2rem' }}>
                      {otherPrem > 0 ? `Earn ₹${otherPrem.toFixed(0)}/kg more` : `Mandi ₹${otherMandi}/kg`}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {l('View', 'देखें')}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 6. TECHNICAL DETAILS (Collapsible accordion below primary benefit & action) */}
      <section style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
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
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                {l('Why this opportunity works & Technical Details', 'यह अवसर कैसे काम करता है एवं तकनीकी विवरण')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {l('Freight curve, vehicle economics, and crop compatibility', 'भाड़ा वक्र, वाहन अर्थशास्त्र और फसल अनुकूलता')}
              </div>
            </div>
          </div>
          {showDetails ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
        </button>

        {showDetails && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Regional Opportunity Freight Curve */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                {l('Regional Freight Curve & Break-Even Dynamics', 'क्षेत्रीय भाड़ा वक्र एवं ब्रेक-ईवन गतिशीलता')}
              </div>
              <MarketFreightCurve board={board} math={math} />
            </div>

            {/* 2. Circular Committed-vs-Threshold Visualization & 3. Market Progress */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-around',
                gap: '1.5rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
              data-testid="circular-threshold-card"
            >
              <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <MarketDemandRing
                  board={board}
                  math={math}
                  committedKg={math.committedKg}
                  thresholdKg={math.thresholdKg}
                  status={board.status}
                  tone="light"
                  language={language}
                />
              </div>

              <div style={{ flex: '1 1 260px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                    {l('Committed Weight vs Break-Even Threshold', 'स्वीकृत मात्रा बनाम ब्रेक-ईवन सीमा')}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {math.committedKg.toLocaleString('en-IN')} / {Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} kg
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{l('Completion', 'पूर्णता')}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isUnlocked ? '#059669' : '#2563eb' }}>
                      {Math.min(100, Math.round((math.committedKg / (math.thresholdKg || 1)) * 100))}%
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{l('Remaining to Unlock', 'खुलने के लिए शेष')}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isUnlocked ? '#059669' : '#d97706' }}>
                      {headroomKg <= 0 ? l('0 kg (Unlocked)', '0 किलो (अनलॉक)') : `${headroomKg} kg`}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                  {isUnlocked
                    ? l('✓ Break-even threshold reached! Transport pool is viable and direct dispatch is unlocked.', '✓ ब्रेक-ईवन सीमा पूरी! परिवहन पूल व्यवहार्य है और सीधा प्रेषण अनलॉक है।')
                    : l(
                        `This regional Market Maker needs ${headroomKg} kg more produce to trigger direct vehicle dispatch without mandi commission.`,
                        `इस क्षेत्रीय मार्केट मेकर को बिना मंडी आढ़त के सीधा वाहन प्रेषण शुरू करने के लिए ${headroomKg} किलो और फसल चाहिए।`
                      )}
                </div>
              </div>
            </div>

            {/* 4. Shared Logistics, 5. Freight, 6. Vehicle Utilization */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b' }}>{l('Assigned Vehicle', 'आवंटित वाहन')}</div>
                <strong style={{ color: '#0f172a' }}>{math.vehicle?.registration ?? 'VEH-02'} · {math.vehicle?.type ?? 'Medium truck'}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b' }}>{l('Vehicle Capacity', 'वाहन क्षमता')}</div>
                <strong style={{ color: '#0f172a' }}>{math.capacityKg} kg ({math.utilisationPct}% utilized)</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b' }}>{l('Total Pooled Freight', 'कुल साझा भाड़ा')}</div>
                <strong style={{ color: '#0f172a' }}>{formatRupee(math.freightTotal)} (₹{math.freightPerKg}/kg)</strong>
              </div>
            </div>

            {/* 7. Additional Economics / Multi-Crop Breakdown if present */}
            {board.isMultiCrop && math.multiCropMath && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🟢</span>
                  <span>{l('Compatible Shared Transport Corridor', 'अनुकूल साझा परिवहन कॉरिडोर')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {math.multiCropMath.cropMaths.map((cm) => (
                    <div key={cm.segment.id} style={{ background: '#ffffff', border: '1px solid #86efac', padding: '0.5rem', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#14532d' }}>{cm.segment.crop}</div>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>Committed: {cm.committedKg} kg</div>
                      <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Farmer Gate: ₹{cm.farmerFloorPerKg}/kg</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
