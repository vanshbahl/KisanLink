import { useEffect, useState } from 'react'
import { Check, ChevronRight, Handshake, IndianRupee, Sprout, Truck, Users, Warehouse } from 'lucide-react'
import { Sheet } from './Sheet'
import { MandiSourceNote } from '../MandiSourceNote'
import { money, useFarmerText } from '../../i18n/farmer'
import { getSellOpportunity, type SellOpportunity } from '../../services/farmerDeal'
import type { FarmerListing } from '../../types'

/**
 * "बेहतर सौदा" beside the sell form.
 *
 * The Market Maker used to run inside the price step, which made a coordinated corridor deal
 * look like the default way to price a listing. It is not. A normal listing is priced by
 * Kisan Intelligence and sells to any buyer; a Behtar Sauda is an *optional* offer that only
 * exists when buyers, pooled supply and a vehicle line up. This card keeps that distinction:
 * it sits beside the form (a column on desktop, a strip above the steps on a phone), never
 * covers a control, and reads from the same `getCropDeal` the crop pages already use.
 *
 * States, in order of how much the farmer has told us:
 *   waiting  -> no crop or quantity yet
 *   looking  -> reading the boards
 *   none     -> nothing better than a normal listing
 *   forming  -> buyers or a vehicle still gathering
 *   ready    -> a better price the farmer can take now
 *   joined   -> the farmer took it; the form carries the deal price
 */
const LOOKUP_DEBOUNCE_MS = 350

export function BehtarSaudaCard({ listing, enabled, joined, onJoin, onLeave, className = '' }: {
  listing: FarmerListing
  /** Crop and quantity are known; nothing is looked up before that. */
  enabled: boolean
  joined: boolean
  onJoin: (opportunity: SellOpportunity) => void
  onLeave: () => void
  className?: string
}) {
  const { f, pick } = useFarmerText()
  const [opportunity, setOpportunity] = useState<SellOpportunity | null>(null)
  const [looking, setLooking] = useState(false)
  const [open, setOpen] = useState(false)

  const crop = pick(listing.crop, listing.cropHi)
  // Only the inputs the boards actually care about re-run the lookup; typing a note does not.
  const lookupKey = enabled ? `${listing.crop}|${listing.quantityKg}|${listing.harvestDate}|${listing.farm}` : ''

  useEffect(() => {
    if (!lookupKey) { setOpportunity(null); setLooking(false); return }
    let active = true
    setLooking(true)
    const timer = window.setTimeout(() => {
      void getSellOpportunity(listing)
        .then((next) => { if (active) setOpportunity(next) })
        .catch(() => { if (active) setOpportunity(null) })
        .finally(() => { if (active) setLooking(false) })
    }, LOOKUP_DEBOUNCE_MS)
    return () => { active = false; window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey])

  const status = !enabled ? 'waiting' : looking ? 'looking' : joined ? 'joined' : (opportunity?.status ?? 'none')

  return (
    <aside className={`f-sauda is-${status} ${className}`.trim()} aria-live="polite" aria-label={f('saudaTitle')}>
      <header className="f-sauda-head">
        <span className="f-sauda-mark" aria-hidden="true"><Handshake size={17} /></span>
        <span className="f-sauda-title">
          <strong>{f('saudaTitle')}</strong>
          <small>{f('saudaPoweredBy')}</small>
        </span>
      </header>

      {status === 'waiting' && <p className="f-sauda-quiet">{f('saudaWaiting')}</p>}

      {status === 'looking' && (
        <p className="f-sauda-quiet" role="status"><span className="spinner" />{f('saudaLooking', { crop })}</p>
      )}

      {status === 'none' && (
        <div className="f-sauda-body">
          <p className="f-sauda-lead">{f('saudaNone', { crop })}</p>
          <small className="f-note">{f('saudaNoneHint')}</small>
        </div>
      )}

      {status === 'forming' && opportunity && (
        <div className="f-sauda-body">
          <p className="f-sauda-lead">{f('saudaForming', { crop })}</p>
          <WhyChips opportunity={opportunity} />
          <small className="f-note">{f('saudaFormingHint')}</small>
          <button type="button" className="f-sauda-more" onClick={() => setOpen(true)}>
            {f('saudaView')}<ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {status === 'ready' && opportunity && (
        <div className="f-sauda-body">
          <p className="f-sauda-lead">{f('saudaReady', { crop })}</p>
          <small className="f-sauda-for">{f('saudaFor', { qty: listing.quantityKg, crop })}</small>
          <WhyChips opportunity={opportunity} />
          <div className="f-sauda-compare">
            <div>
              <span>{f('saudaNormalPrice')}</span>
              <strong>₹{opportunity.normalPerKg}<small>{f('perKg')}</small></strong>
            </div>
            <div className="is-deal">
              <span>{f('saudaDealPrice')}</span>
              <strong>₹{opportunity.dealPerKg}<small>{f('perKg')}</small></strong>
              <b>{f('saudaGain', { amount: opportunity.gainPerKg })}</b>
            </div>
          </div>
          <div className="f-sauda-foot">
            {opportunity.extraTotal > 0 && (
              <p className="f-sauda-extra">{f('saudaExtra', { qty: listing.quantityKg, amount: money(opportunity.extraTotal) })}</p>
            )}
            <button type="button" className="btn btn-primary btn-large f-sauda-cta" onClick={() => setOpen(true)}>
              {f('saudaView')}<ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {status === 'joined' && (
        <div className="f-sauda-body">
          <p className="f-sauda-lead f-sauda-joined"><Check size={18} aria-hidden="true" />{f('saudaJoined')}</p>
          <small className="f-note">{f('saudaJoinedHint', { price: `₹${listing.pricePerKg}` })}</small>
          <button type="button" className="btn btn-ghost btn-full" onClick={onLeave}>{f('saudaSellNormally')}</button>
        </div>
      )}

      {opportunity && (
        <SaudaSheet
          open={open}
          onClose={() => setOpen(false)}
          listing={listing}
          crop={crop}
          opportunity={opportunity}
          onJoin={() => { setOpen(false); onJoin(opportunity) }}
        />
      )}
    </aside>
  )
}

/** The one-line reasons a deal exists, in the order a farmer would check them. */
function WhyChips({ opportunity }: { opportunity: SellOpportunity }) {
  const { f } = useFarmerText()
  const { deal } = opportunity
  return (
    <ul className="f-sauda-why">
      {deal.hasVehicle && <li><Truck size={14} aria-hidden="true" />{f('saudaWhyTruck')}</li>}
      {deal.buyerCount > 0 && <li><Users size={14} aria-hidden="true" />{f('saudaWhyBuyers', { count: deal.buyerCount })}</li>}
      {deal.pooledKg > 0 && <li><Warehouse size={14} aria-hidden="true" />{f('saudaWhyPooled', { qty: deal.pooledKg })}</li>}
    </ul>
  )
}

/**
 * The deal, opened. Same bottom sheet as every other farmer disclosure; the four rows are
 * the reasoning the Market Maker actually ran on, in farmer words, and the two buttons are
 * the only decision: take the deal, or sell normally.
 */
function SaudaSheet({ open, onClose, listing, crop, opportunity, onJoin }: {
  open: boolean
  onClose: () => void
  listing: FarmerListing
  crop: string
  opportunity: SellOpportunity
  onJoin: () => void
}) {
  const { f } = useFarmerText()
  const { deal, normalPerKg, dealPerKg, gainPerKg, extraTotal, status } = opportunity
  const canJoin = status === 'ready'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={f('saudaTitle')}
      footer={(
        <div className="f-sauda-sheet-actions">
          {canJoin && (
            <button type="button" className="btn btn-primary btn-large btn-full" onClick={onJoin}>
              <Handshake size={19} aria-hidden="true" />{f('saudaJoin')}
            </button>
          )}
          <button type="button" className={`btn ${canJoin ? 'btn-ghost' : 'btn-primary'} btn-large btn-full`} onClick={onClose}>
            {f('saudaSellNormally')}
          </button>
        </div>
      )}
    >
      <p className="f-sauda-eyebrow">{f('saudaPoweredBy')}</p>
      <p className="f-sauda-sheet-lead">
        {status === 'ready' ? f('saudaReady', { crop }) : f('saudaForming', { crop })}
        <small>{f('saudaFor', { qty: listing.quantityKg, crop })}</small>
      </p>

      <div className="f-deal-compare f-sauda-sheet-compare">
        <div>
          <span>{f('saudaNormalPrice')}</span>
          <strong>₹{normalPerKg}<small>{f('perKg')}</small></strong>
        </div>
        <div className="is-better">
          <span>{f('saudaDealPrice')}</span>
          <strong>₹{dealPerKg}<small>{f('perKg')}</small></strong>
        </div>
        {gainPerKg > 0 && <b className="f-deal-compare-gain">{f('saudaGain', { amount: gainPerKg })}</b>}
      </div>
      {extraTotal > 0 && <p className="f-sauda-extra">{f('saudaExtra', { qty: listing.quantityKg, amount: money(extraTotal) })}</p>}

      <h3 className="f-section-heading">{f('saudaWhyHeading')}</h3>
      <ul className="f-factor-list">
        <li>
          <span className="f-factor-icon"><Warehouse size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaPooledSupply')}</strong>
            <small>{deal.pooledKg > 0 ? f('saudaPooledSupplyHint', { qty: deal.pooledKg }) : f('saudaPooledSupplyNone')}</small>
          </span>
          {deal.pooledKg > 0 && <b>{deal.pooledKg} {f('kg')}</b>}
        </li>
        <li>
          <span className="f-factor-icon"><Truck size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaTruck')}</strong>
            <small>{deal.hasVehicle ? f('saudaTruckReady') : f('saudaTruckForming')}</small>
          </span>
          {deal.hasVehicle && <b><Check size={19} aria-label={f('saudaTruckReady')} /></b>}
        </li>
        <li>
          <span className="f-factor-icon"><Users size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaDemand')}</strong>
            <small>{deal.buyerCount > 0 ? f('saudaDemandHint', { count: deal.buyerCount }) : f('saudaDemandNone')}</small>
          </span>
          {deal.buyerCount > 0 && <b>{deal.buyerCount}</b>}
        </li>
        <li>
          <span className="f-factor-icon"><IndianRupee size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaOffered')}</strong>
            <small>{f('saudaOfferedHint', { deal: `₹${dealPerKg}`, normal: `₹${normalPerKg}` })}</small>
            <MandiSourceNote source={deal.mandiSource} compact />
          </span>
          <b>₹{dealPerKg}</b>
        </li>
      </ul>

      <p className="f-note"><Sprout size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{f('saudaNormalNote')} {f('marketDisclaimer')}</p>
    </Sheet>
  )
}
