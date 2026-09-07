import { ArrowRight, Check, CircleAlert, IndianRupee, Sprout, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'
import { MarketDemandRing } from './MarketDemandRing'

/**
 * The farmer view of Market Maker.
 *
 * Deliberately not the same page as the other roles: mobile-first, one gauge, one price,
 * one recommended action, and three plain stages. Hindi here is written as short farmer
 * speech rather than as a translation of the analyst-facing English elsewhere.
 */
export function FarmerMarketMaker({ board, math, busy, onOffer, available }: {
  board: MarketMakerBoard
  math: MarketMath
  busy?: boolean
  available: number
  onOffer: (extraKg: number) => void
}) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const created = board.status === 'created'
  const blocked = math.blockers.some((item) => item.kind !== 'demand')
  const own = math.allocations.find((entry) => entry.lot.own)
  const gain = Math.max(0, math.farmerGatePerKg - board.mandiPricePerKg)
  const matched = own?.allocatedKg ?? 0
  const stage = created ? 2 : math.viable ? 1 : 0

  const headline = created
    ? l('Sold. Pickup is coming.', 'बिक गया। गाड़ी आ रही है।')
    : math.viable
      ? l('Ready. Your produce can go.', 'तैयार। फसल जा सकती है।')
      : blocked
        ? l('Wait. Vehicle not ready.', 'रुकें। गाड़ी तैयार नहीं।')
        : l('Almost ready.', 'लगभग तैयार।')

  const advice = created
    ? l(`${matched} kg of yours is sold. Keep it ready for pickup.`, `आपकी ${matched} किलो बिक गई। पिकअप के लिए तैयार रखें।`)
    : math.viable
      ? l(`${matched} kg of yours is matched. Nothing to do — wait for pickup.`, `आपकी ${matched} किलो का मिलान हो गया। कुछ नहीं करना — पिकअप का इंतज़ार करें।`)
      : blocked
        ? l('Buyers are ready. A vehicle is needed. We will tell you.', 'खरीदार तैयार हैं। गाड़ी चाहिए। हम बताएंगे।')
        : l(`${math.gapKg} kg more buyers needed. Give more produce to help.`, `${math.gapKg} किलो और खरीदार चाहिए। ज़्यादा फसल देकर मदद करें।`)

  const stages = [
    l('Buyers joining', 'खरीदार जुड़ रहे हैं'),
    l('Enough buyers', 'खरीदार पूरे'),
    l('Pickup booked', 'पिकअप तय'),
  ]

  return (
    <div className="mm-farmer">
      <section className={`mm-farmer-hero ${created ? 'is-created' : math.viable ? 'is-viable' : blocked ? 'is-blocked' : ''}`}>
        <span className="mm-farmer-flag">{created || math.viable ? <Check size={20} /> : blocked ? <CircleAlert size={20} /> : <Sprout size={20} />}</span>
        <h1>{headline}</h1>
        <p>{advice}</p>
      </section>

      <section className="mm-farmer-price">
        <div>
          <span>{l('Mandi', 'मंडी')}</span>
          <strong>₹{board.mandiPricePerKg}</strong>
          <small>{l('per kg', 'प्रति किलो')}</small>
        </div>
        <ArrowRight size={20} aria-hidden="true" />
        <div className="is-better">
          <span>{l('KisanLink', 'किसानलिंक')}</span>
          <strong>₹{math.farmerGatePerKg}</strong>
          <small>{l('per kg', 'प्रति किलो')}</small>
        </div>
        <b className="mm-farmer-gain"><IndianRupee size={13} />+{gain.toFixed(0)}/kg</b>
      </section>

      <section className="mm-farmer-gauge">
        <MarketDemandRing board={board} math={math} />
        <div>
          <strong>{math.committedKg} kg</strong>
          <span>{math.viable ? l('Buyers are enough', 'खरीदार पूरे हैं') : l(`${math.gapKg} kg more needed`, `${math.gapKg} किलो और चाहिए`)}</span>
          <small>{l(board.crop, board.cropHi)} · {l(board.corridor, board.corridorHi)}</small>
        </div>
      </section>

      <ol className="mm-farmer-stages" aria-label={l('Progress', 'प्रगति')}>
        {stages.map((label, index) => (
          <li key={label} className={index < stage ? 'is-done' : index === stage ? 'is-active' : ''}>
            <span>{index < stage ? <Check size={14} /> : index + 1}</span>
            <small>{label}</small>
          </li>
        ))}
      </ol>

      <div className="mm-farmer-action">
        {created ? (
          <Link className="btn btn-primary btn-large btn-full" to="/farmer/orders"><Truck size={18} /> {l('See my order', 'मेरा ऑर्डर देखें')}</Link>
        ) : math.viable ? (
          <Link className="btn btn-primary btn-large btn-full" to="/farmer/produce"><Sprout size={18} /> {l('See my produce', 'मेरी फसल देखें')}</Link>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-full" disabled={busy || available <= 0} onClick={() => onOffer(40)}>
            <Sprout size={18} /> {l('Give 40 kg more', '40 किलो और दें')}
          </button>
        )}
        <small>{l(`${available} kg of your produce is held for this market.`, `आपकी ${available} किलो फसल इस बाज़ार के लिए रखी है।`)}</small>
      </div>
    </div>
  )
}
