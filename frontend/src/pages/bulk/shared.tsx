import { ChevronDown, RefreshCw, Sparkles, Sprout } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { farmers } from '../../data/farmers'
import { buildProcurementPlan } from '../../services/procurementEngine'
import { localDay } from '../../utils/dates'
import type { BulkOrder, BulkOrderStatus, BulkRfq, Delivery, FarmerListing, RfqStatus, Vehicle } from '../../types'

/* ==========================================================================================
 * Bulk Buyer shared vocabulary
 *
 * One place for the money/kg formatters, the human status labels and the small presentational
 * pieces every Bulk screen uses. Business numbers still come from procurementEngine and
 * phase2Service; nothing here recomputes a price.
 * ======================================================================================= */

export const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
export const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`
export const perKg = (value: number) => `₹${value.toFixed(2)}/kg`
export const isoDay = localDay
/** Engine copy uses em dashes as separators; the UI reads them as commas. */
export const clean = (text: string) => text.replace(/\s*—\s*/g, ', ')

export const prettyDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : value
}

export const rfqLabel: Record<RfqStatus, string> = {
  open: 'Matching', matching: 'Matching', partially_matched: 'Partly matched', fully_matched: 'Match ready', converted: 'Ordered', closed: 'Closed',
}
export const orderLabel: Record<BulkOrderStatus, string> = {
  confirmed: 'Confirmed', farmers_preparing: 'Farms preparing', pickup_scheduled: 'Pickup scheduled', consolidating: 'At Sonipat hub', in_transit: 'On the road', delivered: 'Delivered', cancelled: 'Cancelled',
}
export const orderTone = (status: BulkOrderStatus) => status === 'delivered' ? 'green' : status === 'cancelled' ? 'red' : 'amber'
export const rfqTone = (status: RfqStatus) => status === 'closed' ? 'neutral' : status === 'converted' || status === 'fully_matched' ? 'green' : 'amber'

export const FULFILMENT_STEPS: BulkOrderStatus[] = ['confirmed', 'farmers_preparing', 'pickup_scheduled', 'consolidating', 'in_transit', 'delivered']

export const matchedKg = (rfq: BulkRfq) => rfq.matches.reduce((sum, item) => sum + item.quantityKg, 0)
export const matchedPct = (rfq: BulkRfq) => Math.min(100, Math.round((matchedKg(rfq) / Math.max(1, rfq.requiredQuantityKg)) * 100))
export const isSettled = (rfq: BulkRfq) => rfq.status === 'converted' || rfq.status === 'closed'
export const isActiveOrder = (order: BulkOrder) => order.status !== 'delivered' && order.status !== 'cancelled'

export const farmerFor = (farm: string) => farmers.find((item) => item.farmName === farm)?.name ?? 'Verified farmer'

/** "Tomorrow · 6–10 AM" style copy for an order, preferring the live delivery when one exists. */
export function orderEta(order: BulkOrder, delivery?: Delivery) {
  const raw = delivery?.eta ?? order.deliveryWindow
  return raw.replace(/^(\d{4})-(\d{2})-(\d{2})/, (match) => {
    const days = Math.round((new Date(`${match}T00:00:00`).getTime() - new Date(`${isoDay(0)}T00:00:00`).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days === -1) return 'Yesterday'
    return prettyDate(match)
  })
}

/** Days from today to an ISO date; negative when it has passed. */
export const daysFromToday = (value: string) => Math.round((new Date(`${value.slice(0, 10)}T00:00:00`).getTime() - new Date(`${isoDay(0)}T00:00:00`).getTime()) / 86400000)

/**
 * Landed-cost estimate for a browse-supply pool, from the same engine that prices a
 * requirement. Priced at the pool's full depth (capped at one vehicle load) so a card and the
 * Market Maker never disagree about what a kilo of this crop lands at.
 */
export function poolEstimate(pool: { product: string; totalQuantityKg: number; moqKg: number }, listings: FarmerListing[], vehicles: Vehicle[]) {
  const quantity = Math.max(pool.moqKg, Math.min(pool.totalQuantityKg, 2000))
  const plan = buildProcurementPlan({
    crop: pool.product, grade: 'Grade A', requiredQuantityKg: quantity, targetPrice: 999,
    deliveryLocation: 'Okhla Distribution Centre, New Delhi', requiredBy: isoDay(2), deliverySlot: 'Morning · 6–10 AM', packaging: '25 kg crates',
  }, listings, vehicles)
  return {
    quantityKg: plan.matchedKg,
    landedPerKg: plan.landedPerKg,
    benchmarkPerKg: plan.benchmarkPerKg,
    savingPerKg: Math.max(0, Math.round((plan.benchmarkPerKg - plan.landedPerKg) * 100) / 100),
    savingPct: Math.max(0, plan.savingPct),
    plan,
  }
}

/* ==========================================================================================
 * Presentational pieces
 * ======================================================================================= */

export function PageHead({ title, copy, aside, back }: { title: string; copy?: string; aside?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="b-head">
      <div>
        {back && <Link className="b-back" to={back.to}>← {back.label}</Link>}
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {aside && <div className="b-head-aside">{aside}</div>}
    </header>
  )
}

export function SectionHead({ title, to, linkLabel = 'View all', id }: { title: string; to?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="b-section-head">
      <h2 id={id}>{title}</h2>
      {to && <Link to={to}>{linkLabel}</Link>}
    </div>
  )
}

export function ErrorState({ title = 'Unable to load this page', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="page b-page">
      <div className="b-empty">
        <RefreshCw size={24} />
        <h2>{title}</h2>
        <button className="btn btn-primary" onClick={onRetry ?? (() => window.location.reload())}>Retry</button>
      </div>
    </div>
  )
}

export function Empty({ icon: Icon = Sprout, title, copy, action }: { icon?: typeof Sprout; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="b-empty">
      <Icon size={26} />
      <h2>{title}</h2>
      <p>{copy}</p>
      {action}
    </div>
  )
}

/** One labelled control with optional helper text and an inline error. */
export function Field({ label, htmlFor, hint, error, className = '', children }: { label: string; htmlFor?: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`field-block b-field ${className} ${error ? 'has-error' : ''}`.trim()}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  )
}

/**
 * The only shape a contextual AI recommendation takes outside the shared reveal lifecycle:
 * one sentence, computed from real state by the caller, flush inside the surface it belongs
 * to. Never a card inside a card.
 */
export function AiNote({ label = 'Kisan Intelligence', text, tone = 'default', to, linkLabel, className = '' }: {
  label?: string; text: ReactNode; tone?: 'default' | 'attention' | 'good'; to?: string; linkLabel?: string; className?: string
}) {
  return (
    <div className={`b-ai-note is-${tone} ${className}`.trim()}>
      <span className="b-ai-note-icon" aria-hidden="true"><Sparkles size={14} /></span>
      <div className="b-ai-note-copy">
        <small>{label}</small>
        <p>{text}</p>
        {to && linkLabel && <Link to={to}>{linkLabel}</Link>}
      </div>
    </div>
  )
}

/** Progressive disclosure block: heading always visible, body opened on demand. */
export function Disclosure({ title, summary, defaultOpen = false, children, id }: { title: string; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode; id?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`b-disclosure${open ? ' is-open' : ''}`} id={id}>
      <button type="button" className="b-disclosure-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="b-disclosure-title"><strong>{title}</strong>{summary && <small>{summary}</small>}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && <div className="b-disclosure-body">{children}</div>}
    </section>
  )
}

/** Progress bar with a label, used for match fill and fulfilment. */
export function FillBar({ pct, tone = 'green', label }: { pct: number; tone?: 'green' | 'amber' | 'harvest'; label?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={`b-fill is-${tone}`} role="img" aria-label={label ?? `${value}%`}>
      <i style={{ width: `${value}%` }} />
    </div>
  )
}

/** Commercial stack: produce + pooled logistics + platform = landed. Read the same way everywhere. */
export function CostStack({ produce, logistics, platform, landedTotal, landedPerKg, benchmarkPerKg, quantityKg, compact = false }: {
  produce: number; logistics: number; platform: number; landedTotal: number; landedPerKg: number; benchmarkPerKg?: number; quantityKg: number; compact?: boolean
}) {
  const savingPerKg = benchmarkPerKg ? Math.max(0, benchmarkPerKg - landedPerKg) : 0
  const savingTotal = Math.round(savingPerKg * quantityKg)
  return (
    <div className={`b-cost${compact ? ' is-compact' : ''}`}>
      <dl className="b-cost-rows">
        <div><dt>Produce at farm rates</dt><dd>{money(produce)}</dd></div>
        <div><dt><span className="b-cost-op">+</span> Pooled logistics</dt><dd>{money(logistics)}</dd></div>
        <div><dt><span className="b-cost-op">+</span> Platform</dt><dd>{money(platform)}</dd></div>
        <div className="is-total"><dt><span className="b-cost-op">=</span> Landed</dt><dd>{money(landedTotal)} <small>{perKg(landedPerKg)}</small></dd></div>
      </dl>
      {benchmarkPerKg ? (
        <div className={`b-saving${savingTotal > 0 ? '' : ' is-flat'}`}>
          <div>
            <small>Typical wholesale</small>
            <span>{perKg(benchmarkPerKg)}</span>
          </div>
          <div className="b-saving-main">
            <strong>{savingTotal > 0 ? `${perKg(savingPerKg).replace('/kg', '')} saved per kg` : 'No saving at this volume'}</strong>
            {savingTotal > 0 && <span>{money(savingTotal)} on this load</span>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Badge({ children, tone }: { children: ReactNode; tone: 'green' | 'amber' | 'neutral' | 'soil' | 'red' }) {
  return <StatusBadge tone={tone}>{children}</StatusBadge>
}

/** Farm contributions: who supplies what, at which rate, and the share of the load. */
export function FarmList({ contributions, total, children }: { contributions: Array<{ farmer: string; farm: string; quantityKg: number; ratePerKg: number; location?: string }>; total: number; children?: ReactNode }) {
  const matched = contributions.reduce((sum, item) => sum + item.quantityKg, 0)
  return (
    <div className="b-farms">
      <ol className="b-farm-list">
        {contributions.map((item, index) => (
          <li key={`${item.farm}-${index}`}>
            <span className={`b-farm-seq seq-${index % 3}`}>{index + 1}</span>
            <div className="b-farm-copy">
              <strong>{item.farm}</strong>
              <small>{item.farmer}{item.location ? ` · ${item.location}` : ''}</small>
              <FillBar pct={(item.quantityKg / Math.max(1, total)) * 100} tone="green" label={`${Math.round((item.quantityKg / Math.max(1, total)) * 100)}% of the load`} />
            </div>
            <div className="b-farm-figures">
              <strong>{kg(item.quantityKg)}</strong>
              <small>₹{item.ratePerKg}/kg</small>
            </div>
          </li>
        ))}
      </ol>
      <p className="b-meta">{contributions.length} farm{contributions.length === 1 ? '' : 's'} · {kg(matched)} allocated{matched && total ? ` · ${Math.min(100, Math.round((matched / total) * 100))}% of ${kg(total)}` : ''}</p>
      {children}
    </div>
  )
}
