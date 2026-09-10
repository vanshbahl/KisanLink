import { CircleAlert, CircleCheck, Clock, HelpCircle, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '../StatusBadge'
import type { InspectionStageStatus } from '../../types'

/**
 * One consistent status vocabulary for the whole lot-inspection system. Never mixed with
 * "Grade A" / percentages / "Verified quality" elsewhere in the app - see product brief.
 */
const COPY: Record<InspectionStageStatus, { label: string; tone: 'green' | 'amber' | 'neutral' | 'red'; icon: typeof CircleCheck }> = {
  pending: { label: 'Pending inspection', tone: 'neutral', icon: Clock },
  declared: { label: 'Declared', tone: 'neutral', icon: ShieldCheck },
  fresh: { label: 'Fresh', tone: 'green', icon: CircleCheck },
  needs_review: { label: 'Needs Review', tone: 'amber', icon: CircleAlert },
  quality_concern: { label: 'Quality Concern', tone: 'red', icon: CircleAlert },
  unable_to_assess: { label: 'Unable to Assess', tone: 'neutral', icon: HelpCircle },
}

export function InspectionStatusBadge({ status, verified }: { status: InspectionStageStatus; verified?: boolean }) {
  const meta = COPY[status]
  const Icon = meta.icon
  return (
    <StatusBadge tone={meta.tone} verified={verified}>
      <Icon size={12} style={{ marginRight: 3, verticalAlign: -2 }} />
      {meta.label}
    </StatusBadge>
  )
}

export function inspectionStatusLabel(status: InspectionStageStatus): string {
  return COPY[status].label
}
