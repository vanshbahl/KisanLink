import { useState } from 'react'
import { Link } from 'react-router-dom'
import { marketMakerService } from '../../services/marketMakerService'
import { logisticsService } from '../../services/logisticsService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../contexts/ToastContext'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { Metrics, StatusPill, IntelligenceCallout } from '../../components/logistics/DispatchUI'
import { marketDispatchTiming } from '../../services/logisticsIntelligenceService'
import { ErrorState, useCopy } from './shared'
export function LogisticsMarketPage() {
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const { data, loading, error, refresh } = useAsyncData(
    () => marketMakerService.boards(),
    [],
    { live: true },
  )
  if (!data && loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />
  const view = data.find((v) => v.board.id === selected) ?? data[0]
  if (!view)
    return (
      <div className="page logistics-page dispatch-page">
        <h1>{l('Market', 'बाज़ार')}</h1>
        <p className="dispatch-empty">
          {l(
            'No corridor is open. Open Profile to access demo controls.',
            'कोई कॉरिडोर खुला नहीं है। डेमो नियंत्रण के लिए प्रोफ़ाइल खोलें।',
          )}
        </p>
        <Link to="/logistics/profile">{l('Profile', 'प्रोफ़ाइल')}</Link>
      </div>
    )
  const { board, math, corridorVehicle } = view
  const aggregation = math.multiCropMath
    ? math.multiCropMath.cropMaths.flatMap((c) =>
        c.allocations.map((a) => ({
          ...a,
          crop: language === 'hi' ? c.segment.cropHi : c.segment.crop,
        })),
      )
    : math.allocations.map((a) => ({
        ...a,
        crop: language === 'hi' ? board.cropHi : board.crop,
      }))
  const held = Boolean(
    corridorVehicle && math.vehicle?.id === corridorVehicle.id,
  )
  const timing = marketDispatchTiming(view)
  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await action()
      refresh()
      showToast(message)
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : l('Unable to update corridor', 'कॉरिडोर अपडेट नहीं हुआ'),
      )
    } finally {
      setBusy(false)
    }
  }
  const dispatch = () =>
    act(
      () => marketMakerService.createMarket(board.id),
      l('Market created. Jobs and route are ready.', 'बाज़ार बना। कार्य और रूट तैयार हैं।'),
    )
  return (
    <div className="page logistics-page dispatch-page">
      <header className="page-title-row">
        <div>
          <h1>{l('Market', 'बाज़ार')}</h1>
          <p>
            {l('Where should I put a truck?', 'ट्रक किस कॉरिडोर में लगाएं?')}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/logistics/fleet">
          {l('Open fleet', 'बेड़ा खोलें')}
        </Link>
      </header>
      <div className="dispatch-route-layout">
        <aside className="dispatch-route-list">
          {data.map((v) => (
            <button
              key={v.board.id}
              className={v.board.id === board.id ? 'active' : ''}
              aria-pressed={v.board.id === board.id}
              onClick={() => setSelected(v.board.id)}
            >
              <strong>
                {language === 'hi' ? v.board.corridorHi : v.board.corridor}
              </strong>
              <StatusPill
                status={
                  v.board.status === 'created'
                    ? 'created'
                    : v.math.viable
                      ? 'viable'
                      : 'forming'
                }
              />
              <span>
                {v.math.committedKg} /{' '}
                {Number.isFinite(v.math.thresholdKg) ? v.math.thresholdKg : '?'}{' '}
                kg
              </span>
              <small>
                {v.math.vehicle?.registration ??
                  l('Vehicle required', 'वाहन चाहिए')}
              </small>
            </button>
          ))}
        </aside>
        <section className="dispatch-panel">
          <div className="dispatch-section-head">
            <div>
              <p>{board.id}</p>
              <h2>{language === 'hi' ? board.corridorHi : board.corridor}</h2>
            </div>
            <StatusPill
              status={
                board.status === 'created'
                  ? 'created'
                  : math.viable
                    ? 'viable'
                    : 'forming'
              }
            />
          </div>
          <Metrics
            items={[
              [l('Committed', 'पक्की मांग'), `${math.committedKg} kg`],
              [
                l('Target', 'लक्ष्य'),
                Number.isFinite(math.thresholdKg)
                  ? `${math.thresholdKg} kg`
                  : l('Unavailable', 'उपलब्ध नहीं'),
              ],
              [l('Truck capacity', 'ट्रक क्षमता'), `${math.capacityKg} kg`],
              [
                l('Estimated freight', 'अनुमानित ढुलाई'),
                math.vehicle
                  ? `₹${math.freightTotal.toLocaleString('en-IN')}`
                  : l('Unavailable', 'उपलब्ध नहीं'),
              ],
            ]}
          />
          <progress
            aria-label={l(
              'Committed demand against target',
              'लक्ष्य के मुकाबले पक्की मांग',
            )}
            value={math.committedKg}
            max={
              Number.isFinite(math.thresholdKg)
                ? Math.max(1, math.thresholdKg, math.committedKg)
                : Math.max(1, math.committedKg)
            }
          />
          <div className="dispatch-inline-note">
            <strong>{l('Delivery window', 'डिलीवरी समय')}: </strong>
            {board.deliveryWindow}
            <p>
              {l(
                'Departure time is not recorded. Freight is a model estimate, not a carrier quote.',
                'प्रस्थान समय दर्ज नहीं है। ढुलाई मॉडल का अनुमान है, वाहक का कोटेशन नहीं।',
              )}
            </p>
          </div>
          <div className="dispatch-flow">
            <strong>
              {new Set(aggregation.map((a) => a.lot.farmer)).size}{' '}
              {l('farms', 'खेत')}
            </strong>
            <span>→</span>
            <strong>{l('Consolidation', 'संग्रह')}</strong>
            <span>→</span>
            <strong>{board.destination}</strong>
          </div>
          <h3>{l('Produce aggregation', 'फसल संग्रह')}</h3>
          <div className="dispatch-table">
            {aggregation.map((a) => (
              <div
                className="dispatch-supply-row"
                key={`${a.crop}-${a.lot.id}`}
              >
                <strong>
                  {a.lot.farmer}
                  <small>{a.lot.farm}</small>
                </strong>
                <span>{a.crop}</span>
                <span>
                  {a.allocatedKg} / {a.availableKg} kg
                </span>
                <small>{a.lot.location}</small>
              </div>
            ))}
          </div>
          {timing && (
            <IntelligenceCallout
              title={l('Dispatch now or wait?', 'अभी भेजें या रुकें?')}
              insight={timing}
              busy={busy}
              action={
                timing.verdict === 'Dispatch now'
                  ? { label: l('Dispatch now', 'अभी भेजें'), onClick: dispatch }
                  : undefined
              }
            />
          )}
          {math.blockers.length > 0 && (
            <div className="dispatch-inline-note">
              {math.blockers.map((b) => (
                <p key={b.kind}>{b.title.replaceAll('—', '.')}</p>
              ))}
            </div>
          )}
          <section className="dispatch-commit">
            <h3>{l('Vehicle commitment', 'वाहन प्रतिबद्धता')}</h3>
            <p>
              {math.vehicle
                ? `${math.vehicle.registration} · ${math.vehicle.driver} · ${math.capacityKg} kg`
                : l(
                    'No available vehicle can serve this corridor.',
                    'इस कॉरिडोर के लिए वाहन उपलब्ध नहीं।',
                  )}
            </p>
            {board.status !== 'created' ? (
              <>
                <p>
                  {l(
                    'The existing corridor model uses fleet availability. Withdrawing marks its vehicle unavailable for maintenance; restoring releases it to the available fleet.',
                    'मौजूदा कॉरिडोर मॉडल बेड़े की उपलब्धता उपयोग करता है। हटाने पर वाहन रखरखाव में और बहाल करने पर उपलब्ध होता है।',
                  )}
                </p>
                <div className="dispatch-actions">
                  <button
                    className="btn btn-secondary"
                    disabled={busy || !corridorVehicle}
                    onClick={() =>
                      act(
                        () =>
                          logisticsService.setVehicle(
                            board.vehicleId,
                            held ? 'maintenance' : 'available',
                          ),
                        l('Corridor vehicle updated', 'कॉरिडोर वाहन अपडेट हुआ'),
                      )
                    }
                  >
                    {held
                      ? l('Withdraw corridor vehicle', 'कॉरिडोर वाहन हटाएं')
                      : l('Restore corridor vehicle', 'कॉरिडोर वाहन बहाल करें')}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy || !math.viable}
                    onClick={dispatch}
                  >
                    {l('Create pooled dispatch', 'साझा डिस्पैच बनाएं')}
                  </button>
                </div>
              </>
            ) : (
              <div className="dispatch-actions">
                <Link className="btn btn-primary" to="/logistics/routes">
                  {board.routeId ?? l('Open route', 'रूट खोलें')}
                </Link>
                <Link className="btn btn-secondary" to="/logistics/jobs">
                  {l('Open linked jobs', 'जुड़े कार्य खोलें')}
                </Link>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  )
}
