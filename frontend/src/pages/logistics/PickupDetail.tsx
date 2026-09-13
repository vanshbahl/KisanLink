import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronRight,
  Dices,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import {
  CaptureInspectionModal,
  type CaptureTarget,
} from '../../components/inspection/CaptureInspectionModal'
import { InspectionStatusBadge } from '../../components/inspection/InspectionStatusBadge'
import { SampleSelectionCard } from '../../components/inspection/SampleSelectionCard'
import { useToast } from '../../contexts/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { logisticsService } from '../../services/logisticsService'
import {
  inspectionService,
  type LotContext,
} from '../../services/inspectionService'
import type {
  LogisticsPickup,
  LogisticsPickupStatus,
  LotTrail,
  SampleAssignment,
} from '../../types'

import { CorridorRouteMap } from '../../components/maps/CorridorRouteMap'

import {
  stopsForRoute,
  pickupSteps,
  labels,
  useCopy,
  InfoGrid,
  Timeline,
  ErrorState,
} from './shared'
import {
  ProgressSteps,
  StatusPill,
} from '../../components/logistics/DispatchUI'
export function LogisticsPickupDetailPage() {
  const { id = '' } = useParams()
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const [version, setVersion] = useState(0)
  const [issue, setIssue] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [trail, setTrail] = useState<LotTrail | undefined>(undefined)
  const [assignment, setAssignment] = useState<SampleAssignment | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [samplingBusy, setSamplingBusy] = useState(false)
  const { data, loading, error } = useAsyncData(async () => {
    const [pickup, vehicles, routes, pickups, deliveries] = await Promise.all([
      logisticsService.pickup(id),
      logisticsService.vehicles(),
      logisticsService.routes(),
      logisticsService.pickups(),
      logisticsService.deliveries(),
    ])
    return { pickup, vehicles, routes, pickups, deliveries }
  }, [id, version])

  const lotCode = data?.pickup?.lotCode
  useEffect(() => {
    if (lotCode) inspectionService.getLotTrail(lotCode).then(setTrail)
  }, [lotCode, version])
  useEffect(() => {
    if (lotCode)
      inspectionService
        .getSampleAssignment(lotCode, 'LOGISTICS_PICKUP')
        .then((a) => a && setAssignment(a))
  }, [lotCode])

  if (loading) return <DashboardSkeleton />
  if (!data?.pickup || error)
    return <ErrorState title={l('Pickup not found', 'पिकअप नहीं मिला')} />
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
    try {
      await action()
      showToast(message)
    } catch (reason) {
      showToast(
        reason instanceof Error
          ? reason.message
          : l(
              'That change could not be applied.',
              'यह बदलाव लागू नहीं हो सका।',
            ),
      )
    } finally {
      setBusy(false)
      refresh()
    }
  }
  const update = (status: LogisticsPickupStatus) =>
    guard(
      () => logisticsService.updatePickup(item.id, status),
      l(
        'Pickup status synchronized across roles',
        'पिकअप स्थिति सभी जगह बदल गई',
      ),
    )
  const verifyOtp = () =>
    guard(
      async () => {
        const res = await logisticsService.verifyPickupOtp(item.id, otp)
        setOtp('')
        return res
      },
      l('Pickup OTP verified · produce loaded', 'OTP सत्यापित · माल लोड हुआ'),
    )

  // --- Lot quality inspection: random sample selection + guided capture ---
  const lot: LotContext | null = item.lotCode
    ? {
        lotCode: item.lotCode,
        cropName: item.crop,
        quantityKg: item.quantityKg,
        cropListingId: item.cropListingId,
        packagingType: item.packagingType,
        containerCount: item.containerCount,
        unitWeightKg: item.unitWeightKg,
      }
    : null
  const hasContainers = Boolean(
    lot?.containerCount && lot.packagingType && lot.packagingType !== 'LOOSE',
  )
  const pickupStage = trail?.stages.find(
    (s) => s.checkpoint === 'LOGISTICS_PICKUP',
  )

  const startSampling = async () => {
    if (!lot) return
    setSamplingBusy(true)
    try {
      const drawn = await inspectionService.getOrCreateSampleAssignment(
        lot,
        'LOGISTICS_PICKUP',
      )
      setAssignment(drawn)
      setCaptureOpen(true)
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : l('Could not draw a random sample.', 'नमूना नहीं बन सका।'),
      )
    } finally {
      setSamplingBusy(false)
    }
  }

  const capturedContainers = new Set(
    (pickupStage?.captures ?? []).map((c) => c.containerNumber),
  )
  const captureTargets: CaptureTarget[] =
    hasContainers && assignment
      ? assignment.instructions
          .filter((inst) => !capturedContainers.has(inst.containerNumber))
          .map((inst) => ({
            key: String(inst.containerNumber),
            title: l(
              `Crate ${inst.containerNumber} of ${assignment.containerCount}`,
              `क्रेट ${inst.containerNumber} / ${assignment.containerCount}`,
            ),
            instruction: inst.position,
            note: l(
              `Open the selected crate and expose produce from the ${inst.position.toLowerCase()}.`,
              'चुने गए क्रेट को खोलें और अंदर की उपज दिखाएं।',
            ),
            containerNumber: inst.containerNumber,
          }))
      : (pickupStage?.photoCount ?? 0) > 0
        ? []
        : [
            {
              key: 'single',
              title: l('Lot photo', 'लॉट फ़ोटो'),
              note: l(
                'Capture the produce clearly before loading.',
                'लोड करने से पहले उपज की स्पष्ट फ़ोटो लें।',
              ),
            },
          ]
  // Inspection is only "done" once every sampled crate has a photo (or, for un-packaged
  // small lots, at least one photo) - not merely once a sample has been drawn.
  const inspectionComplete = hasContainers
    ? Boolean(assignment) &&
      capturedContainers.size >= (assignment?.sampleSize ?? Infinity)
    : (pickupStage?.photoCount ?? 0) > 0

  const handleCaptureSubmit = async (target: CaptureTarget, file: File) => {
    if (!lot) throw new Error('Lot information missing for this pickup.')
    const capture = await inspectionService.submitCapture({
      lot,
      checkpoint: 'LOGISTICS_PICKUP',
      file,
      containerNumber: target.containerNumber,
      sampleAssignmentId: hasContainers ? assignment?.id : undefined,
      capturedBy: `${item.driver ?? l('Operator', 'ऑपरेटर')} (Logistics)`,
    })
    return { status: capture.status }
  }
  const handleCaptureComplete = async () => {
    if (!item.checklist.qualityChecked)
      await logisticsService.toggleChecklist(item.id, 'qualityChecked')
    refresh()
  }

  // The single thing this pickup needs next, so the operator is never reading a wall of
  // equally-weighted controls to find the button that matters.
  const nextAction: { label: string; status: LogisticsPickupStatus } | null =
    item.status === 'unassigned'
      ? null
      : item.status === 'assigned'
        ? {
            label: l('Start driving to farm', 'खेत के लिए निकलें'),
            status: 'en_route',
          }
        : item.status === 'en_route'
          ? {
              label: l('Mark arrived at farm', 'खेत पर पहुंचे'),
              status: 'arrived',
            }
          : item.status === 'arrived'
            ? {
                label: l('Confirm produce loaded', 'माल लोड हुआ'),
                status: 'loaded',
              }
            : item.status === 'loaded'
              ? {
                  label: l('Complete this pickup', 'पिकअप पूरा करें'),
                  status: 'completed',
                }
              : null

  return (
    <div className="page logistics-page dispatch-page dispatch-pickup-detail">
      <Link className="back-link" to="/logistics/jobs?tab=pickups">
        <ArrowLeft size={16} /> {l('All pickups', 'सभी पिकअप')}
      </Link>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">
            {item.id}
            {route
              ? ` · ${route.id}${position ? ` · ${l('stop', 'स्टॉप')} ${position}/${route.pickups.length}` : ''}`
              : ''}
          </span>
          <h1>
            {language === 'hi' ? item.cropHi : item.crop} ·{' '}
            {item.quantityKg.toLocaleString('en-IN')} kg
          </h1>
          <p>
            {item.farm} · {item.farmLocation}
          </p>
        </div>
        <StatusPill status={item.status} />
      </div>

      <ProgressSteps
        steps={
          language === 'hi'
            ? ['वाहन तय', 'रास्ते में', 'पहुंचा', 'लोड हुआ', 'पूरा']
            : ['Assigned', 'En Route', 'Arrived', 'Loaded', 'Complete']
        }
        current={[
          'assigned',
          'en_route',
          'arrived',
          'loaded',
          'completed',
        ].indexOf(item.status)}
      />
      <section className="logi-next">
        <div>
          <span className="eyebrow">{l('Next action', 'अगला कदम')}</span>
          <h2>
            {item.status === 'completed'
              ? l('This pickup is complete', 'यह पिकअप पूरा हो गया')
              : item.status === 'issue'
                ? l(
                    'Resolve the reported issue before continuing',
                    'आगे बढ़ने से पहले समस्या हल करें',
                  )
                : item.status === 'unassigned'
                  ? l('Assign a vehicle to this pickup', 'इस पिकअप को वाहन दें')
                  : item.status === 'arrived'
                    ? l(
                        'Inspect produce before securing the load',
                        'लोड सुरक्षित करने से पहले फसल जांचें',
                      )
                    : item.status === 'loaded'
                      ? l(
                          'Verify the farmer OTP to complete pickup',
                          'पिकअप पूरा करने के लिए किसान OTP सत्यापित करें',
                        )
                      : (nextAction?.label ??
                        l('Awaiting the next step', 'अगले कदम का इंतज़ार'))}
          </h2>
          <p>
            {item.pickupWindow} ·{' '}
            {item.notes ||
              l('No special handling notes.', 'कोई विशेष निर्देश नहीं।')}
          </p>
        </div>
        <div className="logi-next-actions">
          {nextAction && !['arrived', 'loaded'].includes(item.status) && (
            <button
              type="button"
              className="btn btn-primary btn-large"
              disabled={busy}
              onClick={() => update(nextAction.status)}
            >
              {nextAction.label} <ChevronRight size={16} />
            </button>
          )}
          {item.status === 'arrived' && (
            <a
              className="btn btn-primary"
              href="#pickup-quality"
              onClick={() => {
                const panel = document.getElementById('pickup-quality')
                if (panel instanceof HTMLDetailsElement) panel.open = true
              }}
            >
              {l('Inspect and secure load', 'जांचें और लोड सुरक्षित करें')}
            </a>
          )}
          {item.status === 'loaded' && (
            <a
              className="btn btn-primary"
              href="#pickup-otp"
              onClick={() => {
                const panel = document.getElementById('pickup-otp')
                if (panel instanceof HTMLDetailsElement) panel.open = true
              }}
            >
              {l('Verify farmer OTP', 'किसान OTP सत्यापित करें')}
            </a>
          )}
          {item.status === 'unassigned' && (
            <a className="btn btn-primary" href="#pickup-vehicle">
              {l('Assign vehicle', 'वाहन तय करें')}
            </a>
          )}
          <a className="btn btn-secondary" href="tel:18001234567">
            <UserRound size={16} /> {l('Call farmer', 'किसान को कॉल करें')}
          </a>
        </div>
      </section>

      <div className="logistics-detail-grid">
        <section className="feature-card">
          <details
            id="pickup-quality"
            className="dispatch-disclosure"
            open={['arrived', 'loaded'].includes(item.status)}
          >
            <summary>
              {l(
                'Sample, photos and load checklist',
                'नमूना, फ़ोटो और लोड चेकलिस्ट',
              )}
            </summary>
            <h2 className="section-title">
              {l('Pickup checklist', 'पिकअप चेकलिस्ट')}{' '}
              <small>
                {checklistDone}/{checklistTotal}
              </small>
            </h2>
            <div className="checklist">
              {(
                Object.entries(item.checklist) as Array<
                  [keyof LogisticsPickup['checklist'], boolean]
                >
              )
                .filter(
                  ([key]) =>
                    (key !== 'loadSecured' || !lot || inspectionComplete) &&
                    (key !== 'pickupCompleted' ||
                      ['loaded', 'completed'].includes(item.status)),
                )
                .map(([key, checked]) =>
                  key === 'qualityChecked' ? (
                    <div className="checklist-quality-row" key={key}>
                      <label>
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          disabled
                        />
                        <span>{l('Quality checked', 'गुणवत्ता जांची')}</span>
                      </label>
                      {!inspectionComplete && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={samplingBusy || busy || !lot}
                          onClick={
                            hasContainers && !assignment
                              ? startSampling
                              : () => setCaptureOpen(true)
                          }
                        >
                          {hasContainers ? (
                            <Dices size={14} />
                          ) : (
                            <Camera size={14} />
                          )}{' '}
                          {assignment && capturedContainers.size > 0
                            ? l('Continue inspection', 'जांच जारी रखें')
                            : hasContainers
                              ? l('Random sample', 'रैंडम नमूना')
                              : l('Add photo', 'फ़ोटो जोड़ें')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          guard(
                            () =>
                              logisticsService.toggleChecklist(item.id, key),
                            l('Checklist updated', 'चेकलिस्ट अपडेट हुई'),
                          )
                        }
                      />
                      <span>
                        {l(
                          key.replace(/([A-Z])/g, ' $1').toLowerCase(),
                          (
                            {
                              arrived: 'पहुंच गया',
                              quantityVerified: 'मात्रा सत्यापित',
                              loadSecured: 'लोड सुरक्षित',
                              pickupCompleted: 'पिकअप पूरा',
                            } as Record<string, string>
                          )[key],
                        )}
                      </span>
                    </label>
                  ),
                )}
            </div>

            {hasContainers && assignment && (
              <SampleSelectionCard
                assignment={assignment}
                quantityKg={item.quantityKg}
              />
            )}

            {pickupStage && pickupStage.photoCount > 0 && (
              <div className="pickup-sample-summary">
                <div className="pickup-sample-summary-head">
                  <span>{l('Sample inspection', 'नमूना जांच')}</span>
                  <InspectionStatusBadge status={pickupStage.status} />
                </div>
                {hasContainers && (
                  <p>
                    {capturedContainers.size} {l('of', '/')}{' '}
                    {pickupStage.totalContainers}{' '}
                    {l('crates inspected', 'क्रेट जांचे गए')}
                  </p>
                )}
                <div className="pickup-sample-rows">
                  {pickupStage.captures.map((c) => (
                    <div key={c.id}>
                      <span>
                        {c.containerNumber !== undefined
                          ? `${l('Crate', 'क्रेट')} ${c.containerNumber}`
                          : l('Lot photo', 'लॉट फ़ोटो')}
                      </span>
                      <InspectionStatusBadge
                        status={
                          c.status === 'saved_ai_unavailable'
                            ? 'unable_to_assess'
                            : c.status
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inspectionComplete && pickupStage && (
              <div className="pickup-verified-card">
                <h3>
                  <ShieldCheck size={16} />{' '}
                  {l('Pickup verified', 'पिकअप सत्यापित')}
                </h3>
                <p>
                  {l('Lot', 'लॉट')} {item.lotCode}
                </p>
                <div className="pickup-verified-grid">
                  <div>
                    <span>{l('Quantity', 'मात्रा')}</span>
                    <strong>{item.quantityKg} kg</strong>
                  </div>
                  {hasContainers && (
                    <div>
                      <span>{l('Crates', 'क्रेट')}</span>
                      <strong>{item.containerCount}</strong>
                    </div>
                  )}
                  {hasContainers && (
                    <div>
                      <span>{l('Randomly sampled', 'रैंडम जांचे')}</span>
                      <strong>{pickupStage.sampledContainers}</strong>
                    </div>
                  )}
                  <div>
                    <span>{l('Photos', 'फ़ोटो')}</span>
                    <strong>
                      {pickupStage.photoCount}{' '}
                      {l('evidence images', 'प्रमाण फ़ोटो')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <CaptureInspectionModal
              isOpen={captureOpen}
              onClose={() => setCaptureOpen(false)}
              title={l('Sample Inspection', 'नमूना जांच')}
              targets={captureTargets}
              onSubmit={handleCaptureSubmit}
              onComplete={handleCaptureComplete}
            />

            {item.status === 'arrived' && (
              <button
                className="btn btn-primary"
                disabled={
                  busy ||
                  !item.checklist.loadSecured ||
                  (Boolean(lot) && !inspectionComplete)
                }
                onClick={() => update('loaded')}
              >
                {l('Confirm produce loaded', 'माल लोड हुआ')}
              </button>
            )}
          </details>
          <details className="dispatch-disclosure">
            <summary>{l('Audit and history', 'ऑडिट और इतिहास')}</summary>
            <Timeline items={item.timeline} language={language} />
          </details>
        </section>

        <aside className="summary-card sticky">
          <details className="dispatch-disclosure">
            <summary>
              {l('Farmer, route and vehicle', 'किसान, रूट और वाहन')}
            </summary>{' '}
            {stops.length > 0 && (
              <CorridorRouteMap
                variant="compact"
                stops={stops}
                title={
                  route
                    ? language === 'hi'
                      ? route.nameHi
                      : route.name
                    : l('Collection corridor', 'संग्रह कॉरिडोर')
                }
                subtitle={l(
                  `This pickup is stop ${position || 1} on the run`,
                  `यह पिकअप रूट पर स्टॉप ${position || 1} है`,
                )}
                meta={
                  route
                    ? {
                        routeId: route.id,
                        vehicle: vehicle
                          ? `${vehicle.registration} · ${vehicle.driver}`
                          : route.vehicleId,
                        distanceKm: route.distanceKm,
                        durationMinutes: route.durationMinutes,
                        loadKg: route.loadKg,
                        capacityKg: route.capacityKg,
                      }
                    : undefined
                }
              />
            )}
            <InfoGrid
              items={[
                [
                  l('Farmer / farm', 'किसान / खेत'),
                  `${item.farmer} · ${item.farm}`,
                ],
                [l('Location', 'स्थान'), item.farmLocation],
                [l('Time window', 'समय'), item.pickupWindow],
                [
                  l('Linked orders', 'जुड़े ऑर्डर'),
                  item.orderRefs.join(', ') || l('Unavailable', 'उपलब्ध नहीं'),
                ],
                [
                  l('Vehicle', 'वाहन'),
                  vehicle
                    ? `${vehicle.registration} · ${vehicle.capacityKg.toLocaleString('en-IN')} kg`
                    : l('Unassigned', 'तय नहीं'),
                ],
                [
                  l('Driver', 'ड्राइवर'),
                  item.driver ?? l('Awaiting assignment', 'असाइनमेंट बाकी'),
                ],
              ]}
            />
          </details>
          <details
            id="pickup-otp"
            className="dispatch-disclosure"
            open={item.status === 'loaded'}
          >
            <summary>{l('Farmer OTP', 'किसान OTP')}</summary>
            <label className="field">
              <span>{l('Farmgate pickup OTP', 'फार्मगेट पिकअप OTP')}</span>
              <div className="otp-field-row">
                <input
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ''))
                  }
                  placeholder={l('6-digit OTP', '6-अंकों का OTP')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={otp.length < 4 || busy}
                  onClick={verifyOtp}
                >
                  {l('Verify', 'सत्यापित करें')}
                </button>
              </div>
              <small className="field-hint">
                {l(
                  'Shared with the farmer when the driver arrives.',
                  'ड्राइवर पहुंचने पर किसान को मिलता है।',
                )}
              </small>
            </label>
          </details>
          <label id="pickup-vehicle" className="field">
            <span>{l('Assign vehicle', 'वाहन तय करें')}</span>
            <select
              value={item.vehicleId ?? ''}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value)
                  guard(
                    () =>
                      logisticsService.assignPickup(
                        item.id,
                        event.target.value,
                      ),
                    l('Vehicle assigned', 'वाहन तय हुआ'),
                  )
              }}
            >
              <option value="">
                {l('Select available vehicle', 'उपलब्ध वाहन चुनें')}
              </option>
              {data.vehicles
                .filter((entry) => entry.status !== 'maintenance')
                .map((entry) => (
                  <option
                    value={entry.id}
                    key={entry.id}
                    disabled={entry.capacityKg < item.quantityKg}
                  >
                    {entry.registration} · {entry.driver} ·{' '}
                    {entry.capacityKg.toLocaleString('en-IN')} kg
                    {entry.capacityKg < item.quantityKg
                      ? ` (${l('too small', 'बहुत छोटा')})`
                      : ''}
                  </option>
                ))}
            </select>
          </label>
          <details className="dispatch-disclosure">
            <summary>
              {l('Advanced status controls', 'उन्नत स्थिति नियंत्रण')}
            </summary>
            <div className="field">
              <span className="field-label">
                {l('Override status', 'स्थिति बदलें')}
              </span>
              <div className="status-controls">
                {pickupSteps
                  .filter((status) => status !== 'issue')
                  .map((status) => (
                    <button
                      className={item.status === status ? 'active' : ''}
                      disabled={item.status === status || busy}
                      onClick={() => update(status)}
                      key={status}
                    >
                      {labels.pickup[status][language === 'hi' ? 1 : 0]}
                    </button>
                  ))}
              </div>
            </div>
          </details>
          <details className="dispatch-disclosure">
            <summary>{l('Report issue', 'समस्या दर्ज करें')}</summary>
            <label className="field">
              <span>{l('Report issue', 'समस्या दर्ज करें')}</span>
              <textarea
                value={issue}
                rows={3}
                maxLength={200}
                onChange={(event) => setIssue(event.target.value)}
                placeholder={l(
                  'Describe the operational issue',
                  'संचालन समस्या लिखें',
                )}
              />
            </label>
            <button
              className="btn btn-secondary btn-full danger"
              disabled={!issue.trim() || busy}
              onClick={() =>
                guard(
                  async () => {
                    await logisticsService.reportPickupIssue(
                      item.id,
                      issue.trim(),
                    )
                    setIssue('')
                  },
                  l('Issue reported', 'समस्या दर्ज हुई'),
                )
              }
            >
              <AlertTriangle size={16} />{' '}
              {l('Report issue', 'समस्या दर्ज करें')}
            </button>
          </details>
        </aside>
      </div>
    </div>
  )
}
