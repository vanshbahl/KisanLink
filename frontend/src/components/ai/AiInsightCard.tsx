import type { ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'

/** Layered Kisan Intelligence result: a branded header with a calm evidence surface. */
export function AiInsightCard({ eyebrow = 'Kisan Intelligence', children, footer = 'Recommendation uses the marketplace signals available in this prototype.', onClose }: { eyebrow?: string; children: ReactNode; footer?: string; onClose?: () => void }) {
  return (
    <div className="ai-result-card">
      <div className="ai-result-head">
        <Sparkles size={16} /><span>{eyebrow}</span>
        {onClose && <button type="button" className="ai-result-close" onClick={onClose} aria-label="Close"><X size={15} /></button>}
      </div>
      <div className="ai-result-body">{children}<p className="ai-disclaimer">{footer}</p></div>
    </div>
  )
}
