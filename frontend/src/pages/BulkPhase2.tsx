import {
  ArrowLeft, ArrowRight, Boxes, Building2, CalendarClock, Check, ChevronRight, CircleDollarSign,
  ClipboardList, Edit3, MapPin, MapPinned, PackageCheck, Plus, RefreshCw, Repeat, Route,
  ShieldCheck, Sprout, Truck, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { MarketMakerAnalysis } from '../components/bulk/MarketMakerAnalysis'
import { prettyWhen } from '../components/maps/CorridorRouteMap'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { phase2Service } from '../services/phase2Service'
import { prototypeService } from '../services/prototypeService'
import { buildProcurementPlan } from '../services/procurementEngine'
import type { BulkOrderStatus, BulkRfq, ProcurementPlan, RfqFrequency, RfqPackaging, RfqStatus, SupplyContribution } from '../types'
import { farmers } from '../data/farmers'
import { localDay } from '../utils/dates'
import { ProfilePage } from './ProfilePage'
import { ContributionMatchIntelligence } from '../components/ai/BulkIntelligenceCards'

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const kg = (value: number) => `${Math.round(value).toLocaleString('en-IN')} kg`
const rfqLabel: Record<RfqStatus, string> = { open: 'Open', matching: 'Matching', partially_matched: 'Partially matched', fully_matched: 'Fully matched', converted: 'Converted to order', closed: 'Closed' }
const orderLabel: Record<BulkOrderStatus, string> = { confirmed: 'Confirmed', farmers_preparing: 'Farmers preparing', pickup_scheduled: 'Pickup scheduled', consolidating: 'Consolidating', in_transit: 'In transit', delivered: 'Delivered', cancelled: 'Cancelled' }
const orderTone = (status: BulkOrderStatus) => status === 'delivered' ? 'green' : status === 'cancelled' ? 'red' : 'amber'
const rfqTone = (status: RfqStatus) => status === 'closed' ? 'red' : status === 'converted' || status === 'fully_matched' ? 'green' : 'amber'

const isoDay = localDay
const prettyDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : value
}

/* ==========================================================================================
 * Requirement creation
 * ======================================================================================= */

/** Produce a buyer can actually source here, i.e. produce farms in the corridor list. */
const CROP_OPTIONS = ['Fresh Tomatoes', 'Red Onions', 'New Potatoes', 'Baby Spinach', 'Sweet Carrots', 'Green Capsicum', 'Crisp Cucumbers', 'Sharbati Wheat']
const PACKAGING_OPTIONS: RfqPackaging[] = ['25 kg crates', '10 kg crates', '50 kg jute sacks', 'Loose crates']
const FREQUENCY_OPTIONS: Array<{ value: RfqFrequency; label: string }> = [
  { value: 'weekly', label: 'Every week' },
  { value: 'twice-weekly', label: 'Twice a week' },
  { value: 'fortnightly', label: 'Every fortnight' },
  { value: 'monthly', label: 'Every month' },
]
const SLOT_OPTIONS = ['Morning · 6–10 AM', 'Midday · 11 AM–2 PM', 'Afternoon · 2–6 PM', 'Night dock · 9 PM–12 AM']
const QUANTITY_PRESETS = [500, 1000, 1500, 2000]

interface RequirementForm {
  crop: string
  grade: 'Grade A+' | 'Grade A'
  requiredQuantityKg: number
  targetPrice: number
  packaging: RfqPackaging
  recurring: boolean
  frequency: RfqFrequency
  deliveryLocation: string
  requiredBy: string
  deliverySlot: string
  notes: string
}

/**
 * A realistic open requirement, pre-filled.
 *
 * A procurement desk does not start from a blank form — it repeats last week's order with
 * this week's numbers. Pre-filling matches that, and means a demo does not open with ten
 * empty fields. Everything remains editable, and nothing here is hidden from the buyer.
 */
const defaultForm: RequirementForm = {
  crop: 'Fresh Tomatoes',
  grade: 'Grade A+',
  requiredQuantityKg: 1200,
  targetPrice: 35,
  packaging: '25 kg crates',
  recurring: false,
  frequency: 'weekly',
  deliveryLocation: 'Okhla Distribution Centre, New Delhi',
  requiredBy: isoDay(2),
  deliverySlot: 'Morning · 6–10 AM',
  notes: 'Firm, retail-grade fruit. Reject anything over-ripe at the farm gate.',
}

const STEPS = ['Requirement', 'Delivery', 'Market Maker'] as const

export function BulkRequestsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { state: navState } = useLocation() as { state?: { crop?: string; quantity?: number } }
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof RequirementForm, string>>>({})
  const [analysisKey, setAnalysisKey] = useState(0)
  const [analysisReady, setAnalysisReady] = useState(false)
  const [form, setForm] = useState<RequirementForm>({
    ...defaultForm,
    crop: navState?.crop ?? defaultForm.crop,
    requiredQuantityKg: navState?.quantity ?? defaultForm.requiredQuantityKg,
  })

  const { data, loading, refresh } = useAsyncData(async () => {
    const [rfqs, listings, profile, state] = await Promise.all([
      phase2Service.rfqs(), phase2Service.listings(), phase2Service.bulkProfile(), prototypeService.getState(),
    ])
    return { rfqs, listings, profile, vehicles: state.vehicles }
  })

  // The analysis is recomputed from the same engine the service uses, so the preview a buyer
  // approves and the order they get are never two different calculations.
  const plan: ProcurementPlan | null = useMemo(() => {
    if (!data || step !== 2) return null
    return buildProcurementPlan(form, data.listings, data.vehicles)
  }, [data, form, step])

  const set = <K extends keyof RequirementForm>(key: K, value: RequirementForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const validate = (target: number) => {
    const next: Partial<Record<keyof RequirementForm, string>> = {}
    if (target > 0) {
      if (!form.crop) next.crop = 'Choose the produce you need.'
      if (!Number.isFinite(form.requiredQuantityKg) || form.requiredQuantityKg < 100) next.requiredQuantityKg = 'Minimum requirement is 100 kg.'
      if (form.requiredQuantityKg > 20000) next.requiredQuantityKg = 'Requirements above 20,000 kg are split into separate orders.'
      if (!Number.isFinite(form.targetPrice) || form.targetPrice < 1) next.targetPrice = 'Enter a target rate in ₹ per kg.'
    }
    if (target > 1) {
      if (!form.deliveryLocation) next.deliveryLocation = 'Choose a delivery location.'
      if (!form.requiredBy) next.requiredBy = 'Choose the date the load must arrive.'
      else if (form.requiredBy < isoDay(1)) next.requiredBy = 'Collection needs at least one day — choose tomorrow or later.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goTo = (target: number) => {
    if (target > step && !validate(target)) return
    if (target === 2) { setAnalysisReady(false); setAnalysisKey((value) => value + 1) }
    setStep(Math.max(0, Math.min(STEPS.length - 1, target)))
  }

  const submit = async () => {
    if (!validate(2)) return
    setSubmitting(true)
    try {
      const rfq = await phase2Service.createRfq({
        crop: form.crop, grade: form.grade, requiredQuantityKg: form.requiredQuantityKg, targetPrice: form.targetPrice,
        deliveryLocation: form.deliveryLocation, deliveryWindow: `${form.requiredBy} · ${form.deliverySlot.replace(/^[^·]+· /, '')}`,
        requiredBy: form.requiredBy, deliverySlot: form.deliverySlot, packaging: form.packaging,
        recurring: form.recurring, frequency: form.recurring ? form.frequency : 'one-time', notes: form.notes,
      })
      showToast(`${rfq.id} created · ${kg(rfq.plan?.matchedKg ?? 0)} matched`)
      navigate(`/bulk/requests/${rfq.id}`)
    } catch {
      showToast('This requirement could not be submitted. Please retry.')
      setSubmitting(false)
    }
  }

  if (loading && !data) return <DashboardSkeleton />

  if (creating) {
    return (
      <div className="page bulk-page">
        <button type="button" className="back-link" onClick={() => { setCreating(false); setStep(0); refresh() }}><ArrowLeft size={16} /> Requirements</button>
        <div className="page-title-row">
          <div>
            <span className="eyebrow">Reverse marketplace</span>
            <h1>Post a requirement</h1>
            <p>Tell KisanLink what you need. The Market Maker assembles it from the farms that can actually deliver it.</p>
          </div>
        </div>

        <ol className="req-stepper" aria-label="Requirement progress">
          {STEPS.map((label, index) => (
            <li key={label} className={index < step ? 'is-done' : index === step ? 'is-active' : ''}>
              <button type="button" onClick={() => goTo(index)} disabled={index > step}>
                <span>{index < step ? <Check size={13} /> : index + 1}</span>
                <small>{label}</small>
              </button>
            </li>
          ))}
        </ol>

        <section className="req-panel">
          {step === 0 && (
            <>
              <div className="req-section-head"><h2>What do you need?</h2><p>Grade and packaging are matched against what farms have actually listed.</p></div>
              <div className="req-grid">
                <Field label="Produce" htmlFor="req-crop" error={errors.crop} className="span-2">
                  <select id="req-crop" value={form.crop} onChange={(event) => set('crop', event.target.value)}>
                    {CROP_OPTIONS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                  </select>
                </Field>

                <Field label="Quality grade" hint="Farms below this grade are excluded from the match.">
                  <div className="segmented" role="radiogroup" aria-label="Quality grade">
                    {(['Grade A+', 'Grade A'] as const).map((grade) => (
                      <button type="button" key={grade} role="radio" aria-checked={form.grade === grade} className={form.grade === grade ? 'is-on' : ''} onClick={() => set('grade', grade)}>{grade}</button>
                    ))}
                  </div>
                </Field>

                <Field label="Packaging" htmlFor="req-pack">
                  <select id="req-pack" value={form.packaging} onChange={(event) => set('packaging', event.target.value as RfqPackaging)}>
                    {PACKAGING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>

                <Field label="Quantity required" htmlFor="req-qty" error={errors.requiredQuantityKg}>
                  <div className="unit-input">
                    <input id="req-qty" type="number" inputMode="numeric" min={100} max={20000} step={50} value={form.requiredQuantityKg} onChange={(event) => set('requiredQuantityKg', Number(event.target.value))} />
                    <span>kg</span>
                  </div>
                  <div className="chip-row">
                    {QUANTITY_PRESETS.map((preset) => (
                      <button type="button" key={preset} className={form.requiredQuantityKg === preset ? 'is-on' : ''} onClick={() => set('requiredQuantityKg', preset)}>{preset.toLocaleString('en-IN')} kg</button>
                    ))}
                  </div>
                </Field>

                <Field label="Target rate" htmlFor="req-price" error={errors.targetPrice} hint="Landed cost per kg you want to beat.">
                  <div className="unit-input has-prefix">
                    <span className="unit-prefix">₹</span>
                    <input id="req-price" type="number" inputMode="decimal" min={1} max={999} step={0.5} value={form.targetPrice} onChange={(event) => set('targetPrice', Number(event.target.value))} />
                    <span>/kg</span>
                  </div>
                </Field>

                <div className="req-toggle-row span-2">
                  <label className="switch-row" htmlFor="req-recurring">
                    <span>
                      <strong><Repeat size={14} /> Recurring requirement</strong>
                      <small>Repeat this order automatically instead of posting it again.</small>
                    </span>
                    <input id="req-recurring" type="checkbox" role="switch" checked={form.recurring} onChange={(event) => set('recurring', event.target.checked)} />
                    <i aria-hidden="true" />
                  </label>
                  {form.recurring && (
                    <Field label="Repeats" htmlFor="req-freq">
                      <select id="req-freq" value={form.frequency} onChange={(event) => set('frequency', event.target.value as RfqFrequency)}>
                        {FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="req-section-head"><h2>Where and when?</h2><p>The collection run is planned backwards from your receiving window.</p></div>
              <div className="req-grid">
                <Field label="Delivery location" htmlFor="req-loc" error={errors.deliveryLocation} className="span-2">
                  <select id="req-loc" value={form.deliveryLocation} onChange={(event) => set('deliveryLocation', event.target.value)}>
                    {(data?.profile.deliveryAddresses ?? [defaultForm.deliveryLocation]).map((address) => <option key={address} value={address}>{address}</option>)}
                  </select>
                </Field>

                <Field label="Required by" htmlFor="req-date" error={errors.requiredBy} hint="Farms are collected the day before.">
                  <input id="req-date" type="date" min={isoDay(1)} max={isoDay(30)} value={form.requiredBy} onChange={(event) => set('requiredBy', event.target.value)} />
                </Field>

                <Field label="Receiving window" htmlFor="req-slot">
                  <select id="req-slot" value={form.deliverySlot} onChange={(event) => set('deliverySlot', event.target.value)}>
                    {SLOT_OPTIONS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </Field>

                <Field label="Notes for the farms" htmlFor="req-notes" className="span-2" hint="Optional. Shown to every matched farmer.">
                  <textarea id="req-notes" rows={3} maxLength={240} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Handling, sizing or rejection criteria" />
                </Field>
              </div>

              <div className="req-recap">
                <span><small>Requirement</small><strong>{kg(form.requiredQuantityKg)} {form.crop}</strong></span>
                <span><small>Grade</small><strong>{form.grade}</strong></span>
                <span><small>Packaging</small><strong>{form.packaging}</strong></span>
                <span><small>Target</small><strong>₹{form.targetPrice}/kg</strong></span>
                <span><small>Cadence</small><strong>{form.recurring ? FREQUENCY_OPTIONS.find((option) => option.value === form.frequency)?.label : 'One-time'}</strong></span>
              </div>
            </>
          )}

          {step === 2 && (
            <MarketMakerAnalysis
              plan={plan}
              runKey={analysisKey}
              crop={form.crop}
              grade={form.grade}
              requiredQuantityKg={form.requiredQuantityKg}
              targetPrice={form.targetPrice}
              deliveryLocation={form.deliveryLocation}
              onDone={() => setAnalysisReady(true)}
            />
          )}

          <div className="req-actions">
            <button type="button" className="btn btn-ghost" disabled={step === 0 || submitting} onClick={() => goTo(step - 1)}>Back</button>
            {step < 2
              ? <button type="button" className="btn btn-primary btn-large" onClick={() => goTo(step + 1)}>{step === 1 ? 'Run Market Maker' : 'Continue'} <ArrowRight size={16} /></button>
              : <button type="button" className="btn btn-primary btn-large" disabled={submitting || !analysisReady || !plan?.matchedKg} onClick={submit}>
                {submitting ? 'Creating requirement…' : 'Post this requirement'} <ArrowRight size={16} />
              </button>}
          </div>
        </section>
      </div>
    )
  }

  const rfqs = data?.rfqs ?? []
  const openCount = rfqs.filter((rfq) => !['converted', 'closed'].includes(rfq.status)).length

  return (
    <div className="page bulk-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Reverse marketplace</span>
          <h1>Requirements</h1>
          <p>{openCount ? `${openCount} open requirement${openCount === 1 ? '' : 's'} · post demand and let KisanLink assemble the supply.` : 'Post demand and let KisanLink assemble the supply.'}</p>
        </div>
        <button className="btn btn-primary btn-large" onClick={() => { setCreating(true); setStep(0); setForm({ ...defaultForm }) }}><Plus size={18} /> Post requirement</button>
      </div>

      {rfqs.length ? (
        <div className="req-list">
          {rfqs.map((rfq) => {
            const matched = rfq.matches.reduce((sum, item) => sum + item.quantityKg, 0)
            const percent = Math.min(100, Math.round((matched / Math.max(1, rfq.requiredQuantityKg)) * 100))
            return (
              <Link className="req-card" to={`/bulk/requests/${rfq.id}`} key={rfq.id}>
                <div className="req-card-main">
                  <span className="eyebrow">{rfq.id}{rfq.recurring ? ' · recurring' : ''}</span>
                  <h2>{kg(rfq.requiredQuantityKg)} {rfq.crop}</h2>
                  <p>{rfq.grade} · {rfq.packaging}</p>
                  <small><MapPin size={12} /> {rfq.deliveryLocation}</small>
                  <small><CalendarClock size={12} /> Required by {prettyDate(rfq.requiredBy)} · target ₹{rfq.targetPrice}/kg</small>
                </div>
                <div className="req-card-side">
                  <StatusBadge tone={rfqTone(rfq.status)}>{rfqLabel[rfq.status]}</StatusBadge>
                  <div className="req-card-fill">
                    <div className="req-fill-bar"><i style={{ width: `${percent}%` }} /></div>
                    <strong>{percent}% matched</strong>
                    <small>{rfq.matches.length} farm{rfq.matches.length === 1 ? '' : 's'}</small>
                  </div>
                  <ChevronRight size={18} />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No requirements yet" copy="Post what you need and the Market Maker will assemble it from the farms in your corridor." actionLabel="Post requirement" actionTo="/bulk/requests" />
      )}
    </div>
  )
}

/* ==========================================================================================
 * Requirement detail
 * ======================================================================================= */

export function BulkRequestDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [converting, setConverting] = useState(false)
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useAsyncData(async () => {
    const [rfq, listings, state] = await Promise.all([phase2Service.rfq(id), phase2Service.listings(), prototypeService.getState()])
    return rfq ? { rfq, plan: rfq.plan ?? buildProcurementPlan(rfq, listings, state.vehicles) } : null
  }, [id, version])

  if (loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Requirement not found" />
  const { rfq, plan } = data
  const matched = rfq.matches.reduce((sum, item) => sum + item.quantityKg, 0)
  const percent = Math.min(100, Math.round((matched / Math.max(1, rfq.requiredQuantityKg)) * 100))
  const settled = ['converted', 'closed'].includes(rfq.status)

  const convert = async () => {
    setConverting(true)
    try {
      const order = await phase2Service.convertRfq(rfq.id)
      showToast(`${order.id} created · pickups assigned to logistics`)
      navigate(`/bulk/orders/${order.id}`)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'This requirement could not be converted.')
      setConverting(false)
    }
  }

  return (
    <div className="page bulk-page">
      <Link className="back-link" to="/bulk/requests"><ArrowLeft size={16} /> Requirements</Link>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{rfq.id}{rfq.recurring ? ' · recurring requirement' : ''}</span>
          <h1>{kg(rfq.requiredQuantityKg)} {rfq.crop}</h1>
          <p>{rfq.grade} · {rfq.packaging} · required by {prettyDate(rfq.requiredBy)}, {rfq.deliverySlot}</p>
        </div>
        <StatusBadge tone={rfqTone(rfq.status)}>{rfqLabel[rfq.status]}</StatusBadge>
      </div>

      <div className="bulk-detail-grid">
        <section className="bulk-detail-main">
          <MarketMakerAnalysis
            plan={plan}
            runKey={`${rfq.id}-${version}`}
            crop={rfq.crop}
            grade={rfq.grade}
            requiredQuantityKg={rfq.requiredQuantityKg}
            targetPrice={rfq.targetPrice}
            deliveryLocation={rfq.deliveryLocation}
            instant
          />
          <ContributionVisual contributions={rfq.matches} total={rfq.requiredQuantityKg} deliveryWindow={rfq.deliveryWindow} grade={rfq.grade} />
        </section>

        <aside className="summary-card sticky">
          <h2>Requirement</h2>
          <div className="price-rows">
            <span>Matched <b>{kg(matched)} · {percent}%</b></span>
            <span>Target rate <b>₹{rfq.targetPrice}/kg</b></span>
            <span>Landed estimate <b>₹{plan.landedPerKg.toFixed(2)}/kg</b></span>
            <span>Delivery <b>{prettyDate(rfq.requiredBy)}</b></span>
            <strong>Order value <b>{money(plan.landedTotal)}</b></strong>
          </div>
          {rfq.notes && <p className="req-note"><Edit3 size={13} /> {rfq.notes}</p>}
          {!settled && (
            <>
              <button className="btn btn-primary btn-full btn-large" disabled={converting || !plan.matchedKg} onClick={convert}>
                {converting ? 'Creating order…' : 'Accept match & create order'}
              </button>
              <p className="safe-note"><ShieldCheck size={16} /> Creates the procurement order, farmer allocations and the pooled pickup route.</p>
              <button className="btn btn-ghost btn-full" disabled={converting} onClick={async () => { await phase2Service.closeRfq(rfq.id); setVersion((value) => value + 1) }}>Close requirement</button>
            </>
          )}
          {rfq.status === 'converted' && <Link className="btn btn-primary btn-full" to="/bulk/orders">View procurement order <ArrowRight size={15} /></Link>}
        </aside>
      </div>
    </div>
  )
}

/* ==========================================================================================
 * Procurement orders
 * ======================================================================================= */

export function BulkOrdersPage() {
  const [filter, setFilter] = useState('active')
  const { data, loading, error } = useAsyncData(() => phase2Service.bulkOrders())
  const orders = data?.filter((item) => filter === 'active' ? !['delivered', 'cancelled'].includes(item.status) : item.status === filter) ?? []
  if (loading) return <DashboardSkeleton />
  return (
    <div className="page bulk-page">
      <PageHead eyebrow="Direct procurement" title="Procurement orders" copy="Pooled farmer allocations, one consolidated delivery, transparent landed cost." />
      <div className="filter-tabs">{['active', 'delivered', 'cancelled'].map((value) => <button className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{value}</button>)}</div>
      {error ? <ErrorState /> : orders.length ? (
        <div className="req-list">
          {orders.map((order) => {
            const saving = order.traditionalEstimate - order.total
            return (
              <Link className="req-card" to={`/bulk/orders/${order.id}`} key={order.id}>
                <div className="req-card-main">
                  <span className="eyebrow">{order.id} · from {order.rfqId}</span>
                  <h2>{kg(order.orderedQuantityKg)} {order.crop}</h2>
                  <p>{order.contributions.length} farm pool · {order.grade}</p>
                  <small><MapPin size={12} /> {order.deliveryLocation}</small>
                  <small><CalendarClock size={12} /> {prettyWhen(order.deliveryWindow)}</small>
                </div>
                <div className="req-card-side">
                  <StatusBadge tone={orderTone(order.status)}>{orderLabel[order.status]}</StatusBadge>
                  <div className="req-card-value">
                    <strong>{money(order.total)}</strong>
                    {saving > 0 && <small className="is-saving">{money(saving)} saved</small>}
                  </div>
                  <ChevronRight size={18} />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={PackageCheck} title={`No ${filter} orders`} copy="Accept a matched requirement to create a procurement order." actionLabel="View requirements" actionTo="/bulk/requests" />
      )}
    </div>
  )
}

const FULFILMENT_STEPS: BulkOrderStatus[] = ['confirmed', 'farmers_preparing', 'pickup_scheduled', 'consolidating', 'in_transit', 'delivered']

export function BulkOrderDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error } = useAsyncData(async () => {
    const [order, state] = await Promise.all([phase2Service.bulkOrder(id), prototypeService.getState()])
    if (!order) return null
    const route = state.logisticsRoutes.find((item) => item.deliveries.some((delivery) => state.deliveries.find((entry) => entry.id === delivery && entry.orderRefs.includes(order.id))))
      ?? state.logisticsRoutes.find((item) => item.pooled)
    const delivery = state.deliveries.find((entry) => entry.orderRefs.includes(order.id))
    const pickups = state.logisticsPickups.filter((pickup) => route?.pickups.includes(pickup.id))
    return { order, route, delivery, pickups }
  }, [id], { live: true })

  if (loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Procurement order not found" />
  const { order, route, delivery, pickups } = data
  const saving = order.traditionalEstimate - order.total
  const savingPct = order.traditionalEstimate ? Math.round((saving / order.traditionalEstimate) * 100) : 0
  const current = Math.max(0, FULFILMENT_STEPS.indexOf(order.status))
  const collected = pickups.filter((pickup) => ['loaded', 'completed'].includes(pickup.status)).reduce((sum, pickup) => sum + pickup.quantityKg, 0)

  return (
    <div className="page bulk-page">
      <Link className="back-link" to="/bulk/orders"><ArrowLeft size={16} /> Procurement orders</Link>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{order.id} · from {order.rfqId}</span>
          <h1>{kg(order.orderedQuantityKg)} {order.crop}</h1>
          <p>{order.grade} · {prettyWhen(order.deliveryWindow)}</p>
        </div>
        <StatusBadge tone={orderTone(order.status)}>{orderLabel[order.status]}</StatusBadge>
      </div>

      <div className="bulk-detail-grid">
        <section className="bulk-detail-main">
          {/* Fulfilment first: on an active order this is the only thing that changes. */}
          <article className="feature-card">
            <div className="card-heading">
              <div><span className="eyebrow">Fulfilment</span><h2>{collected ? `${kg(collected)} collected of ${kg(order.suppliedQuantityKg)}` : `${kg(order.suppliedQuantityKg)} allocated across ${order.contributions.length} farms`}</h2></div>
              {route && <StatusBadge tone="green">{route.id}</StatusBadge>}
            </div>
            <ol className="fulfil-rail">
              {FULFILMENT_STEPS.map((status, index) => (
                <li key={status} className={index < current ? 'is-done' : index === current ? 'is-active' : ''}>
                  <span>{index < current ? <Check size={13} /> : index + 1}</span>
                  <strong>{orderLabel[status]}</strong>
                </li>
              ))}
            </ol>
            {pickups.length > 0 && (
              <div className="fulfil-stops">
                {pickups.map((pickup, index) => (
                  <div key={pickup.id} className={`fulfil-stop is-${pickup.status}`}>
                    <span>{index + 1}</span>
                    <div><strong>{pickup.farm}</strong><small>{pickup.farmLocation} · {kg(pickup.quantityKg)}</small></div>
                    <StatusBadge tone={pickup.status === 'completed' || pickup.status === 'loaded' ? 'green' : pickup.status === 'issue' ? 'red' : 'amber'}>{pickup.status.replaceAll('_', ' ')}</StatusBadge>
                  </div>
                ))}
                <div className="fulfil-stop is-drop">
                  <span><Building2 size={13} /></span>
                  <div><strong>{order.deliveryLocation}</strong><small>{delivery ? `ETA ${prettyWhen(delivery.eta)}` : prettyWhen(order.deliveryWindow)}</small></div>
                  <StatusBadge tone="neutral">{delivery ? delivery.status.replaceAll('_', ' ') : 'scheduled'}</StatusBadge>
                </div>
              </div>
            )}
          </article>

          <article className="feature-card">
            <div className="card-heading"><div><span className="eyebrow">Farmer pool allocations</span><h2>Where this order comes from</h2></div></div>
            <ContributionVisual contributions={order.contributions} total={order.orderedQuantityKg} deliveryWindow={order.deliveryWindow} grade={order.grade} />
          </article>

          <article className="savings-card">
            <div><span className="eyebrow">Against your current chain</span><h2>{money(saving)} saved · {savingPct}%</h2></div>
            <div>
              <span>Mandi → wholesaler → your dock <b>{money(order.traditionalEstimate)}</b></span>
              <span>KisanLink pooled direct <b>{money(order.total)}</b></span>
            </div>
            <small>Benchmark uses the mandi rate quoted by the same farms, plus the commission and wholesale margin between it and your dock.</small>
          </article>
        </section>

        <aside className="summary-card sticky">
          <h2>Landed cost</h2>
          <div className="price-rows">
            <span>Produce at farm rates <b>{money(order.produceValue)}</b></span>
            <span>Pooled collection &amp; delivery <b>{money(order.logisticsFee)}</b></span>
            <span>Platform <b>{money(order.platformFee)}</b></span>
            <strong>Order value <b>{money(order.total)}</b></strong>
          </div>
          <div className="address-box">
            <Building2 size={19} />
            <div><strong>Delivery location</strong><p>{order.deliveryLocation}</p><small>{prettyWhen(order.deliveryWindow)}</small></div>
          </div>
          {route && (
            <div className="address-box">
              <Route size={19} />
              <div><strong>{route.id}</strong><p>{route.stops.length} stops · {route.distanceKm} km</p><small>{route.vehicleId} · {Math.round((route.loadKg / Math.max(1, route.capacityKg)) * 100)}% loaded</small></div>
            </div>
          )}
          <p className="safe-note"><ShieldCheck size={16} /> {order.invoiceStatus} · no real payment</p>
          <a className="btn btn-secondary btn-full" href="tel:18001234567">Procurement support</a>
        </aside>
      </div>
    </div>
  )
}

/* ==========================================================================================
 * Supply pool detail
 * ======================================================================================= */

export function BulkSupplyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data, loading, error } = useAsyncData(async () => (await phase2Service.supplyPools()).find((item) => item.id === id), [id])
  const [quantity, setQuantity] = useState(500)
  useEffect(() => { if (data) setQuantity(Math.min(Math.max(data.moqKg, 500), data.totalQuantityKg)) }, [data])

  if (loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Supply pool not found" />
  const valid = quantity >= data.moqKg && quantity <= data.totalQuantityKg
  const landed = quantity * data.startingPrice + Math.round(quantity * 2.1)
  // The pool's real constituent listings, not an illustrative split: a Red Onion pool
  // should not claim it comes from the tomato farms.
  const contributions: SupplyContribution[] = data.matchingListings.map((listing) => ({
    farmer: farmerFor(listing.farm), farm: listing.farm, listingId: listing.id,
    quantityKg: listing.remainingKg, ratePerKg: listing.pricePerKg,
  }))

  return (
    <div className="page bulk-page">
      <Link className="back-link" to="/bulk/supply"><ArrowLeft size={16} /> All supply</Link>
      <div className="supply-hero">
        <ProductImage imageSrc={data.imageSrc} alt={data.product} visual={data.visual} size="hero" />
        <section>
          <span className="eyebrow">Verified pooled supply</span>
          <h1>{data.product} · {data.grade}</h1>
          <p><MapPin size={17} /> {data.corridor} corridor</p>
          <div className="supply-stats">
            <span><strong>{kg(data.totalQuantityKg)}</strong><small>Pooled quantity</small></span>
            <span><strong>{data.farmerCount}</strong><small>Verified farmers</small></span>
            <span><strong>{data.startingPrice === data.priceMax ? `${money(data.startingPrice)}/kg` : `${money(data.startingPrice)}–${money(data.priceMax)}/kg`}</strong><small>Farm-gate range</small></span>
          </div>
          <div className="readiness"><Truck size={20} /><div><strong>{data.readiness}</strong><small>Expected dispatch {prettyWhen(data.dispatch)}</small></div></div>
        </section>
      </div>

      <div className="bulk-detail-grid">
        <section className="bulk-detail-main">
          <article className="feature-card">
            <div className="card-heading"><div><span className="eyebrow">Contribution preview</span><h2>How this pool is made up</h2></div><StatusBadge tone="green">Dispatch ready</StatusBadge></div>
            <ContributionVisual contributions={contributions} total={data.totalQuantityKg} grade={data.grade} />
            <div className="landed-card">
              <span><small>Produce</small><strong>{money(quantity * data.startingPrice)}</strong></span>
              <Plus size={17} />
              <span><small>Pooling &amp; delivery</small><strong>{money(Math.round(quantity * 2.1))}</strong></span>
              <b>{money(landed)} landed</b>
            </div>
          </article>
        </section>

        <aside className="summary-card sticky">
          <h2>Request this pool</h2>
          <Field label="Quantity" hint={`Minimum order ${kg(data.moqKg)} · ${kg(data.totalQuantityKg)} pooled`} error={valid ? undefined : `Enter between ${kg(data.moqKg)} and ${kg(data.totalQuantityKg)}.`}>
            <div className="unit-input">
              <input type="number" inputMode="numeric" min={data.moqKg} max={data.totalQuantityKg} step={50} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              <span>kg</span>
            </div>
          </Field>
          <button className="btn btn-primary btn-full btn-large" disabled={!valid} onClick={() => navigate('/bulk/requests', { state: { crop: data.product, quantity } })}>Create requirement from this pool</button>
          <button className="btn btn-secondary btn-full" disabled={!valid} onClick={() => showToast(`${kg(quantity)} held in this demo while you create a requirement`)}>Reserve supply</button>
          <p className="safe-note"><ShieldCheck size={16} /> Prototype reservation only. No payment or contract.</p>
        </aside>
      </div>
    </div>
  )
}

export function BulkProfilePage() { return <ProfilePage /> }

/* ==========================================================================================
 * Shared pieces
 * ======================================================================================= */

function ContributionVisual({ contributions, total, deliveryWindow, grade }: { contributions: BulkRfq['matches']; total: number; deliveryWindow?: string; grade?: string }) {
  const matched = contributions.reduce((sum, item) => sum + item.quantityKg, 0)
  const average = matched ? contributions.reduce((sum, item) => sum + item.quantityKg * item.ratePerKg, 0) / matched : 0
  return (
    <>
      <div className="contribution-list">
        {contributions.map((item, index) => (
          <div key={`${item.farm}-${index}`}>
            <span className="farmer-dot">{String.fromCharCode(65 + index)}</span>
            <div>
              <strong>{item.farm}</strong>
              <p>{item.farmer} · {kg(item.quantityKg)} at {money(item.ratePerKg)}/kg</p>
              <i style={{ width: `${Math.min(100, (item.quantityKg / Math.max(1, total)) * 100)}%` }} />
            </div>
            <b>{Math.round((item.quantityKg / Math.max(1, total)) * 100)}%</b>
          </div>
        ))}
      </div>
      <div className="metric-strip">
        <span><Users size={18} /><small>Farms</small><strong>{contributions.length}</strong></span>
        <span><Boxes size={18} /><small>Matched</small><strong>{kg(matched)}</strong></span>
        <span><CircleDollarSign size={18} /><small>Average rate</small><strong>{money(average)}/kg</strong></span>
        <span><MapPinned size={18} /><small>Collection</small><strong>1 pooled run</strong></span>
      </div>
      <ContributionMatchIntelligence contributions={contributions} total={total} deliveryWindow={deliveryWindow} grade={grade} />
    </>
  )
}

/** One labelled control with optional helper text and an inline error. */
function Field({ label, htmlFor, hint, error, className = '', children }: { label: string; htmlFor?: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`field-block ${className} ${error ? 'has-error' : ''}`.trim()}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <small className="field-error"><Sprout size={11} aria-hidden="true" /> {error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  )
}

const farmerFor = (farm: string) => farmers.find((item) => item.farmName === farm)?.name ?? 'Verified farmer'

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></div>
}

function ErrorState({ title = 'Unable to load this page' }: { title?: string }) {
  return <div className="error-panel"><RefreshCw size={25} /><h2>{title}</h2><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div>
}
