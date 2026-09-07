import { ArrowRight, Boxes, Building2, Check, IndianRupee, MapPinned, PackageCheck, Sprout, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { MarketMakerBoard, Role } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { usePrefersReducedMotion } from '../ai/useReducedMotion'
import { AnimatedNumber } from './AnimatedNumber'

export interface MarketCreationResult {
  routeId: string
  farmerOrderIds: string[]
  bulkOrderId?: string
  consumerOrderId?: string
  pickupIds: string[]
  deliveryIds: string[]
}

interface LedgerRow { module: string; icon: LucideIcon; label: string; detail: string; href: string }

/**
 * The moment. A page-covering reveal that shows the market closing, then plays back exactly
 * what was written into shared state — one row per real record, each linking to the module
 * that now owns it. Nothing here is decorative: every row is a record you can open.
 *
 * Reduced-motion users land straight on the final frame with the same content.
 */
export function MarketUnlockReveal({ board, math, result, role, onClose }: {
  board: MarketMakerBoard; math: MarketMath; result: MarketCreationResult; role: Role; onClose: () => void
}) {
  const reduced = usePrefersReducedMotion()
  const [stage, setStage] = useState(reduced ? 3 : 0)
  const timers = useRef<number[]>([])

  const ledger = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = []
    const own = math.allocations.find((entry) => entry.lot.own)
    if (result.farmerOrderIds[0] && own) rows.push({
      module: 'Farmer', icon: Sprout, label: `${own.allocatedKg} kg sold at ₹${math.farmerGatePerKg}/kg`,
      detail: `${result.farmerOrderIds[0]} · no commission, no deduction`, href: `/farmer/orders/${result.farmerOrderIds[0]}`,
    })
    if (result.farmerOrderIds[0] && own) rows.push({
      module: 'Farmer', icon: IndianRupee, label: `₹${Math.round(own.allocatedKg * math.farmerGatePerKg).toLocaleString('en-IN')} added to earnings`,
      detail: `₹${Math.round(own.allocatedKg * (math.farmerGatePerKg - board.mandiPricePerKg)).toLocaleString('en-IN')} more than the mandi would have paid`, href: '/farmer/earnings',
    })
    if (result.bulkOrderId) rows.push({
      module: 'Bulk buyer', icon: Building2, label: `${math.bulkKg} kg procurement order created`,
      detail: `${result.bulkOrderId} · ₹${math.deliveredPerKg.toFixed(2)}/kg landed at ${board.destination}`, href: `/bulk/orders/${result.bulkOrderId}`,
    })
    if (result.consumerOrderId) rows.push({
      module: 'Consumer', icon: PackageCheck, label: 'Farm-direct order confirmed',
      detail: `${result.consumerOrderId} · pooled delivery ${board.deliveryWindow}`, href: `/consumer/orders/${result.consumerOrderId}`,
    })
    if (result.pickupIds.length) rows.push({
      module: 'Logistics', icon: Boxes, label: `${result.pickupIds.length} farm pickups scheduled`,
      detail: `${result.pickupIds.join(' · ')}`, href: '/logistics/pickups',
    })
    rows.push({
      module: 'Logistics', icon: MapPinned, label: 'Pooled route became viable',
      detail: `${result.routeId} · ${board.routeDistanceKm} km on ${math.vehicle?.registration ?? 'assigned vehicle'} at ${math.utilisationPct}% load`, href: '/logistics/routes',
    })
    if (result.deliveryIds.length) rows.push({
      module: 'Logistics', icon: Truck, label: `${result.deliveryIds.length} deliveries scheduled`,
      detail: result.deliveryIds.join(' · '), href: '/logistics/deliveries',
    })
    return rows
  }, [board, math, result])

  useEffect(() => {
    if (reduced) return
    const push = (delay: number, next: number) => timers.current.push(window.setTimeout(() => setStage(next), delay))
    push(120, 1)
    push(1100, 2)
    push(2050, 3)
    return () => { timers.current.forEach(window.clearTimeout); timers.current = [] }
  }, [reduced])

  useEffect(() => {
    const { body } = document
    const gap = window.innerWidth - document.documentElement.clientWidth
    const previous = body.style.paddingRight
    body.classList.add('mm-reveal-open')
    if (gap > 0) body.style.paddingRight = `${gap}px`
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { body.classList.remove('mm-reveal-open'); body.style.paddingRight = previous; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const homeFor: Record<Role, string> = { farmer: '/farmer/market', consumer: '/consumer/market', bulk: '/bulk/market', logistics: '/logistics/market' }

  return createPortal(
    <div className={`mm-reveal stage-${stage}`} role="dialog" aria-modal="true" aria-label="Direct market created">
      <div className="mm-reveal-scrim" />
      <div className="mm-reveal-panel">
        <button type="button" className="mm-reveal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="mm-reveal-badge" aria-hidden="true">
          <span className="mm-reveal-pulse" />
          <Check size={30} />
        </div>
        <span className="eyebrow">{board.corridor} · {board.deliveryWindow}</span>
        <h2 className="mm-reveal-title">Direct Market Created</h2>
        <p className="mm-reveal-sub">
          {math.committedKg} kg of {board.crop} from {math.allocations.filter((entry) => entry.allocatedKg > 0).length} farms and {math.participants} buyer groups now moves on one route that none of them could pay for alone.
        </p>

        <div className="mm-reveal-metrics">
          <article><span>Farmer receives</span><strong><AnimatedNumber value={math.farmerTotal} prefix="₹" /></strong><small>+₹{math.farmerGainTotal.toLocaleString('en-IN')} vs mandi</small></article>
          <article><span>Delivered price</span><strong>₹<AnimatedNumber value={math.deliveredPerKg} decimals={2} /></strong><small>was ₹{board.buyerCurrentPerKg.toFixed(2)}/kg</small></article>
          <article><span>Spread removed</span><strong>₹<AnimatedNumber value={math.spreadRemovedPerKg} decimals={2} /></strong><small>per kg, now stated as freight</small></article>
        </div>

        <div className="mm-reveal-ledger">
          <h3>What this created across KisanLink</h3>
          <ul>
            {ledger.map((row, index) => (
              <li key={`${row.module}-${row.label}`} style={{ animationDelay: reduced ? '0ms' : `${index * 110}ms` }}>
                <span className="mm-ledger-icon"><row.icon size={15} /></span>
                <div><small>{row.module}</small><strong>{row.label}</strong><p>{row.detail}</p></div>
                <Link to={row.href} onClick={onClose} aria-label={`Open ${row.label}`}><ArrowRight size={15} /></Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mm-reveal-actions">
          <Link className="btn btn-primary" to={homeFor[role]} onClick={onClose}>Back to the market <ArrowRight size={16} /></Link>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Stay here</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
