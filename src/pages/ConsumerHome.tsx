import { ArrowRight, MapPin, ShieldCheck, Truck } from 'lucide-react'
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

export function ConsumerHome() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const { data, loading, error } = useAsyncData(() => marketplaceService.getFeaturedListings())
  const categories = marketplaceService.getCategories()
  const filtered = data?.filter((listing) => (category === 'All' || listing.category === category) && listing.product.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <div className="page consumer-page">
      <section className="consumer-intro"><div><span className="eyebrow"><MapPin size={15} /> Dwarka, New Delhi</span><h1>Fresh from farms<br />near you.</h1><p>Seasonal produce, picked with care and priced transparently.</p></div><div className="consumer-hero-art"><span>Farm fresh today</span><div className="hero-basket"><i>🍅</i><i>🥬</i><i>🥕</i><i>🍎</i></div><small><ShieldCheck size={15} /> Quality checked farms</small></div></section>
      <SearchBar value={search} onChange={setSearch} />
      <div className="category-row"><CategoryChip name="All" emoji="✨" active={category === 'All'} onClick={() => setCategory('All')} />{categories.map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}</div>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Picked close to home</span><h2>Fresh near you</h2></div><Link to="/consumer/explore">Explore all <ArrowRight size={16} /></Link></div>
        {loading ? <DashboardSkeleton /> : error ? <div className="error-inline">Couldn’t load fresh produce.</div> : filtered.length ? <div className="product-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div> : <div className="no-results"><span>🌱</span><h3>No produce found</h3><p>Try another search or category.</p></div>}
      </section>

      <section className="consumer-value-grid"><PriceTransparency /><article className="delivery-story"><span className="delivery-icon"><Truck size={24} /></span><div><span className="eyebrow">Designed for freshness</span><h2>One short journey, not six handoffs.</h2><p>Produce moves from verified farms through coordinated pickup—reducing handling and helping it arrive fresher.</p><Link to="/consumer/how-it-works">How KisanLink works <ArrowRight size={16} /></Link></div></article></section>
    </div>
  )
}
