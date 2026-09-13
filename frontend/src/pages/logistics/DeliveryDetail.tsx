import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { inspectionService } from '../../services/inspectionService'
import { logisticsService } from '../../services/logisticsService'
import { deliveryRiskCheck } from '../../services/logisticsIntelligenceService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../contexts/ToastContext'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import {
  IntelligenceCallout,
  ProgressSteps,
  StatusPill,
} from '../../components/logistics/DispatchUI'
import { DropoffConditionCard } from './DropoffCondition'
import {
  deliverySteps,
  ErrorState,
  InfoGrid,
  labels,
  Timeline,
  useCopy,
} from './shared'
import type { DeliveryStatus } from '../../types'
export function LogisticsDeliveryDetailPage() {
  const { id = '' } = useParams()
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const [otp, setOtp] = useState('')
  const [issue, setIssue] = useState('')
  const [busy, setBusy] = useState(false)
  const [arrivalId, setArrivalId] = useState('')
  const {
    data: item,
    loading,
    error,
    refresh,
  } = useAsyncData(() => logisticsService.delivery(id), [id], { live: true })
  const { data: condition, refresh: refreshCondition } = useAsyncData(
    async () =>
      item?.lotCode
        ? (await inspectionService.getLotState(item.lotCode))?.dropoffCondition
        : undefined,
    [item?.lotCode],
  )
  if (loading && !item) return <DashboardSkeleton />
  if (!item || error)
    return <ErrorState title={l('Delivery not found', 'डिलीवरी नहीं मिली')} />
  const guard = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
      refresh()
      showToast(l('Delivery updated', 'डिलीवरी अपडेट हुई'))
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : l('Unable to update delivery', 'डिलीवरी अपडेट नहीं हुई'),
      )
    } finally {
      setBusy(false)
    }
  }
  const step = {
    scheduled: -1,
    loaded: 0,
    in_transit: 1,
    at_hub: 1,
    out_for_delivery: condition ? 3 : arrivalId === item.id ? 2 : 1,
    delivered: 4,
    issue: -1,
  }[item.status]
  const next: { status: DeliveryStatus; label: string } | undefined =
    item.status === 'scheduled'
      ? {
          status: 'loaded',
          label: l('Confirm load received', 'लोड प्राप्त हुआ'),
        }
      : item.status === 'loaded'
        ? {
            status: 'in_transit',
            label: l('Start delivery', 'डिलीवरी शुरू करें'),
          }
        : item.status === 'in_transit'
          ? { status: 'at_hub', label: l('Mark at hub', 'हब पर पहुंचे') }
          : item.status === 'at_hub'
            ? {
                status: 'out_for_delivery',
                label: l(
                  'Leave hub for destination',
                  'गंतव्य के लिए हब से निकलें',
                ),
              }
            : undefined
  return (
    <div className="page logistics-page dispatch-page">
      <Link className="back-link" to="/logistics/jobs?tab=deliveries">
        {l('Back to deliveries', 'डिलीवरी पर वापस')}
      </Link>
      <header className="page-title-row">
        <div>
          <p>
            {item.id} · {item.buyer}
          </p>
          <h1>
            {language === 'hi' ? item.produceHi : item.produce} ·{' '}
            {item.quantityKg} kg
          </h1>
          <p>
            {item.destination} · ETA {item.eta}
          </p>
        </div>
        <StatusPill status={item.status} />
      </header>
      <ProgressSteps
        steps={
          language === 'hi'
            ? ['लोड हुआ', 'रास्ते में', 'गंतव्य पर', 'हैंडओवर', 'डिलीवरी हुई']
            : [
                'Loaded',
                'In Transit',
                'At Destination',
                'Handover',
                'Delivered',
              ]
        }
        current={step}
      />
      <section className="logi-next">
        <div>
          <h2>
            {next?.label ??
              (item.status === 'delivered'
                ? l('Delivery complete', 'डिलीवरी पूरी')
                : item.status === 'issue'
                  ? l('Review the reported issue', 'दर्ज समस्या देखें')
                  : condition
                    ? l(
                        'Verify buyer OTP to complete delivery',
                        'डिलीवरी पूरी करने के लिए खरीदार OTP सत्यापित करें',
                      )
                    : l(
                        'Confirm arrival, then record handover',
                        'पहुंचने की पुष्टि करें, फिर हैंडओवर दर्ज करें',
                      ))}
          </h2>
          <p>{item.handlingNotes}</p>
        </div>
        {next ? (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              guard(() => logisticsService.updateDelivery(item.id, next.status))
            }
          >
            {next.label}
          </button>
        ) : (
          item.status !== 'delivered' && (
            <a
              className="btn btn-primary"
              href="#delivery-handover"
              onClick={() => {
                setArrivalId(item.id)
                const panel = document.getElementById('delivery-handover')
                if (panel instanceof HTMLDetailsElement) panel.open = true
              }}
            >
              {condition
                ? l('Verify buyer OTP', 'खरीदार OTP सत्यापित करें')
                : l(
                    'At destination: start handover',
                    'गंतव्य पर: हैंडओवर शुरू करें',
                  )}
            </a>
          )
        )}
      </section>
      <IntelligenceCallout
        title={l('Delivery risk', 'डिलीवरी जोखिम')}
        insight={deliveryRiskCheck([item])}
      />
      <div className="dispatch-detail-layout">
        <section className="dispatch-panel">
          <details
            id="delivery-handover"
            className="dispatch-disclosure"
            open={['out_for_delivery', 'delivered'].includes(item.status)}
          >
            <summary>
              {l('Handover and buyer OTP', 'हैंडओवर और खरीदार OTP')}
            </summary>
            <p>
              {l(
                'Record condition at the destination before completing delivery.',
                'डिलीवरी पूरी करने से पहले गंतव्य पर स्थिति दर्ज करें।',
              )}
            </p>
            <DropoffConditionCard
              item={item}
              l={l}
              onSaved={() => {
                refresh()
                refreshCondition()
              }}
            />
            {!item.lotCode && (
              <p className="dispatch-inline-note">
                {l(
                  'No lot is linked. Photo and condition capture are unavailable for this delivery.',
                  'लॉट जुड़ा नहीं है। इस डिलीवरी में फ़ोटो और स्थिति कैप्चर उपलब्ध नहीं।',
                )}
              </p>
            )}
            {item.status !== 'delivered' && (
              <label className="field">
                <span>{l('Buyer delivery OTP', 'खरीदार डिलीवरी OTP')}</span>
                <div className="otp-field-row">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder={l('6-digit OTP', '6-अंकों का OTP')}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={busy || !otp.trim()}
                    onClick={() =>
                      guard(async () => {
                        const result = await logisticsService.verifyDeliveryOtp(
                          item.id,
                          otp,
                        )
                        setOtp('')
                        showToast(result.message)
                      })
                    }
                  >
                    {l('Verify and complete', 'सत्यापित और पूरा करें')}
                  </button>
                </div>
              </label>
            )}
          </details>
          <details className="dispatch-disclosure">
            <summary>{l('Audit and history', 'ऑडिट और इतिहास')}</summary>
            <Timeline items={item.timeline} language={language} />
          </details>
        </section>
        <aside className="dispatch-panel">
          <details className="dispatch-disclosure" open>
            <summary>{l('Delivery information', 'डिलीवरी जानकारी')}</summary>
            <InfoGrid
              items={[
                [l('Origin', 'मूल स्थान'), item.origin],
                [l('Destination', 'गंतव्य'), item.destination],
                [l('Orders', 'ऑर्डर'), item.orderRefs.join(', ')],
                [l('Shipment', 'शिपमेंट'), item.shipment],
                [
                  l('Vehicle', 'वाहन'),
                  item.vehicleId ?? l('Unassigned', 'वाहन तय नहीं'),
                ],
              ]}
            />
          </details>
          {item.issues.length > 0 && (
            <div className="dispatch-inline-note">
              {item.issues.map((v, i) => (
                <p key={i}>{v}</p>
              ))}
            </div>
          )}
          <details className="dispatch-disclosure">
            <summary>
              {l('Report issue or delay', 'समस्या या देरी दर्ज करें')}
            </summary>
            <label className="field">
              <span>{l('Issue details', 'समस्या विवरण')}</span>
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </label>
            <button
              className="btn btn-secondary"
              disabled={busy || !issue.trim()}
              onClick={() =>
                guard(async () => {
                  await logisticsService.reportDeliveryIssue(
                    item.id,
                    issue.trim(),
                  )
                  setIssue('')
                })
              }
            >
              {l('Report issue', 'समस्या दर्ज करें')}
            </button>
          </details>
          <details className="dispatch-disclosure">
            <summary>
              {l('Advanced status controls', 'उन्नत स्थिति नियंत्रण')}
            </summary>
            <div className="status-controls">
              {deliverySteps
                .filter((s) => s !== 'issue')
                .map((s) => (
                  <button
                    key={s}
                    disabled={busy || s === item.status}
                    onClick={() =>
                      guard(() => logisticsService.updateDelivery(item.id, s))
                    }
                  >
                    {labels.delivery[s][language === 'hi' ? 1 : 0]}
                  </button>
                ))}
            </div>
          </details>
        </aside>
      </div>
    </div>
  )
}
