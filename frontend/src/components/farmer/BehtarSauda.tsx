import { Check, ChevronRight, Handshake, IndianRupee, MapPin, Sprout, Truck, Users, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Sheet } from './Sheet'
import { MandiSourceNote } from '../MandiSourceNote'
import { ProductImage } from '../ProductImage'
import { money, timeWindow, useFarmerText, type FarmerKey } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOpportunitySummary, type Opportunity, type OpportunityStatus } from '../../services/farmerOpportunities'
import type { FarmerListing } from '../../types'

/**
 * "बेहतर सौदा" — the pieces of the opportunities marketplace that other screens reuse.
 *
 *   BehtarSaudaTeaser  a small card that says how many deals are open and links to the list.
 *                      Sits low on Sell Produce and on Home; never a step, never a panel.
 *   OpportunityCard    one row of the /farmer/sauda list, in the order a farmer reads it:
 *                      crop, kg needed, ₹/kg, what they earn, uplift, where the truck goes.
 *   OpportunitySheet   the deal opened: the Market Maker's reasoning in farmer words, and
 *                      the one decision (join, or close).
 *
 * Nothing here decides a listing price. Normal selling is priced by Kisan Intelligence; a
 * Behtar Sauda is an optional offer that exists only when buyers, pooled supply and a
 * vehicle line up.
 */
export const OPPORTUNITIES_PATH = '/farmer/sauda'

const STATUS_KEY: Record<OpportunityStatus, FarmerKey> = {
  ready: 'saudaStatusReady',
  forming: 'saudaStatusForming',
  highDemand: 'saudaStatusDemand',
}

/** "Tomorrow · 6–10 AM" is stored in English for every role; the farmer screen reads it in their language. */
function deliveryText(language: 'en' | 'hi', window: string): string {
  const text = timeWindow(language, window)
  return language === 'hi' ? text.replace(/Tomorrow/i, 'कल').replace(/Today/i, 'आज') : text
}

/**
 * The compact entry point. Loads its own summary so a host screen adds one line, and
 * renders nothing at all when no deal is open, so it never takes space to say "nothing".
 */
export function BehtarSaudaTeaser({ listings, className = '' }: {
  /** The host's already-loaded listings, to save a second read. */
  listings?: FarmerListing[]
  className?: string
}) {
  const { f } = useFarmerText()
  const { data } = useAsyncData(() => getOpportunitySummary(listings), [listings?.length], { live: true })
  if (!data || data.count === 0) return null

  return (
    <Link to={OPPORTUNITIES_PATH} className={`f-sauda-teaser ${className}`.trim()} aria-label={f('saudaTitle')}>
      <span className="f-sauda-teaser-mark" aria-hidden="true"><Handshake size={18} /></span>
      <span className="f-sauda-teaser-copy">
        <strong>{data.count === 1 ? f('saudaTeaserOne') : f('saudaTeaserCount', { count: data.count })}</strong>
        <span className="f-sauda-teaser-line">
          {data.bestGainPerKg > 0 && <b>{f('saudaTeaserGain', { amount: data.bestGainPerKg })}</b>}
          {data.readyCount > 0 && <em>{f('saudaTeaserReady', { count: data.readyCount })}</em>}
        </span>
        <small>{f('saudaTeaserHint')}</small>
        <span className="f-sauda-teaser-cta">{f('saudaTeaserCta')}<ChevronRight size={16} aria-hidden="true" /></span>
      </span>
    </Link>
  )
}

/** One opportunity, as a list row. `onOpen` opens the sheet; the card itself is not a link. */
export function OpportunityCard({ opportunity, onOpen }: { opportunity: Opportunity; onOpen: () => void }) {
  const { f, language, pick } = useFarmerText()
  const crop = pick(opportunity.cropEn, opportunity.cropHi)
  const grows = opportunity.signals.some((signal) => signal.id === 'growing' || signal.id === 'ownLot')
  const nearby = opportunity.signals.some((signal) => signal.id === 'nearby')

  return (
    <article className={`f-opp is-${opportunity.status}`}>
      <header className="f-opp-head">
        <ProductImage imageSrc={opportunity.imageSrc} visual={opportunity.visual} alt="" size="mini" />
        <span className="f-opp-title">
          <strong>{crop}</strong>
          <small>{f('saudaNeeded', { qty: opportunity.neededKg.toLocaleString('en-IN') })}</small>
        </span>
        <span className="f-opp-status">{f(STATUS_KEY[opportunity.status])}</span>
      </header>

      <div className="f-opp-money">
        <strong>₹{opportunity.offeredPerKg}<small>{f('perKg')}</small></strong>
        <span className="f-opp-earn">
          <b>{f('saudaEarn', { amount: money(opportunity.earnTotal) })}</b>
          <small>{opportunity.baseIsOwn ? f('saudaBasedOnOwn', { qty: opportunity.baseKg }) : f('saudaBasedOnAll', { qty: opportunity.baseKg })}</small>
        </span>
      </div>

      {opportunity.extraTotal > 0
        ? <p className="f-opp-uplift">{f('saudaVsNormal', { amount: money(opportunity.extraTotal) })}</p>
        : <p className="f-opp-uplift is-flat">{f('saudaSameAsNormal')}</p>}

      <ul className="f-opp-meta">
        <li><Truck size={14} aria-hidden="true" />{opportunity.hasVehicle ? f('saudaTruckReadyShort') : f('saudaTruckNearby')}</li>
        <li><MapPin size={14} aria-hidden="true" />{language === 'hi' ? opportunity.corridorHi : opportunity.corridor}</li>
        {grows && <li className="is-why"><Sprout size={14} aria-hidden="true" />{f('saudaYouGrow')}</li>}
        {nearby && <li className="is-why"><MapPin size={14} aria-hidden="true" />{f('saudaNearYou')}</li>}
      </ul>

      <button type="button" className="btn btn-primary f-opp-cta" onClick={onOpen}>
        {f('saudaView')}<ChevronRight size={18} aria-hidden="true" />
      </button>
    </article>
  )
}

/**
 * The deal, opened. The four rows are the reasoning the Market Maker actually ran on, in
 * farmer words. The footer is the only decision: join (or list the crop to join), or close.
 */
export function OpportunitySheet({ opportunity, open, onClose, onJoin, busy = false }: {
  opportunity: Opportunity
  open: boolean
  onClose: () => void
  onJoin: () => void
  busy?: boolean
}) {
  const { f, language, pick } = useFarmerText()
  const crop = pick(opportunity.cropEn, opportunity.cropHi)
  const { normalPerKg, offeredPerKg, gainPerKg, extraTotal, baseKg, status } = opportunity
  const canJoin = status === 'ready'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={f('saudaTitle')}
      footer={(
        <div className="f-sauda-sheet-actions">
          {canJoin && (
            <button type="button" className="btn btn-primary btn-large btn-full" disabled={busy} onClick={onJoin}>
              <Handshake size={19} aria-hidden="true" />
              {opportunity.listingId ? f('saudaJoin') : f('saudaListToJoin', { crop })}
            </button>
          )}
          <button type="button" className={`btn ${canJoin ? 'btn-ghost' : 'btn-primary'} btn-large btn-full`} onClick={onClose}>
            {canJoin ? f('saudaSellNormally') : f('close')}
          </button>
        </div>
      )}
    >
      <p className="f-sauda-eyebrow">{f('saudaPoweredBy')}</p>
      <p className="f-sauda-sheet-lead">
        {canJoin ? f('saudaReady', { crop }) : f('saudaForming', { crop })}
        <small>{f('saudaFor', { qty: baseKg, crop })}</small>
      </p>

      <div className="f-deal-compare f-sauda-sheet-compare">
        <div>
          <span>{f('saudaNormalPrice')}</span>
          <strong>₹{normalPerKg}<small>{f('perKg')}</small></strong>
        </div>
        <div className="is-better">
          <span>{f('saudaDealPrice')}</span>
          <strong>₹{offeredPerKg}<small>{f('perKg')}</small></strong>
        </div>
        {gainPerKg > 0 && <b className="f-deal-compare-gain">{f('saudaGain', { amount: gainPerKg })}</b>}
      </div>
      {extraTotal > 0 && <p className="f-sauda-extra">{f('saudaExtra', { qty: baseKg, amount: money(extraTotal) })}</p>}

      <h3 className="f-section-heading">{f('saudaWhyHeading')}</h3>
      <ul className="f-factor-list">
        <li>
          <span className="f-factor-icon"><Users size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaDemand')}</strong>
            <small>{opportunity.buyerCount > 0 ? f('saudaDemandHint', { count: opportunity.buyerCount }) : f('saudaDemandNone')}</small>
          </span>
          <b>{opportunity.neededKg.toLocaleString('en-IN')} {f('kg')}</b>
        </li>
        <li>
          <span className="f-factor-icon"><Warehouse size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaPooledSupply')}</strong>
            <small>{opportunity.pooledKg > 0 ? f('saudaPooledSupplyHint', { qty: opportunity.pooledKg }) : f('saudaPooledSupplyNone')}</small>
          </span>
          {opportunity.pooledKg > 0 && <b>{opportunity.pooledKg} {f('kg')}</b>}
        </li>
        <li>
          <span className="f-factor-icon"><Truck size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaTruck')}</strong>
            <small>{opportunity.hasVehicle ? f('saudaTruckReady') : f('saudaTruckForming')}</small>
            <small>{f('saudaGoesTo', { place: opportunity.destination })} · {f('saudaDelivery', { window: deliveryText(language, opportunity.deliveryWindow) })}</small>
          </span>
          {opportunity.hasVehicle && <b><Check size={19} aria-label={f('saudaTruckReady')} /></b>}
        </li>
        <li>
          <span className="f-factor-icon"><IndianRupee size={19} /></span>
          <span className="f-factor-copy">
            <strong>{f('saudaOffered')}</strong>
            <small>{f('saudaOfferedHint', { deal: `₹${offeredPerKg}`, normal: `₹${normalPerKg}` })}</small>
            <MandiSourceNote source={opportunity.mandiSource} compact />
          </span>
          <b>₹{offeredPerKg}</b>
        </li>
      </ul>

      <p className="f-note"><Sprout size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{f('saudaNormalNote')} {f('marketDisclaimer')}</p>
    </Sheet>
  )
}
