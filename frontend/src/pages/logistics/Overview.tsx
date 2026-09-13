import { Link } from 'react-router-dom'
import { logisticsService } from '../../services/logisticsService'
import { dispatchPulse } from '../../services/logisticsIntelligenceService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { CorridorRouteMap } from '../../components/maps/CorridorRouteMap'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { Metrics, IntelligenceCallout } from '../../components/logistics/DispatchUI'
import { JobRows } from '../../components/logistics/JobRows'
import { attentionJobs, dispatchJobs } from './jobsModel'
import { ErrorState, RouteProgress, stopsForRoute, useCopy } from './shared'
export function LogisticsDashboard() {
  const { l } = useCopy()
  const { data, loading, error } = useAsyncData(
    () => logisticsService.overview(),
    [],
    { live: true },
  )
  if (!data && loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />
  const pickups = data.logisticsPickups.filter((p) => p.status !== 'completed')
  const deliveries = data.deliveries.filter((d) => d.status !== 'delivered')
  const attention = attentionJobs(
    dispatchJobs(data.logisticsPickups, data.deliveries),
  )
  const route =
    data.logisticsRoutes.find((r) => r.status === 'active') ??
    data.logisticsRoutes.find((r) => r.status === 'planned') ??
    data.logisticsRoutes[0]
  const stops = stopsForRoute(route, data.logisticsPickups, data.deliveries)
  return (
    <div className="page logistics-page dispatch-page">
      <header className="page-title-row">
        <div>
          <p>
            {l('Namaste', 'नमस्ते')}, {data.logisticsProfile.name}
          </p>
          <h1>{data.logisticsProfile.hub}</h1>
        </div>
        <span className="dispatch-shift">
          {l('Shift', 'शिफ्ट')}: {data.logisticsProfile.shift}
        </span>
      </header>
      <Metrics
        items={[
          [
            l('Active jobs', 'सक्रिय कार्य'),
            pickups.length + deliveries.length,
          ],
          [l('Needs attention', 'ध्यान दें'), attention.length],
          [l('Pickups', 'पिकअप'), pickups.length],
          [l('Deliveries', 'डिलीवरी'), deliveries.length],
          [
            l('Vehicles available', 'उपलब्ध वाहन'),
            `${data.vehicles.filter((v) => v.status === 'available').length}/${data.vehicles.length}`,
          ],
        ]}
      />
      <section className="dispatch-map-panel">
        <div className="dispatch-section-head">
          <h2>{l('Live Operations', 'लाइव संचालन')}</h2>
          <Link to="/logistics/routes">{l('Open routes', 'रूट खोलें')}</Link>
        </div>
        {route ? (
          <>
            <CorridorRouteMap
              title={route.name}
              stops={stops}
              variant="compact"
              meta={{
                routeId: route.id,
                vehicle: route.vehicleId,
                loadKg: route.loadKg,
                capacityKg: route.capacityKg,
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes,
              }}
            />
            <RouteProgress stops={stops} />
          </>
        ) : (
          <p className="dispatch-empty">
            {l(
              'No route planned. Review Market for the next corridor.',
              'कोई रूट तय नहीं। अगला कॉरिडोर बाज़ार में देखें।',
            )}
          </p>
        )}
      </section>
      <IntelligenceCallout
        title={l('Dispatch suggestion', 'डिस्पैच सुझाव')}
        insight={dispatchPulse(
          data.logisticsPickups,
          data.deliveries,
          data.vehicles,
        )}
      />
      <section>
        <div className="dispatch-section-head">
          <h2>{l('Needs attention', 'ध्यान दें')}</h2>
          <Link to="/logistics/jobs">{l('All jobs', 'सभी कार्य')}</Link>
        </div>
        <JobRows jobs={attention.slice(0, 6)} />
      </section>
    </div>
  )
}
