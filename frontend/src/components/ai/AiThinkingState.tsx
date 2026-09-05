import { useEffect, useState } from 'react'
import { Check, ShoppingBasket, Sprout, Store, Truck } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { usePrefersReducedMotion } from './useReducedMotion'

/** Staged intelligence animation shown between the AI trigger and the result surface. */
export function AiThinkingState({ stages }: { stages: string[] }) {
  const { language } = useLanguage()
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduced || stages.length <= 1) return
    const step = Math.max(280, Math.round(1200 / stages.length))
    const id = window.setInterval(() => setIndex((current) => Math.min(current + 1, stages.length - 1)), step)
    return () => window.clearInterval(id)
  }, [reduced, stages.length])

  const activeText = reduced ? stages[stages.length - 1] : stages[index]

  return (
    <div className="ai-thinking" role="status" aria-live="polite">
      <div className="ai-thinking-head"><span>{aiText(language, 'kisanIntelligence')}</span><strong>{aiText(language, 'combiningSignals')}</strong></div>
      <div className="ai-signal-scan" aria-hidden="true">
        <div className="ai-scan-rail"><i style={{ width: `${((index + 1) / stages.length) * 100}%` }} /></div>
        {[Sprout, ShoppingBasket, Store, Truck].map((Icon, nodeIndex) => <span className={nodeIndex <= index ? 'active' : ''} key={nodeIndex}><Icon size={14} />{nodeIndex < index && <Check size={10} />}</span>)}
      </div>
      <p className="ai-thinking-text">{activeText}</p>
    </div>
  )
}
