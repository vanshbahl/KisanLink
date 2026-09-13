import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { CropActions } from './CropActions'
import { FreshnessRing } from './FreshnessRing'
import { useFarmerText, money } from '../../i18n/farmer'
import { suggestedPriceFor, type CropDeal, type FarmerDeal } from '../../services/farmerDeal'
import { isRescueActive } from '../../services/farmerRescue'
import type { FarmerListing, ListingStatus } from '../../types'

/**
 * One crop, as a farmer thinks about it: what it is, how much is left, what it fetches, and
 * the single thing worth doing about it right now.
 *
 * The whole card body is the link to the crop, so the tap target is the crop itself. The
 * action row underneath comes from `CropActions`, which the crop page reuses — one verb, one
 * `⋯` sheet, one behaviour to learn.
 */
export function CropCard({ item, deal, cropDeal = null, onChanged }: {
  item: FarmerListing
  deal: FarmerDeal | null
  /** This crop's own Market Maker read, when the list has already fetched it. */
  cropDeal?: CropDeal | null
  onChanged: () => void
}) {
  const { f, pick } = useFarmerText()
  const crop = pick(item.crop, item.cropHi)
  const rescue = isRescueActive(item)
  const rescuePrice = item.rescueDiscountPricePerKg ?? item.pricePerKg
  // The crop's own deal wins over the farm-wide one; either way only a price that actually
  // beats today's ask is shown — a "suggestion" at or below it is noise on a list.
  const suggestion = rescue ? null
    : cropDeal && cropDeal.pricePerKg > item.pricePerKg ? cropDeal.pricePerKg
      : suggestedPriceFor(item, deal)

  const statusLabel: Record<ListingStatus, string> = {
    active: rescue ? f('sellItFastOn') : f('statusOnSale'),
    draft: f('statusDraft'),
    paused: f('statusPaused'),
    sold: f('statusSold'),
    unavailable: f('statusStopped'),
  }

  return (
    <article className={`f-crop${rescue ? ' is-fast' : ''}`}>
      <Link className="f-crop-main" to={`/farmer/fasal/${item.id}`}>
        <ProductImage imageSrc={item.imageSrc} visual={item.visual} alt={item.crop} size="mini" />
        <div className="f-crop-copy">
          <span className={`f-crop-status is-${item.status}${rescue ? ' is-fast' : ''}`}>{statusLabel[item.status]}</span>
          <h2>{crop}</h2>
          {item.status === 'sold'
            ? <p>{f('soldFor', { amount: money(item.quantityKg * item.pricePerKg) })}</p>
            : <p>{f('kgLeft', { qty: item.remainingKg })}</p>}
          <div className="f-crop-price">
            <strong>₹{rescue ? rescuePrice : item.pricePerKg}<small>{f('perKg')}</small></strong>
            {rescue && <s>₹{item.pricePerKg}</s>}
            {suggestion && <em>{f('suggested', { price: `₹${Math.round(suggestion)}` })}</em>}
          </div>
        </div>
        {/* A sold crop's window no longer matters; every live crop says how long it has. */}
        {item.status !== 'sold' && <FreshnessRing listing={item} size="card" className="f-crop-fresh" />}
      </Link>

      {/* A sold crop is a record, not a task: nothing to act on. */}
      {item.status !== 'sold' && <CropActions item={item} deal={deal} onChanged={onChanged} />}
    </article>
  )
}
