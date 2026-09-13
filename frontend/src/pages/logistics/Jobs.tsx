import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { logisticsService } from '../../services/logisticsService'
import { pickupSequence } from '../../services/logisticsIntelligenceService'
import { useAsyncData } from '../../hooks/useAsyncData'
import { JobRows } from '../../components/logistics/JobRows'
import { IntelligenceCallout } from '../../components/logistics/DispatchUI'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { dispatchJobs } from './jobsModel'
import { ErrorState, useCopy } from './shared'
export function LogisticsJobsPage() {
  const { l } = useCopy()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const { data, loading, error } = useAsyncData(
    () => logisticsService.overview(),
    [],
    { live: true },
  )
  if (!data && loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState />
  const tab = ['pickups', 'deliveries', 'issues'].includes(
    params.get('tab') ?? '',
  )
    ? params.get('tab')!
    : 'pickups'
  const all = dispatchJobs(data.logisticsPickups, data.deliveries)
  const selected = all.filter((j) =>
    tab === 'issues' ? j.status === 'issue' : j.kind === tab,
  )
  const jobs = selected.filter(
    (j) =>
      (status === 'all' || j.status === status) &&
      `${j.id} ${j.produce} ${j.produceHi} ${j.location} ${j.party} ${j.vehicle ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const next = pickupSequence(data.logisticsPickups)[0]
  return (
    <div className="page logistics-page dispatch-page">
      <header className="page-title-row">
        <div>
          <h1>{l('Jobs', 'कार्य')}</h1>
          <p>
            {l(
              'Pickups, deliveries and exceptions',
              'पिकअप, डिलीवरी और समस्याएं',
            )}
          </p>
        </div>
        <span>
          {jobs.length} {l('jobs', 'कार्य')}
        </span>
      </header>
      <nav className="dispatch-tabs" aria-label={l('Job queues', 'कार्य कतार')}>
        {[
          ['pickups', l('Pickups', 'पिकअप')],
          ['deliveries', l('Deliveries', 'डिलीवरी')],
          ['issues', l('Issues', 'समस्याएं')],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            className={tab === id ? 'active' : ''}
            onClick={() => {
              setParams({ tab: id })
              setStatus('all')
            }}
          >
            {name}
            <span>
              {
                all.filter((j) =>
                  id === 'issues' ? j.status === 'issue' : j.kind === id,
                ).length
              }
            </span>
          </button>
        ))}
      </nav>
      <div className="dispatch-toolbar">
        <input
          aria-label={l('Search jobs', 'कार्य खोजें')}
          placeholder={l(
            'Search job, produce, location or vehicle',
            'कार्य, फसल, स्थान या वाहन खोजें',
          )}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label={l('Filter status', 'स्थिति फ़िल्टर')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">{l('All statuses', 'सभी स्थितियां')}</option>
          {[...new Set(selected.map((j) => j.status))].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      {tab === 'pickups' && next && (
        <IntelligenceCallout
          title={l('Pickup sequence', 'पिकअप क्रम')}
          insight={{
            title: 'Pickup sequence',
            verdict: l('Start with', 'पहले'),
            recommendation: `${next.item.id} · ${next.item.farm}`,
            reason: next.reason,
            confidence: 76,
            href: `/logistics/pickups/${next.item.id}`,
            ctaLabel: l('Open pickup', 'पिकअप खोलें'),
            factors: [
              { label: l('Status', 'स्थिति'), value: next.item.status.replaceAll('_', ' ') },
              { label: l('Window', 'समय'), value: next.item.pickupWindow },
              { label: l('Load', 'भार'), value: `${next.item.quantityKg} kg` },
              { label: l('Linked orders', 'जुड़े ऑर्डर'), value: String(next.item.orderRefs.length) },
            ],
          }}
        />
      )}
      <JobRows jobs={jobs} />
    </div>
  )
}
