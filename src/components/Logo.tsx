import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="KisanLink home">
      <span className="logo-mark"><Sprout size={22} strokeWidth={2.4} /></span>
      {!compact && <span>Kisan<span>Link</span></span>}
    </Link>
  )
}
