import { ArrowRight, BadgeCheck, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BulkSupply } from '../types'
import { ProduceArtwork } from './ProduceArtwork'

export function BulkSupplyCard({ supply }: { supply: BulkSupply }) {
  return (
    <article className="bulk-card">
      <ProduceArtwork emoji={supply.emoji} visual={supply.visual} size="mini" />
      <div className="bulk-card-content">
        <div className="bulk-card-title"><h3>{supply.product}</h3><span><BadgeCheck size={14} />Verified supply</span></div>
        <p><MapPin size={15} />{supply.locations}</p>
        <div className="bulk-amount"><div><span>Available supply</span><strong>{supply.availableTonnes} tonnes</strong></div><div><span>Starting</span><strong>₹{supply.startingPrice}/kg</strong></div></div>
        <div className="bulk-meta"><span>MOQ {supply.moqKg} kg</span><span><Users size={14} /> {supply.farmerCount} farmers</span></div>
        <Link to={`/bulk/supply/${supply.id}`} className="btn btn-secondary">View supply <ArrowRight size={16} /></Link>
      </div>
    </article>
  )
}
