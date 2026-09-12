import { useEffect, useState } from 'react'
import { ArrowRight, Copy, Edit3, Eye, Layers, PackageOpen, Pause, Play, Plus, SlidersHorizontal, Sprout, Trash2, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { farmerText } from '../i18n/farmerFeature'
import { prototypeService } from '../services/prototypeService'
import type { FarmerListing, ListingStatus } from '../types'

const tabs: ListingStatus[] = ['active', 'draft', 'paused', 'sold']
const keys = { active: 'active', draft: 'draft', paused: 'paused', sold: 'sold', unavailable: 'unavailable' } as const

export function FarmerProducePage() {
  const { language, t } = useLanguage()
  const f = (key: Parameters<typeof farmerText>[1]) => farmerText(language, key)
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<FarmerListing[] | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const tab = (params.get('tab') as ListingStatus) || 'active'

  const load = () => prototypeService.getListings().then(setItems)
  useEffect(() => {
    load()
    const handleSync = () => load()
    window.addEventListener('kisanlink-state', handleSync)
    return () => window.removeEventListener('kisanlink-state', handleSync)
  }, [])

  const patch = async (id: string, status: ListingStatus) => {
    await prototypeService.patchListing(id, { status })
    showToast(f('listingUpdated'))
    load()
  }

  const updateQuantity = async (item: FarmerListing) => {
    const answer = window.prompt(f('updateQuantity'), String(item.remainingKg))
    if (!answer) return
    const value = Number(answer)
    if (!Number.isFinite(value) || value < 0) return
    await prototypeService.patchListing(item.id, { remainingKg: value, quantityKg: value + item.allocatedKg })
    showToast(f('listingUpdated'))
    load()
  }

  const remove = async (id: string) => {
    if (!window.confirm(f('confirmDelete'))) return
    await prototypeService.deleteListing(id)
    load()
  }

  const duplicate = async (id: string) => {
    await prototypeService.duplicateListing(id)
    showToast(f('draftSaved'))
    setParams({ tab: 'draft' })
    load()
  }

  if (!items) return <DashboardSkeleton />
  const visible = items.filter((item) => item.status === tab && `${item.crop} ${item.cropHi}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page farmer-feature-page">
      <div className="page-title-row produce-page-title">
        <div>
          <span className="eyebrow">{f('demoBadge')}</span>
          <h1>{t('myProduce')}</h1>
          <p>{f('allProduce')}</p>
        </div>
        <button className="icon-button" aria-label={f('filter')} onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <Link className="produce-sell-callout" to="/farmer/sell">
        <span><Plus size={22} /></span>
        <div>
          <h2>{f('sellTitle')}</h2>
          <p>{t('fairPricePickup')}</p>
        </div>
        <ArrowRight size={20} />
      </Link>

      {filtersOpen && (
        <div className="filter-panel">
          <label className="field">
            <span>{f('search')}</span>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={f('searchCrop')} />
          </label>
          <button className="btn btn-ghost" onClick={() => setSearch('')}>{f('clearFilters')}</button>
        </div>
      )}

      <div className="tab-strip">
        {tabs.map((key) => (
          <button className={tab === key ? 'active' : ''} key={key} onClick={() => setParams({ tab: key })}>
            {f(keys[key])}
            <span>{items.filter((item) => item.status === key).length}</span>
          </button>
        ))}
      </div>

      <div className="produce-manage-grid">
        {visible.map((item) => {
          const isMmCommitted = Boolean(item.marketMakerId || (item.marketMakerCommittedKg && item.marketMakerCommittedKg > 0))
          const mmKg = item.marketMakerCommittedKg ?? item.allocatedKg

          return (
            <article className="manage-card" key={item.id}>
              <div className="manage-card-top">
                <ProductImage imageSrc={item.imageSrc} alt={item.crop} visual={item.visual} size="mini" />
                <div>
                  <div className="status-line" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
                    <StatusBadge tone={item.status === 'draft' ? 'amber' : item.status === 'paused' ? 'soil' : 'green'}>
                      {isMmCommitted && item.status === 'active'
                        ? 'ACTIVE / MARKET MAKER COMMITTED'
                        : f(keys[item.status])}
                    </StatusBadge>
                    {isMmCommitted && (
                      <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.72rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Layers size={11} /> {item.marketMakerName || 'Market Maker'}
                      </span>
                    )}
                    {item.assisted && <small>{f('callCenterBadge')}</small>}
                  </div>

                  <h2>{language === 'hi' ? item.cropHi : item.crop}</h2>

                  {/* Synchronized Volume Breakdown */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', margin: '0.4rem 0', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '0.2rem' }}>
                      <span>{language === 'hi' ? 'कुल लिस्टेड:' : 'Total Listed:'}</span>
                      <strong>{item.quantityKg} kg</strong>
                    </div>
                    {isMmCommitted && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 600, marginBottom: '0.2rem' }}>
                        <span>{language === 'hi' ? 'मार्केट मेकर:' : 'Market Maker:'}</span>
                        <strong>{mmKg} kg</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                      <span>{language === 'hi' ? 'उपलब्ध स्टॉक:' : 'Available:'}</span>
                      <strong>{item.remainingKg} kg</strong>
                    </div>
                    {isMmCommitted && (
                      <div style={{ marginTop: '0.35rem', paddingTop: '0.3rem', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                        {language === 'hi' ? 'प्रतिबद्ध:' : 'Committed to:'} <strong style={{ color: '#0f172a' }}>{item.marketMakerName || item.marketMakerId}</strong>
                      </div>
                    )}
                  </div>

                  <strong>₹{item.pricePerKg}{f('priceUnit')}</strong>
                </div>
              </div>

              <div className="listing-stats">
                <span><Eye size={15} />{item.views} {f('views')}</span>
                <span>{item.inquiries} {f('inquiries')}</span>
                <small>{item.createdAt}</small>
              </div>

              <div className="manage-actions">
                <Link to={`/farmer/produce/${item.id}`}><Eye size={16} />{f('manage')}</Link>
                <Link to={`/farmer/sell?edit=${item.id}`}><Edit3 size={16} />{f('edit')}</Link>
                <button onClick={() => updateQuantity(item)}><PackageOpen size={16} />{f('updateQuantity')}</button>
                {item.status === 'active' && <button onClick={() => patch(item.id, 'paused')}><Pause size={16} />{f('pause')}</button>}
                {item.status === 'paused' && <button onClick={() => patch(item.id, 'active')}><Play size={16} />{f('resume')}</button>}
                {item.status === 'draft' && <button onClick={() => patch(item.id, 'active')}><Sprout size={16} />{f('publish')}</button>}
                <button onClick={() => duplicate(item.id)}><Copy size={16} />{f('duplicate')}</button>
                {item.status !== 'unavailable' && <button onClick={() => patch(item.id, 'unavailable')}><XCircle size={16} />{f('markUnavailable')}</button>}
                <button className="danger" onClick={() => remove(item.id)}><Trash2 size={16} />{f('delete')}</button>
              </div>
            </article>
          )
        })}
        {!visible.length && (
          <div className="empty-feature">
            <Sprout size={34} />
            <h2>{search ? f('noResults') : f('noListings')}</h2>
            <Link className="btn btn-primary" to="/farmer/sell">{f('sellTitle')}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
