import { Check, ClipboardList, Truck } from 'lucide-react'
import type { CustodyStage, InspectionCheckpoint, LotTrail } from '../../types'
import { InspectionStatusBadge } from './InspectionStatusBadge'

function stageFor(trail: LotTrail | undefined, checkpoint: InspectionCheckpoint): CustodyStage | undefined {
  return trail?.stages.find((s) => s.checkpoint === checkpoint)
}

/**
 * "QUALITY ASSURANCE" - the Bulk Buyer's compact view of what was ordered, what was
 * inspected at pickup, what arrived, and whether condition changed. Reused on both order
 * cards (via QualityIndicator, see below) and the full order-detail page.
 */
export function QualityAssuranceSection({
  trail,
  onStartReceiptInspection,
  onViewTrail,
  onRaiseDispute,
  receiptDisabled,
}: {
  trail?: LotTrail
  onStartReceiptInspection?: () => void
  onViewTrail?: () => void
  onRaiseDispute?: () => void
  receiptDisabled?: boolean
}) {
  const farmerGate = stageFor(trail, 'FARMER_GATE')
  const pickup = stageFor(trail, 'LOGISTICS_PICKUP')
  const dropoff = stageFor(trail, 'LOGISTICS_DROPOFF')
  const warehouseEntry = stageFor(trail, 'WAREHOUSE_ENTRY')

  return (
    <div className="qa-section">
      <div className="qa-section-head"><ClipboardList size={15} /><span>QUALITY ASSURANCE</span></div>

      <div className="qa-row">
        <span className="qa-row-label">Farm declaration</span>
        {farmerGate ? <Check size={16} className="qa-check" /> : <span className="qa-row-pending">Pending</span>}
      </div>

      <div className="qa-row">
        <span className="qa-row-label">Random pickup inspection</span>
        <div className="qa-row-value">
          {pickup ? (
            <>
              <InspectionStatusBadge status={pickup.status} />
              {pickup.sampledContainers && pickup.totalContainers && (
                <small>{pickup.sampledContainers} / {pickup.totalContainers} crates sampled</small>
              )}
            </>
          ) : <span className="qa-row-pending">Pending pickup</span>}
        </div>
      </div>

      <div className="qa-row">
        <span className="qa-row-label"><Truck size={13} /> Transit handoff</span>
        {dropoff ? (
          <span className="qa-row-value-inline">{dropoff.status === 'needs_review' ? 'Review recommended' : 'Load intact'}</span>
        ) : <span className="qa-row-pending">Not yet recorded</span>}
      </div>

      <div className="qa-row">
        <span className="qa-row-label">Receipt inspection</span>
        <div className="qa-row-value">
          {warehouseEntry ? (
            <InspectionStatusBadge status={warehouseEntry.status} />
          ) : onStartReceiptInspection ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={receiptDisabled} onClick={onStartReceiptInspection}>
              Start Receipt Inspection
            </button>
          ) : <span className="qa-row-pending">Pending</span>}
        </div>
      </div>

      {pickup && warehouseEntry && pickup.status !== warehouseEntry.status && (
        <p className="qa-condition-note">Condition changed during custody - review recommended.</p>
      )}

      {onRaiseDispute && warehouseEntry && (warehouseEntry.status === 'needs_review' || warehouseEntry.status === 'quality_concern') && (
        <button type="button" className="btn btn-ghost btn-sm qa-dispute-link" onClick={onRaiseDispute}>
          View evidence &amp; report issue
        </button>
      )}

      {onViewTrail && (
        <button type="button" className="btn btn-ghost btn-full qa-trail-link" onClick={onViewTrail}>
          View full quality trail
        </button>
      )}
    </div>
  )
}

/** Small, concise indicator for list/order cards - never the full dashboard. */
export function QualityIndicator({ trail }: { trail?: LotTrail }) {
  if (!trail || !trail.stages.length) return null
  const latest = trail.stages[trail.stages.length - 1]
  if (latest.checkpoint === 'FARMER_GATE') return <span className="quality-indicator-pill">Declared</span>
  const label = latest.checkpoint === 'WAREHOUSE_ENTRY' && (latest.status === 'needs_review' || latest.status === 'quality_concern')
    ? 'Receipt review required'
    : latest.status === 'fresh' ? 'Sample inspected · Fresh' : undefined
  return (
    <span className={`quality-indicator-pill${label?.includes('review') ? ' is-review' : ''}`}>
      {label ?? <InspectionStatusBadge status={latest.status} />}
    </span>
  )
}
