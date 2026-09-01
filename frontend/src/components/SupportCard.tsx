import { Headphones, Phone } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export function SupportCard({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage()
  return (
    <article className={`support-card ${compact ? 'support-compact' : ''}`}>
      <span className="support-icon"><Headphones size={26} /></span>
      <div><h3>{t('needHelp')}</h3><p>{t('helpCopy')}</p></div>
      <a href="tel:18001234567" className="btn btn-support"><Phone size={18} />{t('callSupport')}</a>
    </article>
  )
}
