import type { MarketView } from '../../services/marketMakerService'
import type { BulkOrder, BulkRfq, Delivery, LotTrail } from '../../types'
import { daysFromToday, isActiveOrder, isSettled, kg, matchedKg, matchedPct, orderEta, perKg } from './shared'

export type AttentionKind = 'match_ready' | 'accept_match' | 'price' | 'arriving' | 'receipt' | 'short'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  title: string
  detail: string
  action: string
  to: string
  /** Lower comes first. */
  priority: number
  urgent?: boolean
}

/** Has the buyer's load physically reached the dock? Receipt QA only makes sense after that. */
export const hasArrived = (order: BulkOrder, delivery?: Delivery) =>
  order.status === 'delivered' || delivery?.status === 'delivered' || delivery?.status === 'out_for_delivery'

/** Lots on this order that still have no warehouse-entry inspection. */
export const receiptStage = (trail: LotTrail | undefined) => {
  const stage = trail?.stages.find((item) => item.checkpoint === 'WAREHOUSE_ENTRY')
  // A drawn sample with no photos yet is an inspection in progress, not a result.
  return stage && stage.photoCount > 0 && stage.status !== 'pending' ? stage : undefined
}
export const uninspectedLots = (order: BulkOrder, trails: Record<string, LotTrail | undefined>) =>
  order.contributions.filter((item) => item.lotCode && !receiptStage(trails[item.lotCode]))

/**
 * "Needs your attention": the handful of decisions on the desk today, with the crop and the
 * number that matters, never a count. Built from the same records the rest of the module
 * shows, so tapping a row always lands on the thing it describes.
 */
export function buildAttention(input: {
  rfqs: BulkRfq[]
  orders: BulkOrder[]
  deliveries: Delivery[]
  market?: MarketView
  trails: Record<string, LotTrail | undefined>
}): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const order of input.orders.filter(isActiveOrder)) {
    const delivery = input.deliveries.find((entry) => entry.orderRefs.includes(order.id))
    const pending = uninspectedLots(order, input.trails)
    if (hasArrived(order, delivery) && pending.length) {
      items.push({
        id: `receipt-${order.id}`, kind: 'receipt', priority: 0, urgent: true,
        title: 'Receipt inspection required',
        detail: `${kg(order.suppliedQuantityKg)} ${order.crop} · ${pending.length} lot${pending.length === 1 ? '' : 's'} to sample`,
        action: 'Start inspection', to: `/bulk/orders/${order.id}#receiving`,
      })
      continue
    }
    const day = daysFromToday((delivery?.eta ?? order.deliveryWindow).slice(0, 10))
    const moving = delivery?.status === 'in_transit' || delivery?.status === 'out_for_delivery' || order.status === 'in_transit'
    if (day <= 1 || moving) {
      items.push({
        id: `arriving-${order.id}`, kind: 'arriving', priority: day <= 0 || moving ? 1 : 6,
        title: `${order.crop} arriving ${day <= 0 ? 'today' : orderEta(order, delivery).split(' · ')[0].toLowerCase()}`,
        detail: `${kg(order.suppliedQuantityKg)} · ${order.contributions.length} farm pickups · ${orderEta(order, delivery)}`,
        action: 'Track', to: `/bulk/orders/${order.id}`,
      })
    }
  }

  if (input.market && input.market.board.status !== 'created' && input.market.math.viable) {
    const { board, math } = input.market
    items.push({
      id: `market-${board.id}`, kind: 'match_ready', priority: 2,
      title: `Market Maker match ready: ${board.crop}`,
      detail: `${kg(math.committedKg)} pooled · ${perKg(math.deliveredPerKg)} landed · ${math.utilisationPct}% truck`,
      action: 'Review', to: '/bulk/market',
    })
  }

  for (const rfq of input.rfqs.filter((entry) => !isSettled(entry))) {
    const matched = matchedKg(rfq)
    const landed = rfq.plan?.landedPerKg ?? 0
    if (rfq.status === 'fully_matched') {
      items.push({
        id: `accept-${rfq.id}`, kind: 'accept_match', priority: 3,
        title: `${rfq.crop} match ready to order`,
        detail: `${kg(rfq.requiredQuantityKg)} from ${rfq.matches.length} farm${rfq.matches.length === 1 ? '' : 's'}${landed ? ` · ${perKg(landed)} landed` : ''}`,
        action: 'Accept match', to: `/bulk/procure/${rfq.id}`,
      })
    } else if (landed && landed > rfq.targetPrice + 2) {
      items.push({
        id: `price-${rfq.id}`, kind: 'price', priority: 4,
        title: `Target price adjustment suggested: ${rfq.crop}`,
        detail: `Target ₹${rfq.targetPrice}/kg · corridor lands at ${perKg(landed)}`,
        action: 'Adjust', to: `/bulk/procure/${rfq.id}`,
      })
    } else if (matched < rfq.requiredQuantityKg) {
      items.push({
        id: `short-${rfq.id}`, kind: 'short', priority: 5,
        title: `${rfq.crop} requirement ${matchedPct(rfq)}% matched`,
        detail: `${kg(rfq.requiredQuantityKg - matched)} still unmatched of ${kg(rfq.requiredQuantityKg)} · ${rfq.matches.length} farm${rfq.matches.length === 1 ? '' : 's'} so far`,
        action: 'Review', to: `/bulk/procure/${rfq.id}`,
      })
    }
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 3)
}

/**
 * Dispatch-timing read of a corridor: should the buyer create the market now, or is waiting
 * for more volume worth it? Every number is the engine's own; the sentence just ranks them.
 */
export function dispatchAdvice(view: MarketView) {
  const { board, math } = view
  if (board.status === 'created') return { tone: 'good' as const, text: `Market created. ${kg(math.committedKg)} moves on ${board.routeId ?? 'the pooled route'} at ${perKg(math.deliveredPerKg)}.` }
  const structural = math.blockers.find((item) => item.kind !== 'demand')
  if (structural) return { tone: 'attention' as const, text: structural.detail }
  if (!math.viable) {
    return { tone: 'attention' as const, text: `Wait for ${kg(math.gapKg)} more demand. At break-even the landed price settles at ${perKg(math.deliveredAtThresholdPerKg)}, against ${perKg(board.buyerCurrentPerKg)} today.` }
  }
  const headroom = Math.max(0, math.ceilingKg - math.committedKg)
  if (math.utilisationPct >= 80 || headroom < 50) {
    return { tone: 'good' as const, text: `Dispatch now. The vehicle is ${math.utilisationPct}% loaded and only ${kg(headroom)} of headroom is left, so waiting cannot lower the ${perKg(math.deliveredPerKg)} landed price much further.` }
  }
  return { tone: 'good' as const, text: `Viable now at ${perKg(math.deliveredPerKg)}. Adding up to ${kg(headroom)} more would split the same ₹${math.freightTotal.toLocaleString('en-IN')} trip further; dispatch today if the ${board.deliveryWindow} window matters more than the last rupee.` }
}
