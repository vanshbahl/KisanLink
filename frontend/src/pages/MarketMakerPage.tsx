import {
  ArrowRight, Boxes, Building2, CalendarClock, Check, CircleAlert, Home, IndianRupee, MapPinned,
  PackageCheck, Radar, RotateCcw, Sparkles, Sprout, Truck, Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketCommitPanel } from '../components/market/MarketCommitPanel'
import { MarketConvergence } from '../components/market/MarketConvergence'
import { MarketDemandRing } from '../components/market/MarketDemandRing'
import { MarketFreightCurve } from '../components/market/MarketFreightCurve'
import { MarketUnlockReveal, type MarketCreationResult } from '../components/market/MarketUnlockReveal'
import { MarketValueSplit } from '../components/market/MarketValueSplit'
import { MarketWhyPanel } from '../components/market/MarketWhyPanel'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { logisticsService } from '../services/logisticsService'
import { marketMakerService } from '../services/marketMakerService'
import { phase2Service } from '../services/phase2Service'
import { prototypeService } from '../services/prototypeService'
import type { Role, Vehicle } from '../types'

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

const roleFrame: Record<Role, { eyebrow: string; title: string; copy: string }> = {
  farmer: {
    eyebrow: 'Your produce, pooled into a market',
    title: 'A buyer big enough for your lot',
    copy: 'No single household or company nearby wants your whole harvest. KisanLink combines them until a direct trip becomes worth running — while your minimum price stays exactly where you set it.',
  },
  consumer: {
    eyebrow: 'Buying together, straight from the farm',
    title: 'Farm-direct opens at a certain size',
    copy: 'A van from Sonipat costs the same whether it carries 15 kg or 300 kg. Once enough neighbours and one bulk buyer are in, that cost splits far enough for farm-direct to beat the shop.',
  },
  bulk: {
    eyebrow: 'Pooled procurement corridors',
    title: 'Requirements that are too small, made viable',
    copy: 'Your requirement alone cannot justify a dedicated run to this corridor. Pooled with household demand on the same route, it clears the break-even volume and lands below your current cost.',
  },
  logistics: {
    eyebrow: 'Corridor feasibility',
    title: 'Trips that only exist once the load does',
    copy: 'Market Maker holds a vehicle against a corridor and states the load it needs to pay for itself. Nothing is dispatched until demand, supply and this fleet all line up.',
  },
}

export function MarketMakerPage() {
  const { session } = useAuth()
  const { language } = useLanguage()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<MarketCreationResult | null>(null)
  const role = (session?.role ?? 'consumer') as Role
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const { data, loading, refresh } = useAsyncData(async () => {
    const [view, consumerProfile, bulkProfile] = await Promise.all([
      marketMakerService.board(),
      phase2Service.consumerProfile(),
      phase2Service.bulkProfile(),
    ])
    return { view, consumerProfile, bulkProfile }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data?.view) return <div className="error-panel"><h2>No market corridor is open</h2><p>Seed the Market Maker scenario from the logistics demo controls to restore it.</p></div>

  const { board, math } = data.view
  const frame = roleFrame[role]
  const own = math.allocations.find((entry) => entry.lot.own)
  const blocker = math.blockers[0]
  const structural = math.blockers.find((item) => item.kind !== 'demand')
  const created = board.status === 'created'

  const guard = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try { await action(); showToast(success) }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'That change could not be applied.') }
    finally { setBusy(false); refresh() }
  }

  const commit = (quantityKg: number) => guard(async () => {
    const result = await marketMakerService.commit(board.id, role === 'bulk'
      ? { source: 'bulk', party: data.bulkProfile.businessName, detail: board.destination, quantityKg, own: true }
      : { source: 'consumer', party: data.consumerProfile.name, detail: data.consumerProfile.addresses[0]?.line1 ?? data.consumerProfile.defaultLocation, quantityKg, own: true })
    if (result.math.viable) showToast('Break-even reached — this market can be created')
  }, `${quantityKg} kg committed to ${board.corridor}`)

  const create = async () => {
    setBusy(true)
    try {
      const result = await marketMakerService.createMarket(board.id)
      setReveal({ routeId: result.routeId, farmerOrderIds: result.farmerOrderIds, bulkOrderId: result.bulkOrderId, consumerOrderId: result.consumerOrderId, pickupIds: result.pickupIds, deliveryIds: result.deliveryIds })
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'This market could not be created.') }
    finally { setBusy(false); refresh() }
  }

  return (
    <div className={`page mm-page mm-page-${role}`}>
      <div className="page-title-row mm-head">
        <div>
          <span className="eyebrow"><Radar size={15} /> {l('KisanLink Market Maker', 'किसानलिंक मार्केट मेकर')} · {frame.eyebrow}</span>
          <h1>{l(frame.title, 'सीधा बाज़ार बनाना')}</h1>
          <p>{l(frame.copy, 'बिखरी हुई मांग और सप्लाई को जोड़कर सीधा व्यापार संभव बनाया जाता है, और आपका न्यूनतम भाव सुरक्षित रहता है।')}</p>
        </div>
        <StatusBadge tone={created ? 'green' : math.viable ? 'green' : structural ? 'red' : 'amber'}>
          {created ? l('Market created', 'बाज़ार बन गया') : math.viable ? l('Ready to create', 'बनाने के लिए तैयार') : structural ? l('Blocked', 'रुका हुआ') : l('Forming', 'बन रहा है')}
        </StatusBadge>
      </div>

      <MarketStateRail status={board.status} viable={math.viable} blocked={Boolean(structural)} />

      <section className="mm-hero">
        <div className="mm-hero-ring">
          <MarketDemandRing board={board} math={math} />
          <div className="mm-hero-corridor">
            <strong>{language === 'hi' ? board.cropHi : board.crop} · {board.grade}</strong>
            <span><MapPinned size={13} /> {language === 'hi' ? board.corridorHi : board.corridor} · {board.routeDistanceKm} km</span>
            <span><CalendarClock size={13} /> {board.deliveryWindow}</span>
          </div>
        </div>

        <div className="mm-hero-body">
          {created ? (
            <div className="mm-verdict is-created">
              <span className="mm-verdict-icon"><Sparkles size={18} /></span>
              <div>
                <h2>{l('Direct Market Created', 'सीधा बाज़ार बन गया')}</h2>
                <p>{math.committedKg} kg moves on {board.routeId} in one pooled trip. {money(math.farmerGainTotal)} more reached the farms and {money(Math.max(0, math.buyerSavingTotal))} stayed with the buyers.</p>
              </div>
            </div>
          ) : math.viable ? (
            <div className="mm-verdict is-viable">
              <span className="mm-verdict-icon"><Check size={18} /></span>
              <div>
                <h2>{l('Enough demand, supply and logistics have aligned', 'मांग, सप्लाई और परिवहन तैयार हैं')}</h2>
                <p>{math.committedKg} kg against a {math.thresholdKg} kg break-even. Delivered price settles at ₹{math.deliveredPerKg.toFixed(2)}/kg, under the ₹{board.buyerCeilingPerKg.toFixed(2)}/kg buyers switch at.</p>
              </div>
            </div>
          ) : (
            <div className={`mm-verdict ${structural ? 'is-blocked' : 'is-forming'}`}>
              <span className="mm-verdict-icon">{structural ? <CircleAlert size={18} /> : <Radar size={18} />}</span>
              <div>
                <h2>{blocker?.title ?? l('Direct trade is not viable yet', 'सीधा व्यापार अभी संभव नहीं है')}</h2>
                <p>{blocker?.detail}</p>
              </div>
            </div>
          )}

          <div className="mm-hero-stats">
            <article><span>Delivered price</span><strong>{math.committedKg ? `₹${math.deliveredPerKg.toFixed(2)}` : '—'}</strong><small>ceiling ₹{board.buyerCeilingPerKg.toFixed(2)} · today ₹{board.buyerCurrentPerKg.toFixed(2)}</small></article>
            <article><span>Farm-gate, protected</span><strong>₹{math.farmerGatePerKg.toFixed(2)}</strong><small>mandi pays ₹{board.mandiPricePerKg.toFixed(2)}</small></article>
            <article><span>Freight per kg</span><strong>{math.committedKg ? `₹${math.freightPerKg.toFixed(2)}` : '—'}</strong><small>₹{math.freightTotal.toLocaleString('en-IN')} trip ÷ {math.committedKg} kg</small></article>
            <article><span>Vehicle load</span><strong>{math.utilisationPct}%</strong><small>{math.vehicle ? `${math.vehicle.registration} · ${math.capacityKg} kg` : 'none held'}</small></article>
          </div>

          {!created && (role === 'consumer' || role === 'bulk') && (
            <MarketCommitPanel
              board={board} math={math} busy={busy}
              source={role === 'bulk' ? 'bulk' : 'consumer'}
              party={role === 'bulk' ? data.bulkProfile.businessName : data.consumerProfile.name}
              detail={role === 'bulk' ? board.destination : (data.consumerProfile.addresses[0]?.line1 ?? data.consumerProfile.defaultLocation)}
              unit={role === 'bulk' ? 10 : 1}
              max={role === 'bulk' ? 400 : 40}
              onCommit={commit}
            />
          )}

          {!created && role === 'farmer' && own && (
            <FarmerLever board={board} lotId={own.lot.id} available={own.availableKg} busy={busy} onOffer={(extra) => guard(() => marketMakerService.offerMore(board.id, own.lot.id, extra), `${extra} kg more released to ${board.corridor}`)} l={l} />
          )}

          {!created && role === 'logistics' && (
            <LogisticsLever
              vehicleId={board.vehicleId} corridorVehicle={data.view.corridorVehicle} math={math} busy={busy}
              onHold={() => guard(() => logisticsService.setVehicle(board.vehicleId, 'available'), 'Vehicle released back to the corridor')}
              onWithdraw={() => guard(() => logisticsService.setVehicle(board.vehicleId, 'maintenance'), 'Vehicle withdrawn from the corridor')}
            />
          )}

          {!created && math.viable && (
            <button type="button" className="btn btn-primary btn-large btn-full mm-create" disabled={busy} onClick={create}>
              <Zap size={18} /> {l('Create the direct market', 'सीधा बाज़ार बनाएं')}
            </button>
          )}

          {created && <CreatedLinks board={board} role={role} />}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Why volume is the constraint</span><h2>Delivered price against committed volume</h2></div></div>
        <MarketFreightCurve board={board} math={math} />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">What is being combined</span><h2>Fragments into one market</h2></div></div>
        <MarketConvergence board={board} math={math} />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Who benefits</span><h2>Where the price actually goes</h2></div></div>
        <MarketValueSplit board={board} math={math} />
      </section>

      <MarketWhyPanel board={board} math={math} defaultOpen={Boolean(structural)} />

      <section className="mm-footer-note">
        <p>Market Maker is a deterministic prototype: the break-even volume, freight, delivered price and every payout above are computed from the listings, fleet and commitments in shared state and can be re-derived by hand.</p>
        <button type="button" className="mm-reset" disabled={busy} onClick={() => guard(() => prototypeService.seedScenario('market'), 'Corridor reset to the forming state')}>
          <RotateCcw size={14} /> Reset this corridor
        </button>
      </section>

      {reveal && <MarketUnlockReveal board={board} math={math} result={reveal} role={role} onClose={() => { setReveal(null); refresh() }} />}
    </div>
  )
}

function MarketStateRail({ status, viable, blocked }: { status: string; viable: boolean; blocked: boolean }) {
  const stage = status === 'created' ? 2 : viable ? 1 : 0
  const steps = [
    { label: blocked ? 'Blocked upstream' : 'Direct trade is not viable yet', detail: 'Fragments too small to move alone' },
    { label: 'Enough demand + supply + logistics have aligned', detail: 'Break-even volume reached' },
    { label: 'Direct Market Created', detail: 'Orders, pickups and a route exist' },
  ]
  return (
    <ol className={`mm-rail stage-${stage} ${blocked ? 'is-blocked' : ''}`}>
      {steps.map((step, index) => (
        <li key={step.label} className={index < stage ? 'is-done' : index === stage ? 'is-active' : ''}>
          <span>{index < stage ? <Check size={13} /> : index + 1}</span>
          <div><strong>{step.label}</strong><small>{step.detail}</small></div>
        </li>
      ))}
    </ol>
  )
}

function FarmerLever({ board, available, busy, onOffer, l }: {
  board: { lots: Array<{ id: string; listingId?: string; offeredKg: number }>; corridor: string }
  lotId: string; available: number; busy?: boolean; onOffer: (extraKg: number) => void; l: (en: string, hi: string) => string
}) {
  return (
    <div className="mm-lever">
      <div>
        <span className="eyebrow">{l('Your lever', 'आपका विकल्प')}</span>
        <h3>{l(`${available} kg of your lot is held for this corridor`, `इस कॉरिडोर के लिए आपकी ${available} किलो फसल रखी है`)}</h3>
        <p>{l('Releasing more stock raises the supply this corridor can draw on. Your minimum price is unchanged either way.', 'और स्टॉक देने से कॉरिडोर की सप्लाई बढ़ती है। आपका न्यूनतम भाव वही रहता है।')}</p>
      </div>
      <div className="mm-lever-actions">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onOffer(40)}><Sprout size={16} /> {l('Release 40 kg more', '40 किलो और दें')}</button>
        <Link className="btn btn-ghost" to="/farmer/produce">{l('My produce', 'मेरी फसल')} <ArrowRight size={15} /></Link>
      </div>
      <small>{board.corridor}</small>
    </div>
  )
}

function LogisticsLever({ vehicleId, corridorVehicle, math, busy, onHold, onWithdraw }: {
  vehicleId: string
  corridorVehicle?: Vehicle
  math: { vehicle: Vehicle | null; thresholdKg: number; capacityKg: number }
  busy?: boolean; onHold: () => void; onWithdraw: () => void
}) {
  // "Held" means the corridor's own vehicle is the one being quoted. When it has been pulled
  // away the engine falls back to a costlier vehicle, and the break-even volume moves with it.
  const held = Boolean(corridorVehicle && math.vehicle?.id === corridorVehicle.id)
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'
  return (
    <div className="mm-lever">
      <div>
        <span className="eyebrow">Your lever</span>
        <h3>{held && math.vehicle
          ? `${math.vehicle.registration} · ${math.vehicle.type} is held for this corridor`
          : math.vehicle
            ? `Quoting ${math.vehicle.registration} · ${math.vehicle.type} instead`
            : `${vehicleId} is unavailable and nothing else can be quoted`}</h3>
        <p>{math.vehicle
          ? held
            ? `Break-even load is ${threshold} kg of ${math.capacityKg} kg. Withdrawing this vehicle re-quotes the corridor against whatever else is free — a larger vehicle costs more per trip, so the break-even volume rises with it.`
            : `${corridorVehicle ? `${corridorVehicle.registration} is ${corridorVehicle.status.replaceAll('_', ' ')}` : `${vehicleId} is unavailable`}, so this corridor is priced on a ${math.capacityKg} kg vehicle and now needs ${threshold} kg to break even.`
          : 'Nothing in the fleet can be quoted for this corridor right now, so the market cannot become viable regardless of how much demand arrives.'}</p>
      </div>
      <div className="mm-lever-actions">
        {held
          ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={onWithdraw}><Truck size={16} /> Withdraw {vehicleId} from corridor</button>
          : <button type="button" className="btn btn-primary" disabled={busy} onClick={onHold}><Truck size={16} /> Hold {vehicleId} for this corridor</button>}
        <Link className="btn btn-ghost" to="/logistics/vehicles">Fleet <ArrowRight size={15} /></Link>
      </div>
    </div>
  )
}

function CreatedLinks({ board, role }: { board: { routeId?: string; farmerOrderIds?: string[]; bulkOrderId?: string; consumerOrderId?: string; pickupIds?: string[] }; role: Role }) {
  const links: Array<{ icon: typeof Sprout; label: string; to: string }> = []
  if (board.farmerOrderIds?.[0]) links.push({ icon: Sprout, label: `Farmer order ${board.farmerOrderIds[0]}`, to: `/farmer/orders/${board.farmerOrderIds[0]}` })
  if (board.farmerOrderIds?.[0]) links.push({ icon: IndianRupee, label: 'Farmer earnings', to: '/farmer/earnings' })
  if (board.bulkOrderId) links.push({ icon: Building2, label: `Procurement ${board.bulkOrderId}`, to: `/bulk/orders/${board.bulkOrderId}` })
  if (board.consumerOrderId) links.push({ icon: Home, label: 'Consumer order', to: `/consumer/orders/${board.consumerOrderId}` })
  if (board.pickupIds?.length) links.push({ icon: Boxes, label: `${board.pickupIds.length} farm pickups`, to: '/logistics/pickups' })
  if (board.routeId) links.push({ icon: MapPinned, label: `Route ${board.routeId}`, to: '/logistics/routes' })
  links.push({ icon: PackageCheck, label: 'Deliveries', to: '/logistics/deliveries' })

  return (
    <div className="mm-created-links">
      <h3>This market created</h3>
      <div>
        {links.map((link) => (
          <Link key={link.to + link.label} to={link.to} className={link.to.startsWith(`/${role}`) ? 'is-mine' : ''}>
            <link.icon size={15} /><span>{link.label}</span><ArrowRight size={14} />
          </Link>
        ))}
      </div>
      <small>Each link opens the record this market wrote into shared prototype state. Roles other than yours will ask you to switch accounts.</small>
    </div>
  )
}
