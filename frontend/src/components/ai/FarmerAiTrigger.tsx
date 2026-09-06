import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { MarketplaceAiTrigger } from './MarketplaceAiTrigger'
import type { ReactNode } from 'react'

/**
 * Full idle -> thinking -> result lifecycle for one contextual "Kisan Intelligence" action.
 * `run` is the real async AI/API call — we always wait for it, and never fake completion before
 * it settles. `MIN_AI_REVEAL_MS` only ever adds a floor on top of that real latency (never a cap),
 * so the loading state reads as deliberate instead of flashing by instantly.
 *
 * While active, the card is elevated above a page-covering dark/blurred overlay. The overlay and the
 * active card are rendered as portal siblings of `document.body` — never nested — so the card can
 * never inherit the overlay's blur/opacity/darkening, regardless of where this trigger sits in the page.
 */
export function FarmerAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className = '', variant = 'card' }: {
  idleLabel: string
  idleHint?: string
  stages: string[]
  run: () => T | Promise<T>
  renderResult: (result: T, reset: () => void) => ReactNode
  className?: string
  variant?: 'card' | 'inline'
}) {
  const { language } = useLanguage()
  return <MarketplaceAiTrigger idleLabel={idleLabel} idleHint={idleHint} stages={stages} run={run} renderResult={renderResult} className={className} variant={variant} brandLabel={aiText(language, 'kisanIntelligence')} thinkingLabel={aiText(language, 'combiningSignals')} errorTitle={language === 'hi' ? 'विश्लेषण पूरा नहीं हुआ' : 'Analysis could not complete'} backLabel={language === 'hi' ? 'वापस जाएं' : 'Go back'} errorFallback={aiText(language, 'disclaimerShort')} />
}
