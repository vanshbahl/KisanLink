import { Check, ChevronRight, Truck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFarmerText } from '../../i18n/farmer'
import type { FarmerDeal } from '../../services/farmerDeal'

/**
 * "बेहतर सौदा" as a farmer reads it, embedded in Home, My crops and the sell flow.
 *
 * The Market Maker's arithmetic is unchanged behind this — what changes is that a farmer is
 * never asked to understand break-even volume, freight per kg or vehicle utilisation to know
 * whether to sell. Three facts and one action:
 *
 *   what I get   ·   how much better than the mandi   ·   is it actually going to move
 *
 * `compact` is the Home/Fasal variant. The full variant adds the explanation link, which the
 * detail page at /farmer/deal answers.
 */
export function BetterDealCard({ deal, compact = false, onSell }: {
  deal: FarmerDeal
  compact?: boolean
  /** When given, replaces the default "sell at this price" link with an inline action. */
  onSell?: () => void
}) {
  const { f, pick } = useFarmerText()
  const crop = pick(deal.cropEn, deal.cropHi)
  const blocked = deal.state === 'noVehicle'

  const sellTo = deal.listingId ? `/farmer/fasal/${deal.listingId}` : `/farmer/sell?crop=${encodeURIComponent(deal.cropEn)}`

  return (
    <section className={`f-deal${blocked ? ' is-blocked' : ''}${compact ? ' is-compact' : ''}`}>
      <span className="f-deal-eyebrow">{f('betterDealFor', { crop })}</span>

      <div className="f-deal-price">
        <strong>₹{Math.round(deal.pricePerKg)}<small>{f('perKg')}</small></strong>
        {deal.gainPerKg > 0 && (
          <b className="f-deal-gain">{f('moreThanMandi', { amount: `₹${Math.round(deal.gainPerKg)}` })}</b>
        )}
      </div>

      <ul className="f-deal-facts">
        <li><Users size={17} aria-hidden="true" />{f('buyersWantIt', { count: deal.buyerCount })}</li>
        <li className={blocked ? 'is-warn' : ''}>
          <Truck size={17} aria-hidden="true" />
          {deal.hasVehicle ? f('pickupReady') : f('pickupNotReady')}
        </li>
        {deal.matchedKg > 0 && (
          <li><Check size={17} aria-hidden="true" />{f('yourKgInDeal', { qty: deal.matchedKg })}</li>
        )}
      </ul>

      <div className="f-deal-actions">
        {onSell
          ? <button type="button" className="btn btn-primary btn-large" onClick={onSell}>{f('sellAtThisPrice')}</button>
          : <Link className="btn btn-primary btn-large" to={sellTo}>{f('sellAtThisPrice')}</Link>}
        <Link className="f-deal-why" to="/farmer/deal">{f('howPriceDecided')}<ChevronRight size={17} /></Link>
      </div>
    </section>
  )
}
