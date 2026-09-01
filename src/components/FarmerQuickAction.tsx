import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FarmerQuickAction({ label, hint, icon: Icon, to, featured = false }: { label: string; hint: string; icon: LucideIcon; to: string; featured?: boolean }) {
  return (
    <Link to={to} className={`farmer-action ${featured ? 'farmer-action-featured' : ''}`}>
      <span className="farmer-action-icon"><Icon size={25} /></span>
      <span><strong>{label}</strong><small>{hint}</small></span>
      <ArrowUpRight className="action-arrow" size={19} />
    </Link>
  )
}
