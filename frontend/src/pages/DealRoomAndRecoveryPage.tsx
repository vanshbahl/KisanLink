import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Handshake, Sparkles, Truck } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { DealRoomView } from '../components/dealroom/DealRoomView'
import { BrokenTruckRecoveryView } from '../components/recovery/BrokenTruckRecoveryView'

export function DealRoomAndRecoveryPage({ initialTab }: { initialTab?: 'deal-room' | 'recovery' }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const location = useLocation()
  const navigate = useNavigate()

  const defaultTab = initialTab || (location.pathname.includes('recovery') ? 'recovery' : 'deal-room')
  const [activeTab, setActiveTab] = useState<'deal-room' | 'recovery'>(defaultTab)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    } else if (location.pathname.includes('recovery')) {
      setActiveTab('recovery')
    } else if (location.pathname.includes('deal-room')) {
      setActiveTab('deal-room')
    }
  }, [location.pathname, initialTab])

  const handleSelectTab = (tab: 'deal-room' | 'recovery') => {
    setActiveTab(tab)
    navigate(tab === 'deal-room' ? '/deal-room' : '/recovery', { replace: true })
  }

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header Banner */}
      <div style={{ maxWidth: '1080px', margin: '0 auto 1.5rem auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Sparkles size={16} />
              <span>{l('PHASE 9 · JUDGE-READY INNOVATION DEMO', 'चरण 9 · जजों के लिए नवाचार डेमो')}</span>
            </div>
            <h1 style={{ margin: '0.2rem 0', fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
              {activeTab === 'deal-room'
                ? l('Smart Deal Room · Feasible Transaction Discovery', 'स्मार्ट डील रूम · व्यवहार्य सौदा खोज')
                : l('Broken Truck, Unbroken Promise · Transaction Recovery', 'टूटा ट्रक, अटूट वादा · सौदा पुनर्प्राप्ति')}
            </h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem' }}>
              {activeTab === 'deal-room'
                ? l('“They couldn’t trade before. KisanLink found a way.” — Protected farmer minimum with flexible terms.', '“वे पहले व्यापार नहीं कर सकते थे। किसानलिंक ने रास्ता खोजा।” — सुरक्षित किसान भाव।')
                : l('“The delivery broke. KisanLink repaired it.” — Deterministic split-load recovery protecting 100% of payload.', '“डिलीवरी बाधित हुई। किसानलिंक ने इसे दुरुस्त किया।” — 100% फसल सुरक्षित।')}
            </p>
          </div>

          {/* Navigation Segmented Control */}
          <div
            style={{
              background: '#e2e8f0',
              padding: '4px',
              borderRadius: '12px',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectTab('deal-room')}
              style={{
                background: activeTab === 'deal-room' ? '#ffffff' : 'transparent',
                color: activeTab === 'deal-room' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.6rem 1.1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: activeTab === 'deal-room' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
              data-testid="tab-deal-room"
            >
              <Handshake size={17} color={activeTab === 'deal-room' ? '#059669' : '#64748b'} />
              <span>{l('Deal Room', 'डील रूम')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('recovery')}
              style={{
                background: activeTab === 'recovery' ? '#ffffff' : 'transparent',
                color: activeTab === 'recovery' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.6rem 1.1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: activeTab === 'recovery' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
              data-testid="tab-recovery"
            >
              <Truck size={17} color={activeTab === 'recovery' ? '#dc2626' : '#64748b'} />
              <span>{l('Broken Truck Recovery', 'टूटा ट्रक रिकवरी')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'deal-room' ? <DealRoomView /> : <BrokenTruckRecoveryView />}
    </div>
  )
}
