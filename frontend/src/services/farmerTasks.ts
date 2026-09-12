import type { EarningsTransaction, FarmerListing, FarmerOrder, Pickup } from '../types'
import { daysUntil } from '../utils/dates'
import { rankOrders } from './farmerAiService'

/**
 * "आज क्या करना है" — the farmer home's task layer.
 *
 * Every task below is derived from a record that already exists in shared prototype state.
 * Nothing is invented to fill the list: when the farm genuinely has nothing outstanding the
 * home says so, which is a more useful screen than three manufactured suggestions.
 *
 * Ordering is by real urgency, not by category: a driver already at the gate outranks an
 * unaccepted order, which outranks a pickup tomorrow, which outranks money that has arrived.
 */
export type FarmerTaskKind = 'driver' | 'accept' | 'ready' | 'pickup' | 'paid' | 'deal'

export interface FarmerTask {
  id: string
  kind: FarmerTaskKind
  /** Dictionary key for the headline, plus the values it interpolates. */
  titleKey: string
  values: Record<string, string | number>
  /** Optional second line. */
  hintKey?: string
  hintValues?: Record<string, string | number>
  /** Label key for the inline action, when the task can be resolved in one tap. */
  actionKey?: string
  to: string
  urgency: number
}

export interface FarmerTaskInput {
  listings: FarmerListing[]
  orders: FarmerOrder[]
  pickups: Pickup[]
  earnings: EarningsTransaction[]
  /** Better-deal summary, when one is open for a crop this farmer actually grows. */
  deal?: { cropEn: string; cropHi: string; pricePerKg: number; gainPerKg: number } | null
}

/** A pickup is "live" once a driver is attached to it and it has not been collected. */
const DRIVER_ON_THE_WAY: Pickup['status'][] = ['driver_assigned', 'arriving']

export function buildFarmerTasks(input: FarmerTaskInput, language: 'en' | 'hi'): FarmerTask[] {
  const { orders, pickups, earnings, deal } = input
  const tasks: FarmerTask[] = []
  const cropOf = (order: { crop: string; cropHi: string }) => (language === 'hi' ? order.cropHi : order.crop)

  // 1. A driver is at, or almost at, the gate. Nothing outranks this.
  for (const pickup of pickups) {
    if (!DRIVER_ON_THE_WAY.includes(pickup.status)) continue
    if (daysUntil(pickup.date) !== 0) continue
    const order = orders.find((item) => item.id === pickup.orderId)
    tasks.push({
      id: `driver_${pickup.id}`,
      kind: 'driver',
      titleKey: 'taskDriverHere',
      values: { crop: cropOf(pickup) },
      actionKey: 'taskDriverAction',
      to: order ? `/farmer/orders/${order.id}?otp=1` : '/farmer/orders',
      urgency: 100,
    })
  }

  // 2. Orders the buyer is waiting on. Ranked among themselves by the existing advisor.
  const newOrders = orders.filter((order) => order.status === 'new')
  const rankedNew = rankOrders(newOrders, pickups).map((entry) => entry.order)
  rankedNew.forEach((order, index) => {
    tasks.push({
      id: `accept_${order.id}`,
      kind: 'accept',
      titleKey: 'taskNewOrder',
      values: { qty: order.quantityKg, crop: cropOf(order) },
      actionKey: 'taskNewOrderAction',
      to: `/farmer/orders/${order.id}`,
      urgency: 90 - index,
    })
  })

  // 3. Accepted but not yet marked ready — the farmer's own next physical step.
  for (const order of orders) {
    if (order.status !== 'accepted') continue
    tasks.push({
      id: `ready_${order.id}`,
      kind: 'ready',
      titleKey: 'taskReady',
      values: { qty: order.quantityKg, crop: cropOf(order) },
      actionKey: 'taskReadyAction',
      to: `/farmer/orders/${order.id}`,
      urgency: 80,
    })
  }

  // 4. A pickup today or tomorrow that does not already have a driver on the way.
  for (const pickup of pickups) {
    if (pickup.status === 'completed' || DRIVER_ON_THE_WAY.includes(pickup.status)) continue
    const days = daysUntil(pickup.date)
    if (days < 0 || days > 1) continue
    const order = orders.find((item) => item.id === pickup.orderId)
    tasks.push({
      id: `pickup_${pickup.id}`,
      kind: 'pickup',
      titleKey: days === 0 ? 'taskPickupToday' : 'taskPickupTomorrow',
      values: { qty: pickup.quantityKg, crop: cropOf(pickup) },
      to: order ? `/farmer/orders/${order.id}` : '/farmer/orders',
      urgency: days === 0 ? 70 : 60,
    })
  }

  // 5. Money that landed in the last week — reassurance, not an action.
  for (const entry of earnings) {
    if (entry.status !== 'paid') continue
    const days = daysUntil(entry.date)
    if (days < -7 || days > 0) continue
    tasks.push({
      id: `paid_${entry.id}`,
      kind: 'paid',
      titleKey: 'taskPaid',
      values: { amount: `₹${Math.round(entry.net).toLocaleString('en-IN')}` },
      hintKey: 'taskPaidHint',
      hintValues: { crop: language === 'hi' ? entry.cropHi : entry.crop },
      to: '/farmer/paisa',
      urgency: 50,
    })
  }

  // 6. A price worth acting on. Only when it actually beats the mandi.
  if (deal && deal.gainPerKg > 0) {
    tasks.push({
      id: 'deal',
      kind: 'deal',
      titleKey: 'taskDeal',
      values: {
        crop: language === 'hi' ? deal.cropHi : deal.cropEn,
        amount: `₹${Math.round(deal.pricePerKg)}`,
      },
      hintKey: 'taskDealHint',
      hintValues: { gain: `₹${Math.round(deal.gainPerKg)}` },
      to: '/farmer/deal',
      urgency: 40,
    })
  }

  return tasks.sort((a, b) => b.urgency - a.urgency)
}
