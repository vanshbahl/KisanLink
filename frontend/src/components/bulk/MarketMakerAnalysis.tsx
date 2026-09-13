import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Building2, CalendarClock, Check, Gauge, IndianRupee, MapPinned, Radar, Route, Sprout, Truck } from 'lucide-react'
import { usePrefersReducedMotion } from '../ai/useReducedMotion'
import { AI_REVEAL_MS } from '../ai/aiTiming'
import { StatusBadge } from '../StatusBadge'
import { prettyWhen } from '../maps/CorridorRouteMap'
import { AiNote, CostStack, FarmList, FillBar, clean, kg } from '../../pages/bulk/shared'
import type { ProcurementPlan } from '../../types'

/**
 * The five passes the Market Maker actually runs, in order. Shown as work in progress rather
 * than as a spinner because each one is a real pass in `procurementEngine`.
 */
const PASSES = [
  { icon: Sprout, label: 'Scanning farms', detail: 'Every listed farm in the corridor with this crop' },
  { icon: Gauge, label: 'Checking quantity and grade', detail: 'Live stock at or above the requested grade' },
  { icon: MapPinned, label: 'Pooling lots', detail: 'Filling the requirement farm by farm, cheapest asking rate first' },
  { icon: Route, label: 'Optimising route', detail: 'One collection run into the Sonipat hub, sized to one vehicle' },
  { icon: IndianRupee, label: 'Calculating landed cost', detail: 'Produce, pooled logistics and platform against typical wholesale' },
] as const

interface Props {
  plan: ProcurementPlan | null
  /** Re-runs the analysis sequence whenever this changes. */
  runKey: string | number
  crop: string
  grade: string
  requiredQuantityKg: number
  targetPrice: number
  deliveryLocation: string
  requiredBy?: string
  /** Skips the sequence and shows the stored result immediately (saved requirements). */
  instant?: boolean
  onDone?: () => void
  /** The decision the analysis leads to, rendered under the result. */
  action?: ReactNode
  /** Extra content inside the farm contributions block (match reasoning trigger). */
  farmsExtra?: ReactNode
}

/**
 * Market Maker analysis for one bulk requirement.
 *
 * Bounded theatre (one AI-reveal window), then a result that reads top to bottom as a
 * decision: what was asked, how much of it is covered, what it costs against wholesale,
 * which farms supply it, and why the pooling works. Reduced-motion users skip to the result.
 */
export function MarketMakerAnalysis({ plan, runKey, crop, grade, requiredQuantityKg, targetPrice, deliveryLocation, requiredBy, instant = false, onDone, action, farmsExtra }: Props) {
  const reduced = usePrefersReducedMotion()
  const skip = reduced || instant
  const [pass, setPass] = useState(skip ? PASSES.length : 0)
  const [done, setDone] = useState(skip)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (skip) { setPass(PASSES.length); setDone(true); doneRef.current?.(); return }
    setPass(0)
    setDone(false)
    const step = Math.round(AI_REVEAL_MS / PASSES.length)
    const timers = PASSES.map((_, index) => window.setTimeout(() => setPass(index + 1), step * (index + 1)))
    const finish = window.setTimeout(() => { setDone(true); doneRef.current?.() }, AI_REVEAL_MS + 220)
    return () => { timers.forEach(window.clearTimeout); window.clearTimeout(finish) }
  }, [runKey, skip])

  if (!done || !plan) {
    return (
      <section className="b-mm is-running" role="status" aria-live="polite">
        <header className="b-mm-head">
          <span className="b-mm-icon"><Radar size={17} /></span>
          <div>
            <small>KisanLink Market Maker</small>
            <h2>Matching {kg(requiredQuantityKg)} {crop.toLowerCase()}</h2>
          </div>
        </header>
        <ol className="b-mm-passes">
          {PASSES.map((item, index) => (
            <li key={item.label} className={index < pass ? 'is-done' : index === pass ? 'is-active' : ''}>
              <span>{index < pass ? <Check size={13} /> : <item.icon size={14} />}</span>
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
            </li>
          ))}
        </ol>
        <FillBar pct={(pass / PASSES.length) * 100} tone="green" label="Analysis progress" />
      </section>
    )
  }

  const tone = plan.feasible ? 'green' : plan.matchedKg > 0 ? 'amber' : 'red'
  const headline = plan.feasible ? 'Match ready' : plan.matchedKg > 0 ? 'Partial match' : 'No match yet'
  const aboveTarget = plan.matchedKg > 0 && plan.landedPerKg > targetPrice + 2

  return (
    <section className="b-mm is-done">
      <header className="b-mm-head">
        <span className="b-mm-icon"><Radar size={17} /></span>
        <div>
          <small>KisanLink Market Maker</small>
          <h2>{headline}</h2>
        </div>
        <StatusBadge tone={tone}>{plan.stops.length} farm{plan.stops.length === 1 ? '' : 's'} · {plan.fillPct}% covered</StatusBadge>
      </header>

      {/* 1. Demand and fulfilment */}
      <div className="b-mm-demand">
        <div className="b-mm-demand-copy">
          <small>Demand</small>
          <strong>{kg(plan.requiredKg)} {crop} · {grade}</strong>
          <span><Building2 size={12} /> {deliveryLocation}{requiredBy ? ` · ${prettyWhen(requiredBy)}` : ''}</span>
        </div>
        <div className="b-mm-fill">
          <div className="b-mm-fill-head">
            <strong>{plan.fillPct}%<small> covered</small></strong>
            <span>{kg(plan.matchedKg)} matched{plan.shortfallKg > 0 ? ` · ${kg(plan.shortfallKg)} short` : ''}</span>
          </div>
          <FillBar pct={plan.fillPct} tone={plan.feasible ? 'green' : 'amber'} label={`${plan.fillPct}% of the requirement matched`} />
        </div>
      </div>

      {/* 2. Summary */}
      <dl className="b-mm-summary">
        <div><dt>Farms</dt><dd>{plan.stops.length}</dd></div>
        <div><dt>Pooled vehicle</dt><dd>{plan.vehicle ? plan.vehicle.type : 'None free'}</dd><small>{plan.vehicle ? plan.vehicle.registration : 'Fleet committed'}</small></div>
        <div><dt>Truck utilisation</dt><dd>{plan.utilisationPct}%</dd><small>{kg(plan.matchedKg)} of {kg(plan.capacityKg)}</small></div>
        <div><dt>Route</dt><dd>{plan.routeDistanceKm} km</dd><small>{Math.floor(plan.routeDurationMinutes / 60)}h {plan.routeDurationMinutes % 60}m · {plan.stops.length} stop{plan.stops.length === 1 ? '' : 's'}</small></div>
      </dl>

      {/* 3. Commercial breakdown */}
      <div className="b-mm-block">
        <h3><IndianRupee size={14} /> Landed cost</h3>
        <CostStack produce={plan.produceValue} logistics={plan.logisticsCost} platform={plan.platformFee} landedTotal={plan.landedTotal} landedPerKg={plan.landedPerKg} benchmarkPerKg={plan.benchmarkPerKg} quantityKg={plan.matchedKg} />
        {aboveTarget && (
          <p className="b-mm-target"><AlertTriangle size={14} /> Lands ₹{(plan.landedPerKg - targetPrice).toFixed(2)}/kg above your ₹{targetPrice}/kg target. Raising the target or widening the grade would bring more farms in.</p>
        )}
      </div>

      {/* 4. Farm contributions */}
      <div className="b-mm-block">
        <h3><Sprout size={14} /> Farm contributions</h3>
        <FarmList contributions={plan.stops} total={plan.requiredKg}>
          {plan.rejected.length > 0 && (
            <details className="b-mm-rejected">
              <summary>{plan.rejected.length} farm{plan.rejected.length === 1 ? '' : 's'} considered and not used</summary>
              <ul>{plan.rejected.map((entry, index) => <li key={`${entry.farm}-${index}`}><strong>{entry.farm}</strong><span>{entry.reason}</span></li>)}</ul>
            </details>
          )}
          {farmsExtra}
        </FarmList>
      </div>

      {/* 5. Timing and blockers */}
      <ol className="b-mm-timeline">
        <li><span><Sprout size={12} /></span><div><strong>Farm collection</strong><small>{prettyWhen(plan.pickupDate)} · {plan.stops.length} stop{plan.stops.length === 1 ? '' : 's'}</small></div></li>
        <li><span><Truck size={12} /></span><div><strong>Consolidation at Sonipat hub</strong><small>{prettyWhen(plan.consolidationAt)}</small></div></li>
        <li><span><CalendarClock size={12} /></span><div><strong>Delivery to {deliveryLocation.split(',')[0]}</strong><small>{prettyWhen(plan.estimatedDelivery)}</small></div></li>
      </ol>
      {plan.blockers.length > 0 && (
        <div className="b-mm-blockers" role="alert">
          <AlertTriangle size={16} />
          <ul>{plan.blockers.map((blocker) => <li key={blocker}>{clean(blocker)}</li>)}</ul>
        </div>
      )}

      {/* 6. Why this match works */}
      <AiNote
        label="Why this match works"
        tone={plan.feasible ? 'good' : 'default'}
        text={<>{plan.rationale.map((line) => <span key={line} className="b-mm-why-line">{clean(line)}</span>)}</>}
      />

      {action && <div className="b-mm-action">{action}</div>}
    </section>
  )
}
