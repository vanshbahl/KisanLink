import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { LogisticsInsight } from '../../services/logisticsIntelligenceService'

export function StatusPill({ status }: { status: string }) {
  const { language } = useLanguage()
  const names: Record<string, string> = {
    unassigned: 'वाहन तय नहीं',
    scheduled: 'तय',
    planned: 'नियोजित',
    assigned: 'वाहन तय',
    en_route: 'रास्ते में',
    in_transit: 'रास्ते में',
    active: 'सक्रिय',
    arrived: 'पहुंचा',
    at_hub: 'हब पर',
    out_for_delivery: 'डिलीवरी के लिए निकला',
    loaded: 'लोड हुआ',
    delivered: 'डिलीवरी हुई',
    completed: 'पूरा',
    available: 'उपलब्ध',
    issue: 'समस्या',
    maintenance: 'रखरखाव',
    forming: 'बन रहा है',
    viable: 'तैयार',
    created: 'बन गया',
  }
  return (
    <span className={`dispatch-status status-${status}`}>
      {language === 'hi'
        ? (names[status] ?? status.replaceAll('_', ' '))
        : status.replaceAll('_', ' ')}
    </span>
  )
}
export function Metrics({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="dispatch-metrics">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
export function ProgressSteps({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <ol className="dispatch-steps" aria-label="Progress">
      {steps.map((step, index) => (
        <li
          key={step}
          className={
            index < current ? 'done' : index === current ? 'current' : ''
          }
          aria-current={index === current ? 'step' : undefined}
        >
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  )
}
export function IntelligenceCallout({
  insight,
  title,
  action,
  busy,
}: {
  insight: LogisticsInsight
  title?: string
  /** Optional primary action rendered instead of the insight link. */
  action?: { label: string; onClick: () => void; disabled?: boolean }
  busy?: boolean
}) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const hi = language === 'hi'
  return (
    <section
      className={`ki-callout${open ? ' is-open' : ''}`}
      aria-label={title ?? 'Kisan Intelligence'}
    >
      <div className="ki-body">
        <span className="ki-badge">
          <Sparkles size={12} aria-hidden="true" />
          Kisan Intelligence
          {title && <em>{title}</em>}
        </span>
        <p className="ki-recommendation">
          {insight.verdict && (
            <strong className="ki-verdict">{insight.verdict}</strong>
          )}
          {insight.recommendation}
        </p>
        {insight.reason && <small className="ki-reason">{insight.reason}</small>}
      </div>
      <div className="ki-actions">
        {action ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={action.disabled || busy}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ) : (
          insight.href && (
            <Link className="btn btn-secondary" to={insight.href}>
              {hi ? 'खोलें' : (insight.ctaLabel ?? 'Open')}
            </Link>
          )
        )}
        <button
          type="button"
          className="ki-why"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {hi ? 'क्यों?' : 'Why?'}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="ki-detail">
          <dl>
            {insight.factors.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <small>
            {insight.note ? `${insight.note} ` : ''}
            {hi
              ? `विश्वास ${insight.confidence}%। दर्ज स्थिति से गणना, भविष्यवाणी मॉडल नहीं।`
              : `Confidence ${insight.confidence}%. Computed from recorded state, not a predictive model.`}
          </small>
        </div>
      )}
    </section>
  )
}
