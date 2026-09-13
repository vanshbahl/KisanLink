import { ArrowRight, CalendarClock, Check, ChevronRight, ClipboardList, Plus, Repeat, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { TargetPriceAdvisor } from '../../components/ai/BulkIntelligenceCards'
import { MarketMakerAnalysis } from '../../components/bulk/MarketMakerAnalysis'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import { buildProcurementPlan } from '../../services/procurementEngine'
import type { BulkRfq, ProcurementPlan, RfqFrequency, RfqPackaging } from '../../types'
import { Badge, Empty, ErrorState, Field, FillBar, PageHead, isSettled, isoDay, kg, matchedKg, matchedPct, money, perKg, prettyDate, rfqLabel, rfqTone } from './shared'

/* ==========================================================================================
 * Procure: the requirement wizard and the list of requirements it produces
 * ======================================================================================= */

const CROP_OPTIONS = ['Fresh Tomatoes', 'Red Onions', 'New Potatoes', 'Baby Spinach', 'Sweet Carrots', 'Green Capsicum', 'Crisp Cucumbers', 'Sharbati Wheat']
const PACKAGING_OPTIONS: RfqPackaging[] = ['25 kg crates', '10 kg crates', '50 kg jute sacks', 'Loose crates']
const FREQUENCY_OPTIONS: Array<{ value: RfqFrequency; label: string }> = [
  { value: 'weekly', label: 'Every week' },
  { value: 'twice-weekly', label: 'Twice a week' },
  { value: 'fortnightly', label: 'Every fortnight' },
  { value: 'monthly', label: 'Every month' },
]
const SLOT_OPTIONS = [
  { value: 'Morning · 6–10 AM', label: 'Morning', hint: '6–10 AM' },
  { value: 'Midday · 11 AM–2 PM', label: 'Midday', hint: '11 AM–2 PM' },
  { value: 'Afternoon · 2–6 PM', label: 'Afternoon', hint: '2–6 PM' },
  { value: 'Night dock · 9 PM–12 AM', label: 'Night dock', hint: '9 PM–12 AM' },
]
const QUANTITY_PRESETS = [500, 1000, 1500, 2000]
const STEPS = ['Requirement', 'Delivery', 'Market Maker'] as const

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

/** A realistic requirement, pre-filled: a desk repeats last week's order with this week's numbers. */
const defaultForm: RequirementForm = {
  crop: 'Fresh Tomatoes', grade: 'Grade A+', requiredQuantityKg: 1200, targetPrice: 35, packaging: '25 kg crates',
  recurring: false, frequency: 'weekly', deliveryLocation: 'Okhla Distribution Centre, New Delhi', requiredBy: isoDay(2),
  deliverySlot: 'Morning · 6–10 AM', notes: 'Firm, retail-grade fruit. Reject anything over-ripe at the farm gate.',
}

type Tab = 'matching' | 'ready' | 'completed'
const tabOf = (rfq: BulkRfq): Tab => rfq.status === 'fully_matched' ? 'ready' : isSettled(rfq) ? 'completed' : 'matching'

export function BulkProcurePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const { state: navState } = useLocation() as { state?: { crop?: string; quantity?: number } }
  const [creating, setCreating] = useState(Boolean(navState?.crop) || params.get('new') === '1')
  const [tab, setTab] = useState<Tab>('matching')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState<'save' | 'order' | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof RequirementForm, string>>>({})
  const [analysisKey, setAnalysisKey] = useState(0)
  const [analysisReady, setAnalysisReady] = useState(false)
  const [form, setForm] = useState<RequirementForm>({ ...defaultForm, crop: navState?.crop ?? defaultForm.crop, requiredQuantityKg: navState?.quantity ?? defaultForm.requiredQuantityKg })

  useEffect(() => { if (params.get('new') === '1') { setCreating(true); setParams({}, { replace: true }) } }, [params, setParams])

  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [rfqs, listings, profile, state] = await Promise.all([phase2Service.rfqs(), phase2Service.listings(), phase2Service.bulkProfile(), prototypeService.getState()])
    // Seeded requirements carry no stored analysis; price them the same way the detail page does.
    const priced = rfqs.map((rfq) => rfq.plan || isSettled(rfq) ? rfq : { ...rfq, plan: buildProcurementPlan(rfq, listings, state.vehicles) })
    return { rfqs: priced, listings, profile, vehicles: state.vehicles }
  }, [], { live: true })

  // Same engine as the service, so the preview a buyer approves and the order they get never differ.
  const plan: ProcurementPlan | null = useMemo(() => data && step === 2 ? buildProcurementPlan(form, data.listings, data.vehicles) : null, [data, form, step])

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
      else if (form.requiredBy < isoDay(1)) next.requiredBy = 'Collection needs at least one day. Choose tomorrow or later.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goTo = (target: number) => {
    if (target > step && !validate(target)) return
    if (target === 2) { setAnalysisReady(false); setAnalysisKey((value) => value + 1) }
    setStep(Math.max(0, Math.min(STEPS.length - 1, target)))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const createRfq = () => phase2Service.createRfq({
    crop: form.crop, grade: form.grade, requiredQuantityKg: form.requiredQuantityKg, targetPrice: form.targetPrice,
    deliveryLocation: form.deliveryLocation, deliveryWindow: `${form.requiredBy} · ${form.deliverySlot.replace(/^[^·]+· /, '')}`,
    requiredBy: form.requiredBy, deliverySlot: form.deliverySlot, packaging: form.packaging,
    recurring: form.recurring, frequency: form.recurring ? form.frequency : 'one-time', notes: form.notes,
  })

  /** Save the requirement and keep matching. */
  const save = async () => {
    if (!validate(2)) return
    setSubmitting('save')
    try {
      const rfq = await createRfq()
      showToast(`Requirement saved · ${kg(rfq.plan?.matchedKg ?? 0)} matched`)
      navigate(`/bulk/procure/${rfq.id}`)
    } catch {
      showToast('This requirement could not be saved. Please retry.')
      setSubmitting(null)
    }
  }

  /** Accept the match: the requirement is written, then converted in the same chain the service always uses. */
  const acceptAndOrder = async () => {
    if (!validate(2)) return
    setSubmitting('order')
    try {
      const rfq = await createRfq()
      const order = await phase2Service.convertRfq(rfq.id)
      showToast(`${order.id} created · pickups assigned to logistics`)
      navigate(`/bulk/orders/${order.id}`)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'This order could not be created.')
      setSubmitting(null)
    }
  }

  const reset = () => { setCreating(false); setStep(0); setForm({ ...defaultForm }); setErrors({}); setSubmitting(null); refresh() }

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Unable to load procurement" onRetry={refresh} />

  if (creating) {
    return (
      <div className="page b-page b-procure">
        <PageHead back={{ to: '/bulk/procure', label: 'Procure' }} title="Procure produce" copy="Tell KisanLink what you need. The Market Maker assembles it from the farms that can deliver it." />

        <ol className="b-stepper" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className={index < step ? 'is-done' : index === step ? 'is-active' : ''}>
              <button type="button" onClick={() => goTo(index)} disabled={index > step}>
                <span>{index < step ? <Check size={13} /> : index + 1}</span>
                <small>{label}</small>
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="b-card b-form">
            <div className="b-form-head"><h2>What do you need?</h2><p>Grade and packaging are matched against what farms have actually listed.</p></div>
            <div className="b-form-grid">
              <Field label="Produce" htmlFor="req-crop" error={errors.crop} className="span-2">
                <select id="req-crop" value={form.crop} onChange={(event) => set('crop', event.target.value)}>
                  {CROP_OPTIONS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                </select>
              </Field>
              <Field label="Grade" hint="Farms below this grade are left out of the match.">
                <div className="segmented" role="radiogroup" aria-label="Grade">
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
              <Field label="Quantity" htmlFor="req-qty" error={errors.requiredQuantityKg}>
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
              <Field label="Target price" htmlFor="req-price" error={errors.targetPrice} hint="Landed cost per kg you want to beat.">
                <div className="unit-input has-prefix">
                  <span className="unit-prefix">₹</span>
                  <input id="req-price" type="number" inputMode="decimal" min={1} max={999} step={0.5} value={form.targetPrice} onChange={(event) => set('targetPrice', Number(event.target.value))} />
                  <span>/kg</span>
                </div>
              </Field>
              <div className="span-2">
                <TargetPriceAdvisor crop={form.crop} quantityKg={form.requiredQuantityKg} targetPrice={form.targetPrice} onApply={(price) => set('targetPrice', price)} />
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="b-card b-form">
            <div className="b-form-head"><h2>Where and when?</h2><p>The collection run is planned backwards from your receiving window.</p></div>
            <div className="b-form-grid">
              <Field label="Delivery location" htmlFor="req-loc" error={errors.deliveryLocation} className="span-2">
                <select id="req-loc" value={form.deliveryLocation} onChange={(event) => set('deliveryLocation', event.target.value)}>
                  {(data.profile.deliveryAddresses.length ? data.profile.deliveryAddresses : [defaultForm.deliveryLocation]).map((address) => <option key={address} value={address}>{address}</option>)}
                </select>
              </Field>
              <Field label="Required by" htmlFor="req-date" error={errors.requiredBy} hint="Farms are collected the day before.">
                <input id="req-date" type="date" min={isoDay(1)} max={isoDay(30)} value={form.requiredBy} onChange={(event) => set('requiredBy', event.target.value)} />
              </Field>
              <Field label="Receiving window">
                <div className="b-slot-grid" role="radiogroup" aria-label="Receiving window">
                  {SLOT_OPTIONS.map((slot) => (
                    <button type="button" key={slot.value} role="radio" aria-checked={form.deliverySlot === slot.value} className={form.deliverySlot === slot.value ? 'is-on' : ''} onClick={() => set('deliverySlot', slot.value)}>
                      <strong>{slot.label}</strong><small>{slot.hint}</small>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notes for the farms" htmlFor="req-notes" className="span-2" hint="Optional. Shown to every matched farmer.">
                <textarea id="req-notes" rows={3} maxLength={240} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Handling, sizing or rejection criteria" />
              </Field>
              <div className="b-toggle-row span-2">
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
            <div className="b-recap">
              <span><small>Requirement</small><strong>{kg(form.requiredQuantityKg)} {form.crop}</strong></span>
              <span><small>Grade</small><strong>{form.grade}</strong></span>
              <span><small>Packaging</small><strong>{form.packaging}</strong></span>
              <span><small>Target</small><strong>₹{form.targetPrice}/kg</strong></span>
              <span><small>Cadence</small><strong>{form.recurring ? FREQUENCY_OPTIONS.find((option) => option.value === form.frequency)?.label : 'One-time'}</strong></span>
            </div>
          </section>
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
            requiredBy={form.requiredBy}
            onDone={() => setAnalysisReady(true)}
            action={(
              <>
                <button type="button" className="btn btn-primary btn-large btn-full" disabled={Boolean(submitting) || !analysisReady || !plan?.matchedKg} onClick={acceptAndOrder}>
                  {submitting === 'order' ? 'Creating order…' : 'Accept match & create order'} <ArrowRight size={16} />
                </button>
                <button type="button" className="btn btn-secondary btn-full" disabled={Boolean(submitting) || !analysisReady} onClick={save}>
                  {submitting === 'save' ? 'Saving…' : plan?.feasible ? 'Save and decide later' : 'Save requirement and keep matching'}
                </button>
                <p className="b-safe"><ShieldCheck size={15} /> Accepting creates the procurement order, farmer allocations and the pooled pickup route. No real payment.</p>
              </>
            )}
          />
        )}

        <div className="b-wizard-actions">
          <button type="button" className="btn btn-ghost" disabled={Boolean(submitting)} onClick={() => step === 0 ? reset() : goTo(step - 1)}>{step === 0 ? 'Cancel' : 'Back'}</button>
          {step < 2 && <button type="button" className="btn btn-primary btn-large" onClick={() => goTo(step + 1)}>{step === 1 ? 'Run Market Maker' : 'Continue'} <ArrowRight size={16} /></button>}
        </div>
      </div>
    )
  }

  const rfqs = data.rfqs
  const counts = { matching: rfqs.filter((rfq) => tabOf(rfq) === 'matching').length, ready: rfqs.filter((rfq) => tabOf(rfq) === 'ready').length, completed: rfqs.filter((rfq) => tabOf(rfq) === 'completed').length }
  const visible = rfqs.filter((rfq) => tabOf(rfq) === tab)

  return (
    <div className="page b-page b-procure">
      <PageHead
        title="Procure"
        copy="Post what you need and let the Market Maker assemble it from the corridor."
        aside={<button className="btn btn-primary btn-large" onClick={() => { setCreating(true); setStep(0); setForm({ ...defaultForm }) }}><Plus size={18} /> Procure Produce</button>}
      />

      <div className="b-tabs" role="tablist" aria-label="Requirements">
        {(['matching', 'ready', 'completed'] as Tab[]).map((value) => (
          <button type="button" key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'is-on' : ''} onClick={() => setTab(value)}>
            {value === 'matching' ? 'Matching' : value === 'ready' ? 'Ready' : 'Completed'}{counts[value] ? <b>{counts[value]}</b> : null}
          </button>
        ))}
      </div>

      {visible.length ? (
        <ul className="b-req-list">
          {visible.map((rfq) => <RequirementCard key={rfq.id} rfq={rfq} />)}
        </ul>
      ) : (
        <Empty
          icon={ClipboardList}
          title={tab === 'matching' ? 'Nothing is being matched' : tab === 'ready' ? 'No match is waiting for a decision' : 'No completed requirements yet'}
          copy={tab === 'completed' ? 'Requirements that were ordered or closed appear here.' : 'Post what you need and the Market Maker will assemble it from the farms in your corridor.'}
          action={tab !== 'completed' ? <button className="btn btn-primary" onClick={() => { setCreating(true); setStep(0) }}><Plus size={16} /> Procure Produce</button> : undefined}
        />
      )}
    </div>
  )
}

function RequirementCard({ rfq }: { rfq: BulkRfq }) {
  const matched = matchedKg(rfq)
  const pct = matchedPct(rfq)
  const plan = rfq.plan
  const ready = rfq.status === 'fully_matched'
  return (
    <li>
      <Link className="b-req-card" to={`/bulk/procure/${rfq.id}`}>
        <div className="b-req-main">
          <div className="b-req-title">
            <h3>{kg(rfq.requiredQuantityKg)} {rfq.crop}</h3>
            <Badge tone={rfqTone(rfq.status)}>{rfqLabel[rfq.status]}</Badge>
          </div>
          <p><CalendarClock size={13} /> Required {prettyDate(rfq.requiredBy)} · {rfq.grade} · {rfq.packaging}{rfq.recurring ? ' · recurring' : ''}</p>
          <div className="b-req-progress">
            <FillBar pct={pct} tone={ready || rfq.status === 'converted' ? 'green' : 'amber'} label={`${pct}% matched`} />
            <small>{kg(matched)} matched · {rfq.matches.length} farm{rfq.matches.length === 1 ? '' : 's'}</small>
          </div>
          <dl className="b-req-facts">
            <div><dt>Target</dt><dd>₹{rfq.targetPrice}/kg</dd></div>
            <div><dt>Est. landed</dt><dd>{plan?.landedPerKg ? perKg(plan.landedPerKg) : 'Pending'}</dd></div>
            {plan && plan.savingTotal > 0 && (ready || rfq.status === 'converted') && <div><dt>Saving</dt><dd className="b-good">{money(plan.savingTotal)}</dd></div>}
          </dl>
          <small className="b-meta">{rfq.id}</small>
        </div>
        <ChevronRight size={18} className="b-req-chevron" aria-hidden="true" />
      </Link>
    </li>
  )
}
