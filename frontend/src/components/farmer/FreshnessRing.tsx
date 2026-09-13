import { AlertTriangle, Clock, Leaf, Zap } from 'lucide-react'
import { useFarmerText, relativeDay } from '../../i18n/farmer'
import { assessFreshness, type Freshness, type FreshnessStage } from '../../services/cropFreshness'
import { daysUntil } from '../../utils/dates'
import type { FarmerListing } from '../../types'

/**
 * The one freshness indicator for the farmer module.
 *
 * A ring shows how much of the crop's recommended selling window is left; the icon and the
 * words say the stage, so the meaning never rests on colour alone. Three sizes cover every
 * place a crop appears:
 *
 *   - `chip`  — ring + stage word, inline (orders, lists, sell-flow review)
 *   - `card`  — ring + stage + "N days left" (crop cards, home crop strip)
 *   - `hero`  — larger ring + stage + concrete sell-by line (crop page, Market Maker)
 *
 * The number inside the ring is days left, because "3" reads faster than a percentage and is
 * the figure a farmer will repeat to a buyer.
 */
const STAGE_ICON: Record<FreshnessStage, typeof Leaf> = {
  FRESH: Leaf, GOOD: Leaf, SELL_SOON: Clock, URGENT: Zap, WINDOW_OVER: AlertTriangle,
}
const STAGE_KEY = {
  FRESH: 'freshFresh', GOOD: 'freshGood', SELL_SOON: 'freshSellSoon', URGENT: 'freshUrgent', WINDOW_OVER: 'freshOver',
} as const

export function useFreshnessCopy() {
  const { f, language } = useFarmerText()
  return (fresh: Freshness) => {
    const stage = f(STAGE_KEY[fresh.stage])
    const left = fresh.daysLeft < 0 ? f('freshOverHint')
      : fresh.daysLeft === 0 ? f('freshSellToday')
        : fresh.daysLeft === 1 ? f('freshOneDayLeft')
          : f('freshDaysLeft', { count: fresh.daysLeft })
    const sellBy = fresh.daysLeft < 0 ? f('freshOverHint')
      : fresh.daysLeft === 0 ? f('freshSellToday')
        : f('freshSellBy', { date: relativeDay(language, fresh.sellBy, daysUntil(fresh.sellBy)) })
    return { stage, left, sellBy }
  }
}

export function FreshnessRing({ listing, size = 'card', className = '' }: {
  listing: Pick<FarmerListing, 'crop' | 'cropHi' | 'harvestDate' | 'createdAt' | 'category'>
  size?: 'chip' | 'card' | 'hero'
  className?: string
}) {
  const { f, pick } = useFarmerText()
  const describe = useFreshnessCopy()
  const fresh = assessFreshness(listing)
  const { stage, left, sellBy } = describe(fresh)
  const Icon = STAGE_ICON[fresh.stage]

  const radius = size === 'hero' ? 26 : size === 'card' ? 19 : 12
  const stroke = size === 'hero' ? 5 : size === 'card' ? 4 : 3
  const box = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (fresh.percent / 100)
  const days = Math.max(0, fresh.daysLeft)

  const label = f('freshRingLabel', { crop: pick(listing.crop, listing.cropHi), stage, left })

  return (
    <div className={`f-fresh f-fresh-${size} is-${fresh.stage.toLowerCase()} ${className}`.trim()} role="img" aria-label={label} title={label}>
      <span className="f-fresh-ring" aria-hidden="true">
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
          <circle cx={box / 2} cy={box / 2} r={radius} fill="none" strokeWidth={stroke} className="f-fresh-track" />
          <circle
            cx={box / 2} cy={box / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
            className="f-fresh-arc"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        </svg>
        {size === 'chip'
          ? <Icon className="f-fresh-icon" size={12} />
          : <b className={`f-fresh-days${String(days).length > 2 ? ' is-wide' : ''}`}>{fresh.daysLeft < 0 ? '!' : days}</b>}
      </span>
      <span className="f-fresh-copy" aria-hidden="true">
        <strong>{size !== 'chip' && <Icon size={size === 'hero' ? 16 : 14} />}{stage}{fresh.approximate && <small> · {f('freshApprox')}</small>}</strong>
        {size !== 'chip' && <small>{size === 'hero' ? sellBy : left}</small>}
      </span>
    </div>
  )
}
