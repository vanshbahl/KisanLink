import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Cpu,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { dealRoomService, type DealEvaluationResult, type DealRoomState } from '../../services/dealRoomService'

const ANALYSIS_STEPS = [
  'Reading protected price limits (🔒 Farmer Minimum ₹28/kg locked)...',
  'Checking buyer flexibility & destination delivery constraints...',
  'Searching shared transport corridor options (Sonipat → Delhi)...',
  'Evaluating route economics: Pooling reduces freight from ₹4/kg to ₹2/kg...',
  'Testing feasible combinations against buyer ceiling of ₹30/kg...',
  'Feasible transaction found: ₹28 Farmer + ₹2 Freight = ₹30 Delivered.',
]

export function DealRoomView() {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const [state, setState] = useState<DealRoomState>(dealRoomService.getState())
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [confirmingTransaction, setConfirmingTransaction] = useState(false)

  const evaluation: DealEvaluationResult = dealRoomService.evaluate(state.conditions)

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setState(e.detail)
    }
    window.addEventListener('kisanlink:dealroom_updated', handleUpdate)
    return () => window.removeEventListener('kisanlink:dealroom_updated', handleUpdate)
  }, [])

  const handleToggleCondition = (key: 'afternoonDelivery' | 'sharedTransport' | 'volumeTolerance') => {
    if (state.status === 'CONFIRMED') return
    const nextVal = !state.conditions[key]
    const updated = dealRoomService.updateConditions({ [key]: nextVal })
    setState(updated)
  }

  const handleRunAnalysis = () => {
    setAnalyzing(true)
    setAnalysisStep(0)

    // Run stepped analysis animation
    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < ANALYSIS_STEPS.length) {
        setAnalysisStep(step)
      } else {
        clearInterval(interval)
        setAnalyzing(false)
        // Automatically enable both flexible terms for dramatic demo reveal
        const updated = dealRoomService.updateConditions({
          afternoonDelivery: true,
          sharedTransport: true,
        })
        setState(updated)
      }
    }, 1200)
  }

  const handleAccept = async (party: 'farmer' | 'buyer') => {
    const next = await dealRoomService.setPartyAcceptance(party, true)
    setState(next)
    if (next.farmerAccepted && next.buyerAccepted) {
      setConfirmingTransaction(true)
      setTimeout(() => {
        setConfirmingTransaction(false)
      }, 1500)
    }
  }

  const handleReset = () => {
    setAnalyzing(false)
    setAnalysisStep(0)
    setConfirmingTransaction(false)
    const reset = dealRoomService.resetDemoScenario()
    setState(reset)
  }

  const isFeasible = evaluation.isFeasible
  const isConfirmed = state.status === 'CONFIRMED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1080px', margin: '0 auto' }}>
      {/* 1. TOP STATUS & DEMO CONTROLS */}
      <div
        style={{
          background: isConfirmed
            ? 'linear-gradient(135deg, #064e3b 0%, #047857 100%)'
            : isFeasible
            ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)'
            : 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.65rem',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {isConfirmed ? (
              <CheckCircle2 size={32} color="#a7f3d0" />
            ) : isFeasible ? (
              <Sparkles size={32} color="#a7f3d0" />
            ) : (
              <XCircle size={32} color="#fca5a5" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
              {l('Kisan Intelligence Deal Room · Smart Deal Analysis', 'किसान इंटेलिजेंस डील रूम · स्मार्ट डील विश्लेषण')}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {isConfirmed
                ? l(`✓ DEAL CONFIRMED · ${state.dealId}`, `✓ सौदा पक्का · ${state.dealId}`)
                : isFeasible
                ? l('🟢 FEASIBLE DEAL UNLOCKED', '🟢 व्यवहार्य सौदा संभव हुआ')
                : l('🔴 NO FEASIBLE DEAL CURRENTLY', '🔴 वर्तमान में कोई व्यवहार्य सौदा नहीं')}
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
              {isConfirmed
                ? l('Both parties accepted! Transaction synchronized to Logistics & Escrow.', 'दोनों पक्षों ने स्वीकार किया! परिवहन व एस्क्रो में सौदा दर्ज।')
                : isFeasible
                ? l('Delivered price meets buyer ceiling without cutting farmer earnings.', 'बिना किसान का भाव घटाए खरीदार की अधिकतम सीमा में सौदा बैठ गया।')
                : l('Deficit of ₹2.0/kg: Farmer minimum + baseline logistics exceeds buyer ceiling.', '₹2.0/किलो का अंतर: किसान का न्यूनतम भाव + परिवहन खरीदार की सीमा से अधिक है।')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.15s',
          }}
        >
          <RotateCcw size={15} />
          {l('Reset Demo Scenario', 'डेमो रीसेट करें')}
        </button>
      </div>

      {/* 2. PROTECTED FARMER MINIMUM HERO CARD */}
      <div
        style={{
          background: '#ffffff',
          border: '2px solid #059669',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '0.75rem',
              color: '#047857',
            }}
          >
            <Lock size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', letterSpacing: '0.8px', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                {l('HARD PROTECTED INVARIANT', 'सुरक्षित न्यूनतम गारंटी')}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                {l('✓ 0% Reduction Conceded', '✓ किसान भाव में ₹0 की कटौती')}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
              {l('Farmer Guaranteed Minimum:', 'किसान का सुरक्षित न्यूनतम भाव:')}{' '}
              <span style={{ color: '#047857', fontSize: '1.6rem' }}>₹{state.farmerMinimumPrice}/kg</span>
            </div>
            <div style={{ fontSize: '0.84rem', color: '#4b5563' }}>
              {l('KisanLink Deal Room strictly preserves farmer income. We solve deals by engineering freight, never by squeezing farmers.', 'किसानलिंक किसान की आय से कोई समझौता नहीं करता। हम भाड़े को अनुकूलित करके सौदा संभव बनाते हैं।')}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{l('Committed Produce', 'फसल मात्रा')}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>500 kg · Fresh Tomatoes</div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>{l('Grade A+ Hand Sorted', 'ग्रेड A+ छांटी हुई')}</div>
        </div>
      </div>

      {/* 3. THREE-COLUMN ECONOMICS & PRICING VISUALIZATION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Node 1: Farmer Gate */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
              {l('1. Farmer Gate Price', '1. किसान गेट भाव')}
            </span>
            <Lock size={15} color="#047857" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '0.3rem' }}>
            ₹{evaluation.farmerPricePerKg}/kg
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {l('Ramesh Kumar · Murthal Plot', 'रमेश कुमार · मुरथल खेत')}
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.6rem', background: '#ecfdf5', borderRadius: '6px', fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>
            {l('Floor Price Guarantee: ₹14,000 Total Net', 'सुरक्षित कुल भुगतान: ₹14,000')}
          </div>
        </div>

        {/* Node 2: Logistics & Freight Engine */}
        <div style={{ background: '#ffffff', border: isFeasible ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isFeasible ? '#047857' : '#d97706', textTransform: 'uppercase' }}>
              {l('2. Transport / Freight', '2. परिवहन / भाड़ा')}
            </span>
            <Truck size={16} color={isFeasible ? '#047857' : '#d97706'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
            {isFeasible && evaluation.logisticsCostPerKg < 4 ? (
              <>
                <span style={{ fontSize: '1.2rem', color: '#9ca3af', textDecoration: 'line-through' }}>₹4.0/kg</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857' }}>
                  ₹{evaluation.logisticsCostPerKg.toFixed(1)}/kg
                </span>
              </>
            ) : (
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>
                ₹{evaluation.logisticsCostPerKg.toFixed(1)}/kg
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {evaluation.transportMode}
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.6rem', background: isFeasible ? '#ecfdf5' : '#fef3c7', borderRadius: '6px', fontSize: '0.75rem', color: isFeasible ? '#065f46' : '#92400e', fontWeight: 600 }}>
            {isFeasible ? l('✓ ₹2.0/kg saved via pooled corridor', '✓ साझा कॉरिडोर से ₹2.0/किलो की बचत') : l('Baseline dedicated morning freight', 'मानक समर्पित सुबह का भाड़ा')}
          </div>
        </div>

        {/* Node 3: Buyer Landed Price */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
              {l('3. Buyer Delivered Price', '3. खरीदार पहुँचा भाव')}
            </span>
            <Coins size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isFeasible ? '#047857' : '#dc2626', marginTop: '0.3rem' }}>
            ₹{evaluation.deliveredPricePerKg.toFixed(1)}/kg
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {l('Buyer Ceiling: ₹30.0/kg max', 'खरीदार की अधिकतम सीमा: ₹30.0/किलो')}
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.6rem', background: isFeasible ? '#ecfdf5' : '#fef2f2', borderRadius: '6px', fontSize: '0.75rem', color: isFeasible ? '#065f46' : '#991b1b', fontWeight: 600 }}>
            {isFeasible
              ? l('✓ Fits within ₹30.0/kg buyer budget', '✓ खरीदार के ₹30.0 बजट में उपयुक्त')
              : l(`₹${evaluation.priceGapPerKg.toFixed(1)}/kg above buyer budget`, `खरीदार के बजट से ₹${evaluation.priceGapPerKg.toFixed(1)} अधिक`)}
          </div>
        </div>
      </div>

      {/* 4. ANIMATED ANALYSIS BANNER (WHEN PROCESSING) */}
      {analyzing && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 6px 20px rgba(49, 46, 129, 0.25)',
            border: '1px solid #4338ca',
          }}
          data-testid="deal-analysis-sequence"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Cpu className="animate-spin" size={16} />
            <span>{l('Smart Deal Analysis in Progress…', 'स्मार्ट डील विश्लेषण जारी है…')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.4rem', color: '#ffffff' }}>
            {ANALYSIS_STEPS[analysisStep]}
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.75rem' }}>
            <div
              style={{
                width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%`,
                height: '100%',
                background: '#38bdf8',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* 5. FLEXIBLE TERMS CONTROLS & "FIND FEASIBLE DEAL" ACTION */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
              {l('Trade Flexibility & Condition Relaxation', 'सौदा अनुकूलन एवं लचीली शर्तें')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {l('Toggle flexible parameters to let Kisan Intelligence discover feasible combinations without reducing farmer price.', 'किसान का भाव घटाए बिना व्यवहार्य सौदा खोजने के लिए लचीली शर्तें चुनें।')}
            </div>
          </div>
          {!isFeasible && !analyzing && (
            <button
              type="button"
              onClick={handleRunAnalysis}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.7rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
              data-testid="find-deal-btn"
            >
              <Sparkles size={16} />
              <span>{l('Find a Feasible Deal', 'व्यवहार्य सौदा खोजें')}</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {/* Toggle 1: Afternoon Delivery */}
          <div
            onClick={() => handleToggleCondition('afternoonDelivery')}
            style={{
              background: state.conditions.afternoonDelivery ? '#f0fdf4' : '#f8fafc',
              border: state.conditions.afternoonDelivery ? '1.5px solid #059669' : '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              cursor: isConfirmed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={18} color={state.conditions.afternoonDelivery ? '#059669' : '#64748b'} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: state.conditions.afternoonDelivery ? '#065f46' : '#1e293b' }}>
                  {l('Afternoon Delivery (1–4 PM)', 'दोपहर डिलीवरी (1–4 बजे)')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {l('Flexible window off-peak savings: ₹1.0/kg', 'ऑफ-पीक बचत: ₹1.0/किलो')}
                </div>
              </div>
            </div>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: state.conditions.afternoonDelivery ? '2px solid #059669' : '2px solid #94a3b8',
                background: state.conditions.afternoonDelivery ? '#059669' : 'transparent',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {state.conditions.afternoonDelivery && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </div>
          </div>

          {/* Toggle 2: Shared Corridor Transport */}
          <div
            onClick={() => handleToggleCondition('sharedTransport')}
            style={{
              background: state.conditions.sharedTransport ? '#f0fdf4' : '#f8fafc',
              border: state.conditions.sharedTransport ? '1.5px solid #059669' : '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              cursor: isConfirmed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Truck size={18} color={state.conditions.sharedTransport ? '#059669' : '#64748b'} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: state.conditions.sharedTransport ? '#065f46' : '#1e293b' }}>
                  {l('Shared Corridor Transport', 'साझा कॉरिडोर परिवहन')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {l('Pooled truck allocation savings: ₹1.0/kg', 'पूल ट्रक बचत: ₹1.0/किलो')}
                </div>
              </div>
            </div>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: state.conditions.sharedTransport ? '2px solid #059669' : '2px solid #94a3b8',
                background: state.conditions.sharedTransport ? '#059669' : 'transparent',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {state.conditions.sharedTransport && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </div>
          </div>

          {/* Toggle 3: Volume Tolerance */}
          <div
            onClick={() => handleToggleCondition('volumeTolerance')}
            style={{
              background: state.conditions.volumeTolerance ? '#f0fdf4' : '#f8fafc',
              border: state.conditions.volumeTolerance ? '1.5px solid #059669' : '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              cursor: isConfirmed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Coins size={18} color={state.conditions.volumeTolerance ? '#059669' : '#64748b'} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: state.conditions.volumeTolerance ? '#065f46' : '#1e293b' }}>
                  {l('±10% Volume Tolerance', '±10% मात्रा छूट')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {l('Buffer: 450–550 kg acceptable', '450–550 किलो तक मान्य')}
                </div>
              </div>
            </div>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: state.conditions.volumeTolerance ? '2px solid #059669' : '2px solid #94a3b8',
                background: state.conditions.volumeTolerance ? '#059669' : 'transparent',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {state.conditions.volumeTolerance && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </div>
          </div>
        </div>
      </div>

      {/* 6. WHAT CHANGED (DISCOVERY / REVEAL CARD) */}
      {isFeasible && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
          data-testid="what-changed-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#065f46', fontSize: '0.92rem' }}>
            <Sparkles size={18} color="#059669" />
            <span>{l('WHAT KISANLINK CHANGED TO MAKE THIS DEAL POSSIBLE', 'सौदा संभव बनाने के लिए किसानलिंक ने क्या बदला')}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>{l('Delivery Window', 'डिलीवरी समय')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                {evaluation.whatChanged.deliveryWindow}
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>{l('Shared Transport', 'साझा परिवहन')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                {evaluation.whatChanged.transportMode}
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>{l('Logistics Freight', 'लॉजिस्टिक्स भाड़ा')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                {evaluation.whatChanged.logisticsSavings}
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>{l('Farmer Minimum', 'किसान का भाव')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857', marginTop: '0.15rem' }}>
                {evaluation.whatChanged.farmerProtection}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MUTUAL ACCEPTANCE SECTION */}
      {isFeasible && !isConfirmed && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.75rem' }}>
            {l('Two-Sided Agreement · Mutual Transaction Sign-Off', 'दोतरफा समझौता · दोनों पक्षों की सहमति')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Farmer Side Accept */}
            <div style={{ border: state.farmerAccepted ? '2px solid #059669' : '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', background: state.farmerAccepted ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                  {l('Farmer: Ramesh Kumar', 'किसान: रमेश कुमार')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: state.farmerAccepted ? '#059669' : '#d97706' }}>
                  {state.farmerAccepted ? l('✓ ACCEPTED', '✓ स्वीकृत') : l('WAITING', 'प्रतीक्षारत')}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.35rem 0 0.75rem 0' }}>
                {l('Agrees to supply 500 kg at guaranteed ₹28/kg net in afternoon slot.', 'दोपहर स्लॉट में ₹28/किलो पर 500 किलो आपूर्ति की सहमति।')}
              </p>
              <button
                type="button"
                disabled={state.farmerAccepted}
                onClick={() => handleAccept('farmer')}
                style={{
                  width: '100%',
                  background: state.farmerAccepted ? '#059669' : '#1e293b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: state.farmerAccepted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {state.farmerAccepted ? <Check size={16} /> : null}
                <span>{state.farmerAccepted ? l('Farmer Accepted', 'किसान द्वारा स्वीकृत') : l('Farmer Accept (₹28/kg)', 'किसान स्वीकार करें (₹28/किलो)')}</span>
              </button>
            </div>

            {/* Buyer Side Accept */}
            <div style={{ border: state.buyerAccepted ? '2px solid #059669' : '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', background: state.buyerAccepted ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                  {l('Buyer: FreshKart Procurement', 'खरीदार: FreshKart')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: state.buyerAccepted ? '#059669' : '#d97706' }}>
                  {state.buyerAccepted ? l('✓ ACCEPTED', '✓ स्वीकृत') : l('WAITING', 'प्रतीक्षारत')}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.35rem 0 0.75rem 0' }}>
                {l('Agrees to accept afternoon delivery at ₹30/kg landed price.', 'दोपहर डिलीवरी में ₹30/किलो पहुँचा भाव पर सहमति।')}
              </p>
              <button
                type="button"
                disabled={state.buyerAccepted}
                onClick={() => handleAccept('buyer')}
                style={{
                  width: '100%',
                  background: state.buyerAccepted ? '#059669' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: state.buyerAccepted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {state.buyerAccepted ? <Check size={16} /> : null}
                <span>{state.buyerAccepted ? l('Buyer Accepted', 'खरीदार द्वारा स्वीकृत') : l('Buyer Accept (₹30/kg Delivered)', 'खरीदार स्वीकार करें (₹30/किलो)')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY */}
      {confirmingTransaction && (
        <div
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            borderRadius: '14px',
            padding: '1.25rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <Cpu className="animate-spin" size={24} color="#a7f3d0" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {l('Finalizing Deal Room Transaction…', 'डील रूम सौदा अंतिम रूप दिया जा रहा है…')}
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
              {l('Locking inventory · Creating transaction · Scheduling pickup · Synchronizing Farmer, Buyer & Logistics…', 'स्टॉक लॉक · सौदा निर्माण · पिकअप निर्धारण · किसान, खरीदार व लॉजिस्टिक्स सिंक…')}
            </div>
          </div>
        </div>
      )}

      {/* 8. TECHNICAL ANALYSIS DETAILS (ACCORDION) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
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
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827' }}>
                {l('Why this deal works & Constraint Analysis', 'यह सौदा कैसे काम करता है एवं बाधा विश्लेषण')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {l('Deterministic solver stages, candidate evaluations, and protected bounds', 'समाधानकर्ता चरण, संभावित संयोजन व सुरक्षित सीमाएँ')}
              </div>
            </div>
          </div>
          {showTechnicalDetails ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
        </button>

        {showTechnicalDetails && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>
              <strong>{l('Combinations Evaluated:', 'परीक्षित संयोजन:')}</strong> {evaluation.candidateCombinationsEvaluated} options checked across time-slots and fleet corridors.
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                {l('Solver Execution Log:', 'सॉल्वर लॉग:')}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                {evaluation.solverNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
