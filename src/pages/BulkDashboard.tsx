import { Boxes, ClipboardCheck, Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BulkSupplyCard } from '../components/BulkSupplyCard'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { MetricCard } from '../components/MetricCard'
import { useAsyncData } from '../hooks/useAsyncData'
import { bulkService } from '../services/bulkService'

export function BulkDashboard() {
  const { data, loading, error } = useAsyncData(() => bulkService.getDashboard())
  if (loading) return <DashboardSkeleton />
  if (!data || error) return <div className="error-panel"><h2>Procurement overview unavailable</h2><p>{error}</p></div>
  return (
    <div className="page bulk-page">
      <section className="bulk-hero"><div><span className="eyebrow">Tuesday · Delhi NCR</span><h1>Welcome,<br />FreshKart Procurement</h1><p>Nearby verified supply, ready for your next procurement cycle.</p><Link className="btn btn-light btn-large" to="/bulk/requests"><Plus size={19} /> New requirement</Link></div><div className="bulk-hero-stat"><span>Potential savings this month</span><strong>₹42,600</strong><small>vs. wholesale benchmark</small><i><TrendingUp size={16} /> 14.8% lower landed cost</i></div></section>
      <section className="bulk-metrics"><MetricCard icon={ClipboardCheck} label="Today’s requirement" value={data.todayRequirement} tone="green" hint="Tomatoes · Grade A" /><MetricCard icon={ClipboardCheck} label="Active procurement requests" value={data.activeRequests} tone="amber" hint="1 needs attention" /><MetricCard icon={Boxes} label="Available nearby supply" value={data.nearbySupply} tone="soil" hint="Within 120 km" /></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Verified nearby network</span><h2>Supply ready to source</h2></div><Link to="/bulk/supply">View all</Link></div><div className="bulk-card-grid">{data.supplies.map((supply) => <BulkSupplyCard key={supply.id} supply={supply} />)}</div></section>
      <article className="procurement-banner"><div><span className="eyebrow">Next phase preview</span><h2>Need a custom quantity?</h2><p>Soon you’ll be able to post a requirement and receive an aggregated plan from nearby farmer clusters.</p></div><Link className="btn btn-secondary" to="/bulk/requests">Preview procurement requests</Link></article>
    </div>
  )
}
