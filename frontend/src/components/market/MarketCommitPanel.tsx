import { Check, Minus, Plus, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MarketCommitmentSource, MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'

/**
 * The one interaction that moves a market. Presets are derived from the live gap, so the
 * primary action is always literally "the amount still missing" — the demo moment is a single
 * tap, and the stepper is there for anything else.
 */
export function MarketCommitPanel({ board, math, source, party, detail, unit, max, busy, selectedCropId, onSelectCrop, onCommit }: {
  board: MarketMakerBoard
  math: MarketMath
  source: MarketCommitmentSource
  party: string
  detail: string
  unit: number
  max: number
  busy?: boolean
  selectedCropId?: string
  onSelectCrop?: (cropId: string) => void
  onCommit: (quantityKg: number) => void
}) {
  const headroomToThreshold = Math.max(0, math.thresholdKg - math.committedKg)
  const gap = headroomToThreshold
  const cap = Math.max(1, Math.min(max, headroomToThreshold))
  const [quantity, setQuantity] = useState(() => Math.max(1, Math.min(cap, gap || 1)))
  useEffect(() => { setQuantity(Math.max(1, Math.min(cap, gap || 1))) }, [gap, cap])

  const activeCrop = board.isMultiCrop && board.crops
    ? (board.crops.find((c) => c.id === selectedCropId) || board.crops[0])
    : null

  const mine = board.commitments.filter((item) => item.own && item.source === source).reduce((sum, item) => sum + item.quantityKg, 0)
  const closes = gap > 0 && quantity >= gap
  const disabled = busy || headroomToThreshold <= 0 || board.status === 'created'

  const presets = headroomToThreshold <= 0
    ? []
    : Array.from(new Set([gap, Math.round(gap / 2), unit * 2, unit * 5]
        .map((value) => Math.round(value))
        .filter((value) => value > 0 && value <= cap))).sort((a, b) => a - b)

  return (
    <div className={`mm-commit ${closes ? 'is-closing' : ''}`}>
      <div className="mm-commit-head">
        <div>
          <span className="eyebrow">{source === 'bulk' ? 'Add to your requirement' : 'Join this market'}</span>
          <h3>{gap > 0 ? `${gap} kg unlocks farm-direct pricing` : math.viable ? 'This market is unlocked and ready to create' : 'Break-even threshold reached'}</h3>
        </div>
        {mine > 0 && <span className="mm-commit-mine"><Check size={13} /> {mine} kg yours</span>}
      </div>

      {board.isMultiCrop && board.crops && board.crops.length > 0 && (
        <div style={{ padding: '0.6rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Target Crop:</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {board.crops.map((c) => {
              const isSelected = activeCrop?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCrop && onSelectCrop(c.id)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: isSelected ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: isSelected ? '#dcfce7' : '#ffffff',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {c.crop === 'Tomatoes' ? '🍅' : c.crop === 'Onions' ? '🧅' : '🥔'} {c.crop}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mm-commit-controls">
        <div className="mm-stepper">
          <button type="button" aria-label="Reduce quantity" disabled={disabled || quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - unit))}><Minus size={16} /></button>
          <strong>{quantity}<small>kg</small></strong>
          <button type="button" aria-label="Increase quantity" disabled={disabled || quantity >= cap} onClick={() => setQuantity((value) => Math.min(cap, value + unit))}><Plus size={16} /></button>
        </div>
        <button type="button" className={`btn ${closes ? 'btn-primary mm-commit-cta' : 'btn-secondary'}`} disabled={disabled} onClick={() => onCommit(quantity)}>
          {headroomToThreshold <= 0 ? <><Zap size={16} /> Market Unlocked</> : closes ? <><Zap size={16} /> Complete the market · {quantity} kg</> : <>Commit {quantity} kg</>}
        </button>
      </div>

      {presets.length > 0 && (
        <div className="mm-commit-presets">
          {presets.map((value) => (
            <button type="button" key={value} className={quantity === value ? 'active' : ''} disabled={disabled} onClick={() => setQuantity(value)}>
              {value === gap ? `Close the gap · ${value} kg` : `${value} kg`}
            </button>
          ))}
        </div>
      )}

      <p className="mm-commit-note">
        {headroomToThreshold <= 0
          ? `The break-even volume threshold of ${math.thresholdKg} kg has been met. No additional commitments are needed.`
          : closes
            ? `Delivered price settles at ₹${math.deliveredAtThresholdPerKg.toFixed(2)}/kg for everyone in the pool, and ${party} is charged only for ${quantity} kg.`
            : `Every extra kilogram splits the same ₹${math.freightTotal.toLocaleString('en-IN')} trip further. ${detail} · ${board.deliveryWindow}.`}
      </p>
    </div>
  )
}
