import type { LucideIcon } from 'lucide-react'

export function MetricCard({ label, value, icon: Icon, tone = 'green', hint }: { label: string; value: string | number; icon: LucideIcon; tone?: 'green' | 'amber' | 'soil'; hint?: string }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon metric-${tone}`}><Icon size={20} /></span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  )
}
