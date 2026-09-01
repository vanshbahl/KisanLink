import { ArrowDown, IndianRupee, Route, Sprout } from 'lucide-react'

export function PriceTransparency({ compact = false }: { compact?: boolean }) {
  return (
    <article className={`price-transparency ${compact ? 'price-compact' : ''}`}>
      <div className="price-heading">
        <div>
          <span className="eyebrow">Transparent by design</span>
          <h2>Know where every rupee goes</h2>
        </div>
        <span className="price-icon"><IndianRupee size={21} /></span>
      </div>
      <div className="price-flow">
        <div className="price-total"><span>Consumer pays</span><strong>₹31</strong><small>per kg</small></div>
        <ArrowDown className="price-arrow" size={18} />
        <div className="price-splits">
          <div><span className="split-icon farmer"><Sprout size={18} /></span><p>Farmer receives</p><strong>₹28</strong></div>
          <div><span className="split-icon logistics"><Route size={18} /></span><p>Logistics</p><strong>₹2</strong></div>
          <div><span className="split-icon platform">K</span><p>Platform</p><strong>₹1</strong></div>
        </div>
      </div>
      <p className="price-note">No hidden mandi commissions. 90% goes directly to the farmer.</p>
    </article>
  )
}
