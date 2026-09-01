import { ArrowRight, MapPin, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { farmersById } from '../data/farmers'
import type { ProduceListing } from '../types'
import { ProduceArtwork } from './ProduceArtwork'
import { StatusBadge } from './StatusBadge'

export function ProductCard({ listing }: { listing: ProduceListing }) {
  const farmer = farmersById[listing.farmerId]
  return (
    <article className="product-card">
      <div className="product-visual">
        <ProduceArtwork emoji={listing.emoji} visual={listing.visual} />
        <StatusBadge tone="green">{listing.freshness}</StatusBadge>
      </div>
      <div className="product-content">
        <div className="product-title-row"><div><h3>{listing.product}</h3><p>{farmer.farmName}</p></div><StatusBadge tone="neutral">{listing.grade}</StatusBadge></div>
        <p className="product-location"><MapPin size={15} />{farmer.location} · {listing.distanceKm} km</p>
        <div className="product-price-row">
          <div><strong>₹{listing.pricePerKg}</strong><span>/kg</span><small>Market ₹{listing.marketPricePerKg}</small></div>
          <Link to={`/consumer/listing/${listing.id}`} className="btn btn-small">View <ArrowRight size={16} /></Link>
        </div>
        <p className="product-available"><Scale size={15} />{listing.availableKg.toLocaleString('en-IN')} kg available</p>
      </div>
    </article>
  )
}
