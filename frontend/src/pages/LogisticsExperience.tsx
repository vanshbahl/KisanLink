import { AlertTriangle, ArrowLeft, Boxes, Building2, Check, ChevronRight, CircleGauge, Clock3, LogOut, MapPinned, PackageCheck, RefreshCw, Route, Save, ShieldCheck, ShoppingBasket, Sprout, Truck, UserRound, Warehouse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DemoControlCenter } from '../components/DemoControlCenter'
import { DeliveryRiskCard, DispatchPulseCard, PickupSequenceCard, RouteReviewCard } from '../components/ai/LogisticsIntelligenceCards'
import { EmptyState } from '../components/EmptyState'
import { MarketPulseCard } from '../components/market/MarketPulseCard'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { apiClient } from '../services/apiClient'
import { logisticsService } from '../services/logisticsService'
import type { Delivery, DeliveryStatus, LogisticsPickup, LogisticsPickupStatus, LogisticsProfileData, VehicleStatus } from '../types'
import { roleHome } from '../utils/routes'

import { CorridorRouteMap, prettyWhen } from '../components/maps/CorridorRouteMap'
import type { RouteStop } from '../types'
import { resolvePlace } from '../data/geo'

/**
 * Derives map geometry for a route that predates `routeStops`, or one written by a flow that
 * only recorded stop names. Falls back to resolving the place from the stop text, so a route
 * is drawn whenever its stops are somewhere the corridor knows about.
 */
function stopsForRoute(route: { routeStops?: RouteStop[]; stops: string[]; pickups: string[]; loadKg: number } | undefined, pickups: LogisticsPickup[], deliveries: Delivery[]): RouteStop[] {
  if (!route) return []
  if (route.routeStops?.length) {
    // Statuses live on the pickup records, which the operator is actively changing.
    return route.routeStops.map((stop) => {
      const pickup = stop.refId ? pickups.find((item) => item.id === stop.refId) : undefined
      if (!pickup) return stop
      const status: RouteStop['status'] = ['completed', 'loaded'].includes(pickup.status) ? 'done' : pickup.status === 'en_route' || pickup.status === 'arrived' ? 'current' : 'upcoming'
      return { ...stop, status, quantityKg: pickup.quantityKg }
    })
  }
  const derived: RouteStop[] = []
  for (const name of route.stops) {
    const place = resolvePlace(name)
    if (!place) continue
    const pickup = pickups.find((item) => resolvePlace(item.farm)?.id === place.id)
    const delivery = deliveries.find((item) => resolvePlace(item.destination)?.id === place.id)
    derived.push({
      placeId: place.id,
      label: place.label,
      kind: place.id === 'sonipat_hub' ? 'hub' : delivery ? 'drop' : 'pickup',
      refId: pickup?.id ?? delivery?.id,
      quantityKg: pickup?.quantityKg ?? delivery?.quantityKg ?? route.loadKg,
      window: pickup?.pickupWindow ?? delivery?.eta,
      status: pickup && ['completed', 'loaded'].includes(pickup.status) ? 'done' : 'upcoming',
    })
  }
  return derived
}

const pickupSteps: LogisticsPickupStatus[] = ['unassigned', 'assigned', 'en_route', 'arrived', 'loaded', 'completed', 'issue']
const deliverySteps: DeliveryStatus[] = ['scheduled', 'loaded', 'in_transit', 'at_hub', 'out_for_delivery', 'delivered', 'issue']
const labels = {
  pickup: { unassigned: ['Unassigned', 'वाहन तय नहीं'], assigned: ['Assigned', 'वाहन तय'], en_route: ['En Route', 'रास्ते में'], arrived: ['Arrived', 'पहुंच गया'], loaded: ['Loaded', 'लोड हुआ'], completed: ['Completed', 'पूरा हुआ'], issue: ['Issue', 'समस्या'] } as Record<LogisticsPickupStatus, [string, string]>,
  delivery: { scheduled: ['Scheduled', 'तय हुई'], loaded: ['Loaded', 'लोड हुआ'], in_transit: ['In Transit', 'रास्ते में'], at_hub: ['At Hub', 'हब पर'], out_for_delivery: ['Out for Delivery', 'डिलीवरी के लिए निकला'], delivered: ['Delivered', 'डिलीवरी हुई'], issue: ['Issue', 'समस्या'] } as Record<DeliveryStatus, [string, string]>,
  vehicle: { available: ['Available', 'उपलब्ध'], assigned: ['Assigned', 'असाइन किया'], in_transit: ['In Transit', 'रास्ते में'], maintenance: ['Maintenance', 'रखरखाव'] } as Record<VehicleStatus, [string, string]>,
}

function useCopy() { const { language } = useLanguage(); return { language, l: (en: string, hi: string) => language === 'hi' ? hi : en } }
const tone = (status: string) => status === 'issue' ? 'red' : ['completed', 'delivered', 'available'].includes(status) ? 'green' : 'amber'

export function LogisticsDashboard() {
  const { l, language } = useCopy(); const { data, loading, error } = useAsyncData(() => logisticsService.overview())
  const [impact, setImpact] = useState<{ farmer_net_gain_percentage: number; buyer_savings_percentage: number; total_distance_saved_km: number; wastage_prevented_kg: number } | null>(null)
  const [impactFallback, setImpactFallback] = useState(false)
  useEffect(() => {
    apiClient.getImpactSummary()
      .then((res) => { setImpact(res); setImpactFallback(false) })
      .catch(() => { setImpact({ farmer_net_gain_percentage: 28.5, buyer_savings_percentage: 14.2, total_distance_saved_km: 64.0, wastage_prevented_kg: 1250.0 }); setImpactFallback(true) })
  }, [])
  if (loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />

  const activePickups = data.logisticsPickups.filter((item) => item.status !== 'completed')
  const activeDeliveries = data.deliveries.filter((item) => item.status !== 'delivered')
  const freeVehicles = data.vehicles.filter((item) => item.status === 'available')
  const fleetCapacity = data.vehicles.filter((item) => item.status !== 'maintenance').reduce((sum, item) => sum + item.capacityKg, 0)
  const loadKg = activePickups.reduce((sum, item) => sum + item.quantityKg, 0)
  const issues = data.logisticsPickups.filter((item) => item.status === 'issue').length + data.deliveries.filter((item) => item.status === 'issue').length
  const pooled = data.logisticsRoutes.find((item) => item.pooled)
  // The run an operator cares about right now: an active pooled route, then any pooled one,
  // then whatever route exists at all — so the map is never empty while work is on the floor.
  const mapRoute = data.logisticsRoutes.find((item) => item.status === 'active')
    ?? pooled
    ?? data.logisticsRoutes[0]
  const mapStops = stopsForRoute(mapRoute, data.logisticsPickups, data.deliveries)

  // Four numbers an operator acts on, in the order they act on them. Everything else is
  // secondary and lives further down the page.
  const kpis = [
    { icon: Boxes, value: activePickups.length, label: l('Active pickups', 'सक्रिय पिकअप'), note: l(`${activePickups.filter((item) => item.status === 'unassigned').length} unassigned`, `${activePickups.filter((item) => item.status === 'unassigned').length} बिना वाहन`) },
    { icon: PackageCheck, value: activeDeliveries.length, label: l('Active deliveries', 'सक्रिय डिलीवरी'), note: issues ? l(`${issues} need attention`, `${issues} पर ध्यान दें`) : l('All on schedule', 'सब समय पर') },
    { icon: Truck, value: `${freeVehicles.length}/${data.vehicles.length}`, label: l('Available capacity', 'उपलब्ध क्षमता'), note: l(`${fleetCapacity.toLocaleString('en-IN')} kg fleet`, `${fleetCapacity.toLocaleString('en-IN')} किलो बेड़ा`) },
    { icon: Warehouse, value: `${loadKg.toLocaleString('en-IN')} kg`, label: l('Produce in transit', 'रास्ते में फसल'), note: pooled ? l(`${pooled.distanceKm} km pooled route`, `${pooled.distanceKm} किमी साझा रूट`) : l('No pooled route yet', 'अभी साझा रूट नहीं') },
  ]

  // Jobs an operator can act on now, exceptions first, then unassigned work, then the rest.
  const jobs: JobCardData[] = [
    ...activePickups.map((item) => ({
      kind: 'pickup' as const,
      id: item.id,
      from: item.farmLocation,
      to: item.routeId ? l('Sonipat hub', 'सोनीपत हब') : l('Assigned route', 'तय रूट'),
      load: `${language === 'hi' ? item.cropHi : item.crop} · ${item.quantityKg} kg`,
      timing: item.pickupWindow,
      status: item.status as string,
      statusLabel: labels.pickup[item.status][language === 'hi' ? 1 : 0],
      action: l('Open pickup', 'पिकअप खोलें'),
      to_: `/logistics/pickups/${item.id}`,
      details: [[l('Farmer', 'किसान'), `${item.farmer} · ${item.farm}`], [l('Vehicle', 'वाहन'), item.vehicleId ?? l('Unassigned', 'तय नहीं')], [l('Orders', 'ऑर्डर'), item.orderRefs.join(', ') || '—']] as string[][],
    })),
    ...activeDeliveries.map((item) => ({
      kind: 'delivery' as const,
      id: item.id,
      from: item.origin,
      to: item.destination,
      load: `${language === 'hi' ? item.produceHi : item.produce} · ${item.quantityKg} kg`,
      timing: `ETA ${prettyWhen(item.eta)}`,
      status: item.status as string,
      statusLabel: labels.delivery[item.status][language === 'hi' ? 1 : 0],
      action: l('Open delivery', 'डिलीवरी खोलें'),
      to_: `/logistics/deliveries/${item.id}`,
      details: [[l('Buyer', 'खरीदार'), `${item.buyer} · ${item.buyerType}`], [l('Vehicle', 'वाहन'), item.vehicleId ?? l('Unassigned', 'तय नहीं')], [l('Shipment', 'शिपमेंट'), item.shipment]] as string[][],
    })),
  ].sort((a, b) => rank(a) - rank(b))

  return (
    <div className="page logistics-page logistics-console">
      <header className="logi-header">
        <div>
          <span className="eyebrow"><CircleGauge size={15} /> {l('Live operations', 'लाइव संचालन')}</span>
          <h1>{l('Good morning, Kavita', 'सुप्रभात, कविता')}</h1>
          <p>{l('Sonipat Hub · farm pickups, pooled routes and buyer deliveries.', 'सोनीपत हब · खेत पिकअप, साझा रूट और खरीदार डिलीवरी।')}</p>
        </div>
        <StatusBadge tone={issues ? 'amber' : 'green'}>{issues ? l(`${issues} exceptions`, `${issues} समस्याएं`) : l('On shift · clear', 'ड्यूटी पर · सब ठीक')}</StatusBadge>
      </header>

      <section className="logi-section">
        <div className="logi-kpis">
          {kpis.map((kpi) => (
            <article key={String(kpi.label)}>
              <span className="logi-kpi-icon"><kpi.icon size={16} /></span>
              <strong>{kpi.value}</strong>
              <span className="logi-kpi-label">{kpi.label}</span>
              <small>{kpi.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="logi-section">
        <div className="logi-section-head">
          <div>
            <h2>{l('Live corridor', 'लाइव कॉरिडोर')}</h2>
            <p>{l('Farm pickups, consolidation and the buyer drop on the run being driven now.', 'अभी चल रहे रूट पर खेत पिकअप, एकत्रीकरण और खरीदार डिलीवरी।')}</p>
          </div>
          {mapRoute && <Link className="logi-section-link" to="/logistics/routes">{l('All routes', 'सभी रूट')} <ChevronRight size={15} /></Link>}
        </div>
        <CorridorRouteMap
          title={mapRoute ? (language === 'hi' ? mapRoute.nameHi : mapRoute.name) : l('Collection corridor', 'संग्रह कॉरिडोर')}
          subtitle={l(
            `${mapStops.filter((stop) => stop.kind === 'pickup').length} farm pickups pooled into one consolidated delivery`,
            'कई खेत पिकअप एक साझा डिलीवरी में',
          )}
          stops={mapStops}
          meta={mapRoute ? {
            routeId: mapRoute.id,
            vehicle: data.vehicles.find((vehicle) => vehicle.id === mapRoute.vehicleId)?.registration ?? mapRoute.vehicleId,
            distanceKm: mapRoute.distanceKm,
            durationMinutes: mapRoute.durationMinutes,
            loadKg: mapRoute.loadKg,
            capacityKg: mapRoute.capacityKg,
            eta: data.deliveries.find((delivery) => mapRoute.deliveries.includes(delivery.id))?.eta,
          } : undefined}
        />
      </section>

      <section className="logi-section">
        <div className="logi-section-head">
          <div><h2>{l('Active jobs', 'सक्रिय काम')}</h2><p>{l('Exceptions and unassigned work first.', 'पहले समस्या और बिना वाहन काम।')}</p></div>
          <Link className="logi-section-link" to="/logistics/pickups">{l('All operations', 'सभी संचालन')} <ChevronRight size={15} /></Link>
        </div>
        {jobs.length ? <div className="logi-jobs">{jobs.slice(0, 5).map((job) => <JobCard key={`${job.kind}-${job.id}`} job={job} l={l} />)}</div>
          : <EmptyState icon={Boxes} title={l('Nothing active', 'कुछ सक्रिय नहीं')} copy={l('No open pickups or deliveries in this state.', 'इस स्थिति में कोई खुला पिकअप या डिलीवरी नहीं।')} />}
      </section>

      <section className="logi-section">
        <div className="logi-section-head"><div><h2>{l('Market Maker', 'मार्केट मेकर')}</h2><p>{l('Where the next viable trip is coming from.', 'अगली संभव यात्रा कहां से आ रही है।')}</p></div></div>
        <MarketPulseCard role="logistics" />
      </section>

      <section className="logi-section logi-secondary">
        <div className="logi-section-head"><div><h2>{l('Analytics & planning', 'विश्लेषण और योजना')}</h2><p>{l('Background numbers — no action needed right now.', 'पृष्ठभूमि आंकड़े — अभी कोई कार्रवाई नहीं।')}</p></div></div>
        <DispatchPulseCard pickups={data.logisticsPickups} deliveries={data.deliveries} vehicles={data.vehicles} />
        <section className="impact-analytics-card">
          <div className="impact-analytics-head">
            <div><h2><ShieldCheck size={16} /> {l('Ecosystem impact', 'पारिस्थितिकी तंत्र प्रभाव')}</h2><p>{l('Live metrics computed from platform orders and rescue listings', 'प्लेटफ़ॉर्म ऑर्डर व बचाव लिस्टिंग से लाइव आँकड़े')}</p></div>
            {impactFallback && <span className="impact-fallback-pill">{l('Fallback metrics', 'बैकअप आँकड़े')}</span>}
          </div>
          <div className="impact-metric-grid">
            <div><span>{l('Farmer net gain', 'किसान शुद्ध लाभ')}</span><strong>+{impact?.farmer_net_gain_percentage ?? 28.5}%</strong><small>{l('vs local mandi price', 'मंडी भाव की तुलना में')}</small></div>
            <div><span>{l('Buyer savings', 'खरीदार बचत')}</span><strong>{impact?.buyer_savings_percentage ?? 14.2}%</strong><small>{l('vs benchmark retail', 'रिटेल बेंचमार्क की तुलना में')}</small></div>
            <div><span>{l('Distance saved', 'बचत ढुलाई दूरी')}</span><strong>{impact?.total_distance_saved_km ?? 64.0} km</strong><small>{l('route pooling', 'रूट साझाकरण')}</small></div>
            <div><span>{l('Wastage prevented', 'बचाई गई फसल')}</span><strong>{(impact?.wastage_prevented_kg ?? 1250).toLocaleString()} kg</strong><small>{l('urgent rescue listings', 'आपातकालीन बचाव लिस्टिंग')}</small></div>
          </div>
        </section>
      </section>
    </div>
  )
}

interface JobCardData {
  kind: 'pickup' | 'delivery'
  id: string
  from: string
  to: string
  load: string
  timing: string
  status: string
  statusLabel: string
  action: string
  to_: string
  details: string[][]
}

const rank = (job: JobCardData) => job.status === 'issue' ? 0 : job.status === 'unassigned' ? 1 : job.status === 'scheduled' ? 2 : 3

/**
 * One operational job in the form an operator scans it: route, load, when, state, and the
 * single action that moves it forward. Everything else is one tap away.
 */
function JobCard({ job, l }: { job: JobCardData; l: (en: string, hi: string) => string }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`logi-job is-${job.kind}`}>
      <div className="logi-job-main">
        <span className="logi-job-icon">{job.kind === 'pickup' ? <Boxes size={16} /> : <PackageCheck size={16} />}</span>
        <div className="logi-job-body">
          <div className="logi-job-route"><strong>{job.from}</strong><ChevronRight size={14} aria-hidden="true" /><strong>{job.to}</strong></div>
          <p>{job.load}</p>
          <small><Clock3 size={12} /> {job.timing} · {job.id}</small>
        </div>
        <StatusBadge tone={tone(job.status)}>{job.statusLabel}</StatusBadge>
      </div>
      <div className="logi-job-actions">
        <button type="button" className="btn btn-ghost btn-small-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? l('Hide details', 'विवरण छुपाएं') : l('Details', 'विवरण')}</button>
        <Link className="btn btn-secondary" to={job.to_}>{job.action} <ChevronRight size={15} /></Link>
      </div>
      {open && <dl className="logi-job-details">{job.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </article>
  )
}

export function LogisticsPickupsPage() {
  const { l, language } = useCopy(); const [filter, setFilter] = useState<'active' | LogisticsPickupStatus>('active'); const { data, loading, error } = useAsyncData(() => logisticsService.pickups())
  if (loading) return <DashboardSkeleton />; const items = data?.filter((item) => filter === 'active' ? item.status !== 'completed' : item.status === filter) ?? []
  return <div className="page logistics-page"><PageHead eyebrow={l('Farm operations', 'खेत संचालन')} title={l('Pickup management', 'पिकअप प्रबंधन')} copy={l('Assign vehicles, complete checks and keep farmers informed.', 'वाहन तय करें, जांच पूरी करें और किसानों को जानकारी दें।')} />{(data?.length ?? 0) > 1 && <PickupSequenceCard pickups={data ?? []} />}<div className="filter-tabs logistics-filters">{(['active', ...pickupSteps] as const).map((status) => <button className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status === 'active' ? l('Active', 'सक्रिय') : labels.pickup[status][language === 'hi' ? 1 : 0]}</button>)}</div>{error ? <ErrorState /> : items.length ? <div className="logistics-list">{items.map((item) => <Link className="logistics-row" to={`/logistics/pickups/${item.id}`} key={item.id}><div><span className="eyebrow">{item.id}</span><h2>{language === 'hi' ? item.cropHi : item.crop} · {item.quantityKg} kg</h2><p>{item.farmer} · {item.farm}</p><small>{item.pickupWindow} · {item.orderRefs.join(', ')}</small></div><div><StatusBadge tone={tone(item.status)}>{labels.pickup[item.status][language === 'hi' ? 1 : 0]}</StatusBadge><strong>{item.vehicleId ?? l('Assign vehicle', 'वाहन तय करें')}</strong><ChevronRight size={18} /></div></Link>)}</div> : <EmptyState icon={Boxes} title={l('No pickups here', 'यहां कोई पिकअप नहीं')} copy={l('This deterministic state has no matching pickup.', 'इस स्थिति में कोई संबंधित पिकअप नहीं है।')} />}</div>
}

export function LogisticsPickupDetailPage() {
  const { id = '' } = useParams(); const { l, language } = useCopy(); const { showToast } = useToast()
  const [version, setVersion] = useState(0); const [issue, setIssue] = useState(''); const [otp, setOtp] = useState(''); const [busy, setBusy] = useState(false)
  const { data, loading, error } = useAsyncData(async () => {
    const [pickup, vehicles, routes, pickups, deliveries] = await Promise.all([
      logisticsService.pickup(id), logisticsService.vehicles(), logisticsService.routes(), logisticsService.pickups(), logisticsService.deliveries(),
    ])
    return { pickup, vehicles, routes, pickups, deliveries }
  }, [id, version])

  if (loading) return <DashboardSkeleton />
  if (!data?.pickup || error) return <ErrorState title={l('Pickup not found', 'पिकअप नहीं मिला')} />
  const item = data.pickup
  const route = data.routes.find((entry) => entry.id === item.routeId)
  const stops = stopsForRoute(route, data.pickups, data.deliveries)
  const vehicle = data.vehicles.find((entry) => entry.id === item.vehicleId)
  const position = route ? route.pickups.indexOf(item.id) + 1 : 0
  const checklistDone = Object.values(item.checklist).filter(Boolean).length
  const checklistTotal = Object.keys(item.checklist).length

  const refresh = () => setVersion((value) => value + 1)
  const guard = async (action: () => Promise<unknown>, message: string) => {
    if (busy) return
    setBusy(true)
    try { await action(); showToast(message) }
    catch (reason) { showToast(reason instanceof Error ? reason.message : l('That change could not be applied.', 'यह बदलाव लागू नहीं हो सका।')) }
    finally { setBusy(false); refresh() }
  }
  const update = (status: LogisticsPickupStatus) => guard(() => logisticsService.updatePickup(item.id, status), l('Pickup status synchronized across roles', 'पिकअप स्थिति सभी जगह बदल गई'))
  const verifyOtp = () => guard(async () => { const res = await logisticsService.verifyPickupOtp(item.id, otp); setOtp(''); return res }, l('Pickup OTP verified · produce loaded', 'OTP सत्यापित · माल लोड हुआ'))

  // The single thing this pickup needs next, so the operator is never reading a wall of
  // equally-weighted controls to find the button that matters.
  const nextAction: { label: string; status: LogisticsPickupStatus } | null =
    item.status === 'unassigned' ? null
      : item.status === 'assigned' ? { label: l('Start driving to farm', 'खेत के लिए निकलें'), status: 'en_route' }
        : item.status === 'en_route' ? { label: l('Mark arrived at farm', 'खेत पर पहुंचे'), status: 'arrived' }
          : item.status === 'arrived' ? { label: l('Confirm produce loaded', 'माल लोड हुआ'), status: 'loaded' }
            : item.status === 'loaded' ? { label: l('Complete this pickup', 'पिकअप पूरा करें'), status: 'completed' }
              : null

  return (
    <div className="page logistics-page">
      <Link className="back-link" to="/logistics/pickups"><ArrowLeft size={16} /> {l('All pickups', 'सभी पिकअप')}</Link>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{item.id}{route ? ` · ${route.id}${position ? ` · ${l('stop', 'स्टॉप')} ${position}/${route.pickups.length}` : ''}` : ''}</span>
          <h1>{language === 'hi' ? item.cropHi : item.crop} · {item.quantityKg.toLocaleString('en-IN')} kg</h1>
          <p>{item.farm} · {item.farmLocation}</p>
        </div>
        <StatusBadge tone={tone(item.status)}>{labels.pickup[item.status][language === 'hi' ? 1 : 0]}</StatusBadge>
      </div>

      {/* What to do next, before any of the reference detail. */}
      <section className="logi-next">
        <div>
          <span className="eyebrow">{l('Next action', 'अगला कदम')}</span>
          <h2>{item.status === 'completed' ? l('This pickup is complete', 'यह पिकअप पूरा हो गया')
            : item.status === 'issue' ? l('Resolve the reported issue before continuing', 'आगे बढ़ने से पहले समस्या हल करें')
              : item.status === 'unassigned' ? l('Assign a vehicle to this pickup', 'इस पिकअप को वाहन दें')
                : nextAction?.label ?? l('Awaiting the next step', 'अगले कदम का इंतज़ार')}</h2>
          <p>{item.pickupWindow} · {item.notes || l('No special handling notes.', 'कोई विशेष निर्देश नहीं।')}</p>
        </div>
        <div className="logi-next-actions">
          {nextAction && <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => update(nextAction.status)}>{nextAction.label} <ChevronRight size={16} /></button>}
          <a className="btn btn-secondary" href="tel:18001234567"><UserRound size={16} /> {l('Call farmer', 'किसान को कॉल करें')}</a>
        </div>
      </section>

      <div className="logistics-detail-grid">
        <section className="feature-card">
          {stops.length > 0 && (
            <CorridorRouteMap
              stops={stops}
              title={route ? (language === 'hi' ? route.nameHi : route.name) : l('Collection corridor', 'संग्रह कॉरिडोर')}
              subtitle={l(`This pickup is stop ${position || 1} on the run`, `यह पिकअप रूट पर स्टॉप ${position || 1} है`)}
              meta={route ? { routeId: route.id, vehicle: vehicle ? `${vehicle.registration} · ${vehicle.driver}` : route.vehicleId, distanceKm: route.distanceKm, durationMinutes: route.durationMinutes, loadKg: route.loadKg, capacityKg: route.capacityKg } : undefined}
            />
          )}
          <InfoGrid items={[
            [l('Farmer / farm', 'किसान / खेत'), `${item.farmer} · ${item.farm}`],
            [l('Location', 'स्थान'), item.farmLocation],
            [l('Time window', 'समय'), item.pickupWindow],
            [l('Linked orders', 'जुड़े ऑर्डर'), item.orderRefs.join(', ') || '—'],
            [l('Vehicle', 'वाहन'), vehicle ? `${vehicle.registration} · ${vehicle.capacityKg.toLocaleString('en-IN')} kg` : l('Unassigned', 'तय नहीं')],
            [l('Driver', 'ड्राइवर'), item.driver ?? l('Awaiting assignment', 'असाइनमेंट बाकी')],
          ]} />
          <h2 className="section-title">{l('Pickup checklist', 'पिकअप चेकलिस्ट')} <small>{checklistDone}/{checklistTotal}</small></h2>
          <div className="checklist">
            {(Object.entries(item.checklist) as Array<[keyof LogisticsPickup['checklist'], boolean]>).map(([key, checked]) => (
              <label key={key}>
                <input type="checkbox" checked={checked} onChange={() => guard(() => logisticsService.toggleChecklist(item.id, key), l('Checklist updated', 'चेकलिस्ट अपडेट हुई'))} />
                <span>{l(key.replace(/([A-Z])/g, ' $1').toLowerCase(), ({ arrived: 'पहुंच गया', quantityVerified: 'मात्रा सत्यापित', qualityChecked: 'गुणवत्ता जांची', loadSecured: 'लोड सुरक्षित', pickupCompleted: 'पिकअप पूरा' } as Record<string, string>)[key])}</span>
              </label>
            ))}
          </div>
          <Timeline items={item.timeline} language={language} />
        </section>

        <aside className="summary-card sticky">
          <h2>{l('Pickup controls', 'पिकअप नियंत्रण')}</h2>
          <label className="field">
            <span>{l('Farmgate pickup OTP', 'फार्मगेट पिकअप OTP')}</span>
            <div className="otp-field-row">
              <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder={l('6-digit OTP', '6-अंकों का OTP')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
              <button type="button" className="btn btn-primary" disabled={otp.length < 4 || busy} onClick={verifyOtp}>{l('Verify', 'सत्यापित करें')}</button>
            </div>
            <small className="field-hint">{l('Shared with the farmer when the driver arrives.', 'ड्राइवर पहुंचने पर किसान को मिलता है।')}</small>
          </label>
          <label className="field">
            <span>{l('Assign vehicle', 'वाहन तय करें')}</span>
            <select value={item.vehicleId ?? ''} disabled={busy} onChange={(event) => { if (event.target.value) guard(() => logisticsService.assignPickup(item.id, event.target.value), l('Vehicle assigned', 'वाहन तय हुआ')) }}>
              <option value="">{l('Select available vehicle', 'उपलब्ध वाहन चुनें')}</option>
              {data.vehicles.filter((entry) => entry.status !== 'maintenance').map((entry) => (
                <option value={entry.id} key={entry.id} disabled={entry.capacityKg < item.quantityKg}>
                  {entry.registration} · {entry.driver} · {entry.capacityKg.toLocaleString('en-IN')} kg{entry.capacityKg < item.quantityKg ? ` (${l('too small', 'बहुत छोटा')})` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span className="field-label">{l('Override status', 'स्थिति बदलें')}</span>
            <div className="status-controls">
              {pickupSteps.filter((status) => status !== 'issue').map((status) => (
                <button className={item.status === status ? 'active' : ''} disabled={item.status === status || busy} onClick={() => update(status)} key={status}>{labels.pickup[status][language === 'hi' ? 1 : 0]}</button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>{l('Report issue', 'समस्या दर्ज करें')}</span>
            <textarea value={issue} rows={3} maxLength={200} onChange={(event) => setIssue(event.target.value)} placeholder={l('Describe the operational issue', 'संचालन समस्या लिखें')} />
          </label>
          <button className="btn btn-secondary btn-full danger" disabled={!issue.trim() || busy} onClick={() => guard(async () => { await logisticsService.reportPickupIssue(item.id, issue.trim()); setIssue('') }, l('Issue reported', 'समस्या दर्ज हुई'))}>
            <AlertTriangle size={16} /> {l('Report issue', 'समस्या दर्ज करें')}
          </button>
        </aside>
      </div>
    </div>
  )
}

export function LogisticsDeliveriesPage() {
  const { l, language } = useCopy(); const [filter, setFilter] = useState<'active' | DeliveryStatus>('active'); const { data, loading, error } = useAsyncData(() => logisticsService.deliveries())
  if (loading) return <DashboardSkeleton />; const items = data?.filter((item) => filter === 'active' ? item.status !== 'delivered' : item.status === filter) ?? []
  return <div className="page logistics-page"><PageHead eyebrow={l('Buyer fulfillment', 'खरीदार पूर्ति')} title={l('Delivery management', 'डिलीवरी प्रबंधन')} copy={l('Consumer and bulk shipments in one operational queue.', 'ग्राहक और थोक शिपमेंट एक संचालन सूची में।')} />{(data?.length ?? 0) > 0 && <DeliveryRiskCard deliveries={data ?? []} />}<div className="filter-tabs logistics-filters">{(['active', ...deliverySteps] as const).map((status) => <button className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status === 'active' ? l('Active', 'सक्रिय') : labels.delivery[status][language === 'hi' ? 1 : 0]}</button>)}</div>{error ? <ErrorState /> : items.length ? <div className="logistics-list">{items.map((item) => <Link className="logistics-row" to={`/logistics/deliveries/${item.id}`} key={item.id}><div><span className="eyebrow">{item.id} · {item.buyerType}</span><h2>{language === 'hi' ? item.produceHi : item.produce} · {item.quantityKg.toLocaleString('en-IN')} kg</h2><p>{item.destination}</p><small>ETA {prettyWhen(item.eta)} · {item.orderRefs.join(', ')}</small></div><div><StatusBadge tone={tone(item.status)}>{labels.delivery[item.status][language === 'hi' ? 1 : 0]}</StatusBadge><strong>{item.vehicleId ?? l('Unassigned', 'तय नहीं')}</strong><ChevronRight size={18} /></div></Link>)}</div> : <EmptyState icon={PackageCheck} title={l('No deliveries here', 'यहां कोई डिलीवरी नहीं')} copy={l('This state has no matching delivery.', 'इस स्थिति में कोई संबंधित डिलीवरी नहीं है।')} />}</div>
}

export function LogisticsDeliveryDetailPage() {
  const { id = '' } = useParams(); const { l, language } = useCopy(); const { showToast } = useToast(); const [version, setVersion] = useState(0); const [issue, setIssue] = useState(''); const [otp, setOtp] = useState(''); const { data, loading, error } = useAsyncData(() => logisticsService.delivery(id), [id, version]); if (loading) return <DashboardSkeleton />; if (!data || error) return <ErrorState title={l('Delivery not found', 'डिलीवरी नहीं मिली')} />; const item: Delivery = data; const refresh = () => setVersion((value) => value + 1)
  const verifyOtp = async () => { try { const res = await logisticsService.verifyDeliveryOtp(item.id, otp); showToast(res.message); setOtp(''); refresh() } catch (err) { showToast(err instanceof Error ? err.message : l('OTP verification failed', 'OTP सत्यापन विफल')) } }
  return <div className="page logistics-page"><Link className="back-link" to="/logistics/deliveries"><ArrowLeft size={16} /> {l('All deliveries', 'सभी डिलीवरी')}</Link><div className="page-title-row"><div><span className="eyebrow">{item.id} · {item.buyerType}</span><h1>{language === 'hi' ? item.produceHi : item.produce} · {item.quantityKg.toLocaleString('en-IN')} kg</h1><p>{item.buyer} · ETA {prettyWhen(item.eta)}</p></div><StatusBadge tone={tone(item.status)}>{labels.delivery[item.status][language === 'hi' ? 1 : 0]}</StatusBadge></div><div className="logistics-detail-grid"><section className="feature-card"><InfoGrid items={[[l('Origin', 'मूल स्थान'), item.origin], [l('Destination', 'गंतव्य'), item.destination], [l('Order references', 'ऑर्डर संदर्भ'), item.orderRefs.join(', ')], [l('Shipment', 'शिपमेंट'), item.shipment], [l('Vehicle', 'वाहन'), item.vehicleId ?? '—'], [l('Handling notes', 'हैंडलिंग नोट्स'), item.handlingNotes]]} />{item.issues.length > 0 && <div className="issue-box"><AlertTriangle size={19} /><div><strong>{l('Reported issues', 'दर्ज समस्याएं')}</strong>{item.issues.map((value) => <p key={value}>{value}</p>)}</div></div>}<Timeline items={item.timeline} language={language} /></section><aside className="summary-card sticky"><h2>{l('Delivery controls', 'डिलीवरी नियंत्रण')}</h2><label className="field"><span>{l('Buyer delivery OTP', 'खरीदार डिलीवरी OTP')}</span><div className="otp-field-row"><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder={l('6-digit OTP', '6-अंकों का OTP')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} /><button type="button" className="btn btn-primary" disabled={!otp.trim()} onClick={verifyOtp}>{l('Verify', 'सत्यापित करें')}</button></div></label><div className="status-controls">{deliverySteps.filter((status) => status !== 'issue').map((status) => <button className={item.status === status ? 'active' : ''} disabled={item.status === status} onClick={async () => { await logisticsService.updateDelivery(item.id, status); showToast(l('Buyer and farmer views synchronized', 'खरीदार और किसान स्थिति बदल गई')); refresh() }} key={status}>{labels.delivery[status][language === 'hi' ? 1 : 0]}</button>)}</div><label className="field"><span>{l('Report issue or delay', 'समस्या या देरी दर्ज करें')}</span><textarea value={issue} onChange={(event) => setIssue(event.target.value)} placeholder={l('Example: ETA delayed by 25 minutes', 'उदाहरण: ETA में 25 मिनट की देरी')} /></label><button className="btn btn-secondary btn-full danger" disabled={!issue.trim()} onClick={async () => { await logisticsService.reportDeliveryIssue(item.id, issue.trim()); setIssue(''); refresh() }}><AlertTriangle size={16} /> {l('Report issue', 'समस्या दर्ज करें')}</button></aside></div></div>
}

export function LogisticsRoutesPage() {
  const { l, language } = useCopy(); const { showToast } = useToast(); const [optimizing, setOptimizing] = useState(false)
  const { data, loading, error } = useAsyncData(async () => {
    const [routes, pickups, deliveries, vehicles] = await Promise.all([
      logisticsService.routes(), logisticsService.pickups(), logisticsService.deliveries(), logisticsService.vehicles(),
    ])
    return { routes, pickups, deliveries, vehicles }
  }, [], { live: true })
  if (loading) return <DashboardSkeleton />

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const res = await logisticsService.optimizeLiveRoute(1500)
      showToast(l(`Route optimized: ${res.total_distance_km} km, ${res.trips_reduced} trips saved`, `रूट अनुकूलित: ${res.total_distance_km} किमी`))
    } finally { setOptimizing(false) }
  }

  const routes = data?.routes ?? []
  const pooledRoutes = routes.filter((route) => route.pooled)
  const tripsSaved = pooledRoutes.reduce((sum, route) => sum + Math.max(0, route.pickups.length - 1), 0)

  return (
    <div className="page logistics-page logistics-console">
      <div className="page-title-row">
        <div>
          <span className="eyebrow"><Route size={14} /> {l('Route optimization', 'रूट अनुकूलन')}</span>
          <h1>{l('Routes', 'रूट')}</h1>
          <p>{l('Capacitated multi-stop farmgate pickup routing. Several small farm lots, one trip.', 'बहु-खेत पिकअप रूट अनुकूलन। कई छोटे लॉट, एक यात्रा।')}</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={optimizing} onClick={handleOptimize}>
          <Route size={16} /> {optimizing ? l('Optimizing…', 'अनुकूलन हो रहा है…') : l('Run route optimizer', 'रूट अनुकूलक चलाएं')}
        </button>
      </div>

      {routes.length > 0 && <RouteReviewCard routes={routes} />}

      {error ? <ErrorState /> : routes.length === 0 ? (
        <EmptyState icon={MapPinned} title={l('No routes planned', 'कोई रूट नहीं')} copy={l('A route is created when a procurement order or pooled market is confirmed.', 'खरीद ऑर्डर या साझा बाज़ार पक्का होने पर रूट बनता है।')} />
      ) : (
        <div className="route-stack">
          {routes.map((route) => {
            const stops = stopsForRoute(route, data!.pickups, data!.deliveries)
            const vehicle = data!.vehicles.find((item) => item.id === route.vehicleId)
            const delivery = data!.deliveries.find((item) => route.deliveries.includes(item.id))
            const utilisation = Math.round((route.loadKg / Math.max(1, route.capacityKg)) * 100)
            return (
              <article className="route-block" key={route.id}>
                <header className="route-block-head">
                  <div>
                    <span className="eyebrow">{route.id} · {route.status}</span>
                    <h2>{language === 'hi' ? route.nameHi : route.name}</h2>
                    <p>{l(`${route.pickups.length} farm pickups → Sonipat hub → ${delivery?.buyer ?? l('buyer', 'खरीदार')}`, `${route.pickups.length} खेत पिकअप → हब → खरीदार`)}</p>
                  </div>
                  <div className="route-block-badges">
                    {route.pooled && <span className="optimized-badge"><ShieldCheck size={14} /> {l('Pooled route', 'साझा रूट')}</span>}
                    <StatusBadge tone={route.status === 'completed' ? 'green' : route.status === 'active' ? 'amber' : 'neutral'}>{route.status}</StatusBadge>
                  </div>
                </header>
                <CorridorRouteMap
                  stops={stops}
                  title={language === 'hi' ? route.nameHi : route.name}
                  subtitle={l(`${route.distanceKm} km · ${utilisation}% of ${route.capacityKg.toLocaleString('en-IN')} kg vehicle`, `${route.distanceKm} किमी · ${utilisation}% भार`)}
                  meta={{
                    routeId: route.id,
                    vehicle: vehicle ? `${vehicle.registration} · ${vehicle.driver}` : route.vehicleId,
                    distanceKm: route.distanceKm,
                    durationMinutes: route.durationMinutes,
                    loadKg: route.loadKg,
                    capacityKg: route.capacityKg,
                    eta: delivery?.eta,
                  }}
                />
              </article>
            )
          })}
        </div>
      )}

      <section className="pooled-feature">
        <div>
          <span className="eyebrow light">{l('Why pooling matters', 'पूलिंग क्यों ज़रूरी है')}</span>
          <h2>{l('Several farms. One coordinated trip.', 'कई खेत। एक साझा यात्रा।')}</h2>
          <p>{l('Traditional sourcing sends one vehicle per farm, so a small lot carries the whole cost of its own trip.', 'पारंपरिक तरीके में हर खेत के लिए अलग वाहन जाता है।')}</p>
          <strong>{l('KisanLink sequences the farms onto one southbound run into the hub, then one delivery.', 'KisanLink सभी खेतों को एक ही रूट पर जोड़ता है, फिर एक डिलीवरी।')}</strong>
          <small>{l('Sequencing solved with a capacitated vehicle-routing pass over the mapped corridor.', 'रूट क्रम क्षमता-आधारित VRP से तय किया गया।')}</small>
        </div>
        <div className="pooled-metrics">
          <span><strong>{tripsSaved + pooledRoutes.length} → {pooledRoutes.length || 1}</strong><small>{l('Trips reduced', 'यात्राएं कम')}</small></span>
          <span><strong>{Math.max(0, Math.round(pooledRoutes.reduce((sum, route) => sum + route.distanceKm * 0.42, 0)))} km</strong><small>{l('Estimated km saved', 'अनुमानित किमी बचत')}</small></span>
          <span><strong>{pooledRoutes.length ? Math.round(pooledRoutes.reduce((sum, route) => sum + (route.loadKg / Math.max(1, route.capacityKg)) * 100, 0) / pooledRoutes.length) : 0}%</strong><small>{l('Vehicle utilization', 'वाहन उपयोग')}</small></span>
          <span><strong>28%</strong><small>{l('Estimated logistics cost reduction', 'अनुमानित लागत बचत')}</small></span>
        </div>
      </section>
    </div>
  )
}

export function LogisticsVehiclesPage() {
  const { l, language } = useCopy(); const { showToast } = useToast(); const [version, setVersion] = useState(0); const { data, loading, error } = useAsyncData(() => logisticsService.vehicles(), [version]); if (loading) return <DashboardSkeleton />
  return <div className="page logistics-page"><PageHead eyebrow={l('Fleet operations', 'फ्लीट संचालन')} title={l('Vehicles', 'वाहन')} copy={l('Assign and release the deterministic demo fleet.', 'निश्चित डेमो फ्लीट असाइन और रिलीज करें।')} />{error ? <ErrorState /> : <div className="vehicle-grid">{data?.map((vehicle) => <article className="feature-card vehicle-card" key={vehicle.id}><div className="vehicle-icon"><Truck /></div><div><span className="eyebrow">{vehicle.id}</span><h2>{vehicle.registration}</h2><p>{language === 'hi' ? vehicle.typeHi : vehicle.type} · {vehicle.capacityKg.toLocaleString('en-IN')} kg</p></div><StatusBadge tone={tone(vehicle.status)}>{labels.vehicle[vehicle.status][language === 'hi' ? 1 : 0]}</StatusBadge><div className="vehicle-meta"><span><UserRound size={16} /> {vehicle.driver}</span><span><MapPinned size={16} /> {vehicle.currentAssignment ?? l('No assignment', 'कोई असाइनमेंट नहीं')}</span></div>{vehicle.status === 'available' ? <button className="btn btn-primary btn-full" onClick={async () => { await logisticsService.setVehicle(vehicle.id, 'assigned', 'RTE-101'); showToast(l('Vehicle assigned', 'वाहन असाइन हुआ')); setVersion((value) => value + 1) }}>{l('Assign to next route', 'अगले रूट को असाइन करें')}</button> : <button className="btn btn-secondary btn-full" onClick={async () => { await logisticsService.setVehicle(vehicle.id, 'available'); showToast(l('Vehicle released', 'वाहन रिलीज हुआ')); setVersion((value) => value + 1) }}>{l('Release vehicle', 'वाहन रिलीज करें')}</button>}</article>)}</div>}</div>
}

export function LogisticsProfilePage() {
  const { l, language } = useCopy(); const { showToast } = useToast(); const { switchRole, logout } = useAuth(); const navigate = useNavigate(); const [profile, setProfile] = useState<LogisticsProfileData | null>(null); const [saving, setSaving] = useState(false); useEffect(() => { logisticsService.profile().then(setProfile) }, []); if (!profile) return <DashboardSkeleton />
  const save = async () => { setSaving(true); await logisticsService.saveProfile({ ...profile, language }); setSaving(false); showToast(l('Logistics profile saved', 'लॉजिस्टिक्स प्रोफ़ाइल सहेजी गई')) }
  const changeRole = async (role: 'farmer' | 'consumer' | 'bulk') => { await switchRole(role); navigate(roleHome(role)) }
  return <div className="page logistics-page"><div className="page-title-row"><div><span className="eyebrow">{l('Operations account', 'संचालन खाता')}</span><h1>{l('Logistics profile', 'लॉजिस्टिक्स प्रोफ़ाइल')}</h1><p>{l('Hub, shift and notification preferences.', 'हब, शिफ्ट और सूचना पसंद।')}</p></div><button className="btn btn-primary" disabled={saving} onClick={save}><Save size={17} /> {saving ? l('Saving…', 'सहेज रहे हैं…') : l('Save changes', 'बदलाव सहेजें')}</button></div><div className="profile-grid"><section className="profile-card"><div className="profile-identity"><span className="profile-avatar avatar-logistics">KL</span><div><span className="profile-role"><Warehouse size={14} /> {l('Verified operator demo', 'सत्यापित ऑपरेटर डेमो')}</span><h2>{profile.name}</h2><p>{profile.hub}</p></div></div><div className="profile-form"><Field label={l('Name', 'नाम')} value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} /><Field label={l('Phone', 'फ़ोन')} type="tel" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} /><Field label={l('Primary hub', 'मुख्य हब')} value={profile.hub} onChange={(value) => setProfile({ ...profile, hub: value })} /><Field label={l('Shift', 'शिफ्ट')} value={profile.shift} onChange={(value) => setProfile({ ...profile, shift: value })} /></div></section><section className="profile-settings-card"><h2>{l('Notification preferences', 'सूचना पसंद')}</h2><div className="preference-group">{Object.entries(profile.notifications).map(([key, checked]) => <label className="toggle-row" key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><input type="checkbox" checked={checked} onChange={(event) => setProfile({ ...profile, notifications: { ...profile.notifications, [key]: event.target.checked } })} /></label>)}</div></section><section className="demo-switch-card logistics-demo-card"><div><span className="eyebrow">{l('Demo controls', 'डेमो नियंत्रण')}</span><h2>{l('Switch demo role', 'डेमो भूमिका बदलें')}</h2><p>{l('Move across the synchronized ecosystem without signing in again.', 'बिना दोबारा साइन इन किए साझा सिस्टम में भूमिका बदलें।')}</p></div><div className="demo-switch-options"><button onClick={() => changeRole('farmer')}><Sprout size={21} /><strong>{l('Farmer', 'किसान')}</strong></button><button onClick={() => changeRole('consumer')}><ShoppingBasket size={21} /><strong>{l('Consumer', 'ग्राहक')}</strong></button><button onClick={() => changeRole('bulk')}><Building2 size={21} /><strong>{l('Bulk Buyer', 'थोक खरीदार')}</strong></button><button onClick={() => { logout(); window.location.replace('/') }}><LogOut size={21} /><strong>{l('Log out', 'लॉग आउट')}</strong></button></div><DemoControlCenter /></section></div></div>
}

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></div> }
function InfoGrid({ items }: { items: string[][] }) { return <div className="logistics-info-grid">{items.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div> }
function Timeline({ items, language }: { items: LogisticsPickup['timeline']; language: 'en' | 'hi' }) { return <div className="operation-timeline"><h2>{language === 'hi' ? 'समयरेखा' : 'Timeline'}</h2>{items.map((item, index) => <div key={`${item.at}-${index}`}><span><Check size={13} /></span><div><strong>{language === 'hi' ? item.labelHi : item.label}</strong><small>{new Date(item.at).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></div>)}</div> }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...(type === 'tel' ? { inputMode: 'tel' as const, autoComplete: 'tel', maxLength: 10 } : {})} /></label> }
function ErrorState({ title = 'Unable to load operations' }: { title?: string }) { return <div className="error-panel"><RefreshCw size={25} /><h2>{title}</h2><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div> }
