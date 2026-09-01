import { ArrowLeft, BadgeCheck, Clock3, MapPin, Scale, ShieldCheck, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { PriceTransparency } from '../components/PriceTransparency'
import { ProduceArtwork } from '../components/ProduceArtwork'
import { StatusBadge } from '../components/StatusBadge'
import { farmersById } from '../data/farmers'
import { useAsyncData } from '../hooks/useAsyncData'
import { marketplaceService } from '../services/marketplaceService'
import { useToast } from '../contexts/ToastContext'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const { data, loading } = useAsyncData(() => marketplaceService.getListing(id), [id])
  if (loading) return <DashboardSkeleton />
  if (!data) return <div className="error-panel"><h2>This produce listing is no longer available.</h2><Link className="btn btn-primary" to="/consumer/explore">Browse fresh produce</Link></div>
  const farmer = farmersById[data.farmerId]
  return (
    <div className="page listing-detail-page">
      <Link to="/consumer/explore" className="back-link"><ArrowLeft size={17} /> Back to marketplace</Link>
      <div className="listing-detail-grid">
        <ProduceArtwork emoji={data.emoji} visual={data.visual} size="hero" />
        <section className="listing-detail-copy">
          <StatusBadge tone="green">{data.freshness}</StatusBadge>
          <h1>{data.product}</h1>
          <p className="listing-farm"><BadgeCheck size={18} /> {farmer.farmName} · Verified farmer</p>
          <p className="listing-location"><MapPin size={17} /> {farmer.location} · {data.distanceKm} km away</p>
          <div className="listing-price"><strong>₹{data.pricePerKg}</strong><span>/kg</span><small>Typical market price ₹{data.marketPricePerKg}/kg</small></div>
          <div className="listing-facts"><span><Scale size={18} /><strong>{data.availableKg} kg</strong><small>Available now</small></span><span><Clock3 size={18} /><strong>Today</strong><small>Harvested</small></span><span><Truck size={18} /><strong>1–2 days</strong><small>Estimated delivery</small></span></div>
          <button className="btn btn-primary btn-large btn-full" onClick={() => showToast('Cart and checkout arrive in the next prototype phase')}>Reserve interest</button>
          <p className="listing-assurance"><ShieldCheck size={17} /> No payment is collected in this Phase 1 prototype.</p>
        </section>
      </div>
      <div className="listing-lower-grid"><PriceTransparency compact /><article className="farm-story"><span className="eyebrow">Meet the grower</span><h2>{farmer.name}</h2><p>{farmer.farmName} has been growing seasonal produce for {farmer.yearsFarming} years. Every KisanLink batch keeps its farm origin visible.</p><div><span>🌱 {farmer.yearsFarming} years farming</span><span>✓ Identity verified</span></div></article></div>
    </div>
  )
}
