import { BarChart3, CalendarClock, IndianRupee, PackageCheck, Plus, Sprout, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FarmerQuickAction } from '../components/FarmerQuickAction'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { MetricCard } from '../components/MetricCard'
import { SupportCard } from '../components/SupportCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { farmerService } from '../services/farmerService'

export function FarmerDashboard() {
  const { t, language } = useLanguage()
  const { data, loading, error } = useAsyncData(() => farmerService.getDashboard())
  if (loading) return <DashboardSkeleton />
  if (error || !data) return <div className="error-panel"><h2>We couldn’t load your farm overview.</h2><p>{error}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button></div>

  return (
    <div className="page farmer-page">
      <section className="farmer-greeting">
        <div><span className="eyebrow">{language === 'hi' ? 'आज आपके खेत पर' : 'Today on your farm'}</span><h1>{t('greeting')}</h1><p>{t('location')}</p></div>
        <div className="weather-pill"><span>☀️</span><strong>29°C</strong><small>Clear</small></div>
      </section>

      <section className="farmer-hero-card">
        <div className="farmer-hero-copy"><span className="farmer-hero-kicker"><Sprout size={17} /> {language === 'hi' ? 'सीधे खरीदारों तक' : 'Reach buyers directly'}</span><h2>{t('sellProduce')}</h2><p>{language === 'hi' ? 'सही कीमत पाएं। पिकअप में हमारी सहायता लें।' : 'Get a fair price and pickup support, without the middlemen.'}</p><Link to="/farmer/sell" className="btn btn-light btn-large"><Plus size={21} />{t('sellProduce')}</Link></div>
        <div className="farmer-hero-illustration"><span>🌿</span><span>🍅</span><span>🥕</span></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">{t('quickActions')}</span><h2>{language === 'hi' ? 'ज़रूरी जानकारी' : 'What needs your attention'}</h2></div><Link to="/farmer/produce">{t('viewDetails')}</Link></div>
        <div className="farmer-metrics">
          <MetricCard icon={IndianRupee} value={`₹${data.earnings.toLocaleString('en-IN')}`} label={t('earningsMonth')} tone="green" hint="↑ 12% from August" />
          <MetricCard icon={Sprout} value={data.activeListings} label={t('activeListings')} tone="soil" hint="Tomato · Spinach · Wheat" />
          <MetricCard icon={PackageCheck} value={data.newOrders} label={t('newOrders')} tone="amber" hint="Tap to review" />
        </div>
      </section>

      <div className="farmer-content-grid">
        <section className="quick-action-section">
          <div className="section-heading compact"><h2>{language === 'hi' ? 'जल्दी करें' : 'Quick actions'}</h2></div>
          <div className="farmer-action-grid">
            <FarmerQuickAction label={t('myProduce')} hint={language === 'hi' ? '3 सक्रिय' : '3 active'} icon={Sprout} to="/farmer/produce" />
            <FarmerQuickAction label={t('orders')} hint={language === 'hi' ? '2 नए' : '2 new'} icon={PackageCheck} to="/farmer/orders" />
            <FarmerQuickAction label={t('earnings')} hint={language === 'hi' ? 'भुगतान देखें' : 'View payouts'} icon={WalletCards} to="/farmer/earnings" />
            <FarmerQuickAction label={t('demandInsights')} hint={language === 'hi' ? 'टमाटर की मांग अधिक' : 'Tomato demand is high'} icon={BarChart3} to="/farmer/insights" />
          </div>
        </section>

        <section className="farmer-side-stack">
          <article className="pickup-card"><span className="pickup-icon"><CalendarClock size={24} /></span><div><small>{t('upcomingPickup')}</small><strong>{data.upcomingPickup}</strong><p>420 kg Tomatoes · Gate 1</p></div><Link to="/farmer/orders">View</Link></article>
          <article className="price-insight-card">
            <div className="price-insight-head"><div><span className="eyebrow">{t('priceInsight')}</span><h2>{language === 'hi' ? 'टमाटर' : 'Tomatoes'}</h2></div><span className="price-up">↑ Good demand</span></div>
            <div className="price-compare"><div><span>{t('localMarket')}</span><strong>₹24<small>/kg</small></strong></div><div className="direct-price"><span>{t('directPotential')}</span><strong>₹31<small>/kg</small></strong></div></div>
            <div className="extra-earning"><span>+₹7/kg</span><p>{t('additional')}</p></div>
          </article>
        </section>
      </div>
      <SupportCard />
    </div>
  )
}
