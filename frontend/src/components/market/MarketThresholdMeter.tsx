import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'

/**
 * Horizontal threshold bar — the compact form of the demand ring, used wherever a card is
 * wider than it is tall. Each committed party keeps its own segment, and the break-even notch
 * is drawn at its true position so the remaining gap is measured, not implied.
 */
export function MarketThresholdMeter({ board, math, tone = 'light', showLabels = true }: {
  board: MarketMakerBoard; math: MarketMath; tone?: 'light' | 'dark'; showLabels?: boolean
}) {
  const threshold = Number.isFinite(math.thresholdKg) && math.thresholdKg > 0 ? math.thresholdKg : Math.max(1, math.committedKg)
  // Leave visible room past break-even so the notch never sits on the very edge.
  const scale = Math.max(threshold * 1.12, math.committedKg * 1.02, 1)
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / scale) * 100))}%`

  return (
    <div className={`mm-meter mm-meter-${tone} ${math.viable ? 'is-viable' : ''}`}>
      <div className="mm-meter-track" role="img" aria-label={`${math.committedKg} kg committed, ${threshold} kg needed`}>
        {board.commitments.map((commitment, index) => (
          <i
            key={commitment.id}
            className={`mm-meter-seg is-${commitment.source}${commitment.own ? ' is-own' : ''}`}
            style={{ width: pct(commitment.quantityKg), animationDelay: `${index * 70}ms` }}
            title={`${commitment.party} · ${commitment.quantityKg} kg`}
          />
        ))}
        <span className="mm-meter-notch" style={{ left: pct(threshold) }}><b>{threshold.toLocaleString('en-IN')} kg</b></span>
      </div>
      {showLabels && (
        <div className="mm-meter-labels">
          <span><i className="key-bulk" /> Bulk {math.bulkKg} kg</span>
          <span><i className="key-consumer" /> Households {math.consumerKg} kg</span>
          <span className="mm-meter-gap">{math.viable ? 'Break-even reached' : math.gapKg > 0 ? `${math.gapKg} kg to go` : 'Blocked'}</span>
        </div>
      )}
    </div>
  )
}
