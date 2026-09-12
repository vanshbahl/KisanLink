import type { FarmerOrder, OrderStatus, Pickup } from '../../types'
import type { FarmerKey } from '../../i18n/farmer'
import { daysUntil } from '../../utils/dates'

export interface OrderWithPickup {
  order: FarmerOrder
  pickup: Pickup | null
}

/** One dictionary key per order status, in farmer language rather than system language. */
export const statusKey: Record<OrderStatus, FarmerKey> = {
  new: 'stNew',
  accepted: 'stAccepted',
  preparing: 'stPreparing',
  pickup_scheduled: 'stPickupScheduled',
  in_transit: 'stInTransit',
  delivered: 'stDelivered',
  cancelled: 'stCancelled',
}

export type OrderAction = 'accept' | 'markReady' | 'otp' | 'pickupInfo' | 'payment' | 'none'

/**
 * The single thing this order needs from the farmer right now.
 *
 * Deliberately exhaustive and deliberately singular: every card and the order page read this
 * one function, so "what do I do next" cannot disagree between two screens. Order matters —
 * a driver on the way today outranks the order's own status, because at that moment the OTP
 * is the only thing the farmer is being asked for.
 */
export function nextAction({ order, pickup }: OrderWithPickup): OrderAction {
  if (order.status === 'cancelled') return 'none'
  if (order.status === 'delivered') return 'payment'
  if (order.status === 'new') return 'accept'
  if (order.status === 'accepted') return 'markReady'

  const driverComing = pickup
    && (pickup.status === 'driver_assigned' || pickup.status === 'arriving')
    && daysUntil(pickup.date) <= 0
  if (driverComing && pickup?.pickupOtp) return 'otp'

  if (order.status === 'in_transit') return 'none'
  return pickup ? 'pickupInfo' : 'none'
}
