import { ArrowRight, CircleAlert, Radar, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MarketMakerBoard, Role } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useAsyncData } from '../../hooks/useAsyncData'
import { marketMakerService } from '../../services/marketMakerService'
import { AnimatedNumber } from './AnimatedNumber'
import { MarketThresholdMeter } from './MarketThresholdMeter'

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/** What each module needs to know about the corridor, in its own language. */
function pitch(role: Role, board: MarketMakerBoard, math: MarketMath) {
  const own = math.allocations.find((entry) => entry.lot.own)
  if (board.status === 'created') return {
    headline: 'Direct market created',
    body: role === 'farmer'
      ? `${own?.allocatedKg ?? 0} kg of your ${board.crop.toLowerCase()} sold at ₹${math.farmerGatePerKg}/kg with no deductions.`
      : role === 'logistics'
        ? `${board.routeId} is planned · ${math.committedKg} kg at ${math.utilisationPct}% load.`
        : `${board.crop} delivered at ₹${math.deliveredPerKg.toFixed(2)}/kg instead of ₹${board.buyerCurrentPerKg.toFixed(2)}/kg.`,
    metric: role === 'farmer' ? money(own ? own.allocatedKg * math.farmerGatePerKg : math.farmerTotal) : money(Math.max(0, math.buyerSavingTotal)),
    metricLabel: role === 'farmer' ? 'paid to you' : role === 'logistics' ? 'buyer saving on this route' : 'saved across the pool',
  }

  const blocker = math.blockers[0]
  if (blocker && blocker.kind !== 'demand') return {
    headline: blocker.title,
    body: blocker.detail,
    metric: Number.isFinite(math.thresholdKg) ? `${math.thresholdKg.toLocaleString('en-IN')} kg` : '—',
    metricLabel: 'needed to break even',
  }

  const gap = math.gapKg
  if (math.viable) return {
    headline: 'Enough demand, supply and logistics have aligned',
    body: `${math.committedKg} kg is committed against a ${math.thresholdKg} kg break-even. The market is ready to create.`,
    metric: `₹${math.deliveredPerKg.toFixed(2)}`,
    metricLabel: 'delivered per kg',
  }

  switch (role) {
    case 'farmer': return {
      headline: `${gap} kg from a direct market for your ${board.crop.toLowerCase()}`,
      body: `${own?.availableKg ?? 0} kg of your lot is held for this corridor at your ₹${math.farmerGatePerKg}/kg floor — ₹${board.mandiPricePerKg}/kg is what the mandi pays.`,
      metric: money((own?.availableKg ?? 0) * math.farmerGatePerKg),
      metricLabel: 'if the market opens',
    }
    case 'consumer': return {
      headline: `${gap} kg unlocks farm-direct pricing`,
      body: `${math.consumerParticipants} household groups and one bulk buyer are already in. Adding the last ${gap} kg opens the route for all of them.`,
      metric: `₹${math.deliveredAtThresholdPerKg.toFixed(2)}`,
      metricLabel: `per kg, from ₹${board.buyerCurrentPerKg.toFixed(2)}`,
    }
    case 'bulk': return {
      headline: `Your corridor is ${gap} kg short of viable`,
      body: `${math.bulkKg} kg of your requirement is pooled with ${math.consumerKg} kg of household demand. The trip pays for itself at ${math.thresholdKg} kg.`,
      metric: money(Math.max(0, Math.round((board.buyerCurrentPerKg - math.deliveredAtThresholdPerKg) * math.bulkKg))),
      metricLabel: 'saving on your share',
    }
    default: return {
      headline: `Corridor is ${gap} kg from a viable trip`,
      body: `${math.vehicle ? `${math.vehicle.registration} · ${math.vehicle.type}` : 'No vehicle'} is held for ${board.corridor}. Break-even load is ${math.thresholdKg} kg of ${math.capacityKg} kg.`,
      metric: `${math.utilisationPct}%`,
      metricLabel: 'load at current demand',
    }
  }
}

/**
 * The Market Maker's presence on every module home: the same board, the same numbers, framed
 * for whoever is looking at it. Reads live shared state so an action in another role shows up
 * here without a reload.
 */
export function MarketPulseCard({ role }: { role: Role }) {
  const { data } = useAsyncData(() => marketMakerService.board(), [], { live: true })
  if (!data) return null
  const { board, math } = data
  const copy = pitch(role, board, math)
  const blocked = math.blockers.some((item) => item.kind !== 'demand')

  return (
    <section className={`mm-pulse mm-pulse-${board.status} ${blocked ? 'is-blocked' : ''}`}>
      <div className="mm-pulse-copy">
        <span className="eyebrow light">
          {board.status === 'created' ? <Sparkles size={14} /> : blocked ? <CircleAlert size={14} /> : <Radar size={14} />}
          Market Maker · {board.corridor}
        </span>
        <h2>{copy.headline}</h2>
        <p>{copy.body}</p>
        <MarketThresholdMeter board={board} math={math} tone="dark" />
        <div className="mm-pulse-actions">
          <Link className="btn btn-light" to={`/${role}/market`}>
            {board.status === 'created' ? 'See what it created' : math.viable ? 'Create the market' : role === 'logistics' ? 'Review feasibility' : 'Open Market Maker'}
            <ArrowRight size={16} />
          </Link>
          {math.vehicle && <span className="mm-pulse-vehicle"><Truck size={14} /> {math.vehicle.registration} · {math.capacityKg} kg</span>}
        </div>
      </div>
      <aside className="mm-pulse-metric">
        <span>{copy.metricLabel}</span>
        <strong>{copy.metric.startsWith('₹')
          ? <AnimatedNumber value={Number(copy.metric.replace(/[^0-9.]/g, '')) || 0} decimals={copy.metric.includes('.') ? 2 : 0} prefix="₹" />
          : copy.metric}</strong>
        <small>{board.crop} · {board.grade} · {board.deliveryWindow}</small>
      </aside>
    </section>
  )
}
