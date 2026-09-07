import { Check, Minus, Plus, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MarketCommitmentSource, MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'

/**
 * The one interaction that moves a market. Presets are derived from the live gap, so the
 * primary action is always literally "the amount still missing" — the demo moment is a single
 * tap, and the stepper is there for anything else.
 */
export function MarketCommitPanel({ board, math, source, party, detail, unit, max, busy, onCommit }: {
  board: MarketMakerBoard
  math: MarketMath
  source: MarketCommitmentSource
  party: string
  detail: string
  unit: number
  max: number
  busy?: boolean
  onCommit: (quantityKg: number) => void
}) {
  const headroom = Math.max(0, math.ceilingKg - math.committedKg)
  const gap = Math.min(math.gapKg, headroom)
  const cap = Math.max(unit, Math.min(max, headroom))
  const [quantity, setQuantity] = useState(() => Math.max(unit, Math.min(cap, gap || unit)))
  useEffect(() => { setQuantity(Math.max(unit, Math.min(cap, gap || unit))) }, [gap, cap, unit])

  const mine = board.commitments.filter((item) => item.own && item.source === source).reduce((sum, item) => sum + item.quantityKg, 0)
  const closes = gap > 0 && quantity >= gap
  const disabled = busy || headroom <= 0 || board.status === 'created'

  const presets = Array.from(new Set([gap, unit * 2, unit * 5, unit * 10]
    .map((value) => Math.round(value))
    .filter((value) => value > 0 && value <= cap))).sort((a, b) => a - b)

  return (
    <div className={`mm-commit ${closes ? 'is-closing' : ''}`}>
      <div className="mm-commit-head">
        <div>
          <span className="eyebrow">{source === 'bulk' ? 'Add to your requirement' : 'Join this market'}</span>
          <h3>{gap > 0 ? `${gap} kg unlocks farm-direct pricing` : math.viable ? 'This market is ready to create' : 'Demand is capped for now'}</h3>
        </div>
        {mine > 0 && <span className="mm-commit-mine"><Check size={13} /> {mine} kg yours</span>}
      </div>

      <div className="mm-commit-controls">
        <div className="mm-stepper">
          <button type="button" aria-label="Reduce quantity" disabled={disabled || quantity <= unit} onClick={() => setQuantity((value) => Math.max(unit, value - unit))}><Minus size={16} /></button>
          <strong>{quantity}<small>kg</small></strong>
          <button type="button" aria-label="Increase quantity" disabled={disabled || quantity >= cap} onClick={() => setQuantity((value) => Math.min(cap, value + unit))}><Plus size={16} /></button>
        </div>
        <button type="button" className={`btn ${closes ? 'btn-primary mm-commit-cta' : 'btn-secondary'}`} disabled={disabled} onClick={() => onCommit(quantity)}>
          {closes ? <><Zap size={16} /> Complete the market · {quantity} kg</> : <>Commit {quantity} kg</>}
        </button>
      </div>

      {presets.length > 1 && (
        <div className="mm-commit-presets">
          {presets.map((value) => (
            <button type="button" key={value} className={quantity === value ? 'active' : ''} disabled={disabled} onClick={() => setQuantity(value)}>
              {value === gap ? `Close the gap · ${value} kg` : `${value} kg`}
            </button>
          ))}
        </div>
      )}

      <p className="mm-commit-note">
        {headroom <= 0
          ? 'This corridor is full for this delivery window.'
          : closes
            ? `Delivered price settles at ₹${math.deliveredAtThresholdPerKg.toFixed(2)}/kg for everyone in the pool, and ${party} is charged only for ${quantity} kg.`
            : `Every extra kilogram splits the same ₹${math.freightTotal.toLocaleString('en-IN')} trip further. ${detail} · ${board.deliveryWindow}.`}
      </p>
    </div>
  )
}
