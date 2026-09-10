import { Dices, ShieldCheck } from 'lucide-react'
import type { SampleAssignment } from '../../types'

/**
 * Makes the anti-fraud mechanic visible: the farmer/operator never picks which crates get
 * opened. Numbers come from a persisted server (or deterministic offline-equivalent) draw -
 * reloading this card never shows a different sample.
 */
export function SampleSelectionCard({ assignment, quantityKg }: { assignment: SampleAssignment; quantityKg?: number }) {
  return (
    <div className="sample-selection-card">
      <div className="sample-selection-head">
        <Dices size={16} />
        <span>Random Sample</span>
      </div>
      {quantityKg !== undefined && (
        <p className="sample-selection-meta">{quantityKg} kg · {assignment.containerCount} crates</p>
      )}
      <p className="sample-selection-instruction">Inspect {assignment.sampleSize} crate{assignment.sampleSize === 1 ? '' : 's'}</p>
      <div className="sample-selection-chips">
        {assignment.selectedContainers.map((n) => (
          <span key={n} className="sample-chip">{n}</span>
        ))}
      </div>
      <p className="sample-selection-note">
        <ShieldCheck size={13} /> Selected randomly by KisanLink
      </p>
    </div>
  )
}
