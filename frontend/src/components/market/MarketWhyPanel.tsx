import { ChevronDown, ChevronUp, Sigma } from 'lucide-react'
import { useState } from 'react'
import type { MarketMakerBoard } from '../../types'
import { explainMarket, type MarketMath } from '../../services/marketMakerEngine'

/**
 * "Why did this market become viable?" answered as arithmetic rather than as a claim. Each
 * step is one operation on a number that appears elsewhere in the app, in engine order.
 */
export function MarketWhyPanel({ board, math, defaultOpen = false }: { board: MarketMakerBoard; math: MarketMath; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const steps = explainMarket(board, math)

  return (
    <section className="mm-why">
      <button type="button" className="mm-why-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="mm-why-icon"><Sigma size={15} /></span>
        <span>
          <small>Inspectable economics</small>
          <strong>{math.viable ? 'Why this market is viable' : 'Why this market is not viable yet'}</strong>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <ol className="mm-why-steps">
          {steps.map((step, index) => (
            <li key={step.label} style={{ animationDelay: `${index * 45}ms` }}>
              <i>{index + 1}</i>
              <div><span>{step.label}</span><p>{step.note}</p></div>
              <strong>{step.value}</strong>
            </li>
          ))}
        </ol>
      )}
      {open && <p className="mm-why-footer">Every figure above is computed from the listing, fleet and commitment records in shared prototype state. No prediction, confidence score or model output is involved.</p>}
    </section>
  )
}
