import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { prettyWhen } from '../maps/CorridorRouteMap'
import type { DispatchJob } from '../../pages/logistics/jobsModel'
import { StatusPill } from './DispatchUI'
export function JobRows({ jobs }: { jobs: DispatchJob[] }) {
  const { language } = useLanguage()
  const hi = language === 'hi'
  return (
    <div className="dispatch-table">
      <div className="dispatch-job-grid dispatch-table-head" aria-hidden="true">
        {(hi
          ? ['कार्य', 'फसल', 'स्थान', 'मात्रा', 'समय / ETA', 'वाहन', 'स्थिति']
          : [
              'Job',
              'Produce',
              'Location',
              'Qty',
              'Window / ETA',
              'Vehicle',
              'Status',
            ]
        ).map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {jobs.map((job) => (
        <Link
          className="dispatch-job-grid dispatch-job"
          key={`${job.kind}-${job.id}`}
          to={`/logistics/${job.kind}/${job.id}`}
        >
          <span className="job-id">
            <strong>{job.id}</strong>
            <small>
              {job.kind === 'pickups'
                ? hi
                  ? 'पिकअप'
                  : 'Pickup'
                : hi
                  ? 'डिलीवरी'
                  : 'Delivery'}
            </small>
          </span>
          <span className="job-produce">
            {hi ? job.produceHi : job.produce}
          </span>
          <span className="job-place">
            {job.location}
            <small>{job.party}</small>
          </span>
          <span className="job-qty">
            {job.quantityKg.toLocaleString('en-IN')} kg
          </span>
          <span className="job-window">{prettyWhen(job.window)}</span>
          <span className="job-vehicle">
            {job.vehicle ?? (hi ? 'वाहन तय नहीं' : 'Unassigned')}
          </span>
          <StatusPill status={job.status} />
        </Link>
      ))}
      {!jobs.length && (
        <p className="dispatch-empty">
          {hi
            ? 'इस कतार में कोई कार्य नहीं। फ़िल्टर बदलें या बाद में देखें।'
            : 'No jobs in this queue. Change the filters or check back when work arrives.'}
        </p>
      )}
    </div>
  )
}
