import { ArrowRight, MapPin, ShieldCheck, Sprout, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryChip } from '../components/CategoryChip'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { PriceTransparency } from '../components/PriceTransparency'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { marketplaceService } from '../services/marketplaceService'
import { useAsyncData } from '../hooks/useAsyncData'
import type { Category } from '../types'
import { useLanguage } from '../contexts/LanguageContext'

export function ConsumerHome() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const { data, loading, error } = useAsyncData(() => marketplaceService.getFeaturedListings())
  const categories = marketplaceService.getCategories()
  const filtered = data?.filter((listing) => (category === 'All' || listing.category === category) && `${listing.product} ${listing.productHi ?? ''} Ramesh Kumar Ramesh Farms`.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <div className="page consumer-page">
      <section className="consumer-intro"><div><span className="eyebrow"><MapPin size={15} /> {t('dwarkaLocation')}</span><h1>{t('freshNearTitle').split('\n').map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1><p>{t('freshNearCopy')}</p></div><div className="consumer-hero-art"><span>{t('farmFreshToday')}</span><div className="hero-basket" aria-hidden="true"><img src="/assets/produce/tomato.webp" alt="" /><img src="/assets/produce/spinach.webp" alt="" /><img src="/assets/produce/carrot.webp" alt="" /><img src="/assets/produce/apple.webp" alt="" /></div><small><ShieldCheck size={15} /> {t('qualityChecked')}</small></div></section>
      <SearchBar value={search} onChange={setSearch} />
      <div className="category-row"><CategoryChip name="All" active={category === 'All'} onClick={() => setCategory('All')} />{categories.map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}</div>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">{t('pickedClose')}</span><h2>{t('freshNearYou')}</h2></div><Link to="/consumer/explore">{t('exploreAll')} <ArrowRight size={16} /></Link></div>
        {loading ? <DashboardSkeleton /> : error ? <div className="error-inline">{t('loadFreshError')}</div> : filtered.length ? <div className="product-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div> : <div className="no-results"><Sprout size={38} /><h3>{t('noProduce')}</h3><p>{t('trySearch')}</p></div>}
      </section>

      <section className="consumer-value-grid"><PriceTransparency /><article className="delivery-story"><span className="delivery-icon"><Truck size={24} /></span><div><span className="eyebrow">{t('designedFreshness')}</span><h2>{t('shortJourney')}</h2><p>{t('journeyCopy')}</p><Link to="/consumer/how-it-works">{t('howWorks')} <ArrowRight size={16} /></Link></div></article></section>
    </div>
  )
}
