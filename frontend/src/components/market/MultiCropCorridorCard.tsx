import { ArrowRight, Check, CircleAlert, Info, Layers, MapPinned, ShieldCheck, Sparkles, Sprout, Truck, Zap } from 'lucide-react'
import { useState } from 'react'
import type { MarketMakerBoard } from '../../types'
import type { MarketMath, CropSegmentMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'
import { StatusBadge } from '../StatusBadge'

const rupee = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`

export function MultiCropCorridorCard({ board, math, onSelectCrop }: {
  board: MarketMakerBoard
  math: MarketMath
  onSelectCrop?: (cropId: string) => void
}) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const multi = math.multiCropMath

  const [selectedCropId, setSelectedCropId] = useState<string>(
    multi?.cropMaths[0]?.segment.id || ''
  )

  if (!multi || !multi.isMultiCrop) return null

  const activeSegmentMath = multi.cropMaths.find((c) => c.segment.id === selectedCropId) || multi.cropMaths[0]
  const status = multi.corridorStatus
  const statusTone = status === 'viable' ? 'green' : status === 'partially_viable' ? 'amber' : 'red'

  const handleCropClick = (cropId: string) => {
    setSelectedCropId(cropId)
    if (onSelectCrop) onSelectCrop(cropId)
  }

  return (
    <div className="card mm-multicrop-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', background: 'var(--card-bg, #ffffff)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
            <Layers size={15} /> {l('Multi-Crop Shared Transport Corridor', 'मल्टी-क्रॉप साझा परिवहन कॉरिडोर')}
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.25rem 0' }}>
            {language === 'hi' ? board.corridorHi : board.corridor}
          </h2>
          <p style={{ margin: 0, color: 'var(--muted-color, #64748b)', fontSize: '0.9rem' }}>
            <MapPinned size={14} style={{ marginRight: '4px', display: 'inline' }} /> {board.destination} · {board.routeDistanceKm} km
          </p>
        </div>

        <StatusBadge tone={statusTone}>
          {status === 'viable' ? l('Corridor Viable', 'कॉरिडोर व्यवहार्य') : status === 'partially_viable' ? l('Partially Viable', 'आंशिक रूप से व्यवहार्य') : l('Corridor Forming', 'कॉरिडोर बन रहा है')}
        </StatusBadge>
      </div>

      {/* Vehicle Capacity Meter */}
      <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Truck size={16} color="#0f172a" />
            {multi.vehicle ? `${multi.vehicle.type} (${multi.vehicle.registration})` : l('Unassigned Vehicle', 'अनिर्धारित वाहन')}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
            {kg(multi.totalCommittedKg)} / {kg(multi.capacityKg)} ({multi.utilisationPct}% {l('loaded', 'लोड')})
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem', display: 'flex' }}>
          {multi.cropMaths.map((c, idx) => {
            const pct = multi.capacityKg ? (c.committedKg / multi.capacityKg) * 100 : 0
            const colors = ['#16a34a', '#2563eb', '#d97706', '#9333ea']
            return (
              <div
                key={c.segment.id}
                title={`${c.segment.crop}: ${kg(c.committedKg)}`}
                style={{ width: `${pct}%`, background: colors[idx % colors.length], height: '100%' }}
              />
            )
          })}
        </div>

        {/* Corridor Freight Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block' }}>{l('Shared Trip Freight', 'साझा यात्रा ढुलाई')}</span>
            <strong style={{ color: '#0f172a' }}>{rupees(multi.freightTotal)}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block' }}>{l('Proportional Freight Rate', 'अनुपातिक ढुलाई दर')}</span>
            <strong style={{ color: '#16a34a' }}>{rupee(math.freightPerKg)}/kg</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block' }}>{l('Total Logistics Savings', 'कुल लॉजिस्टिक्स बचत')}</span>
            <strong style={{ color: '#2563eb' }}>{rupees(multi.cropMaths.reduce((sum, c) => sum + c.freightSavingsTotal, 0))}</strong>
          </div>
        </div>
      </div>

      {/* Multi-Region Origin Contribution Breakdown */}
      {math.regionContributions && math.regionContributions.length > 0 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPinned size={14} color="#16a34a" /> {l('NCR Origin Regions & Contribution', 'एनसीआर मूल क्षेत्र एवं योगदान')}
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
              {l('Estimated shared multi-region logistics', 'अनुमानित साझा बहु-क्षेत्रीय लॉजिस्टिक्स')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {math.regionContributions.map((r) => (
              <div key={r.regionId} style={{ background: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>📍 {r.regionName}</span>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>{kg(r.offeredKg)} {l('offered', 'उपलब्ध')}</span>
                <small style={{ display: 'block', color: '#64748b', fontSize: '0.7rem' }}>{r.crops.join(', ')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Segment Tabs */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.5rem' }}>
          {l('Pooled Crops in this Corridor', 'इस कॉरिडोर में शामिल फसलें')}
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {multi.cropMaths.map((c) => {
            const isActive = c.segment.id === activeSegmentMath?.segment.id
            return (
              <button
                key={c.segment.id}
                type="button"
                onClick={() => handleCropClick(c.segment.id)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: isActive ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: isActive ? '#f0fdf4' : '#ffffff',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{c.segment.crop === 'Tomatoes' ? '🍅' : c.segment.crop === 'Onions' ? '🧅' : '🥔'}</span>
                <span>{language === 'hi' ? c.segment.cropHi : c.segment.crop}</span>
                <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', color: '#334155' }}>
                  {kg(c.committedKg)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Crop Detail View */}
      {activeSegmentMath && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{activeSegmentMath.segment.crop === 'Tomatoes' ? '🍅' : activeSegmentMath.segment.crop === 'Onions' ? '🧅' : '🥔'}</span>
              {language === 'hi' ? activeSegmentMath.segment.cropHi : activeSegmentMath.segment.crop} ({activeSegmentMath.segment.grade})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
              {l('Storage', 'भंडारण')}: {activeSegmentMath.segment.storageType || 'ambient'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>{l('Farmer Floor', 'किसान न्यूनतम')}</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{rupee(activeSegmentMath.farmerFloorPerKg)}/kg</strong>
              <small style={{ color: '#64748b', display: 'block' }}>{l('Mandi', 'मंडी')} {rupee(activeSegmentMath.mandiPricePerKg)}</small>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>{l('Buyer Ceiling', 'खरीदार सीमा')}</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{rupee(activeSegmentMath.buyerCeilingPerKg)}/kg</strong>
              <small style={{ color: '#64748b', display: 'block' }}>{l('Today', 'आज')} {rupee(activeSegmentMath.buyerCurrentPerKg)}</small>
            </div>
            <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#166534', fontSize: '0.75rem', display: 'block' }}>{l('Delivered Price', 'डिलीवरी भाव')}</span>
              <strong style={{ fontSize: '1rem', color: '#15803d' }}>{rupee(activeSegmentMath.deliveredPerKg)}/kg</strong>
              <small style={{ color: '#166534', display: 'block' }}>{l('Freight', 'ढुलाई')} {rupee(activeSegmentMath.allocatedFreightPerKg)}/kg</small>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <span style={{ color: '#1e40af', fontSize: '0.75rem', display: 'block' }}>{l('Pooling Savings', 'पूलिंग बचत')}</span>
              <strong style={{ fontSize: '1rem', color: '#1d4ed8' }}>{rupees(activeSegmentMath.freightSavingsTotal)}</strong>
              <small style={{ color: '#1e40af', display: 'block' }}>{l('vs Standalone', 'बनाम अकेला')} {rupees(activeSegmentMath.standaloneFreightTotal)}</small>
            </div>
          </div>
        </div>
      )}

      {/* Explainability Callout */}
      <div style={{ background: multi.compatibility.compatible ? '#f0fdf4' : '#fef2f2', border: `1px solid ${multi.compatibility.compatible ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '0.85rem 1rem' }}>
        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', fontWeight: 700, color: multi.compatibility.compatible ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Info size={14} /> {l('Why this corridor works', 'यह कॉरिडोर क्यों काम करता है')}
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: multi.compatibility.compatible ? '#14532d' : '#7f1d1d' }}>
          {multi.whyItWorks.map((bullet, idx) => (
            <li key={idx} style={{ marginBottom: '0.2rem' }}>{bullet}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
