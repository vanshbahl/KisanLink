import { useMemo, useState } from 'react'
import { CategoryChip } from '../components/CategoryChip'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { useAsyncData } from '../hooks/useAsyncData'
import { marketplaceService } from '../services/marketplaceService'
import type { Category } from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { productKey } from '../i18n'

export function ConsumerExplorePage() {
  const { t } = useLanguage()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const { data, loading } = useAsyncData(() => marketplaceService.getListings())
  const filtered = useMemo(() => data?.filter((listing) => (category === 'All' || listing.category === category) && `${listing.product} ${t(productKey(listing.id))}`.toLowerCase().includes(search.toLowerCase())) ?? [], [data, category, search, t])
  return <div className="page"><div className="page-title-row"><div><span className="eyebrow">{t('marketplaceEyebrow')}</span><h1>{t('exploreFresh')}</h1><p>{t('seasonalListings', { count: filtered.length })}</p></div></div><SearchBar value={search} onChange={setSearch} onFilter={() => setFiltersOpen(!filtersOpen)} />{filtersOpen && <div className="filter-panel"><strong>{t('searchFilters')}</strong><button className="btn btn-ghost" onClick={() => { setSearch(''); setCategory('All') }}>{t('all')}</button></div>}<div className="category-row"><CategoryChip name="All" active={category === 'All'} onClick={() => setCategory('All')} />{marketplaceService.getCategories().map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}</div>{loading ? <DashboardSkeleton /> : <div className="product-grid product-grid-wide">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div>}</div>
}
