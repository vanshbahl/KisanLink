import { BarChart3, CalendarClock, IndianRupee, PackageCheck, Plus, Sprout, Sun, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FarmerQuickAction } from '../components/FarmerQuickAction'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { MetricCard } from '../components/MetricCard'
import { SupportCard } from '../components/SupportCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { farmerService } from '../services/farmerService'

export function FarmerDashboard() {
  const { t } = useLanguage()
  const { data, loading, error } = useAsyncData(() => farmerService.getDashboard())
  if (loading) return <DashboardSkeleton />
  if (error || !data) return <div className="error-panel"><h2>{t('farmLoadError')}</h2><p>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>{t('tryAgain')}</button></div>

  return (
    <div className="page farmer-page">
      <section className="farmer-greeting">
        <div><span className="eyebrow">{t('todayFarm')}</span><h1>{t('greeting')}</h1><p>{t('location')}</p></div>
        <div className="weather-pill"><Sun size={23} /><strong>29°C</strong><small>{t('clear')}</small></div>
      </section>

      <section className="farmer-hero-card">
        <div className="farmer-hero-copy"><span className="farmer-hero-kicker"><Sprout size={17} /> {t('reachBuyers')}</span><h2>{t('sellProduce')}</h2><p>{t('fairPricePickup')}</p><Link to="/farmer/sell" className="btn btn-light btn-large"><Plus size={21} />{t('sellProduce')}</Link></div>
        <div className="farmer-hero-illustration" aria-hidden="true"><img src="/assets/produce/spinach.webp" alt="" /><img src="/assets/produce/tomato.webp" alt="" /><img src="/assets/produce/carrot.webp" alt="" /></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">{t('quickActions')}</span><h2>{t('attention')}</h2></div><Link to="/farmer/produce">{t('viewDetails')}</Link></div>
        <div className="farmer-metrics">
          <MetricCard icon={IndianRupee} value={`₹${data.earnings.toLocaleString('en-IN')}`} label={t('earningsMonth')} tone="green" hint={t('fromAugust')} />
          <MetricCard icon={Sprout} value={data.activeListings} label={t('activeListings')} tone="soil" hint={t('listingSummary')} />
          <MetricCard icon={PackageCheck} value={data.newOrders} label={t('newOrders')} tone="amber" hint={t('tapReview')} />
        </div>
      </section>

      <div className="farmer-content-grid">
        <section className="quick-action-section">
          <div className="section-heading compact"><h2>{t('quickActionsTitle')}</h2></div>
          <div className="farmer-action-grid">
            <FarmerQuickAction label={t('myProduce')} hint={t('activeCount')} icon={Sprout} to="/farmer/produce" />
            <FarmerQuickAction label={t('orders')} hint={t('newCount')} icon={PackageCheck} to="/farmer/orders" />
            <FarmerQuickAction label={t('earnings')} hint={t('viewPayouts')} icon={WalletCards} to="/farmer/earnings" />
            <FarmerQuickAction label={t('demandInsights')} hint={t('tomatoDemandHigh')} icon={BarChart3} to="/farmer/insights" />
          </div>
        </section>

        <section className="farmer-side-stack">
          <article className="pickup-card"><span className="pickup-icon"><CalendarClock size={24} /></span><div><small>{t('upcomingPickup')}</small><strong>{t('tomorrowPickup')}</strong><p>{t('pickupDetail')}</p></div><Link to="/farmer/orders">{t('view')}</Link></article>
          <article className="price-insight-card">
            <div className="price-insight-head"><div><span className="eyebrow">{t('priceInsight')}</span><h2>{t('tomatoes')}</h2></div><span className="price-up">{t('goodDemand')}</span></div>
            <div className="price-compare"><div><span>{t('localMarket')}</span><strong>₹24<small>/kg</small></strong></div><div className="direct-price"><span>{t('directPotential')}</span><strong>₹31<small>/kg</small></strong></div></div>
            <div className="extra-earning"><span>+₹7/kg</span><p>{t('additional')}</p></div>
          </article>
        </section>
      </div>
      <SupportCard />
    </div>
  )
}
