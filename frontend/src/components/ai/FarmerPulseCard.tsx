import { useState } from 'react'
import { IndianRupee, MapPin, Sprout, Truck, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { getFarmOpportunity } from '../../services/farmerAiService'
import type { FarmerListing } from '../../types'
import { AiConfidenceBadge } from './AiConfidenceBadge'
import { AiInsightCard } from './AiInsightCard'
import { AiReasoningFactors } from './AiReasoningFactors'
import { FarmerAiTrigger } from './FarmerAiTrigger'

const FACTOR_ICONS = { buyerDemand: <TrendingUp size={14} />, marketGap: <IndianRupee size={14} />, supplyGap: <MapPin size={14} />, pickupCapacity: <Truck size={14} /> }

/** Feature 1 — AI Farm Pulse. One compact optional card on the Farmer Dashboard. */
export function FarmerPulseCard({ listings }: { listings: FarmerListing[] }) {
  const { language } = useLanguage()
  const f = (key: Parameters<typeof aiText>[1], values?: Record<string, string | number>) => aiText(language, key, values)
  const [showWhy, setShowWhy] = useState(false)

  return (
    <section className="ai-pulse-card">
      <FarmerAiTrigger
        idleLabel={f('analyseOpportunity')}
        idleHint={f('dashboardSignal')}
        stages={[f('stageDemand'), f('stageMandi'), f('stageProduce'), f('stagePrepare')]}
        run={() => getFarmOpportunity(listings)}
        renderResult={(insight, reset) => {
          const cropLabel = language === 'hi' ? insight.cropHi : insight.crop
          return (
            <AiInsightCard onClose={reset}>
              <div>
                <span className="eyebrow light">{f('bestOpportunityToday')}</span>
                <h2 className="ai-headline">{f('opportunityHeadline', { crop: cropLabel })}</h2>
                <p className="ai-explanation">{f('opportunityBody', { pct: insight.demandChangePct, tonnes: insight.nearbyDemandTonnes.toFixed(1) })}</p>
              </div>
              <div className="ai-metric-row">
                <div><span>{f('recommendedAction')}</span><strong>₹{insight.intel.recommendedMin}–₹{insight.intel.recommendedMax}{f('perKg')}</strong></div>
                <div><span>{f('potentialGain')}</span><strong>+₹{insight.gainPerKg}{f('perKg')}</strong></div>
                <div><AiConfidenceBadge score={insight.confidence} /></div>
              </div>
              {showWhy && <AiReasoningFactors factors={insight.factors.map((factor) => ({ icon: FACTOR_ICONS[factor.id], label: f(factor.labelKey as Parameters<typeof aiText>[1]), value: f(factor.valueKey as Parameters<typeof aiText>[1], factor.values) }))} />}
              <div className="ai-cta-row">
                <Link className="btn btn-primary" to={`/farmer/sell?crop=${encodeURIComponent(insight.listingCrop)}`}><Sprout size={16} />{f('listCrop', { crop: cropLabel })}</Link>
                <button type="button" className="btn btn-ghost-light" onClick={() => setShowWhy((current) => !current)}>{showWhy ? f('hideWhy') : f('seeWhy')}</button>
              </div>
            </AiInsightCard>
          )
        }}
      />
    </section>
  )
}
