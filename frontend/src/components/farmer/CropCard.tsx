import { Link } from 'react-router-dom'
import { ProductImage } from '../ProductImage'
import { CropActions } from './CropActions'
import { useFarmerText, money } from '../../i18n/farmer'
import { suggestedPriceFor, type FarmerDeal } from '../../services/farmerDeal'
import type { FarmerListing, ListingStatus } from '../../types'

/**
 * One crop, as a farmer thinks about it: what it is, how much is left, what it fetches, and
 * the single thing worth doing about it right now.
 *
 * The whole card body is the link to the crop, so the tap target is the crop itself. The
 * action row underneath comes from `CropActions`, which the crop page reuses — one verb, one
 * `⋯` sheet, one behaviour to learn.
 */
export function CropCard({ item, deal, onChanged }: {
  item: FarmerListing
  deal: FarmerDeal | null
  onChanged: () => void
}) {
  const { f, pick } = useFarmerText()
  const crop = pick(item.crop, item.cropHi)
  const rescue = Boolean(item.isUrgentRescue || item.rescueStatus === 'RESCUE_ACTIVE')
  const rescuePrice = item.rescueDiscountPricePerKg ?? item.pricePerKg
  const suggestion = rescue ? null : suggestedPriceFor(item, deal)

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
      </Link>

      {/* A sold crop is a record, not a task: nothing to act on. */}
      {item.status !== 'sold' && <CropActions item={item} deal={deal} onChanged={onChanged} />}
    </article>
  )
}
