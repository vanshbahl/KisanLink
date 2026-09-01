import { Link } from 'react-router-dom'

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="KisanLink home">
      <img className="logo-mark" src="/assets/brand/logo-mark.svg" alt="" />
      {!compact && <span>Kisan<span>Link</span></span>}
    </Link>
  )
}
