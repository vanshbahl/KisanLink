import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { AnimatedNumber } from './AnimatedNumber'
import { useLanguage } from '../../contexts/LanguageContext'

const SIZE = 220
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export interface MarketDemandRingProps {
  board?: MarketMakerBoard
  math?: MarketMath
  committedKg?: number
  thresholdKg?: number
  status?: string
  label?: string
  compact?: boolean
  tone?: 'light' | 'dark'
  language?: 'en' | 'hi'
}

/**
 * Phase 8.7 Circular Commitment vs Break-Even Threshold Visualization
 *
 * Visual representation of committed produce weight against break-even market threshold.
 * Respects strict threshold safety (never visually exceeds 100%).
 * Displays committed / threshold kg, progress percentage, and remaining kg needed (or MARKET UNLOCKED).
 */
export function MarketDemandRing({
  board,
  math,
  committedKg,
  thresholdKg,
  status,
  label,
  compact = false,
  tone = 'dark',
  language: propLanguage,
}: MarketDemandRingProps) {
  let language = propLanguage || 'en'
  if (!propLanguage) {
    try {
      const langContext = useLanguage()
      if (langContext?.language) language = langContext.language
    } catch {
      language = 'en'
    }
  }
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  // Resolve committed and threshold weights
  const committed = committedKg !== undefined
    ? committedKg
    : (math?.committedKg ?? board?.commitments?.reduce((sum, c) => sum + c.quantityKg, 0) ?? 0)

  const threshold = thresholdKg !== undefined
    ? thresholdKg
    : (math && Number.isFinite(math.thresholdKg) && math.thresholdKg > 0
        ? math.thresholdKg
        : Math.max(1, committed))

  // Threshold safety: progress percentage is strictly capped at 100%
  const progressPct = threshold > 0 ? Math.min(100, (committed / threshold) * 100) : 0
  const progressPctRound = Math.round(progressPct)

  // Remaining kg needed to unlock corridor
  const remainingKg = Math.max(0, threshold - committed)

  // Unlocked check: at threshold (remaining = 0) or viable status
  const resolvedStatus = status || board?.status
  const isUnlocked =
    remainingKg === 0 ||
    (math?.viable ?? false) ||
    resolvedStatus === 'created' ||
    resolvedStatus === 'viable'

  // Visual arc is strictly capped at 100%
  const targetFraction = Math.min(1, threshold > 0 ? committed / threshold : 0)
  const filled = Math.min(1, targetFraction)

  // Segment generation: commitments or fallback single arc
  const commitments = board?.commitments ?? []
  let cursor = 0
  const segments =
    commitments.length > 0
      ? commitments.map((commitment) => {
          const rawFrac = threshold > 0 ? commitment.quantityKg / threshold : 0
          const fraction = Math.min(Math.max(0, 1 - cursor), rawFrac)
          const segment = { commitment, fraction, offset: cursor }
          cursor += fraction
          return segment
        })
      : [
          {
            commitment: {
              id: 'committed-arc',
              source: 'farmer' as const,
              party: 'Committed Produce',
              detail: '',
              quantityKg: committed,
              committedAt: new Date().toISOString(),
              own: true,
            },
            fraction: targetFraction,
            offset: 0,
          },
        ]

  // If farmer dynamically contributed more than existing commitments reflect
  if (commitments.length > 0 && targetFraction > cursor) {
    const delta = targetFraction - cursor
    segments.push({
      commitment: {
        id: 'farmer-delta-arc',
        source: 'farmer' as const,
        party: 'Farmer Contribution',
        detail: '',
        quantityKg: Math.round(delta * threshold),
        committedAt: new Date().toISOString(),
        own: true,
      },
      fraction: delta,
      offset: cursor,
    })
    cursor = targetFraction
  }

  return (
    <div
      className={`mm-ring ${isUnlocked ? 'is-viable' : 'is-forming'} ${tone === 'light' ? 'is-light' : ''} ${compact ? 'mm-ring-compact' : ''}`}
      data-testid="market-demand-ring"
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={l(
          `${committed} kg committed of ${threshold} kg needed (${progressPctRound}%)`,
          `${threshold} किलो में से ${committed} किलो मांग पक्की (${progressPctRound}%)`
        )}
      >
        <defs>
          <linearGradient id="mmRingBulk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f7d57" />
            <stop offset="100%" stopColor="#1c5b3c" />
          </linearGradient>
          <linearGradient id="mmRingConsumer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7b657" />
            <stop offset="100%" stopColor="#d1902d" />
          </linearGradient>
          <linearGradient id="mmRingFarmer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {/* Base track */}
          <circle
            className="mm-ring-track"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
            fill="none"
          />

          {/* Commitment segments (never exceeds 100%) */}
          {segments.map((segment) => (
            <circle
              key={segment.commitment.id}
              className={`mm-ring-seg mm-ring-${segment.commitment.source}${segment.commitment.own ? ' is-own' : ''}`}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="butt"
              stroke={
                segment.commitment.source === 'bulk'
                  ? 'url(#mmRingBulk)'
                  : segment.commitment.source === 'consumer'
                  ? 'url(#mmRingConsumer)'
                  : 'url(#mmRingFarmer)'
              }
              strokeDasharray={`${Math.max(0, segment.fraction * CIRCUMFERENCE - (segment.fraction >= 1 ? 0 : 2))} ${CIRCUMFERENCE}`}
              strokeDashoffset={-segment.offset * CIRCUMFERENCE}
            />
          ))}

          {/* Remaining gap drawn as dashed invitation when forming */}
          {!isUnlocked && filled < 1 && (
            <circle
              className="mm-ring-gap"
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={`${Math.max(0, (1 - filled) * CIRCUMFERENCE - 2)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-filled * CIRCUMFERENCE}
            />
          )}
        </g>

        {/* Break-even marker at top */}
        <g className="mm-ring-marker" transform={`translate(${SIZE / 2} ${STROKE / 2})`}>
          <line x1="0" y1={-STROKE / 2 - 4} x2="0" y2={STROKE / 2 + 4} />
        </g>
      </svg>

      {/* Center Core: Percentage, Committed / Threshold, and Status */}
      <div className="mm-ring-core">
        <strong data-testid="ring-progress-pct" style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
          {progressPctRound}
          <small style={{ fontSize: '0.55em', opacity: 0.85 }}>%</small>
        </strong>
        <span data-testid="ring-committed-threshold" style={{ whiteSpace: 'nowrap' }}>
          {committed.toLocaleString('en-IN')} / {threshold.toLocaleString('en-IN')} kg
        </span>
        {label && <span style={{ fontSize: '10px', opacity: 0.75 }}>{label}</span>}
        {isUnlocked ? (
          <em data-testid="ring-status-flag" className="mm-ring-flag is-good">
            {l('MARKET UNLOCKED', 'बाज़ार अनलॉक हो गया')}
          </em>
        ) : (
          <em data-testid="ring-status-flag" className="mm-ring-flag">
            <AnimatedNumber value={remainingKg} /> {l('kg more needed', 'किलो और चाहिए')}
          </em>
        )}
      </div>
    </div>
  )
}
