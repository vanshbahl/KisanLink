import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { AnimatedNumber } from './AnimatedNumber'
import { useLanguage } from '../../contexts/LanguageContext'

const SIZE = 220
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The threshold visualisation: one full turn of the ring is the break-even volume, and each
 * committed party is its own arc. Reading it needs no legend — the gap in the ring *is* the
 * reason the market is not viable yet.
 */
export function MarketDemandRing({ board, math, compact = false }: { board: MarketMakerBoard; math: MarketMath; compact?: boolean }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const threshold = Number.isFinite(math.thresholdKg) && math.thresholdKg > 0 ? math.thresholdKg : Math.max(1, math.committedKg)
  let cursor = 0
  const segments = board.commitments.map((commitment) => {
    const fraction = Math.min(1, commitment.quantityKg / threshold)
    const segment = { commitment, fraction, offset: cursor }
    cursor += fraction
    return segment
  })
  const filled = Math.min(1, cursor)
  const overflow = Math.max(0, cursor - 1)

  return (
    <div className={`mm-ring ${math.viable ? 'is-viable' : 'is-forming'} ${compact ? 'mm-ring-compact' : ''}`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={l(`${math.committedKg} kg committed of ${threshold} kg needed`, `${threshold} किलो में से ${math.committedKg} किलो मांग पक्की`)}>
        <defs>
          <linearGradient id="mmRingBulk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f7d57" /><stop offset="100%" stopColor="#1c5b3c" />
          </linearGradient>
          <linearGradient id="mmRingConsumer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7b657" /><stop offset="100%" stopColor="#d1902d" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle className="mm-ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} fill="none" />
          {segments.map((segment) => (
            <circle
              key={segment.commitment.id}
              className={`mm-ring-seg mm-ring-${segment.commitment.source}${segment.commitment.own ? ' is-own' : ''}`}
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="butt"
              stroke={segment.commitment.source === 'bulk' ? 'url(#mmRingBulk)' : 'url(#mmRingConsumer)'}
              strokeDasharray={`${Math.max(0, segment.fraction * CIRCUMFERENCE - 2)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-segment.offset * CIRCUMFERENCE}
            />
          ))}
          {/* The remaining gap is drawn as a dashed invitation rather than empty space. */}
          {!math.viable && filled < 1 && (
            <circle
              className="mm-ring-gap" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE}
              strokeDasharray={`${Math.max(0, (1 - filled) * CIRCUMFERENCE - 2)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-filled * CIRCUMFERENCE}
            />
          )}
          {overflow > 0 && (
            <circle
              className="mm-ring-over" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS + STROKE / 2 + 5} fill="none" strokeWidth={3}
              strokeDasharray={`${Math.min(1, overflow) * 2 * Math.PI * (RADIUS + STROKE / 2 + 5)} ${2 * Math.PI * (RADIUS + STROKE / 2 + 5)}`}
            />
          )}
        </g>
        {/* Break-even marker sits at the top of the turn, where the ring must close. */}
        <g className="mm-ring-marker" transform={`translate(${SIZE / 2} ${STROKE / 2})`}>
          <line x1="0" y1={-STROKE / 2 - 4} x2="0" y2={STROKE / 2 + 4} />
        </g>
      </svg>
      <div className="mm-ring-core">
        <strong><AnimatedNumber value={math.committedKg} /><small>kg</small></strong>
        <span>{l(`committed of ${threshold.toLocaleString('en-IN')} kg`, `${threshold.toLocaleString('en-IN')} किलो में से पक्की`)}</span>
        {board.status === 'created'
          ? <em className="mm-ring-flag is-good">{l('Market created', 'बाज़ार बन गया')}</em>
          : math.viable
          ? <em className="mm-ring-flag is-good">{l('Threshold reached', 'ज़रूरी मात्रा पूरी')}</em>
          : math.gapKg > 0
            ? <em className="mm-ring-flag"><AnimatedNumber value={math.gapKg} /> {l('kg to unlock', 'किलो और चाहिए')}</em>
            : <em className="mm-ring-flag is-blocked">{l('Needs attention', 'ध्यान ज़रूरी')}</em>}
      </div>
    </div>
  )
}
