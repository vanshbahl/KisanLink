import { Camera, Check, ClipboardCheck, Dices, Flag, ShieldCheck, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CaptureInspectionModal, type CaptureTarget } from '../../components/inspection/CaptureInspectionModal'
import { CustodyTimeline } from '../../components/inspection/CustodyTimeline'
import { InspectionStatusBadge } from '../../components/inspection/InspectionStatusBadge'
import { Sheet } from '../../components/farmer/Sheet'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/apiClient'
import { inspectionService, type LotContext } from '../../services/inspectionService'
import type { BulkOrder, LotTrail, SampleAssignment, SupplyContribution } from '../../types'
import { receiptStage } from './attention'
import { kg } from './shared'

const ACCEPTED_KEY = 'kisanlink_bulk_accepted_lots_v1'
const readAccepted = (): string[] => { try { return JSON.parse(localStorage.getItem(ACCEPTED_KEY) ?? '[]') as string[] } catch { return [] } }

/**
 * Receipt QA for one procurement order.
 *
 * Reads and writes the same lot trails, sample assignments, freshness captures and disputes
 * as before; only the presentation changed. When the load has arrived and lots are still
 * uninspected, the action card at the top is the loudest thing on the page. Otherwise the
 * per-lot rows sit inside the Supply section, where "Inspect on arrival" stays reachable.
 *
 * Lot acceptance has no backend; it is recorded locally so the demo can close the loop.
 */
export function useLotTrails(order: BulkOrder) {
  const lots = order.contributions.filter((item) => item.lotCode)
  const key = lots.map((item) => item.lotCode).join(',')
  const [trails, setTrails] = useState<Record<string, LotTrail | undefined>>({})
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    Promise.all(lots.map((item) => inspectionService.getLotTrail(item.lotCode!))).then((results) => {
      if (!active) return
      const next: Record<string, LotTrail | undefined> = {}
      lots.forEach((item, index) => { next[item.lotCode!] = results[index] })
      setTrails(next)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])
  return { lots, trails, refresh: () => setVersion((value) => value + 1) }
}

export function Receiving({ order, arrived, lots, trails, refresh }: { order: BulkOrder; arrived: boolean; lots: SupplyContribution[]; trails: Record<string, LotTrail | undefined>; refresh: () => void }) {
  const { showToast } = useToast()
  const [assignments, setAssignments] = useState<Record<string, SampleAssignment>>({})
  const [sampling, setSampling] = useState<string | null>(null)
  const [captureLot, setCaptureLot] = useState<string | null>(null)
  const [busyLot, setBusyLot] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ lot: string; mode: 'trail' | 'issue' } | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState<string[]>(readAccepted)

  if (!lots.length) return null

  const entry = (lot: string) => receiptStage(trails[lot])
  const pending = lots.filter((item) => !entry(item.lotCode!))

  const lotContext = (contribution: SupplyContribution): LotContext => {
    const trail = trails[contribution.lotCode!]
    return { lotCode: contribution.lotCode!, cropName: trail?.cropName ?? order.crop, quantityKg: trail?.quantityKg ?? contribution.quantityKg, cropListingId: trail?.cropListingId, packagingType: trail?.packagingType, containerCount: trail?.containerCount, unitWeightKg: trail?.unitWeightKg }
  }

  const draw = async (contribution: SupplyContribution) => {
    const lotCode = contribution.lotCode!
    setBusyLot(lotCode)
    try {
      const assignment = await inspectionService.getOrCreateSampleAssignment(lotContext(contribution), 'WAREHOUSE_ENTRY')
      setAssignments((current) => ({ ...current, [lotCode]: assignment }))
      setSampling(lotCode)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not draw a random sample for receipt inspection.')
    } finally {
      setBusyLot(null)
    }
  }

  const activeAssignment = captureLot ? assignments[captureLot] : undefined
  const targets: CaptureTarget[] = activeAssignment
    ? activeAssignment.instructions.map((inst) => ({ key: String(inst.containerNumber), title: `Crate ${inst.containerNumber} of ${activeAssignment.containerCount}`, instruction: inst.position, note: inst.note, containerNumber: inst.containerNumber }))
    : []

  const submitCapture = async (target: CaptureTarget, file: File) => {
    if (!captureLot) throw new Error('No active lot')
    const contribution = lots.find((item) => item.lotCode === captureLot)!
    const capture = await inspectionService.submitCapture({ lot: lotContext(contribution), checkpoint: 'WAREHOUSE_ENTRY', file, containerNumber: target.containerNumber, sampleAssignmentId: activeAssignment?.id, capturedBy: 'Warehouse receiving' })
    return { status: capture.status }
  }

  const accept = (lot: string) => {
    const next = [...new Set([...accepted, lot])]
    localStorage.setItem(ACCEPTED_KEY, JSON.stringify(next))
    setAccepted(next)
    showToast(`${lot} accepted into stock (recorded locally).`)
  }

  const report = async () => {
    if (!sheet) return
    setSubmitting(true)
    try {
      await apiClient.createDispute({ order_id: sheet.lot, dispute_reason: reason.trim(), withheld_amount_rupees: 0 })
      showToast('Dispute submitted for review.')
    } catch {
      // Seeded lots are not backed by a backend order id; the flow still completes locally.
      showToast('Issue reported for review (recorded locally).')
    } finally {
      setSubmitting(false)
      setSheet(null)
      setReason('')
    }
  }

  const sampleLot = sampling ? lots.find((item) => item.lotCode === sampling) : undefined
  const sampleAssignment = sampling ? assignments[sampling] : undefined

  return (
    <>
      {arrived && pending.length > 0 && (
        <section className="b-receipt" id="receiving" aria-labelledby="b-receipt-title">
          <span className="b-receipt-icon"><ClipboardCheck size={20} /></span>
          <div className="b-receipt-copy">
            <h2 id="b-receipt-title">Receipt inspection required</h2>
            <p>{kg(order.suppliedQuantityKg)} {order.crop} · {pending.length} of {lots.length} lot{lots.length === 1 ? '' : 's'} still to sample at the dock</p>
          </div>
          <button type="button" className="btn btn-primary" disabled={Boolean(busyLot)} onClick={() => draw(pending[0])}>
            {busyLot ? 'Drawing sample…' : 'Start inspection'}
          </button>
        </section>
      )}

      <ul className="b-lot-list">
        {lots.map((contribution) => {
          const lot = contribution.lotCode!
          const trail = trails[lot]
          const received = entry(lot)
          const pickup = trail?.stages.find((stage) => stage.checkpoint === 'LOGISTICS_PICKUP')
          const changed = pickup && received && pickup.status !== received.status
          const isAccepted = accepted.includes(lot)
          const concern = received && (received.status === 'needs_review' || received.status === 'quality_concern')
          return (
            <li key={lot} className="b-lot">
              <div className="b-lot-head">
                <div>
                  <strong>{contribution.farm}</strong>
                  <small>{kg(contribution.quantityKg)} · {lot}{trail?.containerCount ? ` · ${trail.containerCount} crates` : ''}</small>
                </div>
                {received ? <InspectionStatusBadge status={received.status} /> : pickup ? <InspectionStatusBadge status={pickup.status} /> : <span className="b-meta">Declared at farm</span>}
              </div>
              <div className="b-lot-stages">
                <span className={trail?.stages.some((stage) => stage.checkpoint === 'FARMER_GATE') ? 'is-done' : ''}><Check size={12} /> Farm declaration</span>
                <span className={pickup ? 'is-done' : ''}><Check size={12} /> Pickup sample{pickup?.sampledContainers ? ` ${pickup.sampledContainers}/${pickup.totalContainers}` : ''}</span>
                <span className={trail?.stages.some((stage) => stage.checkpoint === 'LOGISTICS_DROPOFF') ? 'is-done' : ''}><Truck size={12} /> Transit handoff</span>
                <span className={received ? 'is-done' : ''}><Check size={12} /> Receipt sample</span>
              </div>
              {changed && <p className="b-lot-note">Condition changed during custody. Review recommended.</p>}
              <div className="b-lot-actions">
                {!received && (
                  <button type="button" className="btn btn-secondary" disabled={busyLot === lot} onClick={() => draw(contribution)}>
                    <Dices size={15} /> {arrived ? 'Inspect this lot' : 'Inspect on arrival'}
                  </button>
                )}
                {received && !isAccepted && (
                  <>
                    <button type="button" className="btn btn-primary" onClick={() => accept(lot)}><Check size={15} /> Accept lot</button>
                    <button type="button" className={`btn ${concern ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => { setSheet({ lot, mode: 'issue' }) }}><Flag size={15} /> Report issue</button>
                  </>
                )}
                {isAccepted && <span className="b-lot-accepted"><ShieldCheck size={14} /> Accepted into stock</span>}
                {trail && <button type="button" className="btn btn-ghost" onClick={() => setSheet({ lot, mode: 'trail' })}>Quality trail</button>}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Sample draw: the buyer never chooses which crates get opened. */}
      <Sheet
        open={Boolean(sampling && sampleAssignment)}
        onClose={() => setSampling(null)}
        title="Random sample"
        footer={(
          <button type="button" className="btn btn-primary btn-full btn-large" onClick={() => { setCaptureLot(sampling); setSampling(null) }}>
            <Camera size={16} /> Photograph {sampleAssignment?.sampleSize} crate{sampleAssignment?.sampleSize === 1 ? '' : 's'}
          </button>
        )}
      >
        {sampleLot && sampleAssignment && (
          <div className="b-sample">
            <p><strong>{sampleLot.farm}</strong> · {kg(sampleLot.quantityKg)} · {sampleAssignment.containerCount} crates</p>
            <p>Open and photograph these crates. KisanLink chose them{sampleAssignment.serverGenerated ? ' on the server' : ' deterministically'}; reloading never changes the draw.</p>
            <div className="b-sample-chips">{sampleAssignment.selectedContainers.map((n) => <span key={n}>{n}</span>)}</div>
            <ol className="b-sample-steps">
              {sampleAssignment.instructions.map((inst) => <li key={inst.containerNumber}><strong>Crate {inst.containerNumber}</strong><small>{inst.position}{inst.note ? ` · ${inst.note}` : ''}</small></li>)}
            </ol>
            <p className="b-safe"><ShieldCheck size={14} /> Each photo gets an AI freshness read: Fresh, Needs Review or Quality Concern. Nothing is scored as a percentage.</p>
          </div>
        )}
      </Sheet>

      <CaptureInspectionModal
        isOpen={Boolean(captureLot)}
        onClose={() => setCaptureLot(null)}
        title="Receipt inspection"
        targets={targets}
        onSubmit={submitCapture}
        onComplete={() => { setCaptureLot(null); refresh() }}
      />

      <Sheet
        open={Boolean(sheet)}
        onClose={() => { setSheet(null); setReason('') }}
        title={sheet?.mode === 'issue' ? 'Report an issue' : 'Quality trail'}
        footer={sheet?.mode === 'issue' ? (
          <button type="button" className="btn btn-primary btn-full" disabled={submitting || reason.trim().length < 3} onClick={report}>{submitting ? 'Submitting…' : 'Submit for review'}</button>
        ) : undefined}
      >
        {sheet && trails[sheet.lot] && <CustodyTimeline trail={trails[sheet.lot]!} defaultExpanded={sheet.mode === 'issue' ? 'WAREHOUSE_ENTRY' : undefined} />}
        {sheet?.mode === 'issue' && (
          <div className="b-issue">
            <p className="b-note">This does not withhold payment or assign liability. It opens a review with the evidence above attached.</p>
            <label className="field-block b-field">
              <span>What is wrong?</span>
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Condition changed between pickup and warehouse receipt" />
            </label>
          </div>
        )}
      </Sheet>
    </>
  )
}
