import { BulkSupplyCard } from '../components/BulkSupplyCard'
import { bulkSupplies } from '../data/insights'

export function BulkSupplyPage() {
  return <div className="page"><div className="page-title-row"><div><span className="eyebrow">Verified farmer network</span><h1>Nearby bulk supply</h1><p>Consolidated availability previews across the Delhi NCR agricultural corridor.</p></div></div><div className="bulk-card-grid bulk-grid-wide">{bulkSupplies.map((supply) => <BulkSupplyCard key={supply.id} supply={supply} />)}</div><div className="gentle-banner"><span>🛡️</span><div><strong>Every supply figure is deterministic demo data.</strong><p>Live aggregation, reservations, and procurement workflows begin in Phase 2.</p></div></div></div>
}
