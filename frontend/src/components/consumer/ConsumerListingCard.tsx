import { BadgeCheck, Heart, MapPin, Plus, Sprout } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import { phase2Service } from '../../services/phase2Service'
import type { FarmerListing } from '../../types'
import { localDay } from '../../utils/dates'
import { consumerPrice } from '../ConsumerPrice'
import { ProductImage } from '../ProductImage'

const FARM_ORIGINS: Record<string, { label: string; km: number }> = {
  'Green Field Farm': { label: 'Murthal, Sonipat', km: 42 },
  'Sunehri Khet': { label: 'Karnal, Haryana', km: 121 },
  'Yadav Fresh Fields': { label: 'Panipat, Haryana', km: 89 },
  'Malik Family Farm': { label: 'Rohtak, Haryana', km: 68 },
  'Doaba Harvests': { label: 'Samalkha, Panipat', km: 74 },
  'Ganga Plains Farm': { label: 'Meerut, Uttar Pradesh', km: 79 },
  'Rana Vegetable Farm': { label: 'Kharkhoda, Sonipat', km: 47 },
}

export const farmOrigin = (farm: string) => FARM_ORIGINS[farm] ?? { label: 'Sonipat, Haryana', km: 42 }

export function ConsumerListingCard({ listing }: { listing: FarmerListing }) {
  const { language } = useLanguage()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  useEffect(() => { void phase2Service.saved().then((data) => setSaved(data.listingIds.includes(listing.id))) }, [listing.id])

  const rescue = Boolean(listing.isUrgentRescue || listing.rescueStatus === 'RESCUE_ACTIVE')
  const rescuePrice = listing.rescueDiscountPricePerKg ?? Math.round(listing.pricePerKg * 0.8)
  const price = consumerPrice({ pricePerKg: listing.pricePerKg, retailPricePerKg: listing.retailPricePerKg, rescuePricePerKg: rescue ? rescuePrice : undefined })
  const origin = farmOrigin(listing.farm)
  const freshToday = listing.harvestDate === localDay()
  const out = listing.status !== 'active' || listing.remainingKg === 0
  const low = !out && listing.remainingKg <= 20
  const badge = rescue ? 'Rescue deal' : out ? 'Out of stock' : low ? 'Low stock' : freshToday ? 'Fresh today' : ''

  const add = () => {
    if (out) return
    const inCart = phase2Service.cart().find((item) => item.listingId === listing.id)?.quantityKg ?? 0
    if (inCart >= listing.remainingKg) { showToast(`Only ${listing.remainingKg} kg ${listing.crop} is available.`); return }
    phase2Service.addToCart(listing.id, 1)
    showToast(`1 kg ${listing.crop} added to cart`)
  }

  return (
    <article className="consumer-product-card">
      <div className="consumer-product-image">
        <Link to={`/consumer/listing/${listing.id}`} aria-label={`View ${listing.crop}`}>
          <ProductImage imageSrc={listing.imageSrc} alt={listing.crop} visual={listing.visual} />
        </Link>
        {badge && <span className={`consumer-product-badge ${rescue ? 'is-rescue' : low || out ? 'is-low' : ''}`}>{badge}</span>}
        <button className={`save-float ${saved ? 'active' : ''}`} aria-label={saved ? 'Remove from saved' : 'Save produce'} aria-pressed={saved} onClick={async () => setSaved((await phase2Service.toggleSavedListing(listing.id)).includes(listing.id))}>
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="consumer-product-copy">
        <Link to={`/consumer/listing/${listing.id}`} className="consumer-product-name">
          <h3>{language === 'hi' ? listing.cropHi : listing.crop}</h3>
        </Link>
        <div className="consumer-product-price">
          <strong>₹{price.price}<small>/kg</small></strong>
          {price.cheaper && <s aria-label={`Local retail ₹${price.retail} per kilogram`}>₹{price.retail}</s>}
        </div>
        {price.cheaper ? <p className="consumer-product-saving">Save ₹{price.savingPerKg}/kg vs local retail</p> : <p className="consumer-product-saving is-neutral">Local retail ₹{price.retail}/kg</p>}
        <p className="consumer-product-freshness"><Sprout size={15} />{freshToday ? 'Harvested today' : `Harvested ${new Date(`${listing.harvestDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
        <p className="consumer-product-farm"><BadgeCheck size={15} />{listing.farm}<span><MapPin size={13} />{origin.km} km</span></p>
        <div className="consumer-product-foot">
          <span>{listing.overviewPhotos?.length ? 'Quality checked' : 'Verified farm'}</span>
          <button className="consumer-add-button" type="button" disabled={out} onClick={add}>{out ? 'Sold out' : <><Plus size={17} /> Add</>}</button>
        </div>
      </div>
    </article>
  )
}
