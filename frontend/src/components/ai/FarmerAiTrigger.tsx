import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { AiThinkingState } from './AiThinkingState'
import { usePrefersReducedMotion } from './useReducedMotion'

type AiPanelState = 'idle' | 'thinking' | 'result' | 'error'
const MIN_AI_REVEAL_MS = 1300

/**
 * Full idle -> thinking -> result lifecycle for one contextual "Kisan Intelligence" action.
 * `run` is a synchronous, deterministic computation — the thinking delay is purely for feel,
 * never used to hide real latency, and is skipped almost entirely for prefers-reduced-motion.
 */
export function FarmerAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className = '', variant = 'card' }: {
  idleLabel: string
  idleHint?: string
  stages: string[]
  run: () => T | Promise<T>
  renderResult: (result: T, reset: () => void) => ReactNode
  className?: string
  variant?: 'card' | 'inline'
}) {
  const { language } = useLanguage()
  const [state, setState] = useState<AiPanelState>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const timer = useRef<number | null>(null)
  const focusTimer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); if (focusTimer.current) window.clearTimeout(focusTimer.current) }, [])
  useEffect(() => {
    document.body.classList.toggle('ai-analysis-active', focused)
    return () => document.body.classList.remove('ai-analysis-active')
  }, [focused])

  const start = async () => {
    setState('thinking')
    setFocused(true)
    setError('')
    const started = performance.now()
    try {
      const computed = await Promise.resolve(run())
      const minimum = reduced ? 80 : MIN_AI_REVEAL_MS
      const remaining = Math.max(0, minimum - (performance.now() - started))
      timer.current = window.setTimeout(() => {
        setResult(computed)
        setState('result')
        focusTimer.current = window.setTimeout(() => setFocused(false), reduced ? 60 : 520)
      }, remaining)
    } catch (cause) {
      const remaining = Math.max(0, (reduced ? 80 : MIN_AI_REVEAL_MS) - (performance.now() - started))
      timer.current = window.setTimeout(() => {
        setError(cause instanceof Error ? cause.message : aiText(language, 'disclaimerShort'))
        setState('error')
        focusTimer.current = window.setTimeout(() => setFocused(false), reduced ? 60 : 520)
      }, remaining)
    }
  }
  const reset = () => { if (timer.current) window.clearTimeout(timer.current); if (focusTimer.current) window.clearTimeout(focusTimer.current); setFocused(false); setState('idle'); setResult(null) }

  return (
    <>
    {focused && createPortal(<div className="ai-analysis-overlay" aria-hidden="true" />, document.body)}
    <div className={`ai-surface ai-surface-${state} ai-surface-${variant}${focused ? ' ai-surface-focused' : ''} ${className}`}>
      {state === 'idle' && (
        <button type="button" className="ai-trigger" onClick={start}>
          <span className="ai-trigger-icon"><Sparkles size={17} /></span>
          <span className="ai-trigger-copy"><small>{aiText(language, 'kisanIntelligence')}</small><strong>{idleHint ?? idleLabel}</strong></span>
          <span className="ai-trigger-action">{idleLabel}<ArrowRight size={15} /></span>
        </button>
      )}
      {state === 'thinking' && <AiThinkingState stages={stages} />}
      {state === 'result' && result !== null && renderResult(result, reset)}
      {state === 'error' && <div className="ai-error-state" role="alert"><AlertCircle size={20} /><div><strong>{language === 'hi' ? 'विश्लेषण पूरा नहीं हुआ' : 'Analysis could not complete'}</strong><p>{error}</p></div><button type="button" className="btn btn-secondary" onClick={reset}>{language === 'hi' ? 'वापस जाएं' : 'Go back'}</button></div>}
    </div>
    </>
  )
}
