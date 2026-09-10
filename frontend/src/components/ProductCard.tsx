import { ArrowRight, MapPin, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { farmersById } from '../data/farmers'
import type { ProduceListing } from '../types'
import { ProductImage } from './ProductImage'
import { StatusBadge } from './StatusBadge'
import { freshnessKey } from '../i18n'
import { useLanguage } from '../contexts/LanguageContext'
import { ConsumerPriceBlock } from './ConsumerPrice'

export function ProductCard({ listing }: { listing: ProduceListing }) {
  const { t, language } = useLanguage()
  const farmer = farmersById[listing.farmerId]
  const productName = language === 'hi' && listing.productHi ? listing.productHi : listing.product
  return (
    <article className="product-card">
      <div className="product-visual">
        <ProductImage imageSrc={listing.imageSrc} alt={productName} visual={listing.visual} />
        <StatusBadge tone="green">{t(freshnessKey[listing.freshness] ?? 'freshToday')}</StatusBadge>
      </div>
      <div className="product-content">
        <div className="product-title-row"><div><h3>{productName}</h3><p>{farmer.farmName}</p></div><StatusBadge tone="neutral">{listing.grade}</StatusBadge></div>
        <p className="product-location"><MapPin size={15} />{farmer.location} · {listing.distanceKm} km</p>
        <div className="product-price-row">
          {/* `marketPricePerKg` on this shape is the local retail reference, never a mandi rate. */}
          <ConsumerPriceBlock listing={{ pricePerKg: listing.pricePerKg, retailPricePerKg: listing.marketPricePerKg }} />
          <Link to={`/consumer/listing/${listing.id}`} className="btn btn-small">{t('viewListing')} <ArrowRight size={16} /></Link>
        </div>
        <p className="product-available"><Scale size={15} />{t('kgAvailable', { count: listing.availableKg.toLocaleString('en-IN') })}</p>
      </div>
    </article>
  )
}
