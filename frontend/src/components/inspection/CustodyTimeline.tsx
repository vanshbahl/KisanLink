import { useState } from 'react'
import { ChevronDown, Image as ImageIcon, Package } from 'lucide-react'
import type { CustodyStage, InspectionCheckpoint, LotTrail } from '../../types'
import { InspectionStatusBadge } from './InspectionStatusBadge'

const CHECKPOINT_LABEL: Record<InspectionCheckpoint, string> = {
  FARMER_GATE: 'Farmer Gate',
  LOGISTICS_PICKUP: 'Logistics Pickup',
  LOGISTICS_DROPOFF: 'Logistics Dropoff',
  WAREHOUSE_ENTRY: 'Warehouse Entry',
  WAREHOUSE_EXIT: 'Warehouse Exit',
}

function summarize(stage: CustodyStage): string {
  if (stage.checkpoint === 'FARMER_GATE') return 'Lot declared'
  if (stage.checkpoint === 'LOGISTICS_DROPOFF') {
    if (!stage.condition) return 'Condition not yet recorded'
    return `Load ${stage.condition.sealed ? 'sealed' : 'unsealed'} · Packaging ${stage.condition.packagingIntact ? 'intact' : 'damaged'}`
  }
  if (stage.sampledContainers && stage.totalContainers) {
    return `${stage.sampledContainers} random crate${stage.sampledContainers === 1 ? '' : 's'} inspected (of ${stage.totalContainers})`
  }
  return `${stage.photoCount} photo${stage.photoCount === 1 ? '' : 's'} captured`
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/**
 * "LOT QUALITY TRAIL" - the judge-facing visual chain-of-custody. Every checkpoint that has
 * evidence is expandable to its photos, timestamps, and (when available) who captured them.
 * Never renders raw model confidence - only the restrained status vocabulary.
 */
export function CustodyTimeline({ trail, defaultExpanded }: { trail: LotTrail; defaultExpanded?: InspectionCheckpoint }) {
  const [expanded, setExpanded] = useState<InspectionCheckpoint | null>(defaultExpanded ?? trail.stages[trail.stages.length - 1]?.checkpoint ?? null)

  if (!trail.stages.length) {
    return <p className="custody-timeline-empty">No inspection evidence recorded yet for this lot.</p>
  }

  return (
    <div className="custody-timeline">
      <div className="custody-timeline-head">
        <Package size={15} />
        <span>Lot Quality Trail</span>
        <span className="custody-timeline-lot">{trail.lotCode}</span>
      </div>
      <ol className="custody-timeline-list">
        {trail.stages.map((stage) => {
          const isOpen = expanded === stage.checkpoint
          return (
            <li key={stage.checkpoint} className={`custody-stage${isOpen ? ' open' : ''}`}>
              <button type="button" className="custody-stage-head" onClick={() => setExpanded(isOpen ? null : stage.checkpoint)} aria-expanded={isOpen}>
                <div className="custody-stage-main">
                  <span className="custody-stage-title">{CHECKPOINT_LABEL[stage.checkpoint]}</span>
                  <span className="custody-stage-time">{formatTime(stage.firstCapturedAt ?? stage.condition?.capturedAt)}</span>
                  <span className="custody-stage-summary">{summarize(stage)}</span>
                </div>
                <div className="custody-stage-meta">
                  <InspectionStatusBadge status={stage.status} />
                  <ChevronDown size={16} className="custody-stage-chevron" />
                </div>
              </button>
              {isOpen && (
                <div className="custody-stage-body">
                  {stage.selectedContainers && stage.selectedContainers.length > 0 && (
                    <p className="custody-stage-detail">Sampled crates: {stage.selectedContainers.join(', ')} · selected randomly by KisanLink</p>
                  )}
                  {stage.condition && (
                    <p className="custody-stage-detail">
                      Sealed: {stage.condition.sealed ? 'Yes' : 'No'} · Packaging intact: {stage.condition.packagingIntact ? 'Yes' : 'No'}
                      {stage.condition.notes ? ` · ${stage.condition.notes}` : ''}
                    </p>
                  )}
                  {(stage.captures.length > 0 || stage.condition?.photoUrl) && (
                    <div className="custody-stage-photos">
                      {stage.captures.map((capture) => (
                        <figure key={capture.id}>
                          <img src={capture.imageUrl} alt={capture.containerNumber ? `Crate ${capture.containerNumber}` : 'Evidence photo'} />
                          {capture.containerNumber !== undefined && <figcaption>Crate {capture.containerNumber}</figcaption>}
                        </figure>
                      ))}
                      {stage.condition?.photoUrl && (
                        <figure>
                          <img src={stage.condition.photoUrl} alt="Handoff condition" />
                          <figcaption><ImageIcon size={10} /> Handoff</figcaption>
                        </figure>
                      )}
                    </div>
                  )}
                  {stage.captures.some((c) => c.capturedBy) && (
                    <p className="custody-stage-detail muted">Captured by {stage.captures.find((c) => c.capturedBy)?.capturedBy}</p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
