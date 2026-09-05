import type { ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'

/** Elevated gradient result surface. Only AI result states use this treatment — normal cards stay normal. */
export function AiInsightCard({ eyebrow, children, footer, onClose }: { eyebrow?: string; children: ReactNode; footer?: string; onClose?: () => void }) {
  const { language } = useLanguage()
  return (
    <div className="ai-result-card">
      <div className="ai-result-glow" aria-hidden="true" />
      <div className="ai-result-head">
        <Sparkles size={16} /><span>{eyebrow ?? aiText(language, 'kisanIntelligence')}</span>
        {onClose && <button type="button" className="ai-result-close" onClick={onClose} aria-label="Close"><X size={15} /></button>}
      </div>
      <div className="ai-result-body">{children}</div>
      <p className="ai-disclaimer">{footer ?? aiText(language, 'disclaimerShort')}</p>
    </div>
  )
}
