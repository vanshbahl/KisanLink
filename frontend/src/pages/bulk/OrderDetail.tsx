import { Building2, Check, ShieldCheck, Truck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ContributionMatchIntelligence } from '../../components/ai/BulkIntelligenceCards'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { CorridorRouteMap } from '../../components/maps/CorridorRouteMap'
import { StatusBadge } from '../../components/StatusBadge'
import { useAsyncData } from '../../hooks/useAsyncData'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import { stopsForRoute } from '../logistics/shared'
import { hasArrived, uninspectedLots } from './attention'
import { orderLogistics } from './Orders'
import { Receiving, useLotTrails } from './Receiving'
import { Badge, CostStack, Disclosure, ErrorState, FULFILMENT_STEPS, FarmList, PageHead, farmerFor, kg, money, orderEta, orderLabel, orderTone, perKg } from './shared'
import type { BulkOrder } from '../../types'

/**
 * One procurement order, disclosed progressively: what and when at the top, the fulfilment
 * rail, then Supply, Logistics and Commercial sections that open on demand. Receipt QA
 * surfaces as the first thing on the page once the load has arrived.
 */
export function BulkOrderDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error } = useAsyncData(async () => {
    const [order, state] = await Promise.all([phase2Service.bulkOrder(id), prototypeService.getState()])
    if (!order) return null
    const { delivery, route, vehicle } = orderLogistics(order, state)
    const pickups = state.logisticsPickups.filter((pickup) => route?.pickups.includes(pickup.id))
    const stops = route ? stopsForRoute(route, state.logisticsPickups, state.deliveries) : []
    return { order, delivery, route, vehicle, pickups, stops }
  }, [id], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Procurement order not found" />
  return <OrderDetail {...data} />
}

function OrderDetail({ order, delivery, route, vehicle, pickups, stops }: { order: BulkOrder } & ReturnType<typeof orderLogistics> & { pickups: Array<{ id: string; farm: string; farmLocation: string; quantityKg: number; status: string }>; stops: ReturnType<typeof stopsForRoute> }) {
  const { lots, trails, refresh } = useLotTrails(order)
  const arrived = hasArrived(order, delivery)
  const pendingLots = uninspectedLots(order, trails)
  const current = Math.max(0, FULFILMENT_STEPS.indexOf(order.status))
  const collected = pickups.filter((pickup) => ['loaded', 'completed'].includes(pickup.status)).reduce((sum, pickup) => sum + pickup.quantityKg, 0)
  const saving = order.traditionalEstimate - order.total
  const landedPerKg = order.total / Math.max(1, order.suppliedQuantityKg)
  const benchmarkPerKg = order.traditionalEstimate / Math.max(1, order.suppliedQuantityKg)

  return (
    <div className="page b-page">
      <PageHead
        back={{ to: '/bulk/orders', label: 'Orders' }}
        title={`${kg(order.orderedQuantityKg)} ${order.crop}`}
        copy={`${order.grade} · ${order.contributions.length} farm${order.contributions.length === 1 ? '' : 's'} · ${order.deliveryLocation.split(',')[0]}`}
        aside={<Badge tone={orderTone(order.status)}>{orderLabel[order.status]}</Badge>}
      />

      <div className="b-order-hero">
        <div><small>{order.status === 'delivered' ? 'Delivered' : 'Arriving'}</small><strong>{orderEta(order, delivery)}</strong></div>
        <div><small>Collected</small><strong>{collected ? `${kg(collected)} of ${kg(order.suppliedQuantityKg)}` : `${kg(order.suppliedQuantityKg)} allocated`}</strong></div>
        <div><small>Landed</small><strong>{perKg(landedPerKg)}</strong></div>
        {saving > 0 && <div className="b-good"><small>Saved</small><strong>{money(saving)}</strong></div>}
      </div>

      {arrived && pendingLots.length > 0 && <Receiving order={order} arrived={arrived} lots={lots} trails={trails} refresh={refresh} />}

      <ol className="b-rail" aria-label="Fulfilment">
        {FULFILMENT_STEPS.map((status, index) => (
          <li key={status} className={index < current ? 'is-done' : index === current ? 'is-active' : ''}>
            <span>{index < current ? <Check size={12} /> : index + 1}</span>
            <strong>{orderLabel[status]}</strong>
          </li>
        ))}
      </ol>

      <Disclosure title="Supply" summary={`${order.contributions.length} farm${order.contributions.length === 1 ? '' : 's'} · ${kg(order.suppliedQuantityKg)} · ${lots.length ? `${lots.length - pendingLots.length}/${lots.length} lots inspected at receipt` : 'lot codes pending'}`} defaultOpen={!arrived || pendingLots.length === 0}>
        <FarmList contributions={order.contributions.map((item) => ({ ...item, farmer: item.farmer || farmerFor(item.farm) }))} total={order.orderedQuantityKg}>
          <ContributionMatchIntelligence contributions={order.contributions} total={order.orderedQuantityKg} deliveryWindow={order.deliveryWindow} grade={order.grade} />
        </FarmList>
        {lots.length > 0 && (
          <div className="b-sub">
            <h3>Lot quality</h3>
            {!(arrived && pendingLots.length > 0) && <Receiving order={order} arrived={arrived} lots={lots} trails={trails} refresh={refresh} />}
            {arrived && pendingLots.length > 0 && <p className="b-note">Receipt inspection is open above. Lots already inspected can be accepted there.</p>}
          </div>
        )}
      </Disclosure>

      <Disclosure title="Logistics" summary={`${vehicle ? `${vehicle.type} ${vehicle.registration}` : route?.vehicleId ?? 'Vehicle pending'} · ${route ? `${route.distanceKm} km` : 'route pending'} · ${pickups.length} pickup${pickups.length === 1 ? '' : 's'}`}>
        {route && stops.length > 0 && (
          <CorridorRouteMap
            stops={stops}
            variant="compact"
            meta={{ routeId: route.id, vehicle: route.vehicleId, loadKg: route.loadKg, capacityKg: route.capacityKg, distanceKm: route.distanceKm, durationMinutes: route.durationMinutes, eta: delivery?.eta }}
          />
        )}
        <div className="b-stops">
          {pickups.map((pickup, index) => (
            <div key={pickup.id} className={`b-stop is-${pickup.status}`}>
              <span>{index + 1}</span>
              <div><strong>{pickup.farm}</strong><small>{pickup.farmLocation} · {kg(pickup.quantityKg)}</small></div>
              <StatusBadge tone={pickup.status === 'completed' || pickup.status === 'loaded' ? 'green' : pickup.status === 'issue' ? 'red' : 'amber'}>{pickup.status.replaceAll('_', ' ')}</StatusBadge>
            </div>
          ))}
          <div className="b-stop is-drop">
            <span><Building2 size={13} /></span>
            <div><strong>{order.deliveryLocation}</strong><small>{delivery ? `ETA ${orderEta(order, delivery)}` : orderEta(order)}</small></div>
            <StatusBadge tone="neutral">{delivery ? delivery.status.replaceAll('_', ' ') : 'scheduled'}</StatusBadge>
          </div>
        </div>
        {vehicle && <p className="b-note"><Truck size={14} /> {vehicle.type} {vehicle.registration} · driver {vehicle.driver} · {route ? `${Math.round((route.loadKg / Math.max(1, route.capacityKg)) * 100)}% loaded` : ''}</p>}
        <small className="b-meta">{route ? `${route.id} · ` : ''}{delivery?.id ?? ''}</small>
      </Disclosure>

      <Disclosure title="Commercial" summary={`${money(order.total)} landed · ${perKg(landedPerKg)}${saving > 0 ? ` · ${money(saving)} saved` : ''}`}>
        <CostStack produce={order.produceValue} logistics={order.logisticsFee} platform={order.platformFee} landedTotal={order.total} landedPerKg={landedPerKg} benchmarkPerKg={benchmarkPerKg} quantityKg={order.suppliedQuantityKg} />
        <p className="b-note">Wholesale benchmark uses the mandi rate quoted by the same farms, plus the commission and wholesale margin between the mandi and your dock.</p>
        <p className="b-safe"><ShieldCheck size={14} /> {order.invoiceStatus} · no real payment</p>
        <small className="b-meta">{order.id} · from {order.rfqId}</small>
      </Disclosure>

      <a className="btn btn-secondary btn-full" href="tel:18001234567">Procurement support</a>
    </div>
  )
}
