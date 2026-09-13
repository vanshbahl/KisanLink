import { ArrowRight, BadgeCheck, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MarketplaceAiTrigger } from '../../components/ai/MarketplaceAiTrigger'
import { MarketplaceInsightResult } from '../../components/ai/MarketplaceInsightResult'
import { Sheet } from '../../components/farmer/Sheet'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ProductImage } from '../../components/ProductImage'
import { useAsyncData } from '../../hooks/useAsyncData'
import { supplyPoolScout } from '../../services/bulkIntelligenceService'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import { Empty, ErrorState, Field, PageHead, daysFromToday, kg, perKg, poolEstimate } from './shared'

type Pool = Awaited<ReturnType<typeof phase2Service.supplyPools>>[number]

const CORRIDORS = ['Any', 'Sonipat', 'Panipat', 'Karnal', 'Rohtak', 'Meerut', 'Jhajjar']
const WINDOWS = [
  { value: 'any', label: 'Any time' },
  { value: '1', label: 'Within 24 hours' },
  { value: '2', label: 'Within 48 hours' },
  { value: '7', label: 'This week' },
]
const SORTS = [
  { value: 'match', label: 'Best match' },
  { value: 'landed', label: 'Lowest landed ₹/kg' },
  { value: 'saving', label: 'Biggest saving' },
  { value: 'quantity', label: 'Most quantity' },
  { value: 'dispatch', label: 'Earliest dispatch' },
]

interface Filters { grade: string; minKg: number; maxPrice: number; maxMoq: number; corridor: string; window: string }
const DEFAULT_FILTERS: Filters = { grade: 'Any', minKg: 0, maxPrice: 80, maxMoq: 1000, corridor: 'Any', window: 'any' }

/**
 * Supply: a B2B marketplace of verified pooled lots.
 *
 * Search, category chips, one Filters button and a sort control stay on the page; the six
 * advanced filters live in a sheet, so the phone view is a list of cards and not a form.
 */
export function BulkSupplyPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('match')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [pools, listings, state] = await Promise.all([phase2Service.supplyPools(), phase2Service.listings(), prototypeService.getState()])
    return { pools: pools.map((pool) => ({ ...pool, estimate: poolEstimate(pool, listings, state.vehicles) })), listings }
  }, [], { live: true })

  const categories = useMemo(() => ['All', ...new Set((data?.pools ?? []).map((pool) => pool.matchingListings[0]?.category ?? 'Vegetables'))], [data])

  const pools = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = (pool: Pool) => !needle
      || pool.product.toLowerCase().includes(needle)
      || pool.corridor.toLowerCase().includes(needle)
      || pool.matchingListings.some((listing) => listing.farm.toLowerCase().includes(needle))
    return (data?.pools ?? [])
      .filter((pool) => matches(pool)
        && (category === 'All' || (pool.matchingListings[0]?.category ?? 'Vegetables') === category)
        && (filters.grade === 'Any' || pool.grade === filters.grade)
        && pool.totalQuantityKg >= filters.minKg
        && pool.startingPrice <= filters.maxPrice
        && pool.moqKg <= filters.maxMoq
        && (filters.corridor === 'Any' || pool.corridor.includes(filters.corridor))
        && (filters.window === 'any' || daysFromToday(pool.dispatch) <= Number(filters.window)))
      .sort((a, b) => sort === 'landed' ? a.estimate.landedPerKg - b.estimate.landedPerKg
        : sort === 'saving' ? b.estimate.savingPerKg - a.estimate.savingPerKg
          : sort === 'quantity' ? b.totalQuantityKg - a.totalQuantityKg
            : sort === 'dispatch' ? a.dispatch.localeCompare(b.dispatch)
              : b.matchingListings.length - a.matchingListings.length)
  }, [data, query, category, filters, sort])

  const activeFilters = (Object.keys(DEFAULT_FILTERS) as Array<keyof Filters>).filter((key) => filters[key] !== DEFAULT_FILTERS[key]).length

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Could not load supply" onRetry={refresh} />

  return (
    <div className="page b-page b-supply">
      <PageHead title="Supply" copy="Verified pooled lots across the NCR corridor, priced landed at your dock." />

      <div className="b-toolbar">
        <label className="b-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Search crop, farmer or corridor" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search supply" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
        </label>
        <div className="b-toolbar-row">
          <div className="b-chips" role="tablist" aria-label="Category">
            {categories.map((item) => (
              <button type="button" key={item} role="tab" aria-selected={category === item} className={category === item ? 'is-on' : ''} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          <div className="b-toolbar-controls">
            <button type="button" className={`b-filter-btn${activeFilters ? ' is-active' : ''}`} onClick={() => { setDraft(filters); setSheetOpen(true) }}>
              <SlidersHorizontal size={15} /> Filters{activeFilters ? <b>{activeFilters}</b> : null}
            </button>
            <label className="b-sort">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort supply">
                {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      {pools.length > 1 && (
        <MarketplaceAiTrigger
          variant="inline"
          className="b-scout"
          idleLabel="Scout"
          idleHint={`Which of these ${pools.length} pools should you open first?`}
          stages={['Comparing pooled depth', 'Comparing farm-gate rates', 'Checking minimum orders', 'Checking dispatch readiness']}
          run={() => supplyPoolScout(pools)}
          renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.href ? navigate(insight.href) : reset()} footer="Compares only the pools left by your current search and filters." />}
        />
      )}

      {pools.length ? (
        <div className="b-supply-grid">
          {pools.map((pool) => <SupplyCard key={pool.id} pool={pool} />)}
        </div>
      ) : (
        <Empty title="No supply matches" copy="Try a wider price, quantity or corridor." action={<button className="btn btn-secondary" onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(''); setCategory('All') }}>Clear filters</button>} />
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter supply"
        footer={(
          <div className="b-sheet-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(DEFAULT_FILTERS)}>Reset</button>
            <button type="button" className="btn btn-primary" onClick={() => { setFilters(draft); setSheetOpen(false) }}>Show results</button>
          </div>
        )}
      >
        <div className="b-filter-grid">
          <Field label="Grade">
            <div className="segmented" role="radiogroup" aria-label="Grade">
              {['Any', 'Grade A+', 'Grade A'].map((grade) => (
                <button type="button" key={grade} role="radio" aria-checked={draft.grade === grade} className={draft.grade === grade ? 'is-on' : ''} onClick={() => setDraft({ ...draft, grade })}>{grade}</button>
              ))}
            </div>
          </Field>
          <Field label="Minimum pooled quantity" htmlFor="flt-min">
            <div className="unit-input"><input id="flt-min" type="number" inputMode="numeric" min={0} max={20000} step={100} value={draft.minKg} onChange={(event) => setDraft({ ...draft, minKg: Number(event.target.value) })} /><span>kg</span></div>
          </Field>
          <Field label="Maximum farm-gate price" htmlFor="flt-price">
            <div className="unit-input has-prefix"><span className="unit-prefix">₹</span><input id="flt-price" type="number" inputMode="numeric" min={10} max={200} step={1} value={draft.maxPrice} onChange={(event) => setDraft({ ...draft, maxPrice: Number(event.target.value) })} /><span>/kg</span></div>
          </Field>
          <Field label="Maximum minimum order (MOQ)" htmlFor="flt-moq">
            <div className="unit-input"><input id="flt-moq" type="number" inputMode="numeric" min={100} max={5000} step={100} value={draft.maxMoq} onChange={(event) => setDraft({ ...draft, maxMoq: Number(event.target.value) })} /><span>kg</span></div>
          </Field>
          <Field label="Corridor" htmlFor="flt-corridor">
            <select id="flt-corridor" value={draft.corridor} onChange={(event) => setDraft({ ...draft, corridor: event.target.value })}>
              {CORRIDORS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Dispatch window" htmlFor="flt-window">
            <select id="flt-window" value={draft.window} onChange={(event) => setDraft({ ...draft, window: event.target.value })}>
              {WINDOWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
        </div>
      </Sheet>
    </div>
  )
}

function SupplyCard({ pool }: { pool: Pool & { estimate: ReturnType<typeof poolEstimate> } }) {
  const range = pool.startingPrice === pool.priceMax ? `₹${pool.startingPrice}/kg` : `₹${pool.startingPrice}–₹${pool.priceMax}/kg`
  return (
    <article className="b-supply-card">
      <ProductImage imageSrc={pool.imageSrc} alt="" visual={pool.visual} size="mini" />
      <div className="b-supply-card-body">
        <header>
          <h3>{pool.product} <span>· {pool.grade}</span></h3>
          <span className="b-verified"><BadgeCheck size={13} /> {pool.farmerCount} verified farm{pool.farmerCount === 1 ? '' : 's'}</span>
        </header>
        <dl className="b-supply-facts">
          <div><dt>Available</dt><dd>{kg(pool.totalQuantityKg)}</dd></div>
          <div><dt>Farm gate</dt><dd>{range}</dd></div>
          <div><dt>MOQ</dt><dd>{kg(pool.moqKg)}</dd></div>
          <div><dt>Corridor</dt><dd>{pool.corridor}</dd></div>
        </dl>
        <div className="b-supply-landed">
          <div><small>Est. landed</small><strong>{perKg(pool.estimate.landedPerKg)}</strong></div>
          {pool.estimate.savingPerKg > 0 && <div className="b-good"><small>Est. saving</small><strong>₹{pool.estimate.savingPerKg.toFixed(2)}/kg</strong></div>}
          <small className="b-supply-dispatch"><Users size={12} /> {pool.readiness}</small>
        </div>
        <Link className="btn btn-secondary" to={`/bulk/supply/${pool.id}`}>View pool <ArrowRight size={15} /></Link>
      </div>
    </article>
  )
}
