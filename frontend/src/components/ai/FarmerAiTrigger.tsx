import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { AiThinkingState } from './AiThinkingState'
import { usePrefersReducedMotion } from './useReducedMotion'

type AiPanelState = 'idle' | 'thinking' | 'result'

/**
 * Full idle -> thinking -> result lifecycle for one contextual "Kisan Intelligence" action.
 * `run` is a synchronous, deterministic computation — the thinking delay is purely for feel,
 * never used to hide real latency, and is skipped almost entirely for prefers-reduced-motion.
 */
export function FarmerAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className = '', variant = 'card' }: {
  idleLabel: string
  idleHint?: string
  stages: string[]
  run: () => T
  renderResult: (result: T, reset: () => void) => ReactNode
  className?: string
  variant?: 'card' | 'inline'
}) {
  const { language } = useLanguage()
  const [state, setState] = useState<AiPanelState>('idle')
  const [result, setResult] = useState<T | null>(null)
  const reduced = usePrefersReducedMotion()
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const start = () => {
    setState('thinking')
    const duration = reduced ? 120 : 1250
    timer.current = window.setTimeout(() => { setResult(run()); setState('result') }, duration)
  }
  const reset = () => { if (timer.current) window.clearTimeout(timer.current); setState('idle'); setResult(null) }

  return (
    <div className={`ai-surface ai-surface-${state} ai-surface-${variant} ${className}`}>
      {state === 'idle' && (
        <button type="button" className="ai-trigger" onClick={start}>
          <span className="ai-trigger-icon"><Sparkles size={17} /></span>
          <span className="ai-trigger-copy"><small>{aiText(language, 'kisanIntelligence')}</small><strong>{idleHint ?? idleLabel}</strong></span>
          <span className="ai-trigger-action">{idleLabel}<ArrowRight size={15} /></span>
        </button>
      )}
      {state === 'thinking' && <AiThinkingState stages={stages} />}
      {state === 'result' && result !== null && renderResult(result, reset)}
    </div>
  )
}
