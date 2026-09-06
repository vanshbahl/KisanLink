import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { AiConfidenceBadge } from './AiConfidenceBadge'
import { AiInsightCard } from './AiInsightCard'
import { AiReasoningFactors } from './AiReasoningFactors'

export function MarketplaceInsightResult({ title, recommendation, confidence, factors, note, ctaLabel, onCta, onClose, footer }: { title: string; recommendation: string; confidence: number; factors: Array<{ label: string; value: string }>; note?: string; ctaLabel?: string; onCta?: () => void; onClose: () => void; footer?: string }) {
  const [showWhy, setShowWhy] = useState(false)
  return <AiInsightCard onClose={onClose} footer={footer}><div className="ai-result-summary"><div><span className="eyebrow">{title}</span><h3>{recommendation}</h3></div><AiConfidenceBadge score={confidence} /></div>{note && <p className="ai-explanation">{note}</p>}{factors.length > 0 && <button className="ai-why" type="button" onClick={() => setShowWhy(!showWhy)}>{showWhy ? 'Hide reasoning' : 'See why'} {showWhy ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>}{showWhy && <AiReasoningFactors factors={factors.map((factor) => ({ ...factor, icon: null }))} />}{ctaLabel && onCta && <button className="btn btn-primary ai-result-cta" onClick={onCta}>{ctaLabel}</button>}</AiInsightCard>
}
