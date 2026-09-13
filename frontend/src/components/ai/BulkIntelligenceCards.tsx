import { contributionIntelligence, targetPriceOptions } from '../../services/bulkIntelligenceService'
import type { SupplyContribution } from '../../types'
import { AiInsightCard } from './AiInsightCard'
import { MarketplaceAiTrigger } from './MarketplaceAiTrigger'
import { MarketplaceInsightResult } from './MarketplaceInsightResult'

/**
 * Target Price Advisor for the Procure flow.
 *
 * Mounted directly under the target-rate control. The advisor reads the requirement from the
 * form state it is given and writes a chosen rate back through `onApply`, so it stays in step
 * with the wizard's own validation instead of reaching into the rendered inputs.
 */
export function TargetPriceAdvisor({ crop, quantityKg, targetPrice, onApply }: { crop: string; quantityKg: number; targetPrice: number; onApply: (price: number) => void }) {
  return (
    <MarketplaceAiTrigger
      variant="inline"
      className="b-price-advisor"
      idleLabel="Compare"
      idleHint={`Is ₹${targetPrice}/kg the right target for ${quantityKg.toLocaleString('en-IN')} kg?`}
      stages={['Checking mandi intelligence', 'Reviewing active farmer asks', 'Considering requested quantity', 'Preparing price options']}
      run={() => targetPriceOptions(crop, quantityKg, targetPrice)}
      renderResult={(options, reset) => (
        <AiInsightCard eyebrow="Target Price Advisor" onClose={reset} footer="Likelihoods are deterministic prototype scores over the crop anchor and requested quantity, not trained predictions.">
          <div><h3 className="ai-headline">Choose a target rate for {quantityKg.toLocaleString('en-IN')} kg {crop}.</h3></div>
          <div className="ai-price-options b-price-options">
            {options.map((option) => (
              <button type="button" className={`ai-price-option${option.id === 'recommended' ? ' recommended' : ''}`} key={option.id} onClick={() => { onApply(option.price); reset() }}>
                <strong>₹{option.price}/kg</strong>
                <small>{option.id === 'fast' ? 'Fast' : option.id === 'recommended' ? 'Recommended' : 'Aggressive'}</small>
                <span className="ai-price-tag">{option.likelihood}% likely to fill</span>
              </button>
            ))}
          </div>
        </AiInsightCard>
      )}
    />
  )
}

/** Match reasoning for one pooled allocation, shared by requirement and order screens. */
export function ContributionMatchIntelligence({ contributions, total, deliveryWindow, grade }: { contributions: SupplyContribution[]; total: number; deliveryWindow?: string; grade?: string }) {
  return (
    <MarketplaceAiTrigger
      variant="inline"
      className="b-match-reasoning"
      idleLabel="See why"
      idleHint="How strong is this farm mix, and where is the risk?"
      stages={['Weighting distance', 'Comparing price', 'Checking delivery timing', 'Reviewing reliability and quality']}
      run={() => contributionIntelligence(contributions, total, { deliveryWindow, grade })}
      renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} footer="Weights: distance 30%, price 25%, time 20%, reliability 15%, quality 10%. Reliability and quality may be prototype defaults." />}
    />
  )
}
