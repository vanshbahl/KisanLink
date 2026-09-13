import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logisticsService } from '../../services/logisticsService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../contexts/ToastContext'
import { Metrics, StatusPill } from '../../components/logistics/DispatchUI'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ErrorState, InfoGrid, useCopy } from './shared'
export function LogisticsVehiclesPage() {
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const [selected, setSelected] = useState('')
  const [filter, setFilter] = useState('all')
  const [job, setJob] = useState('')
  const [busy, setBusy] = useState(false)
  const { data, loading, error, refresh } = useAsyncData(
    () => logisticsService.overview(),
    [],
    { live: true },
  )
  if (!data && loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />
  const vehicles = data.vehicles.filter(
    (v) => filter === 'all' || v.status === filter,
  )
  const vehicle = vehicles.find((v) => v.id === selected) ?? vehicles[0]
  const route =
    vehicle &&
    data.logisticsRoutes.find(
      (r) =>
        r.id === vehicle.currentAssignment &&
        r.vehicleId === vehicle.id &&
        r.status !== 'completed',
    )
  const choices = vehicle
    ? data.logisticsPickups.filter(
        (p) => p.status === 'unassigned' && p.quantityKg <= vehicle.capacityKg,
      )
    : []
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
      setJob('')
      refresh()
      showToast(l('Fleet updated', 'बेड़ा अपडेट हुआ'))
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : l('Unable to update fleet', 'बेड़ा अपडेट नहीं हुआ'),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page logistics-page dispatch-page">
      <header className="page-title-row">
        <div>
          <h1>{l('Fleet', 'बेड़ा')}</h1>
          <p>
            {l(
              'Vehicles, drivers and assignments',
              'वाहन, ड्राइवर और असाइनमेंट',
            )}
          </p>
        </div>
      </header>
      <Metrics
        items={[
          [l('Total', 'कुल'), data.vehicles.length],
          [
            l('Available', 'उपलब्ध'),
            data.vehicles.filter((v) => v.status === 'available').length,
          ],
          [
            l('Active', 'सक्रिय'),
            data.vehicles.filter((v) =>
              ['assigned', 'in_transit'].includes(v.status),
            ).length,
          ],
        ]}
      />
      <div className="dispatch-toolbar">
        <label>
          {l('Status', 'स्थिति')}{' '}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setJob('')
            }}
          >
            {['all', 'available', 'assigned', 'in_transit', 'maintenance'].map(
              (s) => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="dispatch-fleet-layout">
        <div className="dispatch-table">
          <div
            className="dispatch-fleet-row dispatch-table-head"
            aria-hidden="true"
          >
            {[
              'Vehicle',
              'Type / capacity',
              'Driver',
              'Assignment',
              'Status',
            ].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {vehicles.map((v) => (
            <button
              className={`dispatch-fleet-row ${vehicle?.id === v.id ? 'selected' : ''}`}
              key={v.id}
              aria-pressed={vehicle?.id === v.id}
              onClick={() => {
                setSelected(v.id)
                setJob('')
                if (window.matchMedia('(max-width: 1150px)').matches)
                  requestAnimationFrame(() =>
                    document
                      .getElementById('fleet-detail')
                      ?.scrollIntoView({ block: 'start' }),
                  )
              }}
            >
              <strong>
                {v.id}
                <small>{v.registration}</small>
              </strong>
              <span>
                {language === 'hi' ? v.typeHi : v.type}
                <small>{v.capacityKg} kg</small>
              </span>
              <span>{v.driver}</span>
              <span>{v.currentAssignment ?? l('Unassigned', 'तय नहीं')}</span>
              <StatusPill status={v.status} />
            </button>
          ))}
          {!vehicles.length && (
            <p className="dispatch-empty">
              {l(
                'No vehicles match this status.',
                'इस स्थिति में कोई वाहन नहीं।',
              )}
            </p>
          )}
        </div>
        {vehicle && (
          <aside id="fleet-detail" className="dispatch-panel">
            <div className="dispatch-section-head">
              <h2>{vehicle.id}</h2>
              <StatusPill status={vehicle.status} />
            </div>
            <InfoGrid
              items={[
                [l('Registration', 'पंजीकरण'), vehicle.registration],
                [
                  l('Type', 'प्रकार'),
                  language === 'hi' ? vehicle.typeHi : vehicle.type,
                ],
                [l('Capacity', 'क्षमता'), `${vehicle.capacityKg} kg`],
                [l('Driver', 'ड्राइवर'), vehicle.driver],
                [
                  l('Assignment', 'असाइनमेंट'),
                  vehicle.currentAssignment ?? l('None', 'कोई नहीं'),
                ],
                [
                  l('Route planned load', 'रूट का नियोजित भार'),
                  route
                    ? `${route.loadKg} kg (${Math.round((route.loadKg / Math.max(1, vehicle.capacityKg)) * 100)}%)`
                    : l('Unavailable', 'उपलब्ध नहीं'),
                ],
              ]}
            />
            {route && (
              <Link className="btn btn-secondary" to="/logistics/routes">
                {l('Open route', 'रूट खोलें')}
              </Link>
            )}
            {vehicle.status === 'available' ? (
              <>
                <label className="field">
                  <span>
                    {l(
                      'Assign an unassigned pickup',
                      'बिना वाहन का पिकअप चुनें',
                    )}
                  </span>
                  <select
                    value={job}
                    disabled={busy}
                    onChange={(e) => setJob(e.target.value)}
                  >
                    <option value="">
                      {l('Select pickup', 'पिकअप चुनें')}
                    </option>
                    {choices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.farm} · {p.quantityKg} kg
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn btn-primary btn-full"
                  disabled={busy || !choices.some((p) => p.id === job)}
                  onClick={() =>
                    act(() => logisticsService.assignPickup(job, vehicle.id))
                  }
                >
                  {l('Assign vehicle', 'वाहन असाइन करें')}
                </button>
                {!choices.length && (
                  <p>
                    {l(
                      'No unassigned pickup fits this vehicle.',
                      'इस वाहन के लिए उपयुक्त पिकअप नहीं।',
                    )}
                  </p>
                )}
              </>
            ) : (
              <button
                className="btn btn-secondary btn-full"
                disabled={busy}
                onClick={() =>
                  act(() =>
                    logisticsService.setVehicle(vehicle.id, 'available'),
                  )
                }
              >
                {l('Release vehicle', 'वाहन रिलीज करें')}
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
