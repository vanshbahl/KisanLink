import { ArrowLeft, BadgeCheck, Clock3, MapPin, Scale, ShieldCheck, Sprout, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { PriceTransparency } from '../components/PriceTransparency'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { farmersById } from '../data/farmers'
import { useAsyncData } from '../hooks/useAsyncData'
import { marketplaceService } from '../services/marketplaceService'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import { freshnessKey, productKey } from '../i18n'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const { t } = useLanguage()
  const { data, loading } = useAsyncData(() => marketplaceService.getListing(id), [id])
  if (loading) return <DashboardSkeleton />
  if (!data) return <div className="error-panel"><h2>{t('listingUnavailable')}</h2><Link className="btn btn-primary" to="/consumer/explore">{t('browseFresh')}</Link></div>
  const farmer = farmersById[data.farmerId]
  const productName = t(productKey(data.id))
  return (
    <div className="page listing-detail-page">
      <Link to="/consumer/explore" className="back-link"><ArrowLeft size={17} /> {t('backMarketplace')}</Link>
      <div className="listing-detail-grid">
        <ProductImage imageSrc={data.imageSrc} alt={productName} visual={data.visual} size="hero" />
        <section className="listing-detail-copy">
          <StatusBadge tone="green">{t(freshnessKey[data.freshness] ?? 'freshToday')}</StatusBadge>
          <h1>{productName}</h1>
          <p className="listing-farm"><BadgeCheck size={18} /> {farmer.farmName} · {t('verifiedFarmer')}</p>
          <p className="listing-location"><MapPin size={17} /> {farmer.location} · {t('kmAway', { count: data.distanceKm })}</p>
          <div className="listing-price"><strong>₹{data.pricePerKg}</strong><span>{t('perKg')}</span><small>{t('typicalMarket', { price: data.marketPricePerKg })}</small></div>
          <div className="listing-facts"><span><Scale size={18} /><strong>{t('kgAvailable', { count: data.availableKg })}</strong><small>{t('availableNow')}</small></span><span><Clock3 size={18} /><strong>{t('today')}</strong><small>{t('harvested')}</small></span><span><Truck size={18} /><strong>{t('oneTwoDays')}</strong><small>{t('estimatedDelivery')}</small></span></div>
          <button className="btn btn-primary btn-large btn-full" onClick={() => showToast(t('cartNextPhase'))}>{t('reserveInterest')}</button>
          <p className="listing-assurance"><ShieldCheck size={17} /> {t('noPayment')}</p>
        </section>
      </div>
      <div className="listing-lower-grid"><PriceTransparency compact /><article className="farm-story"><span className="eyebrow">{t('meetGrower')}</span><h2>{farmer.name}</h2><p>{t('growerStory', { farm: farmer.farmName, years: farmer.yearsFarming })}</p><div><span><Sprout size={13} /> {t('yearsFarming', { years: farmer.yearsFarming })}</span><span><BadgeCheck size={13} /> {t('identityVerified')}</span></div></article></div>
    </div>
  )
}
