import { AlertTriangle, ArrowLeft, BadgeCheck, ChevronDown, Heart, MapPin, Minus, PackageSearch, Plus, Scale, ShieldCheck, Sprout } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MarketplaceAiTrigger } from '../components/ai/MarketplaceAiTrigger'
import { MarketplaceInsightResult } from '../components/ai/MarketplaceInsightResult'
import { farmOrigin } from '../components/consumer/ConsumerListingCard'
import { consumerPrice } from '../components/ConsumerPrice'
import { CustodyTimeline } from '../components/inspection/CustodyTimeline'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { prettyWhen } from '../components/maps/CorridorRouteMap'
import { ProductImage } from '../components/ProductImage'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { smartBuy } from '../services/consumerIntelligenceService'
import { inspectionService } from '../services/inspectionService'
import { phase2Service } from '../services/phase2Service'
import type { LotTrail } from '../types'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { showToast } = useToast()
  const { data, loading, error } = useAsyncData(() => phase2Service.listing(id), [id])
  const [quantity, setQuantity] = useState(1)
  const [saved, setSaved] = useState(false)
  const [trail, setTrail] = useState<LotTrail>()

  useEffect(() => { void phase2Service.saved().then((value) => setSaved(value.listingIds.includes(id))) }, [id])
  useEffect(() => { if (data?.lotCode) void inspectionService.getLotTrail(data.lotCode).then(setTrail) }, [data?.lotCode])
  if (loading) return <DashboardSkeleton />
  if (!data || error) return <div className="error-panel"><h2>Listing unavailable</h2><p>This produce may have been paused or sold.</p><Link className="btn btn-primary" to="/consumer#marketplace">Browse fresh produce</Link></div>

  const out = data.status !== 'active' || data.remainingKg === 0
  const low = data.remainingKg > 0 && data.remainingKg <= 20
  const title = language === 'hi' ? data.cropHi : data.crop
  const rescue = Boolean(data.isUrgentRescue || data.rescueStatus === 'RESCUE_ACTIVE')
  const rescuePrice = data.rescueDiscountPricePerKg ?? Math.round(data.pricePerKg * 0.8)
  const price = consumerPrice({ pricePerKg: data.pricePerKg, retailPricePerKg: data.retailPricePerKg, rescuePricePerKg: rescue ? rescuePrice : undefined })
  const origin = farmOrigin(data.farm)
  const activePrice = price.price

  const add = (buyNow = false) => {
    if (quantity < 1 || quantity > data.remainingKg) return
    phase2Service.addToCart(data.id, quantity)
    showToast(`${quantity} kg ${data.crop} added to cart`)
    if (buyNow) navigate('/consumer/checkout')
  }

  return (
    <div className="page consumer-detail-page">
      <Link to="/consumer#marketplace" className="back-link"><ArrowLeft size={17} />Back to marketplace</Link>
      <div className="consumer-detail-main">
        <div className="consumer-detail-image"><ProductImage imageSrc={data.imageSrc} alt={title} visual={data.visual} size="hero" />{(rescue || low || out) && <span className={`consumer-detail-badge ${rescue ? 'is-rescue' : ''}`}>{rescue ? 'Rescue deal' : out ? 'Out of stock' : 'Low stock'}</span>}</div>

        <section className="consumer-detail-buy">
          <div className="consumer-detail-title"><div><h1>{title}</h1><p><BadgeCheck size={17} />{data.farm}<span>Verified</span></p></div><button className={`icon-button ${saved ? 'active' : ''}`} aria-label="Save produce" aria-pressed={saved} onClick={async () => setSaved((await phase2Service.toggleSavedListing(data.id)).includes(data.id))}><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button></div>
          <p className="consumer-detail-location"><MapPin size={16} />{origin.label}<span>{origin.km} km away</span></p>

          <div className="consumer-detail-fresh"><Sprout size={18} /><span><strong>Harvested {new Date(`${data.harvestDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong><small>Expected farm-to-door journey: 1 to 2 days</small></span></div>

          {rescue && <div className="consumer-detail-rescue"><AlertTriangle size={18} /><span><strong>Rescue price is active</strong><small>Best for near-term use and priced to prevent spoilage.</small></span></div>}

          <div className="consumer-detail-price"><p><strong>₹{price.price}</strong><span>/kg</span>{price.cheaper && <s>₹{price.retail}</s>}</p>{price.cheaper ? <b>Save ₹{price.savingPerKg}/kg, {price.savingPct}% vs local retail</b> : <b className="is-neutral">Local retail ₹{price.retail}/kg</b>}</div>

          <div className="consumer-detail-stock"><Scale size={17} /><strong>{data.remainingKg.toLocaleString('en-IN')} kg available</strong>{low && <span>Limited stock</span>}</div>

          <div className="consumer-detail-quantity"><span>Quantity</span><div className="qty-stepper"><button disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)} aria-label="Decrease quantity"><Minus size={17} /></button><strong>{quantity} kg</strong><button disabled={quantity >= data.remainingKg} onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity"><Plus size={17} /></button></div></div>
          <div className="consumer-detail-actions"><button className="btn btn-secondary btn-large" disabled={out} onClick={() => add(false)}>Add to cart</button><button className="btn btn-primary btn-large" disabled={out} onClick={() => add(true)}>Buy now</button></div>

          <div className="consumer-detail-ai">
            <MarketplaceAiTrigger
              variant="inline"
              className="consumer-ai-compact"
              idleLabel="Check this listing"
              idleHint="Check freshness, value, distance and quality"
              stages={rescue ? ['Checking rescue price', 'Comparing local retail', 'Reviewing harvest timing', 'Checking available stock', 'Preparing rescue check'] : ['Comparing asking price', 'Comparing local retail', 'Reviewing harvest date', 'Checking stock and grade', 'Preparing value check']}
              run={() => smartBuy(data)}
              renderResult={(insight, reset) => {
                const factor = (label: string) => insight.factors.find((item) => item.label === label)?.value ?? ''
                return <MarketplaceInsightResult {...insight} factors={[{ label: 'Freshness', value: factor('Harvest') }, { label: 'Price and value', value: factor('Local retail') }, { label: 'Distance', value: `${origin.km} km from ${origin.label}` }, { label: 'Quality', value: factor('Grade & farm') }]} onClose={reset} onCta={() => { const amount = Math.min(3, data.remainingKg); phase2Service.addToCart(data.id, amount); showToast(`${amount} kg ${data.crop} added to cart`) }} footer="Uses local retail price, harvest date, distance, stock, grade and verification." />
              }}
            />
          </div>
        </section>
      </div>

      <div className="consumer-detail-secondary">
        {trail && trail.stages.length > 0 && <details><summary><PackageSearch size={18} /><span><strong>Quality trail</strong><small>Inspection and custody checkpoints</small></span><ChevronDown size={17} /></summary><div className="consumer-detail-disclosure"><CustodyTimeline trail={trail} /></div></details>}
        <details><summary><Sprout size={18} /><span><strong>Farm story</strong><small>{data.farm}</small></span><ChevronDown size={17} /></summary><div className="consumer-detail-disclosure"><p>{data.notes || 'A verified nearby farmer supplying carefully sorted seasonal produce.'}</p><div className="consumer-detail-tags"><span>{data.farmingMethod}</span><span>Identity verified</span><span>Ready {prettyWhen(data.availableFrom)}</span></div></div></details>
        <details><summary><ShieldCheck size={18} /><span><strong>Where your money goes</strong><small>Transparent price split</small></span><ChevronDown size={17} /></summary><div className="consumer-detail-disclosure"><div className="price-rows"><span>Farmer share <b>₹{Math.round(activePrice * .9)}</b></span><span>Platform amount <b>₹{Math.round(activePrice * .03)}</b></span><span>Indicative logistics <b>₹{Math.round(activePrice * .07)}</b></span></div><p>Final logistics are calculated across your basket.</p></div></details>
      </div>
    </div>
  )
}
