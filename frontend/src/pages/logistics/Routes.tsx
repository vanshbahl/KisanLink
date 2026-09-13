import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logisticsService } from '../../services/logisticsService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../contexts/ToastContext'
import { CorridorRouteMap } from '../../components/maps/CorridorRouteMap'
import { Metrics, StatusPill, IntelligenceCallout } from '../../components/logistics/DispatchUI'
import { routeSequenceInsight } from '../../services/logisticsIntelligenceService'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ErrorState, stopsForRoute, useCopy } from './shared'
export function LogisticsRoutesPage() {
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof logisticsService.optimizeLiveRoute>
  > | null>(null)
  const { data, loading, error } = useAsyncData(
    () => logisticsService.overview(),
    [],
    { live: true },
  )
  if (!data && loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />
  const routes = data.logisticsRoutes
  const route =
    routes.find((r) => r.id === selected) ??
    routes.find((r) => r.status === 'active') ??
    routes[0]
  const stops = stopsForRoute(route, data.logisticsPickups, data.deliveries)
  const review = routeSequenceInsight(route, stops, data.logisticsPickups, data.deliveries)
  const optimize = async () => {
    setBusy(true)
    try {
      setResult(
        await logisticsService.optimizeLiveRoute(route?.capacityKg ?? 1500),
      )
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : l(
              'Optimization failed. Try again.',
              'अनुकूलन विफल। फिर कोशिश करें।',
            ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page logistics-page dispatch-page">
      <header className="page-title-row">
        <div>
          <h1>{l('Routes', 'रूट')}</h1>
          <p>
            {l(
              'Corridor planning and stop sequence',
              'कॉरिडोर योजना और स्टॉप क्रम',
            )}
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={busy || !route}
          onClick={optimize}
        >
          {busy
            ? l('Optimizing…', 'अनुकूलन जारी…')
            : l('Optimize', 'अनुकूलित करें')}
        </button>
      </header>
      <Metrics
        items={[
          [
            l('Active routes', 'सक्रिय रूट'),
            routes.filter((r) => r.status === 'active').length,
          ],
          [
            l('Vehicles', 'वाहन'),
            new Set(
              routes
                .filter((r) => r.status !== 'completed')
                .map((r) => r.vehicleId),
            ).size,
          ],
          [
            l('Planned kg moving', 'नियोजित भार'),
            routes
              .filter((r) => r.status !== 'completed')
              .reduce((n, r) => n + r.loadKg, 0),
          ],
        ]}
      />
      {result && (
        <section className="dispatch-insight" role="status">
          <div>
            <strong>
              {result.source === 'backend'
                ? l('OR-Tools result', 'OR-Tools परिणाम')
                : l(
                    'Demo benchmark. Backend unavailable.',
                    'डेमो परिणाम। बैकएंड उपलब्ध नहीं।',
                  )}
            </strong>
            <p>
              {l(
                'Dispatch records remain below. Review the returned shipment plan separately.',
                'डिस्पैच रिकॉर्ड नीचे हैं। मिले शिपमेंट प्लान को अलग से देखें।',
              )}
            </p>
            <Metrics
              items={[
                [l('Distance', 'दूरी'), `${result.total_distance_km} km`],
                [
                  l('Duration', 'अवधि'),
                  `${result.estimated_duration_minutes} min`,
                ],
                [l('Trips reduced', 'कम यात्राएं'), result.trips_reduced],
                [l('Utilization', 'उपयोग'), `${result.utilization_pct}%`],
              ]}
            />
            {result.waypoints && result.waypoints.length > 0 && (
              <details>
                <summary>
                  {l('Optimizer stop order', 'अनुकूलित स्टॉप क्रम')}
                </summary>
                <ol>
                  {[...result.waypoints]
                    .sort((a, b) => a.sequence_index - b.sequence_index)
                    .map((stop) => (
                      <li key={stop.id}>
                        {stop.stop_name} · {stop.payload_weight_kg} kg
                      </li>
                    ))}
                </ol>
              </details>
            )}
          </div>
        </section>
      )}
      {route ? (
        <div className="dispatch-route-layout">
          <aside
            className="dispatch-route-list"
            aria-label={l('Select route', 'रूट चुनें')}
          >
            {routes.map((r) => (
              <button
                key={r.id}
                className={r.id === route.id ? 'active' : ''}
                aria-pressed={r.id === route.id}
                onClick={() => setSelected(r.id)}
              >
                <strong>{r.id}</strong>
                <StatusPill status={r.status} />
                <span>{language === 'hi' ? r.nameHi : r.name}</span>
                <small>
                  {r.vehicleId} · {r.loadKg}/{r.capacityKg} kg
                </small>
              </button>
            ))}
          </aside>
          <section className="dispatch-map-panel">
            <div className="dispatch-section-head">
              <div>
                <h2>{route.id}</h2>
                <p>
                  {route.stops[0]} → {route.stops.at(-1)}
                </p>
              </div>
              <StatusPill status={route.status} />
            </div>
            {review && (
              <IntelligenceCallout
                title={l('Route review', 'रूट समीक्षा')}
                insight={review}
              />
            )}
            <CorridorRouteMap
              stops={stops}
              title={language === 'hi' ? route.nameHi : route.name}
              variant="compact"
              meta={{
                routeId: route.id,
                vehicle: route.vehicleId,
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes,
                loadKg: route.loadKg,
                capacityKg: route.capacityKg,
              }}
            />
            <Metrics
              items={[
                [l('Stops', 'स्टॉप'), stops.length],
                [
                  l('Utilization', 'उपयोग'),
                  route.capacityKg
                    ? `${Math.round((route.loadKg / route.capacityKg) * 100)}%`
                    : l('Unavailable', 'उपलब्ध नहीं'),
                ],
                [
                  l('Complete', 'पूरे'),
                  `${stops.filter((s) => s.status === 'done').length}/${stops.length}`,
                ],
              ]}
            />
            <ol className="dispatch-stops">
              {stops.map((s, i) => (
                <li key={`${s.placeId}-${i}`}>
                  <span className="dispatch-stop-index">{i + 1}</span>
                  <div>
                    <strong>{s.label}</strong>
                    <small>
                      {s.kind} · {s.quantityKg ?? 0} kg · {s.window}
                    </small>
                  </div>
                  <span>
                    {s.status === 'done'
                      ? l('Complete', 'पूरा')
                      : s.status === 'current'
                        ? l('Current', 'वर्तमान')
                        : l('Upcoming', 'आगामी')}
                  </span>
                  {s.refId && (
                    <Link
                      className="btn btn-secondary"
                      to={`/logistics/${data.logisticsPickups.some((p) => p.id === s.refId) ? 'pickups' : 'deliveries'}/${s.refId}`}
                    >
                      {l('Open', 'खोलें')}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : (
        <p className="dispatch-empty">
          {l(
            'No routes planned. Confirm a procurement order or pooled market to create one.',
            'कोई रूट नहीं। खरीद ऑर्डर या साझा बाज़ार पक्का करें।',
          )}
        </p>
      )}
    </div>
  )
}
