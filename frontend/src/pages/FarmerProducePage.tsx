import { ArrowRight, Lightbulb, PackageOpen, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { farmerService } from '../services/farmerService'
import { productKey } from '../i18n'

export function FarmerProducePage() {
  const { t } = useLanguage()
  const { data, loading } = useAsyncData(() => farmerService.getListings())
  if (loading) return <DashboardSkeleton />
  return (
    <div className="page">
      <div className="page-title-row"><div><span className="eyebrow">{t('yourHarvest')}</span><h1>{t('myProduce')}</h1><p>{t('produceSubtitle')}</p></div><Link className="btn btn-primary" to="/farmer/sell"><Sprout size={18} /> {t('sellNewProduce')}</Link></div>
      <div className="farmer-listing-grid">{data?.map((listing) => <article className="farmer-listing" key={listing.id}><ProductImage imageSrc={listing.imageSrc} alt={t(productKey(listing.id))} visual={listing.visual} size="mini" /><div><div><h2>{t(productKey(listing.id))}</h2><StatusBadge tone="green">{t('active')}</StatusBadge></div><p><PackageOpen size={15} /> {t('kgAvailable', { count: listing.availableKg })}</p><strong>₹{listing.pricePerKg}{t('perKg')} <small>{t('directPrice')}</small></strong></div><Link to="/farmer/produce/details">{t('manage')} <ArrowRight size={16} /></Link></article>)}</div>
      <article className="gentle-banner"><Lightbulb size={25} /><div><strong>{t('buyerInterest')}</strong><p>{t('quantityHelp')}</p></div><Link to="/farmer/insights">{t('seeInsight')}</Link></article>
    </div>
  )
}
