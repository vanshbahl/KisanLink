import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Info,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  transactionRecoveryService,
  type BrokenTruckState,
} from '../../services/transactionRecoveryService'
import { DigitalTwinCorridorMap, type CorridorNode, type CorridorRoute } from '../maps/DigitalTwinCorridorMap'

const RECOVERY_STEPS = [
  'Identifying affected commitments (3 orders, 650 kg total payload)...',
  'Scanning regional depot: Located 2 available spare vehicles with active drivers...',
  'Evaluating vehicle capacities & routing constraints (Truck B: 2000kg, Truck C: 400kg)...',
  'Checking buyer delivery flexibility: Evaluating split-load multi-destination drops...',
  'Testing split-load recovery optimization via OR-Tools Capacitated VRP solver...',
  'Recovery plan found: 100% of payload protected across 2 replacement routes.',
]

const corridorNodes: CorridorNode[] = [
  { id: 'node-murthal', type: 'FARMER', name: 'Ramesh Sharma (Murthal)', locationName: 'Murthal Farmgate', cropName: 'Fresh Tomatoes', quantityKg: 400, latitude: 28.9912, longitude: 77.0125 },
  { id: 'node-rai', type: 'FARMER', name: 'Suresh Kumar (Rai Plot)', locationName: 'Rai Farmgate', cropName: 'Baby Spinach', quantityKg: 250, latitude: 29.0200, longitude: 77.0500 },
  { id: 'node-hub', type: 'HUB', name: 'Sonipat Consolidation Hub', locationName: 'Kundli, Sonipat', cropName: 'Pooled Hub', quantityKg: 650, latitude: 28.8628, longitude: 77.1167 },
  { id: 'node-azadpur', type: 'BUYER', name: 'FreshKart Azadpur Wholesale', locationName: 'Azadpur, Delhi', cropName: 'Wholesale Tomatoes', quantityKg: 400, latitude: 28.7041, longitude: 77.1725 },
  { id: 'node-okhla', type: 'BUYER', name: 'GreenBazaar Okhla Hub', locationName: 'Okhla, New Delhi', cropName: 'Retail Produce', quantityKg: 250, latitude: 28.6315, longitude: 77.2167 },
]

export function BrokenTruckRecoveryView() {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const [state, setState] = useState<BrokenTruckState>(transactionRecoveryService.getState())
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setState(e.detail)
    }
    window.addEventListener('kisanlink:recovery_updated', handleUpdate)
    return () => window.removeEventListener('kisanlink:recovery_updated', handleUpdate)
  }, [])

  const handleSimulateFailure = () => {
    const nextState = transactionRecoveryService.simulateVehicleFailure()
    setState(nextState)

    // Trigger analysis animation
    setAnalyzing(true)
    setAnalysisStep(0)
    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < RECOVERY_STEPS.length) {
        setAnalysisStep(step)
      } else {
        clearInterval(interval)
        setAnalyzing(false)
      }
    }, 1200)
  }

  const handleApproveBuyerAdjustment = (orderId: string) => {
    const nextState = transactionRecoveryService.approveBuyerAdjustment(orderId)
    setState(nextState)
  }

  const handleApplyPlan = async () => {
    const nextState = await transactionRecoveryService.applyRecoveryPlan()
    setState(nextState)
  }

  const handleReset = () => {
    setAnalyzing(false)
    setAnalysisStep(0)
    const nextState = transactionRecoveryService.resetDemoScenario()
    setState(nextState)
  }

  const isUnavailable = state.truckStatus === 'UNAVAILABLE'
  const isRecovered = state.truckStatus === 'RECOVERED'
  const plan = state.recoveryPlan

  // Map route generation based on truck status
  const mapRoutes: CorridorRoute[] = isRecovered
    ? [
        {
          id: 'route-rec-1',
          shipmentCode: 'REC-01 (Truck B)',
          originName: 'Murthal Farmgate',
          destinationName: 'Azadpur Wholesale Hub',
          cropName: 'Fresh Tomatoes (400 kg)',
          quantityKg: 400,
          distanceKm: 58.0,
          status: 'RECOVERED',
          farmerCoords: [77.0125, 28.9912],
          buyerCoords: [77.1725, 28.7041],
        },
        {
          id: 'route-rec-2',
          shipmentCode: 'REC-02 (Truck C)',
          originName: 'Rai Farmgate',
          destinationName: 'Okhla Distribution Centre',
          cropName: 'Spinach & Veg (250 kg)',
          quantityKg: 250,
          distanceKm: 76.0,
          status: 'RECOVERED',
          farmerCoords: [77.0500, 29.0200],
          buyerCoords: [77.2167, 28.6315],
        },
      ]
    : isUnavailable
    ? [
        {
          id: 'route-broken-1',
          shipmentCode: 'SHP-BROKEN-01',
          originName: 'Murthal → Rai Corridor',
          destinationName: 'Delhi Distribution Hubs',
          cropName: 'Tomatoes & Spinach (650 kg at risk)',
          quantityKg: 650,
          distanceKm: 82.0,
          status: 'BROKEN',
          farmerCoords: [77.0125, 28.9912],
          buyerCoords: [77.2167, 28.6315],
        },
      ]
    : [
        {
          id: 'route-active-1',
          shipmentCode: 'SHP-ACT-01',
          originName: 'Murthal → Rai Corridor',
          destinationName: 'Delhi Distribution Hubs',
          cropName: 'Tomatoes & Spinach (650 kg)',
          quantityKg: 650,
          distanceKm: 82.0,
          status: 'IN_TRANSIT',
          farmerCoords: [77.0125, 28.9912],
          buyerCoords: [77.2167, 28.6315],
        },
      ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1080px', margin: '0 auto' }}>
      {/* 1. TOP STATUS BANNER */}
      <div
        style={{
          background: isRecovered
            ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
            : isUnavailable
            ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
            {isRecovered ? (
              <ShieldCheck size={32} color="#a7f3d0" />
            ) : isUnavailable ? (
              <AlertTriangle size={32} color="#fca5a5" />
            ) : (
              <Truck size={32} color="#93c5fd" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
              {l('Broken Truck, Unbroken Promise · Transaction Recovery Intelligence', 'टूटा ट्रक, अटूट वादा · सौदा पुनर्प्राप्ति बुद्धिमत्ता')}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {isRecovered
                ? l('🟢 RECOVERY PLAN APPLIED · 100% TRANSACTIONS PROTECTED', '🟢 रिकवरी प्लान लागू · 100% सौदे सुरक्षित')
                : isUnavailable
                ? l('🔴 VEHICLE UNAVAILABLE · ROUTE BROKEN ON NH-44', '🔴 वाहन अनुपलब्ध · NH-44 पर रूट टूटा')
                : l('🟢 DELIVERY ACTIVE · TRUCK A ON ROUTE', '🟢 डिलीवरी सक्रिय · ट्रक A रास्ते में')}
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
              {isRecovered
                ? l('Payload reallocated across Truck B & Truck C. 0 kg produce wasted.', 'माल ट्रक B और ट्रक C में विभाजित। 0 किलो फसल नष्ट होने से बची।')
                : isUnavailable
                ? l('3 commitments (650 kg produce) at immediate risk of delivery failure.', '3 सौदे (650 किलो उपज) डिलीवरी विफलता के तत्काल जोखिम में।')
                : l('Truck A (HR 10 AK 4821) carrying 650 kg produce across 3 commercial commitments.', 'ट्रक A (HR 10 AK 4821) 3 सौदों का 650 किलो माल लेकर जा रहा है।')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isUnavailable && !isRecovered && (
            <button
              type="button"
              onClick={handleSimulateFailure}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
              data-testid="simulate-breakdown-btn"
            >
              <Wrench size={16} />
              {l('Simulate Vehicle Unavailable', 'वाहन खराबी का डेमो ट्रिगर')}
            </button>
          )}

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
            }}
          >
            <RotateCcw size={15} />
            {l('Reset Demo Scenario', 'डेमो रीसेट')}
          </button>
        </div>
      </div>

      {/* 2. FLEET & ROUTE STATUS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Card 1: Primary Truck A */}
        <div
          style={{
            background: '#ffffff',
            border: isUnavailable ? '2px solid #ef4444' : isRecovered ? '1px solid #cbd5e1' : '2px solid #3b82f6',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isUnavailable ? '#dc2626' : '#2563eb', textTransform: 'uppercase' }}>
              {l('Primary Vehicle: Truck A', 'प्राथमिक वाहन: ट्रक A')}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '999px',
                background: isUnavailable ? '#fef2f2' : isRecovered ? '#f1f5f9' : '#eff6ff',
                color: isUnavailable ? '#b91c1c' : isRecovered ? '#64748b' : '#1d4ed8',
              }}
            >
              {isUnavailable ? l('🔴 UNAVAILABLE', '🔴 अनुपलब्ध') : isRecovered ? l('IN MAINTENANCE', 'रखरखाव में') : l('🟢 EN ROUTE', '🟢 मार्ग में')}
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {state.truckRegistration} · {l('Mini Truck', 'मिनी ट्रक')}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {l('Driver: Suresh Kumar · Assigned Load: 650 kg', 'चालक: सुरेश कुमार · भार: 650 किलो')}
          </div>

          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: isUnavailable ? '#fef2f2' : '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: isUnavailable ? '#b91c1c' : '#475569' }}>
            {isUnavailable
              ? l('⚠️ Engine cooling failure on NH-44. Vehicle immobilized. Rescue required.', '⚠️ NH-44 पर इंजन गर्म होकर बंद। वाहन रुका हुआ।')
              : isRecovered
              ? l('Towed to Kundli maintenance workshop. Load successfully rescued.', 'कुंडली वर्कशॉप में भेजा गया। माल सुरक्षित निकाला गया।')
              : l('Normal transit speed · 3 active commercial delivery drops.', 'सामान्य गति · 3 सक्रिय व्यावसायिक ड्रॉप्स।')}
          </div>
        </div>

        {/* Card 2: Affected Commitments Overview */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              {l('Corridor Load & Commitments', 'कॉरिडोर भार व सौदे')}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              650 kg / 750 kg
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {state.affectedOrders.length} {l('Commercial Orders', 'व्यावसायिक ऑर्डर')}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {l('Murthal & Rai Plots → Azadpur, CP & Okhla', 'मुरथल व राई → आज़ादपुर, सीपी व ओखला')}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, background: isRecovered ? '#ecfdf5' : isUnavailable ? '#fef2f2' : '#eff6ff', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{l('Protected', 'सुरक्षित')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isRecovered ? '#059669' : isUnavailable ? '#dc2626' : '#2563eb' }}>
                {isRecovered ? '650 kg' : isUnavailable ? '0 kg' : '650 kg'}
              </div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{l('Wasted', 'नुकसान')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                0 kg
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STEPPED RECOVERY ANALYSIS ANIMATION */}
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
          data-testid="recovery-analysis-sequence"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Cpu className="animate-spin" size={16} />
            <span>{l('Transaction Recovery Intelligence in Progress…', 'सौदा पुनर्प्राप्ति बुद्धिमत्ता विश्लेषण जारी है…')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.4rem', color: '#ffffff' }}>
            {RECOVERY_STEPS[analysisStep]}
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.75rem' }}>
            <div
              style={{
                width: `${((analysisStep + 1) / RECOVERY_STEPS.length) * 100}%`,
                height: '100%',
                background: '#10b981',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* 4. RECOVERY PLAN RESULT REVEAL */}
      {plan && !analyzing && (
        <div
          style={{
            background: '#ffffff',
            border: '2px solid #059669',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(5, 150, 105, 0.1)',
          }}
          data-testid="recovery-plan-card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={18} color="#059669" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', letterSpacing: '0.8px' }}>
                  {l('OPTIMAL SPLIT-LOAD RECOVERY PLAN FOUND', 'इष्टतम स्प्लिट-लोड रिकवरी प्लान तैयार')}
                </span>
              </div>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                {l('100% of 650 kg Recovered across 2 Spare Vehicles', '650 किलो का 100% माल 2 अतिरिक्त वाहनों में सुरक्षित')}
              </h3>
            </div>

            {!isRecovered && (
              <button
                type="button"
                disabled={!plan.allApprovalsGranted}
                onClick={handleApplyPlan}
                style={{
                  background: plan.allApprovalsGranted ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#9ca3af',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: plan.allApprovalsGranted ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: plan.allApprovalsGranted ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none',
                }}
                data-testid="apply-recovery-btn"
              >
                <ShieldCheck size={18} />
                <span>{l('Apply Recovery Plan', 'रिकवरी प्लान लागू करें')}</span>
              </button>
            )}
          </div>

          {/* Allocation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {plan.allocations.map((alloc) => (
              <div
                key={alloc.vehicleId}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                    {alloc.vehicleName}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                    {alloc.allocatedKg} kg / {alloc.capacityKg} kg
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {l(`Driver: ${alloc.driver} · ${alloc.vehicleType}`, `चालक: ${alloc.driver} · ${alloc.vehicleType}`)}
                </div>

                <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.6rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 700, color: '#047857' }}>
                    {language === 'hi' ? alloc.etaImpactHi : alloc.etaImpact}
                  </div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                    {alloc.commitments.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Buyer Approval Checklist if needed */}
          {plan.approvalRequiredOrdersCount > 0 && !isRecovered && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Clock size={20} color="#d97706" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#92400e' }}>
                    {l('Customer Schedule Confirmation Required', 'ग्राहक डिलीवरी समय पुष्टि आवश्यक')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#78350f' }}>
                    {l('Order KL-ORD-1048 (GreenBazaar Okhla) revised delivery window: +2 Hours (1:15–2:00 PM)', 'ऑर्डर KL-ORD-1048 (ग्रीनबाज़ार ओखला) संशोधित समय: +2 घंटे')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApproveBuyerAdjustment('KL-ORD-1048')}
                style={{
                  background: state.affectedOrders.find((o) => o.id === 'KL-ORD-1048')?.buyerApproved ? '#059669' : '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                data-testid="approve-buyer-btn"
              >
                <Check size={14} />
                <span>
                  {state.affectedOrders.find((o) => o.id === 'KL-ORD-1048')?.buyerApproved
                    ? l('Buyer Approved ✓', 'खरीदार द्वारा स्वीकृत ✓')
                    : l('Approve Revised Delivery (+2h)', 'संशोधित डिलीवरी स्वीकृत करें (+2h)')}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. DIGITAL TWIN MAP INTEGRATION */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
              {l('Digital Twin Corridor Map · Real-Time Incident & Recovery Tracking', 'डिजिटल ट्विन कॉरिडोर मैप · वास्तविक समय घटना व रिकवरी')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {isRecovered
                ? l('🟢 Alternate recovery legs active (Azadpur Direct Leg + CP & Okhla Split Run)', '🟢 वैकल्पिक रिकवरी रूट सक्रिय (आज़ादपुर व ओखला स्प्लिट रूट)')
                : isUnavailable
                ? l('🔴 Broken leg highlighted on NH-44 corridor · Incident logged at Kundli hub', '🔴 NH-44 पर टूटा रूट चिन्हित · कुंडली हब में घटना दर्ज')
                : l('🟢 Active baseline transit corridor · Murthal → Rai → Delhi wholesale hub', '🟢 सामान्य सक्रिय मार्ग · मुरथल → राई → दिल्ली थोक हब')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: isRecovered ? '#ecfdf5' : isUnavailable ? '#fef2f2' : '#f1f5f9', color: isRecovered ? '#047857' : isUnavailable ? '#b91c1c' : '#475569' }}>
              {isRecovered ? 'RECOVERED (2 LEGS)' : isUnavailable ? 'INCIDENT (BROKEN)' : 'ACTIVE'}
            </span>
          </div>
        </div>

        <div style={{ height: '340px', position: 'relative' }}>
          <DigitalTwinCorridorMap nodes={corridorNodes} routes={mapRoutes} height="340px" />
        </div>
      </div>

      {/* 6. TECHNICAL ANALYSIS DETAILS */}
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
                {l('Why this recovery works & OR-Tools Solver Details', 'यह रिकवरी कैसे काम करती है एवं OR-Tools सॉल्वर विवरण')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {l('Capacitated VRP solver formulation, split assignments, and zero-wastage audit', 'क्षमता-आधारित वीआरपी सॉल्वर सूत्र, विभाजन व शून्य बर्बादी ऑडिट')}
              </div>
            </div>
          </div>
          {showTechnicalDetails ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
        </button>

        {showTechnicalDetails && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                {l('Recovery Solver Execution Log:', 'रिकवरी सॉल्वर लॉग:')}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                {(plan?.solverStages || RECOVERY_STEPS).map((stage, idx) => (
                  <li key={idx}>{stage}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
