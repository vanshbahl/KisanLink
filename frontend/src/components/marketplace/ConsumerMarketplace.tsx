import { Filter, RefreshCw, SlidersHorizontal, Sprout, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryChip } from '../CategoryChip'
import { SearchBar } from '../SearchBar'
import { DashboardSkeleton } from '../LoadingSkeleton'
import { useAsyncData } from '../../hooks/useAsyncData'
import { marketplaceService } from '../../services/marketplaceService'
import { phase2Service } from '../../services/phase2Service'
import { ConsumerListingCard } from '../../pages/ConsumerPhase2'
import { MarketplaceAiSection } from '../ai/MarketplaceAiSection'
import { MarketplaceInsightResult } from '../ai/MarketplaceInsightResult'
import { bestInResults } from '../../services/consumerIntelligenceService'

export type MarketplaceSort = 'recommended' | 'nearest' | 'freshest' | 'price'

const PAGE_SIZE = 12

/**
 * Listing records carry the category inconsistently ("Vegetable", "VEGETABLE", "STAPLE")
 * while the chips and the filter menu use the plural title case. Compare on a normalised
 * form so the same filter works across every record shape rather than silently returning
 * nothing.
 */
const normalizeCategory = (value: string) => value.trim().toLowerCase().replace(/s$/, '')
const matchesCategory = (itemCategory: string, selected: string) =>
  selected === 'All' || normalizeCategory(itemCategory) === normalizeCategory(selected)

/**
 * The single consumer marketplace. Previously this lived on a separate /consumer/explore
 * destination; Home now renders it directly so there is exactly one implementation of the
 * search / category / filter / sort / listing pipeline.
 */
export function ConsumerMarketplace() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const [category, setCategory] = useState('All')
  const [grade, setGrade] = useState('All')
  const [freshness, setFreshness] = useState('All')
  const [availability, setAvailability] = useState('available')
  const [maxPrice, setMaxPrice] = useState(100)
  const [distance, setDistance] = useState(100)
  const [sort, setSort] = useState<MarketplaceSort>('recommended')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const { data, loading, error } = useAsyncData(() => phase2Service.listings(), [retry])
  const categories = marketplaceService.getCategories()

  const count = [category !== 'All', grade !== 'All', freshness !== 'All', availability !== 'all', maxPrice < 100, distance < 100].filter(Boolean).length
  const filtered = useMemo(() => (data ?? []).filter((item) => `${item.crop} ${item.cropHi} ${item.farm} Ramesh Kumar`.toLowerCase().includes(search.toLowerCase()) && matchesCategory(item.category, category) && (grade === 'All' || item.grade === grade) && (freshness === 'All' || (freshness === 'today' ? item.harvestDate === new Date().toISOString().slice(0, 10) : true)) && (availability === 'all' || item.remainingKg > 0) && item.pricePerKg <= maxPrice && 42 <= distance).sort((a, b) => sort === 'price' ? a.pricePerKg - b.pricePerKg : sort === 'freshest' ? b.harvestDate.localeCompare(a.harvestDate) : sort === 'nearest' ? a.farm.localeCompare(b.farm) : b.views - a.views), [data, search, category, grade, freshness, availability, maxPrice, distance, sort])

  // Any change to the query resets paging so "load more" never strands the user mid-list.
  useEffect(() => { setVisible(PAGE_SIZE) }, [search, category, grade, freshness, availability, maxPrice, distance, sort])

  const clear = () => { setCategory('All'); setGrade('All'); setFreshness('All'); setAvailability('all'); setMaxPrice(100); setDistance(100) }
  const page = filtered.slice(0, visible)

  return (
    <section className="section-block marketplace-section" id="marketplace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Live farmer supply</span>
          <h2>Explore fresh produce</h2>
          <p className="section-support">{filtered.length} listings match your search and filters.</p>
        </div>
        <label className="sort-control">Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as MarketplaceSort)}>
            <option value="recommended">Recommended</option>
            <option value="nearest">Nearest</option>
            <option value="freshest">Freshest</option>
            <option value="price">Price low to high</option>
          </select>
        </label>
      </div>

      <SearchBar value={search} onChange={setSearch} onFilter={() => setOpen(true)} />
      <div className="category-row">
        <CategoryChip name="All" active={category === 'All'} onClick={() => setCategory('All')} />
        {categories.map((item) => <CategoryChip key={item.name} {...item} active={category === item.name} onClick={() => setCategory(item.name)} />)}
      </div>
      <button className="mobile-filter-trigger btn btn-secondary" onClick={() => setOpen(true)}><Filter size={17} /> Filters {count > 0 && <b>{count}</b>}</button>

      <div className="market-layout">
        <aside className={`market-filters ${open ? 'open' : ''}`}>
          <div className="filter-head">
            <strong><SlidersHorizontal size={18} /> Filters {count > 0 && `(${count})`}</strong>
            <button className="icon-button" onClick={() => setOpen(false)}><X size={19} /></button>
          </div>
          <FilterControls
            category={category} setCategory={setCategory} grade={grade} setGrade={setGrade}
            freshness={freshness} setFreshness={setFreshness} availability={availability} setAvailability={setAvailability}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice} distance={distance} setDistance={setDistance}
          />
          <div className="filter-actions">
            <button className="btn btn-ghost" onClick={clear}>Clear filters</button>
            <button className="btn btn-primary" onClick={() => setOpen(false)}>Show {filtered.length} results</button>
          </div>
        </aside>

        <section>
          {!loading && !error && filtered.length > 1 && (
            <MarketplaceAiSection
              sectionClassName="explore-intelligence-slot"
              title="Best in these results"
              subtitle="Compares only the listings left by your current filters."
              idleLabel="Compare results"
              idleHint="Which of these listings is the strongest buy?"
              stages={['Comparing asking prices', 'Checking mandi references', 'Reviewing harvest dates', 'Checking available stock', 'Preparing your comparison']}
              run={() => bestInResults(filtered)}
              renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.listingId ? navigate(`/consumer/listing/${insight.listingId}`) : reset()} footer="Uses listing price, mandi reference, harvest date, available stock and grade for the filtered results only." />}
            />
          )}
          {loading ? <DashboardSkeleton /> : error ? (
            <div className="error-panel"><RefreshCw size={24} /><h2>Could not load produce</h2><button className="btn btn-primary" onClick={() => setRetry(retry + 1)}>Retry</button></div>
          ) : filtered.length ? (
            <>
              <div className="product-grid product-grid-wide">{page.map((item) => <ConsumerListingCard key={item.id} listing={item} />)}</div>
              {visible < filtered.length && (
                <div className="marketplace-more">
                  <button className="btn btn-secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                    Load more ({filtered.length - visible} left)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-results"><Sprout size={38} /><h3>No produce matches</h3><p>Try removing a filter or searching in English or Hindi.</p><button className="btn btn-secondary" onClick={clear}>Clear filters</button></div>
          )}
        </section>
      </div>
      {open && <button className="sheet-backdrop" aria-label="Close filters" onClick={() => setOpen(false)} />}
    </section>
  )
}

function FilterControls(props: { category: string; setCategory: (value: string) => void; grade: string; setGrade: (value: string) => void; freshness: string; setFreshness: (value: string) => void; availability: string; setAvailability: (value: string) => void; maxPrice: number; setMaxPrice: (value: number) => void; distance: number; setDistance: (value: number) => void }) {
  return <div className="filter-fields"><label className="field"><span>Category</span><select value={props.category} onChange={(e) => props.setCategory(e.target.value)}><option>All</option><option>Vegetables</option><option>Fruits</option><option>Grains</option><option>Staples</option></select></label><label className="field"><span>Grade</span><select value={props.grade} onChange={(e) => props.setGrade(e.target.value)}><option>All</option><option>Grade A+</option><option>Grade A</option></select></label><label className="field"><span>Freshness</span><select value={props.freshness} onChange={(e) => props.setFreshness(e.target.value)}><option value="All">Any</option><option value="today">Harvested today</option><option value="week">This week</option></select></label><label className="field"><span>Availability</span><select value={props.availability} onChange={(e) => props.setAvailability(e.target.value)}><option value="available">In stock</option><option value="all">All stock states</option></select></label><label className="range-field"><span>Price up to <b>₹{props.maxPrice}/kg</b></span><input type="range" min="20" max="100" value={props.maxPrice} onChange={(e) => props.setMaxPrice(Number(e.target.value))} /></label><label className="range-field"><span>Distance up to <b>{props.distance} km</b></span><input type="range" min="20" max="100" value={props.distance} onChange={(e) => props.setDistance(Number(e.target.value))} /></label></div>
}
