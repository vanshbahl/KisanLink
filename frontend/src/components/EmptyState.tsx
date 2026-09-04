import { Sprout, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({ title, message, copy, actionLabel, actionTo, icon: Icon = Sprout }: { title: string; message?: string; copy?: string; actionLabel?: string; actionTo?: string; icon?: LucideIcon }) {
  return (
    <div className="empty-state">
      <span><Icon size={30} /></span>
      <h2>{title}</h2>
      <p>{message ?? copy}</p>
      {actionLabel && actionTo && <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>}
    </div>
  )
}
