import { useNavigate } from 'react-router-dom'
import { contributionIntelligence, supplyPoolScout, targetPriceOptions, type SupplyPoolLike } from '../../services/bulkIntelligenceService'
import type { SupplyContribution } from '../../types'
import { AiInsightCard } from './AiInsightCard'
import { MarketplaceAiSection } from './MarketplaceAiSection'
import { MarketplaceAiTrigger } from './MarketplaceAiTrigger'
import { MarketplaceInsightResult } from './MarketplaceInsightResult'

/**
 * Target Price Advisor for the requirement wizard.
 *
 * The advisor reads the requirement straight from the form state it is given and writes a chosen
 * rate back through `onApply`, so the card stays in step with the wizard's own validation instead
 * of reaching into the rendered inputs.
 */
export function TargetPriceAdvisor({ crop, quantityKg, targetPrice, onApply }: { crop: string; quantityKg: number; targetPrice: number; onApply: (price: number) => void }) {
  return (
    <section className="bulk-price-advisor">
      <span className="eyebrow">Kisan Intelligence</span>
      <h2>Target Price Advisor</h2>
      <MarketplaceAiTrigger
        variant="inline"
        idleLabel="Compare target prices"
        idleHint="Set a target from current prototype price signals"
        stages={['Checking mandi intelligence', 'Reviewing active farmer asks', 'Considering requested quantity', 'Checking delivery timing', 'Preparing price options']}
        run={() => targetPriceOptions(crop, quantityKg, targetPrice)}
        renderResult={(options, reset) => (
          <AiInsightCard onClose={reset} footer="Uses current crop-intelligence anchors and the quantity entered in this requirement; it does not guarantee fulfilment.">
            <div><span className="eyebrow">Target Price Advisor</span><h2 className="ai-headline">Choose a target rate for {quantityKg.toLocaleString('en-IN')} kg {crop}.</h2></div>
            <div className="ai-price-options">
              {options.map((option) => (
                <button type="button" className={`ai-price-option${option.id === 'recommended' ? ' recommended' : ''}`} key={option.id} onClick={() => { onApply(option.price); reset() }}>
                  <strong>₹{option.price}/kg</strong>
                  <small>{option.label}</small>
                  <span className="ai-price-tag">{option.likelihood}% match likelihood</span>
                </button>
              ))}
            </div>
            <p className="ai-explanation">Likelihoods are deterministic prototype scores over the crop anchor and requested quantity, not trained acceptance predictions. Selecting an option writes the rate into the requirement's target-price field.</p>
          </AiInsightCard>
        )}
      />
    </section>
  )
}

/** Match reasoning for one pooled allocation, shared by supply, requirement and order screens. */
export function ContributionMatchIntelligence({ contributions, total, deliveryWindow, grade }: { contributions: SupplyContribution[]; total: number; deliveryWindow?: string; grade?: string }) {
  return (
    <div className="contribution-intelligence">
      <MarketplaceAiTrigger
        variant="inline"
        idleLabel="See match reasoning"
        idleHint="Review match strength and cluster risk"
        stages={['Weighting distance', 'Comparing price', 'Checking delivery timing', 'Reviewing reliability signal', 'Reviewing quality and concentration']}
        run={() => contributionIntelligence(contributions, total, { deliveryWindow, grade })}
        renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} footer="The five-factor weights are distance 30%, price 25%, time 20%, reliability 15% and quality 10%. Reliability and quality may be prototype defaults when no canonical cluster is available." />}
      />
    </div>
  )
}

/** Browse-supply scout over whatever pools the buyer's current filters have left on screen. */
export function SupplyPoolScoutCard({ pools }: { pools: SupplyPoolLike[] }) {
  const navigate = useNavigate()
  return <MarketplaceAiSection
    sectionClassName="bulk-supply-intelligence"
    title="Supply Scout"
    subtitle="Compares only the pools left by your current filters."
    idleLabel="Scout this supply"
    idleHint="Which pool should this procurement open first?"
    stages={['Comparing pooled depth', 'Comparing farm-gate rates', 'Checking minimum order sizes', 'Checking dispatch readiness', 'Preparing supply advice']}
    run={() => supplyPoolScout(pools)}
    renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.href ? navigate(insight.href) : reset()} footer="Compares only the pools left by your current filters, using pooled quantity, farm-gate range, MOQ, grade and dispatch readiness." />}
  />
}
