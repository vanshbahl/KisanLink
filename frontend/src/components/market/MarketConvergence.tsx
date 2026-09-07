import { Building2, Home, Sprout, Truck } from 'lucide-react'
import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'

/**
 * Fragmented supply and fragmented demand converging on one route.
 *
 * Laid out with CSS grid rather than a fixed SVG so the same component reads as three columns
 * on a laptop and three stacked bands on a phone, with the connecting rails redrawn for each.
 * Nodes that are too small to trade alone are marked as such — that is the whole point.
 */
export function MarketConvergence({ board, math }: { board: MarketMakerBoard; math: MarketMath }) {
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg : 0
  const supply = math.allocations
  const demand = board.commitments

  return (
    <div className={`mm-flow ${math.viable ? 'is-connected' : ''} ${board.status === 'created' ? 'is-created' : ''}`}>
      <section className="mm-flow-side">
        <h4><Sprout size={14} /> Fragmented supply<em>{math.offeredKg.toLocaleString('en-IN')} kg offered</em></h4>
        <ul>
          {supply.map((entry, index) => (
            <li key={entry.lot.id} className={entry.allocatedKg > 0 ? 'is-matched' : ''} style={{ animationDelay: `${index * 80}ms` }}>
              <div>
                <strong>{entry.lot.farm}</strong>
                <small>{entry.lot.farmer} · {entry.lot.location}</small>
              </div>
              <span>
                <b>{entry.availableKg} kg</b>
                <i>{threshold && entry.availableKg < threshold ? 'too small alone' : 'ready'}</i>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mm-flow-core" aria-hidden="true">
        <span className="mm-flow-rail mm-flow-rail-in" />
        <div className="mm-flow-hub">
          <Truck size={20} />
          <strong>{math.committedKg} kg</strong>
          <small>{math.vehicle ? `${math.vehicle.type} · ${math.utilisationPct}% full` : 'no vehicle'}</small>
        </div>
        <span className="mm-flow-rail mm-flow-rail-out" />
      </div>

      <section className="mm-flow-side mm-flow-demand">
        <h4><Home size={14} /> Fragmented demand<em>{math.committedKg.toLocaleString('en-IN')} kg committed</em></h4>
        <ul>
          {demand.map((commitment, index) => (
            <li key={commitment.id} className={`is-matched ${commitment.own ? 'is-own' : ''}`} style={{ animationDelay: `${index * 80}ms` }}>
              <div>
                <strong>{commitment.source === 'bulk' ? <Building2 size={12} /> : <Home size={12} />}{commitment.party}</strong>
                <small>{commitment.detail}</small>
              </div>
              <span>
                <b>{commitment.quantityKg} kg</b>
                <i>{threshold && commitment.quantityKg < threshold ? 'cannot fill a trip' : 'ready'}</i>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
