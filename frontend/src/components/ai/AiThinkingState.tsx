import { useEffect, useState } from 'react'
import { Check, Leaf, ShoppingBasket, Sprout, Store, Truck } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { usePrefersReducedMotion } from './useReducedMotion'
import { AI_REVEAL_MS } from './aiTiming'

const SIGNAL_ICONS = [Sprout, ShoppingBasket, Store, Truck, Leaf]

/**
 * Staged intelligence animation shown between the AI trigger and the result surface.
 *
 * Stages are paced across the whole reveal window so the last signal lands just as the result
 * is ready — never racing ahead and leaving a static panel for the rest of the wait.
 */
export function AiThinkingState({ stages, brandLabel, thinkingLabel, durationMs = AI_REVEAL_MS }: { stages: string[]; brandLabel?: string; thinkingLabel?: string; durationMs?: number }) {
  const { language } = useLanguage()
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const count = Math.max(1, stages.length)
  // Leave the final stage a full beat on screen before the result replaces it.
  const step = Math.max(240, Math.round(durationMs / (count + 0.6)))

  useEffect(() => {
    setIndex(0)
    if (reduced || count <= 1) return
    const id = window.setInterval(() => setIndex((current) => Math.min(current + 1, count - 1)), step)
    return () => window.clearInterval(id)
  }, [reduced, count, step])

  const activeText = reduced ? stages[count - 1] : stages[Math.min(index, count - 1)]

  return (
    <div className="ai-thinking" role="status" aria-live="polite">
      <div className="ai-thinking-head"><span>{brandLabel ?? aiText(language, 'kisanIntelligence')}</span><strong>{thinkingLabel ?? aiText(language, 'combiningSignals')}</strong></div>
      <div className="ai-signal-scan" aria-hidden="true">
        <div className="ai-scan-rail"><i style={{ width: `${((index + 1) / count) * 100}%`, transitionDuration: reduced ? '0ms' : `${step}ms` }} /></div>
        {stages.map((stage, nodeIndex) => {
          const Icon = SIGNAL_ICONS[nodeIndex % SIGNAL_ICONS.length]
          return <span className={nodeIndex <= index ? 'active' : ''} key={`${stage}-${nodeIndex}`}><Icon size={14} />{nodeIndex < index && <Check size={10} />}</span>
        })}
      </div>
      <p className="ai-thinking-text" key={activeText}>{activeText}</p>
    </div>
  )
}
