import { ArrowRight, Check, ChevronDown, MapPin, Minus, Plus, ShoppingBag, Sprout, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { useToast } from '../../contexts/ToastContext'
import type { CropSegmentMath } from '../../services/marketMakerEngine'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { extractUserRegion, rankMarketMakerOpportunities } from '../../services/marketRankingService'
import { phase2Service } from '../../services/phase2Service'
import type { ConsumerProfileData, FarmerListing } from '../../types'

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

export function ConsumerMarketMakerDeal({ variant = 'home' }: { variant?: 'home' | 'page' }) {
  const [views, setViews] = useState<MarketView[]>([])
  const [activeBoardId, setActiveBoardId] = useState('')
  const [selectedCropId, setSelectedCropId] = useState('')
  const [quantityKg, setQuantityKg] = useState(5)
  const [profile, setProfile] = useState<ConsumerProfileData | null>(null)
  const [listings, setListings] = useState<FarmerListing[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const { showToast } = useToast()

  const load = async () => {
    try {
      const [marketViews, consumerProfile, activeListings] = await Promise.all([
        marketMakerService.boards(),
        phase2Service.consumerProfile(),
        phase2Service.listings(),
      ])
      setViews(marketViews.filter((view) => view.board.isMultiCrop))
      setProfile(consumerProfile)
      setListings(activeListings.filter((listing) => listing.status === 'active'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const sync = () => { void load() }
    window.addEventListener('kisanlink-state', sync)
    return () => window.removeEventListener('kisanlink-state', sync)
  }, [])

  const ranked = useMemo(() => {
    if (!views.length) return null
    return rankMarketMakerOpportunities(views, extractUserRegion('consumer', { consumerProfile: profile }))
  }, [profile, views])

  if (!ranked) return loading ? <div className={`consumer-mm-skeleton is-${variant}`} aria-label="Loading group buy" /> : null

  const current = (activeBoardId ? views.find((view) => view.board.id === activeBoardId) : undefined) ?? ranked.hero
  const { board, math } = current
  const cropMaths = math.multiCropMath?.cropMaths ?? []
  const cropMath: CropSegmentMath | undefined = cropMaths.length
    ? cropMaths.find((item) => item.segment.id === selectedCropId) ?? cropMaths[0]
    : undefined
  const cropId = cropMath?.segment.id ?? board.crops?.[0]?.id ?? 'seg_tomato'
  const cropName = cropMath?.segment.crop ?? board.crop
  const regularPrice = cropMath?.segment.buyerCurrentPerKg ?? board.buyerCurrentPerKg
  const pooledPrice = cropMath
    ? cropMath.deliveredPerKg || cropMath.segment.buyerCeilingPerKg
    : math.deliveredPerKg || board.buyerCeilingPerKg
  const savingsPerKg = Math.max(0, regularPrice - pooledPrice)
  const savingsPct = regularPrice > 0 ? Math.round((savingsPerKg / regularPrice) * 100) : 0
  const quantity = Math.max(1, Number(quantityKg) || 1)
  const totalSavings = Math.round(quantity * savingsPerKg)
  const remainingKg = Math.max(0, math.thresholdKg - math.committedKg)
  const progress = Math.min(100, Math.max(0, math.progressPct))
  const regionName = board.regions?.[0]?.name ?? 'NCR'
  const matched = ranked.userRegionMatched && ranked.matchedRegionName?.toLowerCase() === regionName.toLowerCase()
  const imageListing = listings.find((listing) => {
    const key = cropName.toLowerCase()
    return listing.crop.toLowerCase().includes(key) || key.includes(listing.crop.toLowerCase()) || listing.visual === board.visual
  })

  const changeQuantity = (delta: number) => setQuantityKg(Math.max(1, Math.min(50, quantity + delta)))

  const join = async () => {
    const listing = listings.find((item) => {
      if (cropId.includes('tomato')) return item.visual === 'tomato'
      if (cropId.includes('onion')) return item.visual === 'onion'
      if (cropId.includes('leaf')) return item.visual === 'leafy'
      if (cropId.includes('wheat')) return item.visual === 'grain'
      if (cropId.includes('potato')) return item.visual === 'potato'
      return item.crop.toLowerCase().includes(cropName.toLowerCase())
    })
    if (!listing) { showToast(`${cropName} is not available in the marketplace right now.`); return }
    if (phase2Service.cart().some((item) => item.listingId === listing.id && !item.isPooled)) {
      showToast(`${cropName} is already in your cart at the regular price. Remove it before joining the group buy.`)
      return
    }
    setBusy(true)
    try {
      await marketMakerService.commit(board.id, {
        source: 'consumer',
        party: profile?.name || 'Consumer group buy',
        detail: `${regionName} group buy, ${cropName}`,
        quantityKg: quantity,
        own: true,
        cropId,
      })
      phase2Service.addPooledToCart({
        listingId: listing.id,
        quantityKg: quantity,
        pooledPricePerKg: pooledPrice,
        regularPricePerKg: regularPrice,
        savingsPerKg,
        farmerGatePerKg: cropMath?.farmerFloorPerKg ?? board.farmerFloorPerKg,
        platformFeePerKg: cropMath?.platformFeePerKg ?? math.platformFeePerKg,
        freightPerKg: cropMath?.allocatedFreightPerKg ?? math.freightPerKg,
        boardId: board.id,
        cropId,
        regionId: board.regions?.[0]?.id ?? 'reg_ncr',
      })
      showToast(`${quantity} kg ${cropName} joined the group buy. You save ${money(totalSavings)}.`)
      await load()
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to join this group buy.')
    } finally { setBusy(false) }
  }

  if (variant === 'home') return (
    <section className="consumer-group-preview" aria-labelledby="consumer-mm-home">
      <div className="consumer-preview-heading"><h2 id="consumer-mm-home">Market Maker <small>Group buy</small></h2><span><MapPin size={14} />{regionName} pool</span></div>
      <div className="consumer-preview-price"><strong>{cropName}</strong><span>{money(pooledPrice)}<small>/kg</small></span>{savingsPct > 0 && <b>Save ~{savingsPct}%</b>}</div>
      <p>Nearby buyers fill one truck to reduce delivery and intermediary costs.</p>
      <Link className="btn btn-primary" to="/consumer/market">View group buy <ArrowRight size={16} /></Link>
    </section>
  )

  return (
    <section className={`consumer-mm-deal is-${variant}`} aria-labelledby={`consumer-mm-${variant}`}>
      <div className="consumer-pool-controls">
        <label><MapPin size={17} /><select aria-label="Choose group-buy pool" value={board.id} onChange={(event) => { setActiveBoardId(event.target.value); setSelectedCropId('') }}>{views.map((view) => <option key={view.board.id} value={view.board.id}>{view.board.regions?.[0]?.name ?? view.board.corridor} pool</option>)}</select></label>
        <div className="consumer-produce-options" aria-label="Produce available in this pool">{cropMaths.map((item) => <button type="button" aria-pressed={item.segment.id === cropId} key={item.segment.id} onClick={() => setSelectedCropId(item.segment.id)}>{item.segment.crop}</button>)}</div>
      </div>
      <div className="consumer-mm-visual">
        <ProductImage imageSrc={imageListing?.imageSrc ?? board.imageSrc} visual={imageListing?.visual ?? board.visual} alt={cropName} />
        <span className="consumer-mm-location"><MapPin size={14} />{matched ? `Best match for ${regionName}` : `${regionName} group buy`}</span>
      </div>

      <div className="consumer-mm-main">
        <div className="consumer-mm-heading">
          <div><h2 id={`consumer-mm-${variant}`}>{cropName}</h2></div>

        </div>

        <div className="consumer-mm-price">
          <strong>{money(pooledPrice)}<small>/kg</small></strong>
          <s aria-label={`Local retail ${money(regularPrice)} per kilogram`}>{money(regularPrice)}/kg local retail</s>
          {savingsPerKg > 0 && <span>Save {money(savingsPerKg)}/kg, {savingsPct}%</span>}
        </div>

        <div className="consumer-mm-progress-copy">
          <strong>{math.committedKg.toLocaleString('en-IN')} of {math.thresholdKg.toLocaleString('en-IN')} kg joined</strong>
          <span>{remainingKg > 0 ? `${remainingKg.toLocaleString('en-IN')} kg remaining to unlock` : <><Check size={14} /> Group buy unlocked</>}</span>
        </div>
        <div className="consumer-mm-progress" role="progressbar" aria-label="Group-buy progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>



        <div className="consumer-mm-buy-row">
          <span className="consumer-mm-delivery"><Truck size={17} /><span>Expected delivery<strong>{board.deliveryWindow}</strong></span></span>
          <div className="consumer-mm-quantity" aria-label="Quantity in kilograms">
            <button type="button" onClick={() => changeQuantity(-1)} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
            <strong>{quantity}<small> kg</small></strong>
            <button type="button" onClick={() => changeQuantity(1)} disabled={quantity >= 50} aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
          <button type="button" className="btn btn-primary consumer-mm-cta" onClick={join} disabled={busy || board.status === 'created'}><ShoppingBag size={18} />{busy ? 'Joining...' : board.status === 'created' ? 'Group buy complete' : `Join and save ${money(totalSavings)}`}</button>
        </div>

        <p className="consumer-mm-explainer">Nearby orders are pooled into one fuller truck, reducing delivery and intermediary cost.</p>
        <details className="consumer-mm-why">
          <summary>Why is this cheaper?<ChevronDown size={16} /></summary>
          <div className="consumer-mm-comparison">
            <p><span>Traditional</span><strong>Farmer {money(board.mandiPricePerKg)} <ArrowRight size={14} /> Consumer {money(regularPrice)}</strong></p>
            <p><span>KisanLink</span><strong>Farmer {money(cropMath?.farmerFloorPerKg ?? board.farmerFloorPerKg)} <ArrowRight size={14} /> Consumer {money(pooledPrice)}</strong></p>
          </div>
          <p>Pooling fills the truck and removes intermediary margins.</p>
          <p className="consumer-mm-farmer-gain"><Sprout size={15} />Farmers earn {money(Math.max(0, (cropMath?.farmerFloorPerKg ?? board.farmerFloorPerKg) - (cropMath?.mandiPricePerKg ?? board.mandiPricePerKg)))}/kg more than the local wholesale route.</p>
        </details>

      </div>

    </section>
  )
}
