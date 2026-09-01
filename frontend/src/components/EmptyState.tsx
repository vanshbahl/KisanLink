import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({ title, message, actionLabel, actionTo }: { title: string; message: string; actionLabel: string; actionTo: string }) {
  return (
    <div className="empty-state">
      <span><Sprout size={30} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>
    </div>
  )
}
