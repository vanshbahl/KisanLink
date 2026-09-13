import { ChevronRight, PackageCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useAsyncData } from '../../hooks/useAsyncData'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import type { BulkOrder, Delivery, LogisticsRoute, Vehicle } from '../../types'
import { Badge, Empty, ErrorState, FULFILMENT_STEPS, FillBar, PageHead, isActiveOrder, kg, money, orderEta, orderLabel, orderTone, perKg } from './shared'

/** The route and vehicle actually fulfilling an order, read from shared logistics state. */
export function orderLogistics(order: BulkOrder, state: { logisticsRoutes: LogisticsRoute[]; deliveries: Delivery[]; vehicles: Vehicle[]; logisticsPickups: Array<{ id: string; routeId?: string }> }) {
  const delivery = state.deliveries.find((entry) => entry.orderRefs.includes(order.id))
  const route = state.logisticsRoutes.find((item) => delivery && item.deliveries.includes(delivery.id))
    ?? state.logisticsRoutes.find((item) => item.deliveries.some((deliveryId) => state.deliveries.find((entry) => entry.id === deliveryId)?.orderRefs.includes(order.id)))
  const vehicle = state.vehicles.find((item) => item.id === (route?.vehicleId ?? delivery?.vehicleId))
  return { delivery, route, vehicle }
}

type Tab = 'active' | 'delivered' | 'cancelled'

export function BulkOrdersPage() {
  const [tab, setTab] = useState<Tab>('active')
  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [orders, state] = await Promise.all([phase2Service.bulkOrders(), prototypeService.getState()])
    return { orders, state }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Unable to load orders" onRetry={refresh} />

  const orders = data.orders.filter((order) => tab === 'active' ? isActiveOrder(order) : order.status === tab)
  const counts = { active: data.orders.filter(isActiveOrder).length, delivered: data.orders.filter((order) => order.status === 'delivered').length, cancelled: data.orders.filter((order) => order.status === 'cancelled').length }

  return (
    <div className="page b-page">
      <PageHead title="Orders" copy="Pooled farm pickups, one consolidated delivery, transparent landed cost." />
      <div className="b-tabs" role="tablist" aria-label="Orders">
        {(['active', 'delivered', 'cancelled'] as Tab[]).map((value) => (
          <button type="button" key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'is-on' : ''} onClick={() => setTab(value)}>
            {value === 'active' ? 'Active' : value === 'delivered' ? 'Delivered' : 'Cancelled'}{counts[value] ? <b>{counts[value]}</b> : null}
          </button>
        ))}
      </div>

      {orders.length ? (
        <ul className="b-order-list">
          {orders.map((order) => {
            const { delivery, route, vehicle } = orderLogistics(order, data.state)
            const step = Math.max(0, FULFILMENT_STEPS.indexOf(order.status))
            const saving = order.traditionalEstimate - order.total
            return (
              <li key={order.id}>
                <Link className="b-order-card" to={`/bulk/orders/${order.id}`}>
                  <div className="b-order-main">
                    <div className="b-req-title">
                      <h3>{kg(order.orderedQuantityKg)} {order.crop}</h3>
                      <Badge tone={orderTone(order.status)}>{orderLabel[order.status]}</Badge>
                    </div>
                    <p><Truck size={13} /> {order.status === 'delivered' ? 'Delivered' : 'Arriving'} {orderEta(order, delivery)} · {order.deliveryLocation.split(',')[0]}</p>
                    <div className="b-req-progress">
                      <FillBar pct={order.status === 'cancelled' ? 0 : (step / (FULFILMENT_STEPS.length - 1)) * 100} tone="green" label={orderLabel[order.status]} />
                      <small>{order.contributions.length} farm pickup{order.contributions.length === 1 ? '' : 's'}{vehicle ? ` · ${vehicle.type} ${vehicle.registration}` : route ? ` · ${route.vehicleId}` : ''}</small>
                    </div>
                    <dl className="b-req-facts">
                      <div><dt>Landed</dt><dd>{perKg(order.total / Math.max(1, order.suppliedQuantityKg))}</dd></div>
                      <div><dt>Order value</dt><dd>{money(order.total)}</dd></div>
                      {saving > 0 && <div><dt>Saving</dt><dd className="b-good">{money(saving)}</dd></div>}
                    </dl>
                    <small className="b-meta">{order.id}{route ? ` · ${route.id}` : ''}</small>
                  </div>
                  <ChevronRight size={18} className="b-req-chevron" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty icon={PackageCheck} title={`No ${tab} orders`} copy="Accept a matched requirement to create a procurement order." action={<Link className="btn btn-primary" to="/bulk/procure">Go to Procure</Link>} />
      )}
    </div>
  )
}
