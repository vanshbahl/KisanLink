import { Boxes, ClipboardCheck, Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BulkSupplyCard } from '../components/BulkSupplyCard'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { MetricCard } from '../components/MetricCard'
import { useAsyncData } from '../hooks/useAsyncData'
import { bulkService } from '../services/bulkService'
import { useLanguage } from '../contexts/LanguageContext'

export function BulkDashboard() {
  const { t } = useLanguage()
  const { data, loading, error } = useAsyncData(() => bulkService.getDashboard())
  if (loading) return <DashboardSkeleton />
  if (!data || error) return <div className="error-panel"><h2>{t('loadFreshError')}</h2><p>{error}</p></div>
  return (
    <div className="page bulk-page">
      <section className="bulk-hero"><div><span className="eyebrow">{t('tuesdayDelhi')}</span><h1>{t('bulkWelcome').split('\n').map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1><p>{t('bulkCopy')}</p><Link className="btn btn-light btn-large" to="/bulk/requests"><Plus size={19} /> {t('newRequirement')}</Link></div><div className="bulk-hero-stat"><span>{t('savingsMonth')}</span><strong>₹42,600</strong><small>{t('wholesaleBenchmark')}</small><i><TrendingUp size={16} /> {t('lowerCost')}</i></div></section>
      <section className="bulk-metrics"><MetricCard icon={ClipboardCheck} label={t('todayRequirement')} value={data.todayRequirement} tone="green" hint={`${t('tomatoes')} · Grade A`} /><MetricCard icon={ClipboardCheck} label={t('activeRequests')} value={data.activeRequests} tone="amber" hint={t('needsAttention')} /><MetricCard icon={Boxes} label={t('nearbySupply')} value={data.nearbySupply} tone="soil" hint={t('within120')} /></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">{t('verifiedNetwork')}</span><h2>{t('supplyReady')}</h2></div><Link to="/bulk/supply">{t('viewAll')}</Link></div><div className="bulk-card-grid">{data.supplies.map((supply) => <BulkSupplyCard key={supply.id} supply={supply} />)}</div></section>
      <article className="procurement-banner"><div><span className="eyebrow">{t('nextPhasePreview')}</span><h2>{t('customQuantity')}</h2><p>{t('customQuantityCopy')}</p></div><Link className="btn btn-secondary" to="/bulk/requests">{t('previewRequests')}</Link></article>
    </div>
  )
}
