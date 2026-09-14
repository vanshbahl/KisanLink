import { useState } from 'react'
import { ChevronRight, Sprout, TrendingUp, Truck, Users, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FarmerAiResult, FarmerAiTrigger } from './FarmerAi'
import { FreshnessRing } from './FreshnessRing'
import { useToast } from '../../contexts/ToastContext'
import { money, useFarmerText } from '../../i18n/farmer'
import { isUrgentFreshness } from '../../services/cropFreshness'
import { getCropDeal, type CropDeal } from '../../services/farmerDeal'
import { dealWhy } from '../../services/farmerInsight'
import { isRescueActive, rescuePriceFor, startRescueSale } from '../../services/farmerRescue'
import { prototypeService } from '../../services/prototypeService'
import type { FarmerListing } from '../../types'
import { MandiSourceNote } from '../MandiSourceNote'
import { perKgText } from '../../services/pricingEngine'

/**
 * Market Maker, for one crop.
 *
 * The farmer taps "सही दाम देखें" (or the sell flow opens it on its own), the page dims, the
 * card lifts and the staged copy plays while `getCropDeal` reads the live boards. What lands
 * is the farmer-facing read only — what I get, how much better than the mandi, are buyers
 * ready, is there a vehicle, how fresh is my crop — and one action.
 *
 * The action depends on the crop, not on the deal:
 *   - freshness urgent            -> "जल्दी बेचें" (rescue sale, existing flow)
 *   - deal beats the current ask  -> "इस दाम पर बेचें" (adopt the price)
 *   - otherwise                   -> nothing to press; the price is already right
 *
 * `onAdopt` lets the sell flow take the price into its form instead of writing a listing.
 */
export function CropMarketMaker({ listing, onChanged, onAdopt, autoStart = false, className = '' }: {
  listing: FarmerListing
  onChanged?: () => void
  onAdopt?: (pricePerKg: number) => void
  autoStart?: boolean
  className?: string
}) {
  const { f, pick } = useFarmerText()
  const crop = pick(listing.crop, listing.cropHi)

  return (
    <FarmerAiTrigger<CropDeal | null>
      className={className}
      brandLabel={f('marketPrice')}
      idleLabel={f('checkMarketPrice')}
      idleHint={f('checkMarketPriceHint')}
      idleIcon={<TrendingUp size={17} />}
      stages={[f('marketStageBuyers'), f('marketStageMandi'), f('marketStageFresh'), f('marketStagePickup')]}
      run={() => getCropDeal(listing)}
      autoStart={autoStart}
      renderResult={(deal, reset) => (
        <FarmerAiResult onClose={reset}>
          {deal
            ? <DealBody listing={listing} deal={deal} crop={crop} onChanged={onChanged} onAdopt={onAdopt} />
            : (
              <div className="f-mm-empty">
                <Sprout size={26} aria-hidden="true" />
                <strong>{f('marketNoData')}</strong>
                <small>{f('marketNoDataHint')}</small>
              </div>
            )}
        </FarmerAiResult>
      )}
    />
  )
}

function DealBody({ listing, deal, crop, onChanged, onAdopt }: {
  listing: FarmerListing
  deal: CropDeal
  crop: string
  onChanged?: () => void
  onAdopt?: (pricePerKg: number) => void
}) {
  const { f } = useFarmerText()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  const urgent = isUrgentFreshness(deal.freshness)
  const rescue = isRescueActive(listing)
  const price = Math.round(deal.pricePerKg)
  const beatsAsk = price > listing.pricePerKg
  const gainOverAsk = Math.max(0, price - listing.pricePerKg)
  const extraTotal = gainOverAsk * listing.remainingKg
  // The headline only ever claims a better deal when there genuinely is one — the same
  // `beatsAsk` check that gates the CTA below, so the chips, the core message and the button
  // can never disagree with each other.
  const showBetterDealStory = beatsAsk && gainOverAsk > 0

  const adopt = async () => {
    if (onAdopt) { onAdopt(price); return }
    setBusy(true)
    try {
      await prototypeService.patchListing(listing.id, { pricePerKg: price, status: listing.status === 'draft' ? 'active' : listing.status })
      showToast(f('marketApplied', { price: `₹${price}` }))
    } catch { showToast(f('somethingWrong')) }
    finally { setBusy(false); onChanged?.() }
  }

  const sellFast = async () => {
    setBusy(true)
    try { await startRescueSale(listing); showToast(f('fastSaleOn', { price: rescuePriceFor(listing) })) }
    catch { showToast(f('somethingWrong')) }
    finally { setBusy(false); onChanged?.() }
  }

  return (
    <div className="f-mm">
      <span className="f-mm-eyebrow">{f('betterDealFor', { crop })}</span>

      {/* Lead with why a better price exists at all — real buyers, real transport — before
          the numbers, so the deal reads as earned rather than a mystery discount. */}
      {showBetterDealStory && (
        <ul className="f-mm-headline">
          <li className="is-gain"><TrendingUp size={15} aria-hidden="true" />{f('marketHeadlineGain', { amount: `₹${gainOverAsk}` })}</li>
          {deal.hasVehicle && <li><Truck size={15} aria-hidden="true" />{f('marketHeadlineTruck')}</li>}
          {deal.buyerCount > 0 && <li><Users size={15} aria-hidden="true" />{f('marketBuyers', { count: deal.buyerCount })}</li>}
        </ul>
      )}
      {showBetterDealStory && <p className="f-mm-message">{f('marketCoreMessage', { amount: `₹${gainOverAsk}${f('perKg')}` })}</p>}

      <div className="f-mm-compare">
        <div className="is-you">
          <span>{f('marketYouGet')}</span>
          <strong>₹{price}<small>{f('perKg')}</small></strong>
        </div>
        <div>
          <span>{f('marketMandi')}</span>
          <strong>₹{perKgText(deal.mandiPerKg)}<small>{f('perKg')}</small></strong>
          <MandiSourceNote source={deal.mandiSource} compact />
        </div>
        {deal.gainPerKg > 0
          ? <b className="f-mm-gain">{f('moreThanMandi', { amount: `₹${perKgText(deal.gainPerKg)}` })}</b>
          : <b className="f-mm-gain is-flat">{f('marketSameAsMandi')}</b>}
      </div>

      <ul className="f-mm-facts">
        <li><Users size={17} aria-hidden="true" />{deal.buyerCount > 0 ? f('marketBuyers', { count: deal.buyerCount }) : f('marketBuyersNone')}</li>
        <li className={deal.hasVehicle ? '' : 'is-warn'}><Truck size={17} aria-hidden="true" />{deal.hasVehicle ? f('marketPickup') : f('marketPickupNone')}</li>
        {showBetterDealStory && extraTotal > 0 && (
          <li><TrendingUp size={17} aria-hidden="true" />{f('marketExtraTotal', { qty: listing.remainingKg, amount: money(extraTotal) })}</li>
        )}
      </ul>

      <FreshnessRing listing={listing} size="hero" className="f-mm-fresh" />

      <div className="f-mm-actions">
        {urgent && !rescue ? (
          <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={sellFast}>
            <Zap size={19} />{f('sellItFast')}
          </button>
        ) : (beatsAsk || onAdopt) ? (
          <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={adopt}>
            {f('sellAtThisPrice')}
          </button>
        ) : null}
      </div>

      {/* Technical reasoning stays a tap away — the headline above already told the farmer
          why, this is only for the farmer who wants the full breakdown. */}
      <button type="button" className={`f-mm-why-toggle${showWhy ? ' is-open' : ''}`} onClick={() => setShowWhy((open) => !open)} aria-expanded={showWhy}>
        <ChevronRight size={15} aria-hidden="true" />{f('marketWhy')}
      </button>
      {showWhy && (
        <div className="f-mm-why-detail">
          <p className="f-mm-why">{dealWhy(deal, f)}</p>
          {deal.source === 'board' && <Link className="f-mm-link" to="/farmer/deal">{f('howPriceDecided')}<ChevronRight size={17} /></Link>}
        </div>
      )}
    </div>
  )
}
