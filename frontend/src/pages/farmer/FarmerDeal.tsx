import { ArrowLeft, Check, CircleAlert, IndianRupee, MapPin, Sprout, TrendingUp, Truck, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText, type FarmerKey } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getFarmerDeal, type DealFactor, type FarmerDeal as Deal } from '../../services/farmerDeal'
import { marketMakerService } from '../../services/marketMakerService'

/**
 * "बेहतर सौदा" — what used to be the farmer's Market Maker page.
 *
 * The engine is unchanged. What is gone from the farmer's screen is the vocabulary of the
 * engine: break-even volume, freight per kg, vehicle utilisation, delivered price at
 * threshold, corridor rails, blocker cards, the regional directory. A farmer arriving here
 * has one question — "यह दाम कैसे तय हुआ?" — and this page answers it in four plain rows:
 * the mandi rate, how many buyers, how much is wanted nearby, and whether a vehicle exists.
 *
 * The one chart is the price a farmer already tracks: last week, and the next three days.
 * It is drawn once, labelled in words, and carries an explicit "this is an estimate" note.
 */
const FACTOR_ICONS: Record<DealFactor['id'], typeof Sprout> = {
  mandi: IndianRupee,
  buyers: Users,
  demand: MapPin,
  vehicle: Truck,
}

export function FarmerDeal() {
  const { f, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const { data, loading, refresh } = useAsyncData(() => getFarmerDeal(), [], { live: true })

  if (loading && !data) return <DashboardSkeleton />

  if (!data) {
    return (
      <div className="page f-page f-empty">
        <TrendingUp size={34} aria-hidden="true" />
        <h2>{f('noDeal')}</h2>
        <p>{f('noDealHint')}</p>
        <Link className="btn btn-primary btn-large" to="/farmer/fasal">{f('seeMyCrops')}</Link>
      </div>
    )
  }

  const deal: Deal = data
  const crop = pick(deal.cropEn, deal.cropHi)

  const headline = deal.state === 'sold' ? f('dealSold')
    : deal.state === 'ready' ? f('dealReady')
      : deal.state === 'noVehicle' ? f('dealBlocked')
        : f('dealForming')

  const body = deal.state === 'sold' ? f('dealSoldBody', { qty: deal.matchedKg })
    : deal.state === 'ready' ? f('dealMatched', { qty: deal.matchedKg })
      : deal.state === 'noVehicle' ? f('dealBlockedBody')
        : f('dealFormingBody')

  /**
   * The only lever a farmer has on a forming market: release more of their own crop into it.
   * Everything else the analytical page exposes (commit demand, hold a vehicle, create the
   * market) belongs to buyers and logistics, not here.
   */
  const giveMore = async () => {
    if (!deal.ownLotId) return
    try {
      await marketMakerService.offerMore(deal.boardId, deal.ownLotId, 40)
      showToast(f('cropUpdated'))
    } catch { showToast(f('somethingWrong')) }
    finally { refresh() }
  }

  return (
    <div className="page f-page f-deal-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />{f('back')}
      </button>

      <header className={`f-deal-hero is-${deal.state}`}>
        <span className="f-deal-hero-icon">
          {deal.state === 'sold' || deal.state === 'ready' ? <Check size={22} />
            : deal.state === 'noVehicle' ? <CircleAlert size={22} /> : <Sprout size={22} />}
        </span>
        <h1>{headline}</h1>
        <p>{body}</p>
      </header>

      <section className="f-deal-compare">
        <div>
          <span>{f('mandiToday')}</span>
          <strong>₹{Math.round(deal.mandiPerKg)}<small>{f('perKg')}</small></strong>
        </div>
        <div className="is-better">
          <span>{f('betterDeal')}</span>
          <strong>₹{Math.round(deal.pricePerKg)}<small>{f('perKg')}</small></strong>
        </div>
        {deal.gainPerKg > 0 && (
          <b className="f-deal-compare-gain">+₹{Math.round(deal.gainPerKg)}{f('perKg')}</b>
        )}
      </section>

      <section className="f-card">
        <h2>{f('whyThisPrice')}</h2>
        <ul className="f-factor-list">
          {deal.factors.map((factor) => {
            const Icon = FACTOR_ICONS[factor.id]
            return (
              <li key={factor.id}>
                <span className="f-factor-icon"><Icon size={19} /></span>
                <span className="f-factor-copy">
                  <strong>{f(factor.labelKey as FarmerKey)}</strong>
                  <small>{f(factor.hintKey as FarmerKey, { ...factor.values, crop })}</small>
                </span>
                {factor.value && <b>{factor.value}</b>}
              </li>
            )
          })}
        </ul>
      </section>

      {deal.intel && <PriceTrend intel={deal.intel} />}

      <p className="f-note f-deal-disclaimer">{f('dealDisclaimer')}</p>

      <div className="f-deal-page-actions">
        {deal.state === 'sold' ? (
          <Link className="btn btn-primary btn-large btn-full" to="/farmer/orders"><Truck size={20} />{f('seeMyOrder')}</Link>
        ) : deal.state === 'ready' ? (
          <Link className="btn btn-primary btn-large btn-full" to="/farmer/fasal"><Sprout size={20} />{f('seeMyCrops')}</Link>
        ) : deal.ownLotId && deal.availableKg > 0 ? (
          <button type="button" className="btn btn-primary btn-large btn-full" onClick={giveMore}>
            <Sprout size={20} />{f('giveMoreCrop', { qty: 40 })}
          </button>
        ) : (
          <Link className="btn btn-primary btn-large btn-full" to={`/farmer/sell?crop=${encodeURIComponent(deal.cropEn)}`}>
            <Sprout size={20} />{f('sellCrop')}
          </Link>
        )}
        {deal.availableKg > 0 && <small className="f-note">{f('heldForDeal', { qty: deal.availableKg })}</small>}
      </div>
    </div>
  )
}

/**
 * Last seven days and the next three, in one line.
 *
 * Drawn rather than tabulated because a direction is the point; labelled in words rather
 * than with an axis because the numbers that matter are the two endpoints.
 */
function PriceTrend({ intel }: { intel: NonNullable<Deal['intel']> }) {
  const { f } = useFarmerText()
  const all = [...intel.historical, ...intel.forecast]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const width = 320
  const height = 96
  const pad = 10
  const x = (index: number) => (index / (all.length - 1)) * width
  const y = (value: number) => height - pad - ((value - min) / Math.max(1, max - min)) * (height - pad * 2)
  const path = (values: number[], offset: number) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index + offset).toFixed(1)} ${y(value).toFixed(1)}`).join(' ')

  const today = intel.historical[intel.historical.length - 1]
  const ahead = intel.forecast[intel.forecast.length - 1]
  const directionKey = ahead > today ? 'priceRising' : ahead < today ? 'priceFalling' : 'priceSteady'

  return (
    <section className="f-card f-trend">
      <h2>{f('priceLastWeek')}</h2>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={f(directionKey)}>
        <path d={path(intel.historical, 0)} fill="none" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={path([today, ...intel.forecast], intel.historical.length - 1)}
          fill="none" stroke="var(--harvest)" strokeWidth="4" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx={x(intel.historical.length - 1)} cy={y(today)} r="5" fill="var(--green)" />
      </svg>
      <div className="f-trend-legend">
        <span>₹{intel.historical[0]}</span>
        <b>{f(directionKey)}</b>
        <span>{f('priceNextDays')} · ₹{ahead}</span>
      </div>
    </section>
  )
}
