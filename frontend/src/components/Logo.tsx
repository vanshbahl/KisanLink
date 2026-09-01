import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const { t } = useLanguage()
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label={t('logoHome')}>
      <img className="logo-mark" src="/assets/brand/kisanlink-official.png" alt="" />
      {!compact && <span>Kisan<span>Link</span></span>}
    </Link>
  )
}
