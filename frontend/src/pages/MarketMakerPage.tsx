import {
  ArrowRight, Boxes, Building2, CalendarClock, Check, CircleAlert, Home, IndianRupee, MapPinned,
  PackageCheck, Radar, RotateCcw, Sparkles, Sprout, Truck, Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FarmerMarketMaker } from '../components/market/FarmerMarketMaker'
import { MarketCommitPanel } from '../components/market/MarketCommitPanel'
import { MarketHowItWorks } from '../components/market/MarketHowItWorks'
import { MarketInfographics } from '../components/market/MarketInfographics'
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
    copy: 'Small lots are combined until a direct trip is worth running. Your minimum price never moves.',
  },
  consumer: {
    eyebrow: 'Buying together, straight from the farm',
    title: 'Farm-direct opens at a certain size',
    copy: 'One van costs the same at 15 kg or 300 kg. Enough neighbours, and farm-direct beats the shop.',
  },
  bulk: {
    eyebrow: 'Pooled procurement corridors',
    title: 'Requirements that are too small, made viable',
    copy: 'Your requirement alone cannot justify this corridor. Pooled with household demand, it clears break-even.',
  },
  logistics: {
    eyebrow: 'Corridor feasibility',
    title: 'Trips that only exist once the load does',
    copy: 'A vehicle is held against a corridor with the load it needs to pay for itself. Nothing dispatches before that.',
  },
}

/** One deep visualisation per role — the question that role actually asks of the market. */
const roleDeepView: Record<Role, { eyebrow: string; title: string }> = {
  farmer: { eyebrow: 'Why volume matters', title: 'Delivered price against committed volume' },
  consumer: { eyebrow: 'Who benefits', title: 'Where the price actually goes' },
  bulk: { eyebrow: 'What is being combined', title: 'Where the supply is coming from' },
  logistics: { eyebrow: 'Why volume matters', title: 'Delivered price against committed volume' },
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
  const deliveryWindow = language === 'hi'
    ? board.deliveryWindow.replace('Tomorrow', 'कल').replace(' AM', ' बजे').replace(' PM', ' बजे')
    : board.deliveryWindow
  const own = math.allocations.find((entry) => entry.lot.own)
  const blocker = math.blockers[0]
  const structural = math.blockers.find((item) => item.kind !== 'demand')
  const created = board.status === 'created'
  const blockerTitle = language === 'hi' && blocker
    ? blocker.kind === 'demand' ? `सीधा बाज़ार बनने के लिए ${math.gapKg} किलो और चाहिए`
      : blocker.kind === 'vehicle' ? 'इस कॉरिडोर के लिए वाहन उपलब्ध नहीं है'
        : blocker.kind === 'supply' ? 'ज़रूरी मात्रा के लिए फसल कम है'
          : 'उपलब्ध वाहन में ज़रूरी मात्रा नहीं आ सकती'
    : blocker?.title
  const blockerDetail = language === 'hi' && blocker
    ? blocker.kind === 'demand'
      ? `${math.committedKg} किलो मांग पक्की है। ${math.thresholdKg} किलो पर तय ढुलाई लागत बंटने से डिलीवरी कीमत खरीदार की सीमा में आ जाएगी।`
      : 'मांग मौजूद है, लेकिन बाज़ार बनाने से पहले पर्याप्त फसल और सही वाहन दोनों उपलब्ध होने चाहिए।'
    : blocker?.detail

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

  if (role === 'farmer') {
    return (
      <div className="page mm-page mm-page-farmer">
        <FarmerMarketMaker
          board={board} math={math} busy={busy} available={own?.availableKg ?? 0}
          onOffer={(extra) => own && guard(() => marketMakerService.offerMore(board.id, own.lot.id, extra), `${extra} kg more released to ${board.corridor}`)}
        />
        <MarketHowItWorks board={board} math={math} />
        {reveal && <MarketUnlockReveal board={board} math={math} result={reveal} role={role} onClose={() => { setReveal(null); refresh() }} />}
      </div>
    )
  }

  return (
    <div className={`page mm-page mm-page-${role}`}>
      <div className="page-title-row mm-head">
        <div>
          <span className="eyebrow"><Radar size={15} /> {l('KisanLink Market Maker', 'किसानलिंक मार्केट मेकर')} · {l(frame.eyebrow, 'साझा मांग से सीधा बाज़ार')}</span>
          <h1>{l(frame.title, 'सीधा बाज़ार बनाना')}</h1>
          <p>{l(frame.copy, 'बिखरी हुई मांग और सप्लाई को जोड़कर सीधा व्यापार संभव बनाया जाता है, और किसान का न्यूनतम भाव सुरक्षित रहता है।')}</p>
        </div>
        <StatusBadge tone={created ? 'green' : math.viable ? 'green' : structural ? 'red' : 'amber'}>
          {created ? l('Market created', 'बाज़ार बन गया') : math.viable ? l('Ready to create', 'बनाने के लिए तैयार') : structural ? l('Blocked', 'रुका हुआ') : l('Forming', 'बन रहा है')}
        </StatusBadge>
      </div>

      <MarketStateRail status={board.status} viable={math.viable} blocked={Boolean(structural)} l={l} />

      <MarketOutcomeSummary board={board} math={math} l={l} />

      <section className="mm-hero">
        <div className="mm-hero-ring">
          <MarketDemandRing board={board} math={math} />
          <div className="mm-hero-corridor">
            <strong>{language === 'hi' ? board.cropHi : board.crop} · {board.grade}</strong>
            <span><MapPinned size={13} /> {language === 'hi' ? board.corridorHi : board.corridor} · {board.routeDistanceKm} km</span>
            <span><CalendarClock size={13} /> {deliveryWindow}</span>
          </div>
        </div>

        <div className="mm-hero-body">
          {created ? (
            <div className="mm-verdict is-created">
              <span className="mm-verdict-icon"><Sparkles size={18} /></span>
              <div>
                <h2>{l('Direct Market Created', 'सीधा बाज़ार बन गया')}</h2>
                <p>{l(`${math.committedKg} kg moves on ${board.routeId} in one pooled trip. ${money(math.farmerGainTotal)} more reached the farms and ${money(Math.max(0, math.buyerSavingTotal))} stayed with the buyers.`, `${math.committedKg} किलो एक साझा यात्रा में ${board.routeId} पर जाएगा। किसानों को ${money(math.farmerGainTotal)} अधिक मिला और खरीदारों ने ${money(Math.max(0, math.buyerSavingTotal))} बचाए।`)}</p>
              </div>
            </div>
          ) : math.viable ? (
            <div className="mm-verdict is-viable">
              <span className="mm-verdict-icon"><Check size={18} /></span>
              <div>
                <h2>{l('Enough demand, supply and logistics have aligned', 'मांग, सप्लाई और परिवहन तैयार हैं')}</h2>
                <p>{l(`${math.committedKg} kg against a ${math.thresholdKg} kg break-even. Delivered price settles at ₹${math.deliveredPerKg.toFixed(2)}/kg.`, `${math.thresholdKg} किलो की ज़रूरत के मुकाबले ${math.committedKg} किलो मांग पक्की है। डिलीवरी कीमत ₹${math.deliveredPerKg.toFixed(2)}/किलो है।`)}</p>
              </div>
            </div>
          ) : (
            <div className={`mm-verdict ${structural ? 'is-blocked' : 'is-forming'}`}>
              <span className="mm-verdict-icon">{structural ? <CircleAlert size={18} /> : <Radar size={18} />}</span>
              <div>
                <h2>{blockerTitle ?? l('Direct trade is not viable yet', 'सीधा व्यापार अभी संभव नहीं है')}</h2>
                <p>{blockerDetail}</p>
              </div>
            </div>
          )}

          {!created && math.viable && (
            <button type="button" className="btn btn-primary btn-large btn-full mm-create" disabled={busy} onClick={create}>
              <Zap size={18} /> {l('Create the direct market', 'सीधा बाज़ार बनाएं')}
            </button>
          )}

          <div className="mm-hero-stats">
            <article><span>{l('Delivered price', 'डिलीवरी कीमत')}</span><strong>{math.committedKg ? `₹${math.deliveredPerKg.toFixed(2)}` : '—'}</strong><small>{l(`limit ₹${board.buyerCeilingPerKg.toFixed(2)} · today ₹${board.buyerCurrentPerKg.toFixed(2)}`, `सीमा ₹${board.buyerCeilingPerKg.toFixed(2)} · आज ₹${board.buyerCurrentPerKg.toFixed(2)}`)}</small></article>
            <article><span>{l('Farmer price protected', 'किसान की सुरक्षित कीमत')}</span><strong>₹{math.farmerGatePerKg.toFixed(2)}</strong><small>{l(`mandi pays ₹${board.mandiPricePerKg.toFixed(2)}`, `मंडी में ₹${board.mandiPricePerKg.toFixed(2)} मिलते हैं`)}</small></article>
            <article><span>{l('Freight per kg', 'प्रति किलो ढुलाई')}</span><strong>{math.committedKg ? `₹${math.freightPerKg.toFixed(2)}` : '—'}</strong><small>₹{math.freightTotal.toLocaleString('en-IN')} ÷ {math.committedKg} kg</small></article>
            <article><span>{l('Vehicle load', 'वाहन में भार')}</span><strong>{math.utilisationPct}%</strong><small>{math.vehicle ? `${math.vehicle.registration} · ${math.capacityKg} kg` : l('none held', 'कोई वाहन नहीं')}</small></article>
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

          {!created && role === 'logistics' && (
            <LogisticsLever
              vehicleId={board.vehicleId} corridorVehicle={data.view.corridorVehicle} math={math} busy={busy}
              onHold={() => guard(() => logisticsService.setVehicle(board.vehicleId, 'available'), 'Vehicle released back to the corridor')}
              onWithdraw={() => guard(() => logisticsService.setVehicle(board.vehicleId, 'maintenance'), 'Vehicle withdrawn from the corridor')}
            />
          )}

          {created && <CreatedLinks board={board} role={role} l={l} />}
        </div>
      </section>

      <MarketInfographics role={role} board={board} math={math} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{roleDeepView[role].eyebrow}</span>
            <h2>{roleDeepView[role].title}</h2>
          </div>
        </div>
        {role === 'consumer' ? <MarketValueSplit board={board} math={math} />
          : role === 'bulk' ? <MarketConvergence board={board} math={math} />
            : <MarketFreightCurve board={board} math={math} />}
      </section>

      <MarketHowItWorks board={board} math={math} />

      <MarketWhyPanel board={board} math={math} defaultOpen={Boolean(structural)} />

      <section className="mm-footer-note">
        <p>{l('Market Maker is deterministic: break-even volume, freight, delivered price and payouts are computed from listings, fleet and commitments in shared prototype state.', 'मार्केट मेकर की गणना तय है: ज़रूरी मात्रा, ढुलाई, डिलीवरी कीमत और भुगतान साझा प्रोटोटाइप की लिस्टिंग, वाहन और पक्की मांग से निकाले जाते हैं।')}</p>
        <button type="button" className="mm-reset" disabled={busy} onClick={() => guard(() => prototypeService.seedScenario('market'), l('Corridor reset to the forming state', 'कॉरिडोर फिर से बनती हुई स्थिति में है'))}>
          <RotateCcw size={14} /> {l('Reset corridor', 'कॉरिडोर रीसेट करें')}
        </button>
      </section>

      {reveal && <MarketUnlockReveal board={board} math={math} result={reveal} role={role} onClose={() => { setReveal(null); refresh() }} />}
    </div>
  )
}

function MarketOutcomeSummary({ board, math, l }: {
  board: { mandiPricePerKg: number; buyerCurrentPerKg: number }
  math: { farmerGatePerKg: number; deliveredPerKg: number; deliveredAtThresholdPerKg: number; viable: boolean }
  l: (en: string, hi: string) => string
}) {
  const directPrice = math.viable ? math.deliveredPerKg : math.deliveredAtThresholdPerKg
  return (
    <section className="mm-outcome-summary">
      <div className="mm-outcome-label">
        <span className="eyebrow">{l('The idea in one glance', 'एक नज़र में पूरी बात')}</span>
        <h2>{l('A better price on both sides', 'दोनों तरफ बेहतर कीमत')}</h2>
        <p>{l('Pooled demand shares one fixed logistics cost across more kilograms.', 'साझा मांग से एक तय ढुलाई लागत अधिक किलो में बंट जाती है।')}</p>
      </div>
      <div className="mm-outcome-state is-before">
        <span>{l('Without Market Maker', 'मार्केट मेकर के बिना')}</span>
        <p>{l('Farmer gets', 'किसान को मिलता है')} <strong>₹{board.mandiPricePerKg}/kg</strong></p>
        <p>{l('Buyer pays', 'खरीदार देता है')} <strong>₹{board.buyerCurrentPerKg}/kg</strong></p>
        <small>{l('Existing retail / traditional-chain price', 'मौजूदा खुदरा / पारंपरिक श्रृंखला की कीमत')}</small>
      </div>
      <ArrowRight className="mm-outcome-arrow" aria-hidden="true" />
      <div className="mm-outcome-state is-after">
        <span>{l('With Market Maker', 'मार्केट मेकर के साथ')}</span>
        <p>{l('Farmer gets', 'किसान को मिलता है')} <strong>₹{math.farmerGatePerKg}/kg</strong></p>
        <p>{l('Buyer pays', 'खरीदार देता है')} <strong>₹{directPrice.toFixed(2)}/kg</strong></p>
        <small>{l('At the pooled market threshold', 'साझा बाज़ार की ज़रूरी मात्रा पर')}</small>
      </div>
    </section>
  )
}

function MarketStateRail({ status, viable, blocked, l }: { status: string; viable: boolean; blocked: boolean; l: (en: string, hi: string) => string }) {
  const stage = status === 'created' ? 2 : viable ? 1 : 0
  const steps = [
    { label: blocked ? l('Needs attention', 'ध्यान देना ज़रूरी') : l('Market is forming', 'बाज़ार बन रहा है'), detail: l('Small needs are being pooled', 'छोटी ज़रूरतें जोड़ी जा रही हैं') },
    { label: l('Ready to create', 'बनाने के लिए तैयार'), detail: l('Demand threshold reached', 'मांग की सीमा पूरी') },
    { label: l('Direct market created', 'सीधा बाज़ार बन गया'), detail: l('Orders, pickups and a route exist', 'ऑर्डर, पिकअप और रूट बन गए हैं') },
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

function CreatedLinks({ board, role, l }: { board: { routeId?: string; farmerOrderIds?: string[]; bulkOrderId?: string; consumerOrderId?: string; pickupIds?: string[] }; role: Role; l: (en: string, hi: string) => string }) {
  const links: Array<{ icon: typeof Sprout; label: string; to: string }> = []
  if (board.farmerOrderIds?.[0]) links.push({ icon: Sprout, label: l(`Farmer order ${board.farmerOrderIds[0]}`, `किसान ऑर्डर ${board.farmerOrderIds[0]}`), to: `/farmer/orders/${board.farmerOrderIds[0]}` })
  if (board.farmerOrderIds?.[0]) links.push({ icon: IndianRupee, label: l('Farmer earnings', 'किसान की कमाई'), to: '/farmer/earnings' })
  if (board.bulkOrderId) links.push({ icon: Building2, label: l(`Procurement ${board.bulkOrderId}`, `खरीद ${board.bulkOrderId}`), to: `/bulk/orders/${board.bulkOrderId}` })
  if (board.consumerOrderId) links.push({ icon: Home, label: l('Consumer order', 'ग्राहक ऑर्डर'), to: `/consumer/orders/${board.consumerOrderId}` })
  if (board.pickupIds?.length) links.push({ icon: Boxes, label: l(`${board.pickupIds.length} farm pickups`, `${board.pickupIds.length} खेत पिकअप`), to: '/logistics/pickups' })
  if (board.routeId) links.push({ icon: MapPinned, label: l(`Route ${board.routeId}`, `रूट ${board.routeId}`), to: '/logistics/routes' })
  links.push({ icon: PackageCheck, label: l('Deliveries', 'डिलीवरी'), to: '/logistics/deliveries' })

  return (
    <div className="mm-created-links">
      <h3>{l('This market created', 'इस बाज़ार ने ये बनाए')}</h3>
      <div>
        {links.map((link) => (
          <Link key={link.to + link.label} to={link.to} className={link.to.startsWith(`/${role}`) ? 'is-mine' : ''}>
            <link.icon size={15} /><span>{link.label}</span><ArrowRight size={14} />
          </Link>
        ))}
      </div>
      <small>{l('Each link opens a record written into shared prototype state. Other roles require switching accounts.', 'हर लिंक साझा प्रोटोटाइप में बना रिकॉर्ड खोलता है। दूसरी भूमिका के लिए खाता बदलना होगा।')}</small>
    </div>
  )
}
