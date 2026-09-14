import { useLanguage } from '../contexts/LanguageContext'
import { benchmarkDateLabel } from '../services/mandiBenchmarkService'
import type { PriceSourceMeta } from '../services/pricingEngine'

/**
 * One quiet line of provenance under a mandi figure.
 *
 *   Live mandi benchmark · ₹28.5/kg · Source: AGMARKNET · Updated 14 Sep
 *
 * Only a benchmark whose `source` is `agmarknet` is ever called live government data; the
 * seeded fallback says so in as many words, and a stale record says when it was last seen.
 * Deliberately a single <small> so it drops into existing cards without a redesign.
 */
export function MandiSourceNote({ source, pricePerKg, compact = false, className = '' }: {
  source?: PriceSourceMeta | null
  /** Shown as "· ₹X/kg" when the surrounding card does not already print the figure. */
  pricePerKg?: number
  /** Drops the leading label, for tight tiles that already say "Mandi". */
  compact?: boolean
  className?: string
}) {
  const { language } = useLanguage()
  const hi = language === 'hi'
  if (!source) return null

  const date = benchmarkDateLabel(source, hi ? 'hi' : 'en')
  const parts: string[] = []
  if (source.source === 'agmarknet') {
    if (!compact) parts.push(source.stale ? (hi ? 'पिछला मंडी भाव' : 'Last available mandi price') : (hi ? 'लाइव मंडी भाव' : 'Live mandi benchmark'))
    if (pricePerKg !== undefined) parts.push(`₹${pricePerKg}${hi ? '/किलो' : '/kg'}`)
    if (source.market) parts.push(source.market)
    else if (source.district && source.matchLevel === 'district') parts.push(`${source.district}${hi ? ' मंडियाँ' : ' mandis'}`)
    else if (source.matchLevel === 'state' && source.state) parts.push(`${source.state}${hi ? ' औसत' : ' median'}`)
    else if (source.matchLevel === 'national') parts.push(hi ? 'राष्ट्रीय औसत' : 'National median')
    parts.push(hi ? 'स्रोत: AGMARKNET' : 'Source: AGMARKNET')
    if (date) parts.push(`${hi ? 'अपडेट' : 'Updated'} ${date}`)
  } else {
    parts.push(hi ? 'संदर्भ मंडी भाव (ऑफ़लाइन डेमो)' : 'Reference mandi price (offline demo)')
    if (pricePerKg !== undefined) parts.push(`₹${pricePerKg}${hi ? '/किलो' : '/kg'}`)
  }

  return (
    <small className={`mandi-source${source.source === 'agmarknet' ? ' is-live' : ' is-seed'}${className ? ` ${className}` : ''}`} data-source={source.source}>
      {parts.join(' · ')}
    </small>
  )
}
