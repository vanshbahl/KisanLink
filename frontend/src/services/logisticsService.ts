import type { DeliveryStatus, LogisticsPickup, LogisticsPickupStatus, LogisticsProfileData, VehicleStatus } from '../types'
import type { PrototypeState } from './prototypeService'
import { prototypeService } from './prototypeService'

const now = () => new Date().toISOString()
const note = (state: PrototypeState, role: 'farmer' | 'consumer' | 'bulk' | 'logistics', title: string, titleHi: string, body: string, bodyHi: string, href: string) => state.notifications.unshift({ id: `note-${Date.now()}-${state.notifications.length}`, role, title, titleHi, body, bodyHi, timestamp: now(), read: false, href })
const pickupLabels: Record<LogisticsPickupStatus, [string, string]> = {
  unassigned: ['Unassigned', 'वाहन तय नहीं'], assigned: ['Vehicle assigned', 'वाहन तय हुआ'], en_route: ['Driver en route', 'ड्राइवर रास्ते में'], arrived: ['Driver arrived', 'ड्राइवर पहुंच गया'], loaded: ['Produce loaded', 'फसल लोड हुई'], completed: ['Pickup completed', 'पिकअप पूरा हुआ'], issue: ['Pickup issue reported', 'पिकअप समस्या दर्ज हुई'],
}
const deliveryLabels: Record<DeliveryStatus, [string, string]> = {
  scheduled: ['Delivery scheduled', 'डिलीवरी तय हुई'], loaded: ['Shipment loaded', 'माल लोड हुआ'], in_transit: ['Shipment in transit', 'माल रास्ते में'], at_hub: ['Shipment at hub', 'माल हब पर है'], out_for_delivery: ['Out for delivery', 'डिलीवरी के लिए निकला'], delivered: ['Delivered', 'डिलीवरी पूरी हुई'], issue: ['Delivery issue reported', 'डिलीवरी समस्या दर्ज हुई'],
}

function syncPickup(state: PrototypeState, id: string, status: LogisticsPickupStatus) {
  const item = state.logisticsPickups.find((entry) => entry.id === id)
  if (!item) throw new Error('Pickup not found')
  item.status = status
  const [label, labelHi] = pickupLabels[status]
  item.timeline.push({ label, labelHi, at: now() })
  const legacy = state.pickups.find((entry) => entry.id === id)
  if (legacy) {
    legacy.driver = item.driver ?? 'Assigning shortly'
    legacy.vehicle = state.vehicles.find((vehicle) => vehicle.id === item.vehicleId)?.registration ?? 'To be assigned'
    legacy.status = status === 'assigned' ? 'driver_assigned' : ['en_route', 'arrived'].includes(status) ? 'arriving' : status === 'loaded' ? 'collected' : status === 'completed' ? 'completed' : 'scheduled'
  }
  for (const ref of item.orderRefs) {
    const farmerOrder = state.orders.find((order) => order.id === ref)
    if (farmerOrder && status !== 'issue') farmerOrder.status = ['loaded', 'completed'].includes(status) ? 'in_transit' : ['assigned', 'en_route', 'arrived'].includes(status) ? 'pickup_scheduled' : farmerOrder.status
    const parent = ref.replace(/-\d+$/, '')
    const consumer = state.consumerOrders.find((order) => order.id === parent)
    if (consumer && ['loaded', 'completed'].includes(status)) {
      consumer.status = 'collected'
      if (!consumer.timeline.some((entry) => entry.status === 'collected')) consumer.timeline.push({ status: 'collected', label: 'Pickup completed', at: now() })
      note(state, 'consumer', 'Pickup completed', 'पिकअप पूरा हुआ', `${consumer.id} has been collected from the farm.`, 'आपका ऑर्डर खेत से ले लिया गया है।', `/consumer/orders/${consumer.id}`)
    }
    if (farmerOrder && status === 'assigned') note(state, 'farmer', 'Driver assigned', 'ड्राइवर तय हुआ', `${item.driver} will collect ${item.quantityKg} kg ${item.crop}.`, `${item.quantityKg} किलो फसल के लिए ड्राइवर तय हुआ।`, `/farmer/orders/${farmerOrder.id}`)
    if (farmerOrder && status === 'arrived') note(state, 'farmer', 'Driver has arrived', 'ड्राइवर पहुंच गया', `${item.driver} is at ${item.farm}.`, `ड्राइवर ${item.farm} पर पहुंच गया है।`, '/farmer/pickups')
    if (farmerOrder && status === 'completed') note(state, 'farmer', 'Pickup completed', 'पिकअप पूरा हुआ', `${id} was collected successfully.`, `${id} सफलतापूर्वक पूरा हुआ।`, '/farmer/pickups')
  }
  note(state, 'logistics', label, labelHi, `${id} · ${item.crop}`, `${id} · ${item.cropHi}`, `/logistics/pickups/${id}`)
  return item
}

function syncDelivery(state: PrototypeState, id: string, status: DeliveryStatus) {
  const item = state.deliveries.find((entry) => entry.id === id)
  if (!item) throw new Error('Delivery not found')
  item.status = status
  const [label, labelHi] = deliveryLabels[status]
  item.timeline.push({ label, labelHi, at: now() })
  for (const ref of item.orderRefs) {
    const consumer = state.consumerOrders.find((order) => order.id === ref)
    if (consumer && status !== 'issue') {
      const mapped = status === 'delivered' ? 'delivered' : status === 'out_for_delivery' ? 'out_for_delivery' : ['loaded', 'in_transit', 'at_hub'].includes(status) ? (status === 'loaded' ? 'collected' : 'in_transit') : 'pickup_scheduled'
      consumer.status = mapped
      if (!consumer.timeline.some((entry) => entry.status === mapped)) consumer.timeline.push({ status: mapped, label, at: now() })
      note(state, 'consumer', label, labelHi, `${ref} · ${item.produce}`, `${ref} · ${item.produceHi}`, `/consumer/orders/${ref}`)
    }
    const bulk = state.bulkOrders.find((order) => order.id === ref)
    if (bulk && status !== 'issue') {
      bulk.status = status === 'delivered' ? 'delivered' : status === 'at_hub' ? 'consolidating' : ['loaded', 'in_transit', 'out_for_delivery'].includes(status) ? 'in_transit' : 'pickup_scheduled'
      note(state, 'bulk', status === 'at_hub' ? 'Consolidation update' : label, status === 'at_hub' ? 'एकत्रीकरण अपडेट' : labelHi, `${ref} · ${item.quantityKg.toLocaleString('en-IN')} kg ${item.produce}`, `${ref} की स्थिति बदल गई है।`, `/bulk/orders/${ref}`)
    }
    if (status === 'delivered') {
      state.orders.filter((order) => order.id === ref || order.id.startsWith(`${ref}-`)).forEach((order) => { order.status = 'delivered'; order.paymentStatus = 'paid'; const earning = state.earnings.find((entry) => entry.orderId === order.id); if (earning) earning.status = 'paid'; note(state, 'farmer', 'Mock payout complete', 'डेमो भुगतान पूरा हुआ', `${order.id} was delivered and ₹${order.farmerPayout.toLocaleString('en-IN')} is complete.`, `${order.id} की डिलीवरी और डेमो भुगतान पूरा हुआ।`, '/farmer/earnings') })
    }
  }
  note(state, 'logistics', label, labelHi, `${id} · ${item.destination}`, `${id} · ${item.destination}`, `/logistics/deliveries/${id}`)
  return item
}

export const logisticsService = {
  async overview() { return prototypeService.getState() },
  async pickups() { return (await prototypeService.getState()).logisticsPickups },
  async pickup(id: string) { return (await prototypeService.getState()).logisticsPickups.find((item) => item.id === id) },
  async deliveries() { return (await prototypeService.getState()).deliveries },
  async delivery(id: string) { return (await prototypeService.getState()).deliveries.find((item) => item.id === id) },
  async routes() { return (await prototypeService.getState()).logisticsRoutes },
  async vehicles() { return (await prototypeService.getState()).vehicles },
  async profile() { return (await prototypeService.getState()).logisticsProfile },
  async saveProfile(profile: LogisticsProfileData) { const state = await prototypeService.getState(); state.logisticsProfile = profile; await prototypeService.replaceState(state); return profile },
  async assignPickup(pickupId: string, vehicleId: string) { const state = await prototypeService.getState(); const pickup = state.logisticsPickups.find((item) => item.id === pickupId); const vehicle = state.vehicles.find((item) => item.id === vehicleId); if (!pickup || !vehicle || vehicle.status === 'maintenance') throw new Error('Vehicle is not available'); pickup.vehicleId = vehicle.id; pickup.driver = vehicle.driver; vehicle.status = 'assigned'; vehicle.currentAssignment = pickup.routeId ?? pickup.id; const result = syncPickup(state, pickupId, 'assigned'); await prototypeService.replaceState(state); return result },
  async updatePickup(pickupId: string, status: LogisticsPickupStatus) { const state = await prototypeService.getState(); const result = syncPickup(state, pickupId, status); if (status === 'completed') result.checklist.pickupCompleted = true; await prototypeService.replaceState(state); return result },
  async toggleChecklist(pickupId: string, key: keyof LogisticsPickup['checklist']) { const state = await prototypeService.getState(); const pickup = state.logisticsPickups.find((item) => item.id === pickupId); if (!pickup) throw new Error('Pickup not found'); pickup.checklist[key] = !pickup.checklist[key]; await prototypeService.replaceState(state); return pickup },
  async reportPickupIssue(pickupId: string, issue: string) { const state = await prototypeService.getState(); const pickup = state.logisticsPickups.find((item) => item.id === pickupId); if (!pickup) throw new Error('Pickup not found'); pickup.notes = issue; const result = syncPickup(state, pickupId, 'issue'); note(state, 'farmer', 'Pickup issue reported', 'पिकअप समस्या दर्ज हुई', issue, 'पिकअप में समस्या दर्ज हुई है।', '/farmer/pickups'); await prototypeService.replaceState(state); return result },
  async updateDelivery(deliveryId: string, status: DeliveryStatus) { const state = await prototypeService.getState(); const result = syncDelivery(state, deliveryId, status); await prototypeService.replaceState(state); return result },
  async reportDeliveryIssue(deliveryId: string, issue: string) { const state = await prototypeService.getState(); const delivery = state.deliveries.find((item) => item.id === deliveryId); if (!delivery) throw new Error('Delivery not found'); delivery.issues.unshift(issue); const result = syncDelivery(state, deliveryId, 'issue'); note(state, delivery.buyerType === 'Consumer' ? 'consumer' : 'bulk', 'Delivery delay', 'डिलीवरी में देरी', issue, 'डिलीवरी में देरी की सूचना।', delivery.buyerType === 'Consumer' ? '/consumer/orders' : '/bulk/orders'); await prototypeService.replaceState(state); return result },
  async setVehicle(vehicleId: string, status: VehicleStatus, assignment?: string) { const state = await prototypeService.getState(); const vehicle = state.vehicles.find((item) => item.id === vehicleId); if (!vehicle) throw new Error('Vehicle not found'); vehicle.status = status; vehicle.currentAssignment = status === 'available' ? undefined : assignment ?? vehicle.currentAssignment; note(state, 'logistics', status === 'available' ? 'Vehicle released' : 'Vehicle assignment changed', status === 'available' ? 'वाहन उपलब्ध हुआ' : 'वाहन असाइनमेंट बदला', `${vehicle.registration} is ${status.replaceAll('_', ' ')}.`, `${vehicle.registration} की स्थिति बदली।`, '/logistics/vehicles'); await prototypeService.replaceState(state); return vehicle },
}
