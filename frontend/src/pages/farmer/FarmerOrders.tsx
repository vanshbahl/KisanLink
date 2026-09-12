import { useState } from 'react'
import { Check, ChevronRight, KeyRound, PackageCheck, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Money } from '../../components/farmer/Money'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText, relativeDay, timeWindow } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { rankOrders } from '../../services/farmerAiService'
import { prototypeService } from '../../services/prototypeService'
import { daysUntil } from '../../utils/dates'
import { nextAction, statusKey, type OrderWithPickup } from './orderState'

/**
 * Orders, built around the next action rather than around every possible action.
 *
 * Previously each card carried Details / Accept / Decline / Mark ready / View pickup at once,
 * behind an eight-tab status filter. A farmer with a new order does not need five buttons:
 * they need one, "स्वीकार करें". Everything else is either implied by the card being tappable
 * or lives on the order itself.
 *
 * The Order Advisor's ranking (`rankOrders`) survives as the sort of the "चालू" tab — the
 * intelligence is still applied, it just no longer asks the farmer to run it.
 */
type Tab = 'running' | 'done' | 'cancelled'

export function FarmerOrders() {
  const { f, language, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('running')

  const { data, loading, refresh } = useAsyncData(async () => {
    const [listings, orders, pickups] = await Promise.all([
      prototypeService.getMyListings(),
      prototypeService.getOrders(),
      prototypeService.getPickups(),
    ])
    const mine = new Set(listings.map((item) => item.id))
    const myOrders = orders.filter((order) => mine.has(order.listingId))
    return { orders: myOrders, pickups }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />

  const orders = data?.orders ?? []
  const pickups = data?.pickups ?? []

  const running = orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
  const buckets: Record<Tab, typeof orders> = {
    running: rankOrders(running, pickups).map((entry) => entry.order),
    done: orders.filter((order) => order.status === 'delivered'),
    cancelled: orders.filter((order) => order.status === 'cancelled'),
  }
  const visible = buckets[tab]

  const accept = async (id: string) => {
    await prototypeService.updateOrder(id, 'accepted')
    showToast(f('orderSaved'))
    refresh()
  }
  const markReady = async (id: string) => {
    await prototypeService.updateOrder(id, 'preparing')
    showToast(f('orderSaved'))
    refresh()
  }

  return (
    <div className="page f-page f-orders">
      <header className="f-page-head"><h1>{f('ordersTitle')}</h1></header>

      <div className="f-tabs" role="tablist">
        {(['running', 'done', 'cancelled'] as Tab[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'is-active' : ''}
            onClick={() => setTab(key)}
          >
            {key === 'running' ? f('tabRunning') : key === 'done' ? f('tabDone') : f('tabCancelled')}
            {buckets[key].length > 0 && <span>{buckets[key].length}</span>}
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="f-order-list">
          {visible.map((order) => {
            const pickup = pickups.find((item) => item.orderId === order.id) ?? null
            const entry: OrderWithPickup = { order, pickup }
            const action = nextAction(entry)
            const pickupDays = pickup ? daysUntil(pickup.date) : null

            return (
              <article className={`f-order is-${order.status}`} key={order.id}>
                <Link className="f-order-main" to={`/farmer/orders/${order.id}`}>
                  <div className="f-order-top">
                    <span className={`f-order-status is-${order.status}`}>{f(statusKey[order.status])}</span>
                    <h2>{pick(order.crop, order.cropHi)}</h2>
                    <p>{f('orderQty', { qty: order.quantityKg, price: `₹${order.ratePerKg}` })} · {order.buyerName}</p>
                  </div>
                  <div className="f-order-money">
                    <span>{f('youGet')}</span>
                    <Money value={order.farmerPayout} size="lg" tone={order.paymentStatus === 'paid' ? 'good' : 'default'} />
                  </div>
                </Link>

                {pickup && pickupDays !== null && order.status !== 'delivered' && (
                  <p className="f-order-pickup">
                    <Truck size={17} aria-hidden="true" />
                    {relativeDay(language, pickup.date, pickupDays)} · {timeWindow(language, pickup.timeWindow)}
                  </p>
                )}

                <div className="f-order-foot">
                  {action === 'accept' && (
                    <button type="button" className="btn btn-primary f-order-cta" onClick={() => accept(order.id)}>
                      <Check size={19} />{f('accept')}
                    </button>
                  )}
                  {action === 'markReady' && (
                    <button type="button" className="btn btn-primary f-order-cta" onClick={() => markReady(order.id)}>
                      <PackageCheck size={19} />{f('markReady')}
                    </button>
                  )}
                  {action === 'otp' && (
                    <button type="button" className="btn btn-primary f-order-cta" onClick={() => navigate(`/farmer/orders/${order.id}?otp=1`)}>
                      <KeyRound size={19} />{f('showOtp')}
                    </button>
                  )}
                  {action === 'pickupInfo' && (
                    <Link className="btn btn-secondary f-order-cta" to={`/farmer/orders/${order.id}`}>
                      <Truck size={19} />{f('pickupInfo')}
                    </Link>
                  )}
                  {action === 'payment' && (
                    <Link className="btn btn-secondary f-order-cta" to="/farmer/paisa">
                      {f('seePayment')}<ChevronRight size={18} />
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="f-empty">
          <PackageCheck size={34} aria-hidden="true" />
          <h2>{f('noOrders')}</h2>
        </div>
      )}
    </div>
  )
}
