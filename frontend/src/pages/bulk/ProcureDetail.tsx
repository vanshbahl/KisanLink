import { ArrowRight, Edit3, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ContributionMatchIntelligence } from '../../components/ai/BulkIntelligenceCards'
import { MarketMakerAnalysis } from '../../components/bulk/MarketMakerAnalysis'
import { Sheet } from '../../components/farmer/Sheet'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { phase2Service } from '../../services/phase2Service'
import { buildProcurementPlan } from '../../services/procurementEngine'
import { prototypeService } from '../../services/prototypeService'
import { Badge, ErrorState, Field, PageHead, isSettled, kg, matchedKg, matchedPct, money, perKg, prettyDate, rfqLabel, rfqTone } from './shared'

/** One saved requirement: the stored Market Maker result and the decision it is waiting for. */
export function BulkRequirementDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [converting, setConverting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({ requiredQuantityKg: 100, targetPrice: 1, deliveryLocation: '', notes: '' })
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useAsyncData(async () => {
    const [rfq, listings, state] = await Promise.all([phase2Service.rfq(id), phase2Service.listings(), prototypeService.getState()])
    return rfq ? { rfq, plan: rfq.plan ?? buildProcurementPlan(rfq, listings, state.vehicles), addresses: state.bulkProfile.deliveryAddresses } : null
  }, [id, version])

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Requirement not found" />
  const { rfq, plan } = data
  const matched = matchedKg(rfq)
  const settled = isSettled(rfq)

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

  const openEdit = () => {
    setEditForm({ requiredQuantityKg: rfq.requiredQuantityKg, targetPrice: rfq.targetPrice, deliveryLocation: rfq.deliveryLocation, notes: rfq.notes ?? '' })
    setEditing(true)
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    try {
      await phase2Service.updateRfq(rfq.id, editForm)
      showToast('Requirement updated and re-matched.')
      setEditing(false)
      setVersion((value) => value + 1)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'This requirement could not be updated.')
    } finally {
      setSavingEdit(false)
    }
  }

  const close = async () => {
    await phase2Service.closeRfq(rfq.id)
    showToast('Requirement closed.')
    setVersion((value) => value + 1)
  }

  const summary = (
    <section className="b-card b-summary">
      <h2>Requirement</h2>
      <dl className="b-facts b-facts-rows">
        <div><dt>Matched</dt><dd>{kg(matched)} · {matchedPct(rfq)}%</dd></div>
        <div><dt>Target</dt><dd>₹{rfq.targetPrice}/kg</dd></div>
        <div><dt>Est. landed</dt><dd>{perKg(plan.landedPerKg)}</dd></div>
        <div><dt>Delivery</dt><dd>{prettyDate(rfq.requiredBy)} · {rfq.deliverySlot.replace(/^[^·]+· /, '')}</dd></div>
        <div className="is-total"><dt>Order value</dt><dd>{money(plan.landedTotal)}</dd></div>
      </dl>
      {rfq.notes && <p className="b-note"><Edit3 size={13} /> {rfq.notes}</p>}
      {!settled && (
        <>
          <button className="btn btn-primary btn-full btn-large" disabled={converting || !plan.matchedKg} onClick={convert}>
            {converting ? 'Creating order…' : 'Accept match & create order'} <ArrowRight size={16} />
          </button>
          <p className="b-safe"><ShieldCheck size={15} /> Creates the procurement order, farmer allocations and the pooled pickup route.</p>
          <div className="b-summary-secondary">
            <button className="btn btn-secondary" disabled={converting} onClick={openEdit}><Edit3 size={15} /> Edit</button>
            <button className="btn btn-ghost" disabled={converting} onClick={close}>Close requirement</button>
          </div>
        </>
      )}
      {rfq.status === 'converted' && <Link className="btn btn-primary btn-full" to="/bulk/orders">View procurement order <ArrowRight size={15} /></Link>}
      <small className="b-meta">{rfq.id}{rfq.recurring ? ' · recurring' : ''}</small>
    </section>
  )

  return (
    <div className="page b-page">
      <PageHead
        back={{ to: '/bulk/procure', label: 'Procure' }}
        title={`${kg(rfq.requiredQuantityKg)} ${rfq.crop}`}
        copy={`${rfq.grade} · ${rfq.packaging} · required ${prettyDate(rfq.requiredBy)}`}
        aside={<Badge tone={rfqTone(rfq.status)}>{rfqLabel[rfq.status]}</Badge>}
      />

      <div className="b-layout">
        <div className="b-layout-main">
          <MarketMakerAnalysis
            plan={plan}
            runKey={`${rfq.id}-${version}`}
            crop={rfq.crop}
            grade={rfq.grade}
            requiredQuantityKg={rfq.requiredQuantityKg}
            targetPrice={rfq.targetPrice}
            deliveryLocation={rfq.deliveryLocation}
            requiredBy={rfq.requiredBy}
            instant
            farmsExtra={rfq.matches.length > 0 ? <ContributionMatchIntelligence contributions={rfq.matches} total={rfq.requiredQuantityKg} deliveryWindow={rfq.deliveryWindow} grade={rfq.grade} /> : undefined}
          />
        </div>
        <aside className="b-layout-aside">{summary}</aside>
      </div>

      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit requirement"
        footer={(
          <div className="b-sheet-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" type="button" disabled={savingEdit} onClick={saveEdit}>{savingEdit ? 'Saving…' : 'Save and re-match'}</button>
          </div>
        )}
      >
        <div className="b-filter-grid">
          <Field label="Quantity" htmlFor="edit-qty">
            <div className="unit-input"><input id="edit-qty" type="number" min={100} max={20000} step={50} value={editForm.requiredQuantityKg} onChange={(event) => setEditForm({ ...editForm, requiredQuantityKg: Number(event.target.value) })} /><span>kg</span></div>
          </Field>
          <Field label="Target price" htmlFor="edit-price">
            <div className="unit-input has-prefix"><span className="unit-prefix">₹</span><input id="edit-price" type="number" min={1} step={0.5} value={editForm.targetPrice} onChange={(event) => setEditForm({ ...editForm, targetPrice: Number(event.target.value) })} /><span>/kg</span></div>
          </Field>
          <Field label="Delivery location" htmlFor="edit-loc">
            <select id="edit-loc" value={editForm.deliveryLocation} onChange={(event) => setEditForm({ ...editForm, deliveryLocation: event.target.value })}>
              {[...new Set([editForm.deliveryLocation, ...data.addresses])].filter(Boolean).map((address) => <option key={address} value={address}>{address}</option>)}
            </select>
          </Field>
          <Field label="Notes for the farms" htmlFor="edit-notes">
            <textarea id="edit-notes" rows={3} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
          </Field>
        </div>
      </Sheet>
    </div>
  )
}
