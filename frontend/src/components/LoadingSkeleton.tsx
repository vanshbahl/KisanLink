import { useLanguage } from '../contexts/LanguageContext'

export function DashboardSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="skeleton-page" aria-label={t('loading')}>
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  )
}
