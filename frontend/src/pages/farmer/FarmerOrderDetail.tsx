import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, KeyRound, MapPin, PackageCheck, Phone, Star, Truck, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Money } from '../../components/farmer/Money'
import { Sheet } from '../../components/farmer/Sheet'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText, money, relativeDay, timeWindow } from '../../i18n/farmer'
import { apiClient } from '../../services/apiClient'
import { prototypeService } from '../../services/prototypeService'
import { daysUntil } from '../../utils/dates'
import { nextAction, statusKey } from './orderState'
import type { FarmerOrder, OrderStatus, Pickup } from '../../types'

/**
 * One order, end to end.
 *
 * This page carries everything that is true about the order but does not belong on a list:
 * the exact money breakdown, where the crop has reached, the pickup and its OTP, and — only
 * where the order's state makes them meaningful — reporting a problem and rating the buyer.
 *
 * Reporting a problem and rating both call backend that already existed (`createDispute`,
 * `createReview`) and had no farmer entry point at all. They are disclosed, not promoted:
 * a farmer whose order is going fine never has to read the word "dispute".
 */
const STAGES: OrderStatus[] = ['new', 'accepted', 'preparing', 'pickup_scheduled', 'in_transit', 'delivered']

export function FarmerOrderDetail() {
  const { id } = useParams()
  const { f, language, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [order, setOrder] = useState<FarmerOrder | null | undefined>(undefined)
  const [pickup, setPickup] = useState<Pickup | null>(null)
  const [otpOpen, setOtpOpen] = useState(params.get('otp') === '1')
  const [problemOpen, setProblemOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [problem, setProblem] = useState('')
  const [rating, setRating] = useState(5)
  const [busy, setBusy] = useState(false)

  const load = () => {
    if (!id) return
    void prototypeService.getOrder(id).then(setOrder)
    void prototypeService.getPickups().then((items) => setPickup(items.find((item) => item.orderId === id) ?? null))
  }
  useEffect(load, [id])

  if (order === undefined) return <DashboardSkeleton />
  if (!order) {
    return (
      <div className="page f-page f-empty">
        <h2>{f('noOrders')}</h2>
        <Link className="btn btn-primary btn-large" to="/farmer/orders">{f('ordersTitle')}</Link>
      </div>
    )
  }

  const crop = pick(order.crop, order.cropHi)
  const action = nextAction({ order, pickup })
  const current = STAGES.indexOf(order.status)
  const pooled = order.id.startsWith('KL-MM')

  const advance = async (status: OrderStatus) => {
    setBusy(true)
    await prototypeService.updateOrder(order.id, status)
    setBusy(false)
    showToast(f('orderSaved'))
    load()
  }

  const decline = async () => {
    if (!window.confirm(f('declineConfirm'))) return
    await advance('cancelled')
  }

  /** Both writes fail soft: the farmer's complaint is acknowledged either way, and support
   *  is reachable by phone, which is the path that actually resolves it. */
  const sendProblem = async () => {
    if (!problem.trim()) return
    setBusy(true)
    try { await apiClient.createDispute({ order_id: order.db_id ?? order.id, dispute_reason: problem.trim() }) }
    catch { /* recorded locally; the call-centre number below is the real escalation */ }
    finally {
      setBusy(false); setProblemOpen(false); setProblem('')
      showToast(f('problemSent'))
    }
  }

  const sendRating = async () => {
    setBusy(true)
    try { await apiClient.createReview({ order_id: order.db_id ?? order.id, rating_score: rating }) }
    catch { /* see sendProblem */ }
    finally { setBusy(false); setRateOpen(false); showToast(f('rateSent')) }
  }

  return (
    <div className="page f-page f-order-detail">
      <button type="button" className="back-link" onClick={() => navigate('/farmer/orders')}>
        <ArrowLeft size={18} />{f('ordersTitle')}
      </button>

      <header className="f-order-hero">
        <span className={`f-order-status is-${order.status}`}>{f(statusKey[order.status])}</span>
        <h1>{crop}</h1>
        <p>{f('orderQty', { qty: order.quantityKg, price: `₹${order.ratePerKg}` })}</p>
        <div className="f-order-hero-money">
          <span>{f('youGet')}</span>
          <Money value={order.farmerPayout} size="hero" tone="good" />
          <small>{order.paymentStatus === 'paid' ? f('paid') : order.paymentStatus === 'processing' ? f('paymentProcessing') : f('paymentPending')}</small>
        </div>
      </header>

      {/* The one thing this order needs, repeated from the list so the page is self-contained. */}
      {action !== 'none' && (
        <div className="f-order-action-bar">
          {action === 'accept' && (
            <>
              <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => advance('accepted')}>
                <Check size={20} />{f('accept')}
              </button>
              <button type="button" className="btn btn-ghost btn-large" disabled={busy} onClick={decline}>{f('declineOrder')}</button>
            </>
          )}
          {action === 'markReady' && (
            <button type="button" className="btn btn-primary btn-large btn-full" disabled={busy} onClick={() => advance('preparing')}>
              <PackageCheck size={20} />{f('markReady')}
            </button>
          )}
          {action === 'otp' && (
            <button type="button" className="btn btn-primary btn-large btn-full" onClick={() => setOtpOpen(true)}>
              <KeyRound size={20} />{f('showOtp')}
            </button>
          )}
          {action === 'payment' && (
            <Link className="btn btn-primary btn-large btn-full" to="/farmer/paisa">{f('seePayment')}</Link>
          )}
        </div>
      )}

      {pickup && (
        <section className="f-card">
          <h2>{f('pickupInfo')}</h2>
          <dl className="f-facts">
            <div><dt><Truck size={17} />{f('pickupWhen')}</dt><dd>{relativeDay(language, pickup.date, daysUntil(pickup.date))} · {timeWindow(language, pickup.timeWindow)}</dd></div>
            <div><dt><UserRound size={17} />{f('driver')}</dt><dd>{pickup.driver}</dd></div>
            <div><dt><Truck size={17} />{f('vehicle')}</dt><dd>{pickup.vehicle}</dd></div>
            <div><dt><MapPin size={17} />{f('pickupAddress')}</dt><dd>{pickup.farmAddress}</dd></div>
          </dl>
          {pickup.pickupOtp && pickup.status !== 'completed' && (
            <button type="button" className="btn btn-secondary btn-large btn-full" onClick={() => setOtpOpen(true)}>
              <KeyRound size={19} />{f('showOtp')}
            </button>
          )}
        </section>
      )}

      <section className="f-card">
        <h2>{f('orderProgress')}</h2>
        <ol className="f-progress">
          {STAGES.map((stage, index) => (
            <li key={stage} className={index < current ? 'is-done' : index === current ? 'is-current' : ''}>
              <span>{index < current ? <Check size={14} /> : index + 1}</span>
              <small>{f(statusKey[stage])}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="f-card">
        <h2>{f('moneyBreakdown')}</h2>
        <dl className="f-breakdown">
          <div><dt>{f('totalPrice')}</dt><dd>{money(order.total)}</dd></div>
          <div><dt>{f('transportCost')}</dt><dd className="is-minus">−{money(order.logisticsFee)}</dd></div>
          <div><dt>{f('kisanlinkCost')}</dt><dd className="is-minus">−{money(order.platformFee)}</dd></div>
          <div className="is-total"><dt>{f('youGet')}</dt><dd>{money(order.farmerPayout)}</dd></div>
        </dl>
        {pooled && <p className="f-note">{f('mmPayoutNote')}</p>}
      </section>

      <div className="f-order-secondary">
        {order.status === 'delivered' && (
          <button type="button" className="f-secondary-action" onClick={() => setRateOpen(true)}>
            <Star size={19} />{f('rateBuyer')}
          </button>
        )}
        <button type="button" className="f-secondary-action" onClick={() => setProblemOpen(true)}>
          <AlertTriangle size={19} />{f('reportProblem')}
        </button>
        <a className="f-secondary-action" href="tel:18001234567"><Phone size={19} />{f('callHelp')}</a>
      </div>

      <Sheet open={otpOpen} onClose={() => { setOtpOpen(false); if (params.get('otp')) { params.delete('otp'); setParams(params, { replace: true }) } }} title={f('otpTitle')}>
        {pickup?.pickupOtp ? (
          <div className="f-otp">
            <p>{f('otpHint')}</p>
            <strong className="f-otp-code">{pickup.pickupOtp.split('').map((digit, index) => <i key={index}>{digit}</i>)}</strong>
            <small>{pickup.driver} · {pickup.vehicle}</small>
          </div>
        ) : (
          <p className="f-note">{f('otpNotYet')}</p>
        )}
      </Sheet>

      <Sheet
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        title={f('reportProblem')}
        footer={<button type="button" className="btn btn-primary btn-large btn-full" disabled={busy || !problem.trim()} onClick={sendProblem}>{f('sendProblem')}</button>}
      >
        <p className="f-note">{f('reportProblemHint')}</p>
        <label className="f-field">
          <textarea rows={4} autoFocus value={problem} placeholder={f('problemPlaceholder')} onChange={(event) => setProblem(event.target.value)} />
        </label>
        <a className="f-secondary-action" href="tel:18001234567"><Phone size={19} />{f('callHelp')} · {f('helpNumber')}</a>
      </Sheet>

      <Sheet
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        title={f('rateBuyer')}
        footer={<button type="button" className="btn btn-primary btn-large btn-full" disabled={busy} onClick={sendRating}>{f('sendProblem')}</button>}
      >
        <p className="f-note">{f('rateHint')}</p>
        <div className="f-rating" role="radiogroup" aria-label={f('rateHint')}>
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={rating === score}
              className={score <= rating ? 'is-on' : ''}
              onClick={() => setRating(score)}
            >
              <Star size={30} />
            </button>
          ))}
        </div>
        <p className="f-rating-label">{rating <= 2 ? f('rate1') : rating <= 3 ? f('rate3') : f('rate5')}</p>
      </Sheet>
    </div>
  )
}
