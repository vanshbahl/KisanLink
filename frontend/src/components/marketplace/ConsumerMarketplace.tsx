import { Filter, RefreshCw, SlidersHorizontal, Sparkles, Sprout, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { marketplaceService } from '../../services/marketplaceService'
import { phase2Service } from '../../services/phase2Service'
import { localDay } from '../../utils/dates'
import { farmOrigin, ConsumerListingCard } from '../consumer/ConsumerListingCard'
import { CategoryChip } from '../CategoryChip'
import { DashboardSkeleton } from '../LoadingSkeleton'
import { SearchBar } from '../SearchBar'

export type MarketplaceSort = 'recommended' | 'nearest' | 'freshest' | 'price'
type BrowseMode = 'for-you' | 'fresh' | 'value' | 'near'

const PAGE_SIZE = 12
const normalizeCategory = (value: string) => value.trim().toLowerCase().replace(/s$/, '')
const matchesCategory = (itemCategory: string, selected: string) => selected === 'All' || normalizeCategory(itemCategory) === normalizeCategory(selected)
const saving = (price: number, retail: number) => Math.max(0, retail - price)

export function ConsumerMarketplace({ searchOpen = false }: { searchOpen?: boolean }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const [mode, setMode] = useState<BrowseMode>('for-you')
  const [category, setCategory] = useState('All')
  const [grade, setGrade] = useState('All')
  const [freshness, setFreshness] = useState('All')
  const [availability, setAvailability] = useState('available')
  const [maxPrice, setMaxPrice] = useState(100)
  const [distance, setDistance] = useState(100)
  const [sort, setSort] = useState<MarketplaceSort>('recommended')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const { data, loading, error } = useAsyncListings(retry)
  const categories = marketplaceService.getCategories()

  const count = [category !== 'All', grade !== 'All', freshness !== 'All', availability !== 'all', maxPrice < 100, distance < 100].filter(Boolean).length
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const items = (data ?? []).filter((item) => {
      const origin = farmOrigin(item.farm)
      const freshMatch = mode === 'fresh' || freshness === 'today'
        ? item.harvestDate === localDay()
        : freshness === 'week' ? item.harvestDate >= localDay(-7) : true
      return `${item.crop} ${item.cropHi} ${item.farm} ${origin.label}`.toLowerCase().includes(query)
        && matchesCategory(item.category, category)
        && (grade === 'All' || item.grade === grade)
        && freshMatch
        && (availability === 'all' || item.remainingKg > 0)
        && item.pricePerKg <= maxPrice
        && origin.km <= distance
    })
    return items.sort((a, b) => {
      if (mode === 'value') return saving(b.pricePerKg, b.retailPricePerKg) - saving(a.pricePerKg, a.retailPricePerKg)
      if (mode === 'near' || sort === 'nearest') return farmOrigin(a.farm).km - farmOrigin(b.farm).km
      if (sort === 'price') return a.pricePerKg - b.pricePerKg
      if (sort === 'freshest') return b.harvestDate.localeCompare(a.harvestDate)
      return b.views - a.views
    })
  }, [availability, category, data, distance, freshness, grade, maxPrice, mode, search, sort])

  useEffect(() => {
    if (searchOpen) document.querySelector<HTMLInputElement>('#consumer-search input')?.focus()
  }, [searchOpen])
  useEffect(() => { setVisible(PAGE_SIZE) }, [search, mode, category, grade, freshness, availability, maxPrice, distance, sort])
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])
  const clear = () => { setCategory('All'); setGrade('All'); setFreshness('All'); setAvailability('available'); setMaxPrice(100); setDistance(100) }
  const page = filtered.slice(0, visible)

  return (
    <section className="consumer-marketplace" id="marketplace">
      <div className="consumer-market-toolbar" id="consumer-search" hidden={!searchOpen}>
        <SearchBar value={search} onChange={setSearch} onFilter={() => setOpen(true)} />
        <label className="consumer-sort">Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as MarketplaceSort)}>
            <option value="recommended">Recommended</option>
            <option value="nearest">Nearest</option>
            <option value="freshest">Freshest</option>
            <option value="price">Price low to high</option>
          </select>
        </label>
        <button className="btn btn-secondary consumer-filter-button" onClick={() => setOpen(true)}><SlidersHorizontal size={17} />Filters{count > 0 && <b>{count}</b>}</button>
      </div>


      <div className="consumer-market-heading">
        <div><h2>Fresh produce</h2><p>{filtered.length} listings from nearby farms</p></div>
        <button className="consumer-mobile-filter" onClick={() => setOpen(true)}><Filter size={16} />Filters{count > 0 && <b>{count}</b>}</button>
      </div>

      <div className="consumer-browse-modes" aria-label="Marketplace views">
        {([['for-you', 'For You'], ['fresh', 'Fresh Today'], ['value', 'Best Value'], ['near', 'Near You']] as const).map(([value, label]) => <button className={mode === value ? 'active' : ''} key={value} onClick={() => setMode(value)}>{value === 'for-you' && <Sparkles size={15} />}{label}</button>)}
      </div>
      <div className="category-row consumer-category-row">
        <CategoryChip name="All" active={category === 'All'} onClick={() => setCategory('All')} />
        {categories.map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}
      </div>



      {loading ? <DashboardSkeleton /> : error ? (
        <div className="error-panel"><RefreshCw size={24} /><h2>Could not load produce</h2><button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
      ) : filtered.length ? (
        <>
          <div className="consumer-product-grid">{page.map((item) => <ConsumerListingCard key={item.id} listing={item} />)}</div>
          {visible < filtered.length && <div className="marketplace-more"><button className="btn btn-secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>Load more ({filtered.length - visible} left)</button></div>}
        </>
      ) : (
        <div className="no-results"><Sprout size={38} /><h3>No produce matches</h3><p>Try removing a filter or searching in English or Hindi.</p><button className="btn btn-secondary" onClick={clear}>Clear filters</button></div>
      )}

      <aside className={`consumer-filter-sheet ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Marketplace filters" aria-hidden={!open} hidden={!open}>
        <div className="consumer-filter-head"><div><strong>Filters</strong><span>{filtered.length} matching listings</span></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close filters"><X size={19} /></button></div>
        <FilterControls category={category} setCategory={setCategory} grade={grade} setGrade={setGrade} freshness={freshness} setFreshness={setFreshness} availability={availability} setAvailability={setAvailability} maxPrice={maxPrice} setMaxPrice={setMaxPrice} distance={distance} setDistance={setDistance} />
        <div className="consumer-filter-actions"><button className="btn btn-ghost" onClick={clear}>Clear</button><button className="btn btn-primary" onClick={() => setOpen(false)}>Show {filtered.length} results</button></div>
      </aside>
      {open && <button className="sheet-backdrop" aria-label="Close filters" onClick={() => setOpen(false)} />}
    </section>
  )
}

function useAsyncListings(retry: number) {
  const [state, setState] = useState<{ data?: Awaited<ReturnType<typeof phase2Service.listings>>; loading: boolean; error?: unknown }>({ loading: true })
  useEffect(() => {
    let live = true
    setState((current) => ({ ...current, loading: true, error: undefined }))
    phase2Service.listings().then((data) => { if (live) setState({ data, loading: false }) }).catch((error) => { if (live) setState({ loading: false, error }) })
    const sync = () => { void phase2Service.listings().then((data) => { if (live) setState({ data, loading: false }) }) }
    window.addEventListener('kisanlink-state', sync)
    return () => { live = false; window.removeEventListener('kisanlink-state', sync) }
  }, [retry])
  return state
}

function FilterControls(props: { category: string; setCategory: (value: string) => void; grade: string; setGrade: (value: string) => void; freshness: string; setFreshness: (value: string) => void; availability: string; setAvailability: (value: string) => void; maxPrice: number; setMaxPrice: (value: number) => void; distance: number; setDistance: (value: number) => void }) {
  return <div className="filter-fields consumer-filter-fields"><label className="field"><span>Category</span><select value={props.category} onChange={(e) => props.setCategory(e.target.value)}><option>All</option><option>Vegetables</option><option>Fruits</option><option>Grains</option><option>Staples</option></select></label><label className="field"><span>Grade</span><select value={props.grade} onChange={(e) => props.setGrade(e.target.value)}><option>All</option><option>Grade A+</option><option>Grade A</option></select></label><label className="field"><span>Freshness</span><select value={props.freshness} onChange={(e) => props.setFreshness(e.target.value)}><option value="All">Any</option><option value="today">Harvested today</option><option value="week">This week</option></select></label><label className="field"><span>Availability</span><select value={props.availability} onChange={(e) => props.setAvailability(e.target.value)}><option value="available">In stock</option><option value="all">All stock states</option></select></label><label className="range-field"><span>Price up to <b>₹{props.maxPrice}/kg</b></span><input type="range" min="20" max="100" value={props.maxPrice} onChange={(e) => props.setMaxPrice(Number(e.target.value))} /></label><label className="range-field"><span>Distance up to <b>{props.distance} km</b></span><input type="range" min="20" max="150" value={props.distance} onChange={(e) => props.setDistance(Number(e.target.value))} /></label></div>
}
