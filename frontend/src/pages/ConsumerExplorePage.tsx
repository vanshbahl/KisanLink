import { useMemo, useState } from 'react'
import { CategoryChip } from '../components/CategoryChip'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { useAsyncData } from '../hooks/useAsyncData'
import { marketplaceService } from '../services/marketplaceService'
import type { Category } from '../types'

export function ConsumerExplorePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const { data, loading } = useAsyncData(() => marketplaceService.getListings())
  const filtered = useMemo(() => data?.filter((listing) => (category === 'All' || listing.category === category) && listing.product.toLowerCase().includes(search.toLowerCase())) ?? [], [data, category, search])
  return <div className="page"><div className="page-title-row"><div><span className="eyebrow">Farm-direct marketplace</span><h1>Explore fresh produce</h1><p>{filtered.length} seasonal listings from verified farms.</p></div></div><SearchBar value={search} onChange={setSearch} /><div className="category-row"><CategoryChip name="All" active={category === 'All'} onClick={() => setCategory('All')} />{marketplaceService.getCategories().map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}</div>{loading ? <DashboardSkeleton /> : <div className="product-grid product-grid-wide">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div>}</div>
}
