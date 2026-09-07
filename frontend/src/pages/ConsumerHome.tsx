import { ArrowRight, Sprout, Truck } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { PriceTransparency } from '../components/PriceTransparency'
import { ProductCard } from '../components/ProductCard'
import { marketplaceService } from '../services/marketplaceService'
import { useAsyncData } from '../hooks/useAsyncData'
import { useLanguage } from '../contexts/LanguageContext'
import { MarketplaceAiSection } from '../components/ai/MarketplaceAiSection'
import { MarketPulseCard } from '../components/market/MarketPulseCard'
import { MarketplaceInsightResult } from '../components/ai/MarketplaceInsightResult'
import { ConsumerMarketplace } from '../components/marketplace/ConsumerMarketplace'
import { freshPick } from '../services/consumerIntelligenceService'
import { phase2Service } from '../services/phase2Service'

export function ConsumerHome() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { data, loading, error } = useAsyncData(() => marketplaceService.getFeaturedListings())
  const { data: intelligenceListings } = useAsyncData(() => phase2Service.listings())
  const featured = data?.slice(0, 4) ?? []

  // Links from elsewhere (and the retired /consumer/explore route) deep-link to the
  // marketplace section; the router does not scroll to hashes on its own. The listings
  // above it load asynchronously, so the first attempt is repeated until the section's
  // position stops moving rather than landing on a stale offset.
  useEffect(() => {
    if (hash !== '#marketplace') return
    let tries = 0
    const settle = window.setInterval(() => {
      const target = document.getElementById('marketplace')
      tries += 1
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 72
        if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: 'auto' })
        else { window.clearInterval(settle); return }
      }
      if (tries > 12) window.clearInterval(settle)
    }, 150)
    return () => window.clearInterval(settle)
  }, [hash])

  return (
    <div className="page consumer-page">
      <MarketPulseCard role="consumer" />

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">{t('pickedClose')}</span><h2>{t('freshNearYou')}</h2></div>
          <a href="#marketplace">{t('exploreAll')} <ArrowRight size={16} /></a>
        </div>
        {loading ? <DashboardSkeleton /> : error ? <div className="error-inline">{t('loadFreshError')}</div> : featured.length ? <div className="product-grid">{featured.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div> : <div className="no-results"><Sprout size={38} /><h3>{t('noProduce')}</h3><p>{t('trySearch')}</p></div>}
      </section>

      <MarketplaceAiSection sectionClassName="consumer-intelligence-slot" title="Fresh Pick" subtitle="One recommendation across every active farm listing near you." idleLabel="Find my pick" idleHint="Find the strongest current produce option" stages={['Checking fresh harvests', 'Comparing nearby farm prices', 'Checking mandi references', 'Reviewing available supply', 'Preparing your recommendation']} run={() => freshPick(intelligenceListings ?? [])} renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.listingId ? navigate(`/consumer/listing/${insight.listingId}`) : reset()} footer="Uses active listing price, mandi reference, harvest date, stock and verification fields." />} />

      {/* The full marketplace — search, categories, filters, sorting, listings, paging. */}
      <ConsumerMarketplace />

      <section className="consumer-value-grid"><PriceTransparency /><article className="delivery-story"><span className="delivery-icon"><Truck size={24} /></span><div><span className="eyebrow">{t('designedFreshness')}</span><h2>{t('shortJourney')}</h2><p>{t('journeyCopy')}</p><Link to="/consumer/how-it-works">{t('howWorks')} <ArrowRight size={16} /></Link></div></article></section>
    </div>
  )
}
