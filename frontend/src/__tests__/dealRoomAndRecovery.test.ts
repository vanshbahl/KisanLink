import { describe, expect, it, beforeAll } from 'vitest'
import { dealRoomService } from '../services/dealRoomService'
import { transactionRecoveryService } from '../services/transactionRecoveryService'
import { prototypeService } from '../services/prototypeService'

// Polyfill localStorage & window for Node test environment
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {}
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
      length: 0,
      key: () => null,
    }
  }
  if (typeof globalThis.window === 'undefined') {
    const listeners: Record<string, Function[]> = {}
    globalThis.window = {
      dispatchEvent: (event: Event) => {
        const list = listeners[event.type] || []
        list.forEach((fn) => fn(event))
        return true
      },
      addEventListener: (type: string, fn: Function) => {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(fn)
      },
      removeEventListener: (type: string, fn: Function) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((item) => item !== fn)
        }
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    } as unknown as Window & typeof globalThis
  }
})

describe('Phase 9 — Deal Room: Smart Deal Analysis & Protected Farmer Minimum', () => {
  it('1. Initially infeasible deal correctly detected when farmer minimum + logistics exceeds buyer max', () => {
    dealRoomService.resetDemoScenario()
    const state = dealRoomService.getState()

    expect(state.farmerMinimumPrice).toBe(28)
    expect(state.buyerMaxDeliveredPrice).toBe(30)
    expect(state.currentDeliveredCost).toBe(32) // 28 + 4
    expect(state.status).toBe('INFEASIBLE')

    const evaluation = dealRoomService.evaluate(state.conditions)
    expect(evaluation.isFeasible).toBe(false)
    expect(evaluation.priceGapPerKg).toBe(2.0)
    expect(evaluation.deliveredPricePerKg).toBe(32.0)
  })

  it('2. Hard protected invariant: Farmer Minimum is strictly preserved under all condition relaxations', () => {
    dealRoomService.resetDemoScenario()

    // Test with various condition combinations
    const combinations = [
      { afternoonDelivery: false, sharedTransport: false, volumeTolerance: false },
      { afternoonDelivery: true, sharedTransport: false, volumeTolerance: false },
      { afternoonDelivery: false, sharedTransport: true, volumeTolerance: false },
      { afternoonDelivery: true, sharedTransport: true, volumeTolerance: true },
    ]

    combinations.forEach((c) => {
      const evalResult = dealRoomService.evaluate(c)
      // Farmer earnings must NEVER be reduced
      expect(evalResult.farmerPricePerKg).toBe(28)
      expect(evalResult.whatChanged.farmerProtection).toContain('28')
      expect(evalResult.whatChanged.farmerProtection).toContain('Zero farmer concessions')
    })
  })

  it('3. Flexible terms reduce logistics cost from ₹4/kg to ₹2/kg', () => {
    dealRoomService.resetDemoScenario()

    // Baseline: dedicated morning
    const baseEval = dealRoomService.evaluate({ afternoonDelivery: false, sharedTransport: false, volumeTolerance: false })
    expect(baseEval.logisticsCostPerKg).toBe(4.0)

    // Shared transport enabled: pooling cuts freight
    const pooledEval = dealRoomService.evaluate({ afternoonDelivery: false, sharedTransport: true, volumeTolerance: false })
    expect(pooledEval.logisticsCostPerKg).toBe(2.5)

    // Both afternoon delivery + shared transport: optimal pooled corridor
    const optimalEval = dealRoomService.evaluate({ afternoonDelivery: true, sharedTransport: true, volumeTolerance: false })
    expect(optimalEval.logisticsCostPerKg).toBe(2.0)
    expect(optimalEval.deliveredPricePerKg).toBe(30.0) // 28 + 2
  })

  it('4. Feasible transaction unlocked when delivered price meets buyer ceiling', () => {
    dealRoomService.resetDemoScenario()
    const updatedState = dealRoomService.updateConditions({
      afternoonDelivery: true,
      sharedTransport: true,
    })

    expect(updatedState.status).toBe('FEASIBLE')
    expect(updatedState.currentDeliveredCost).toBe(30.0)
    expect(updatedState.currentDeliveredCost).toBeLessThanOrEqual(updatedState.buyerMaxDeliveredPrice)

    const evaluation = dealRoomService.evaluate(updatedState.conditions)
    expect(evaluation.isFeasible).toBe(true)
    expect(evaluation.priceGapPerKg).toBe(0)
    expect(evaluation.whatChanged.deliveryWindow).toContain('Afternoon')
    expect(evaluation.whatChanged.transportMode).toContain('Pooled')
  })

  it('5. Two-sided acceptance flow confirms deal and commits to shared prototype state', async () => {
    dealRoomService.resetDemoScenario()
    dealRoomService.updateConditions({ afternoonDelivery: true, sharedTransport: true })

    // Step 1: Farmer accepts
    let state = await dealRoomService.setPartyAcceptance('farmer', true)
    expect(state.farmerAccepted).toBe(true)
    expect(state.buyerAccepted).toBe(false)
    expect(state.status).toBe('FEASIBLE')

    // Step 2: Buyer accepts -> Confirmed
    state = await dealRoomService.setPartyAcceptance('buyer', true)
    expect(state.farmerAccepted).toBe(true)
    expect(state.buyerAccepted).toBe(true)
    expect(state.status).toBe('CONFIRMED')
    expect(state.confirmedAt).toBeDefined()

    // Step 3: Verified synchronized into shared prototype orders and pickups
    const pState = await prototypeService.getState()
    const confirmedOrder = pState.orders.find((o) => o.id.startsWith('ORD-DEAL-'))
    expect(confirmedOrder).toBeDefined()
    expect(confirmedOrder?.quantityKg).toBe(500)
    expect(confirmedOrder?.ratePerKg).toBe(28)
    expect(confirmedOrder?.total).toBe(14000)

    const confirmedPickup = pState.logisticsPickups.find((p) => p.id === 'PK-DEAL-01')
    expect(confirmedPickup).toBeDefined()
    expect(confirmedPickup?.vehicleId).toBe('VEH-02')
  })

  it('6. Reset demo scenario safely restores baseline state', () => {
    const reset = dealRoomService.resetDemoScenario()
    expect(reset.status).toBe('INFEASIBLE')
    expect(reset.farmerAccepted).toBe(false)
    expect(reset.buyerAccepted).toBe(false)
    expect(reset.conditions.afternoonDelivery).toBe(false)
    expect(reset.conditions.sharedTransport).toBe(false)
    expect(reset.currentDeliveredCost).toBe(32)
  })
})

describe('Phase 9 — Broken Truck, Unbroken Promise: Transaction Recovery Intelligence', () => {
  it('7. Initial delivery state: Truck A on route carrying 3 commitments (650 kg)', () => {
    transactionRecoveryService.resetDemoScenario()
    const state = transactionRecoveryService.getState()

    expect(state.truckStatus).toBe('ACTIVE')
    expect(state.truckId).toBe('VEH-01')
    expect(state.affectedOrders.length).toBe(3)

    const totalWeight = state.affectedOrders.reduce((sum, o) => sum + o.quantityKg, 0)
    expect(totalWeight).toBe(650)
  })

  it('8. Vehicle failure simulation marks truck unavailable and flags orders at risk', () => {
    transactionRecoveryService.resetDemoScenario()
    const failureState = transactionRecoveryService.simulateVehicleFailure()

    expect(failureState.truckStatus).toBe('UNAVAILABLE')
    expect(failureState.failureReason).toBeDefined()
    expect(failureState.affectedOrders.every((o) => o.status === 'AT_RISK')).toBe(true)
    expect(failureState.recoveryPlan).toBeDefined()
  })

  it('9. Split-load recovery plan protects 100% of payload across Truck B and Truck C', () => {
    transactionRecoveryService.resetDemoScenario()
    const failureState = transactionRecoveryService.simulateVehicleFailure()
    const plan = failureState.recoveryPlan!

    expect(plan.isResolved).toBe(true)
    expect(plan.totalAffectedKg).toBe(650)
    expect(plan.recoveredKg).toBe(650)
    expect(plan.unresolvedKg).toBe(0) // 0 kg wasted!

    expect(plan.allocations.length).toBe(2)

    // Truck B takes 400 kg wholesale order on original ETA
    const truckB = plan.allocations.find((a) => a.vehicleId === 'VEH-02')!
    expect(truckB).toBeDefined()
    expect(truckB.allocatedKg).toBe(400)
    expect(truckB.etaImpact).toContain('Original ETA Preserved')

    // Truck C takes 250 kg combined orders with +2h revised window
    const truckC = plan.allocations.find((a) => a.vehicleId === 'VEH-05')!
    expect(truckC).toBeDefined()
    expect(truckC.allocatedKg).toBe(250)
    expect(truckC.etaImpact).toContain('+2 Hours')
  })

  it('10. Buyer approval requirement for revised delivery window', () => {
    transactionRecoveryService.resetDemoScenario()
    const failureState = transactionRecoveryService.simulateVehicleFailure()

    expect(failureState.recoveryPlan?.approvalRequiredOrdersCount).toBe(1)
    expect(failureState.recoveryPlan?.allApprovalsGranted).toBe(false)

    // Approve the delayed buyer
    const approvedState = transactionRecoveryService.approveBuyerAdjustment('KL-ORD-1048')
    expect(approvedState.recoveryPlan?.allApprovalsGranted).toBe(true)
    expect(approvedState.affectedOrders.find((o) => o.id === 'KL-ORD-1048')?.buyerApproved).toBe(true)
  })

  it('11. Applying recovery plan reassigns vehicles and creates recovery routes in shared fleet', async () => {
    transactionRecoveryService.resetDemoScenario()
    transactionRecoveryService.simulateVehicleFailure()
    transactionRecoveryService.approveBuyerAdjustment('KL-ORD-1048')

    const appliedState = await transactionRecoveryService.applyRecoveryPlan()
    expect(appliedState.truckStatus).toBe('RECOVERED')
    expect(appliedState.planApplied).toBe(true)

    // Check prototype fleet updates
    const pState = await prototypeService.getState()
    const truckA = pState.vehicles.find((v) => v.id === 'VEH-01')
    expect(truckA?.status).toBe('maintenance')

    const truckB = pState.vehicles.find((v) => v.id === 'VEH-02')
    expect(truckB?.status).toBe('assigned')

    const truckC = pState.vehicles.find((v) => v.id === 'VEH-05')
    expect(truckC?.status).toBe('assigned')

    // Recovery routes created
    const recRoute1 = pState.logisticsRoutes.find((r) => r.id === 'RTE-REC-01')
    const recRoute2 = pState.logisticsRoutes.find((r) => r.id === 'RTE-REC-02')
    expect(recRoute1).toBeDefined()
    expect(recRoute2).toBeDefined()
    expect(recRoute1?.loadKg).toBe(400)
    expect(recRoute2?.loadKg).toBe(250)
  })

  it('12. Reset demo scenario safely restores active delivery state', () => {
    const reset = transactionRecoveryService.resetDemoScenario()
    expect(reset.truckStatus).toBe('ACTIVE')
    expect(reset.planApplied).toBe(false)
    expect(reset.affectedOrders.every((o) => o.status === 'ACTIVE')).toBe(true)
  })
})
