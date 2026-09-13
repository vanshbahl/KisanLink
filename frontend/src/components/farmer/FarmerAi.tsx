import type { ReactNode } from 'react'
import { Sparkles, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AiInsightCard } from '../ai/AiInsightCard'
import { MarketplaceAiTrigger } from '../ai/MarketplaceAiTrigger'
import { useFarmerText } from '../../i18n/farmer'
import { homeInsight, type Insight } from '../../services/farmerInsight'
import type { CropDeal } from '../../services/farmerDeal'
import type { FarmerListing } from '../../types'

/**
 * The farmer module's two Kisan Intelligence surfaces.
 *
 * `FarmerAiTrigger` is the interaction that existed before the overhaul — the page dims and
 * blurs, the card lifts, the staged copy plays, the result lands — re-wrapped with farmer
 * vocabulary and a shorter floor. The shared lifecycle in `MarketplaceAiTrigger` is untouched;
 * only the reveal window (2.2s instead of 3.6s) and the labels differ, because a farmer
 * checking a price on every crop should not sit through a demo pause every time.
 *
 * `AiOverview` is the *only* form an "AI card" takes outside that lifecycle: one sentence,
 * built from real numbers by the caller, with an optional link. It is deliberately not a
 * card-in-a-card — it sits flush inside whatever surface it belongs to.
 */
export const FARMER_AI_REVEAL_MS = 2200

export function FarmerAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className, autoStart, idleIcon, brandLabel }: {
  idleLabel: string
  idleHint?: string
  stages: string[]
  run: () => T | Promise<T>
  renderResult: (result: T, reset: () => void) => ReactNode
  className?: string
  autoStart?: boolean
  idleIcon?: ReactNode
  /** Eyebrow on the idle and thinking states; defaults to the Kisan Intelligence brand. */
  brandLabel?: string
}) {
  const { f } = useFarmerText()
  return (
    <MarketplaceAiTrigger<T>
      idleLabel={idleLabel}
      idleHint={idleHint}
      stages={stages}
      run={run}
      renderResult={renderResult}
      className={`f-ai ${className ?? ''}`.trim()}
      brandLabel={brandLabel ?? f('aiEyebrow')}
      thinkingLabel={f('marketFinding')}
      errorTitle={f('somethingWrong')}
      backLabel={f('back')}
      errorFallback={f('marketNoDataHint')}
      minRevealMs={FARMER_AI_REVEAL_MS}
      autoStart={autoStart}
      idleIcon={idleIcon}
    />
  )
}

/** Result shell with the farmer's eyebrow and disclaimer, so every result reads the same. */
export function FarmerAiResult({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const { f } = useFarmerText()
  return <AiInsightCard eyebrow={f('aiEyebrow')} footer={f('marketDisclaimer')} onClose={onClose}>{children}</AiInsightCard>
}

/**
 * Home's Kisan Intelligence surface.
 *
 * The previous version was a sentence that sat permanently under the greeting, answering a
 * question nobody asked yet. This is the same lifecycle as `CropMarketMaker` instead — a
 * small question a farmer would actually have, tapped open, answered from the same real
 * listings/freshness/Market Maker data `homeInsight` already reads, then closed again. It
 * never occupies more than one line of Home at rest.
 */
export function HomeAiTrigger({ listings, cropDeals, pick }: {
  listings: FarmerListing[]
  cropDeals: Record<string, CropDeal | null>
  pick: (en: string, hi?: string) => string
}) {
  const { f } = useFarmerText()
  return (
    <FarmerAiTrigger<Insight | null>
      idleLabel={f('aiHomeAsk')}
      idleHint={f('aiHomeQuestion')}
      stages={[f('marketStageBuyers'), f('marketStageMandi'), f('marketStageFresh'), f('marketStagePickup')]}
      run={() => homeInsight(listings, cropDeals, pick)}
      renderResult={(insight, reset) => <FarmerAiResult onClose={reset}><HomeAiAnswer insight={insight} /></FarmerAiResult>}
    />
  )
}

function HomeAiAnswer({ insight }: { insight: Insight | null }) {
  const { f } = useFarmerText()
  if (!insight) {
    return (
      <div className="f-mm-empty">
        <Sprout size={26} aria-hidden="true" />
        <strong>{f('nothingToday')}</strong>
        <small>{f('nothingTodayHint')}</small>
      </div>
    )
  }
  return (
    <div className="f-home-ai-answer">
      <p><InsightText text={f(insight.key, insight.values)} highlight={insight.values.crop} /></p>
      {insight.listingId && (
        <Link className="btn btn-primary btn-large" to={`/farmer/fasal/${insight.listingId}`}>
          {insight.urgent ? f('freshUrgentTaskAction') : f('sellAtThisPrice')}
        </Link>
      )}
    </div>
  )
}

/**
 * An insight sentence with the crop it is about set in bold, so the answer reads as being
 * about *this* crop before the rest of the line is read. Falls back to the plain text when
 * the crop does not appear in it.
 */
export function InsightText({ text, highlight }: { text: string; highlight?: string | number }) {
  const term = highlight == null ? '' : String(highlight)
  const at = term ? text.indexOf(term) : -1
  if (at < 0) return <>{text}</>
  return <>{text.slice(0, at)}<strong className="f-ai-crop">{term}</strong>{text.slice(at + term.length)}</>
}

export function AiOverview({ text, highlight, to, linkLabel, tone = 'default', className = '' }: {
  text: string
  /** The crop the sentence is about; rendered as the emphasised part. */
  highlight?: string | number
  to?: string
  linkLabel?: string
  tone?: 'default' | 'urgent'
  className?: string
}) {
  const { f } = useFarmerText()
  return (
    <div className={`f-ai-note is-${tone} ${className}`.trim()}>
      <span className="f-ai-note-icon" aria-hidden="true"><Sparkles size={15} /></span>
      <div className="f-ai-note-copy">
        <small>{f('aiEyebrow')}</small>
        <p><InsightText text={text} highlight={highlight} /></p>
        {to && linkLabel && <Link to={to}>{linkLabel}</Link>}
      </div>
    </div>
  )
}
