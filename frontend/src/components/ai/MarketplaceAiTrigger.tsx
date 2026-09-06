import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { usePrefersReducedMotion } from './useReducedMotion'
import { AiThinkingState } from './AiThinkingState'

type AiPanelState = 'idle' | 'thinking' | 'result' | 'error'
type PortalRect = { top: number; left: number; width: number; height: number }
const MIN_AI_REVEAL_MS = 3500

/** Shared, role-neutral Kisan Intelligence interaction lifecycle. */
export function MarketplaceAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className = '', variant = 'card', brandLabel = 'Kisan Intelligence', thinkingLabel = 'Combining signals', errorTitle = 'Analysis could not complete', backLabel = 'Go back', errorFallback = 'This prototype analysis could not complete.' }: {
  idleLabel: string; idleHint?: string; stages: string[]; run: () => T | Promise<T>; renderResult: (result: T, reset: () => void) => ReactNode
  className?: string; variant?: 'card' | 'inline'; brandLabel?: string; thinkingLabel?: string; errorTitle?: string; backLabel?: string; errorFallback?: string
}) {
  const [state, setState] = useState<AiPanelState>('idle'); const [result, setResult] = useState<T | null>(null); const [error, setError] = useState(''); const [focused, setFocused] = useState(false); const [portalRect, setPortalRect] = useState<PortalRect | null>(null)
  const reduced = usePrefersReducedMotion(); const timer = useRef<number | null>(null); const focusTimer = useRef<number | null>(null); const wrapperRef = useRef<HTMLDivElement>(null); const busyRef = useRef(false)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); if (focusTimer.current) window.clearTimeout(focusTimer.current) }, [])
  useEffect(() => { document.body.classList.toggle('ai-analysis-active', focused); return () => document.body.classList.remove('ai-analysis-active') }, [focused])
  useEffect(() => { if (!focused) return; const measure = () => { const r = wrapperRef.current?.getBoundingClientRect(); if (r) setPortalRect({ top: r.top, left: r.left, width: r.width, height: r.height }) }; window.addEventListener('resize', measure); window.addEventListener('orientationchange', measure); return () => { window.removeEventListener('resize', measure); window.removeEventListener('orientationchange', measure) } }, [focused])
  const reset = () => { if (timer.current) window.clearTimeout(timer.current); if (focusTimer.current) window.clearTimeout(focusTimer.current); busyRef.current = false; setFocused(false); setState('idle'); setResult(null) }
  const start = async () => {
    if (busyRef.current) return; busyRef.current = true
    const r = wrapperRef.current?.getBoundingClientRect(); if (r) setPortalRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    setState('thinking'); setFocused(true); setError(''); const started = performance.now()
    try { const computed = await Promise.resolve(run()); const remaining = Math.max(0, (reduced ? 80 : MIN_AI_REVEAL_MS) - (performance.now() - started)); timer.current = window.setTimeout(() => { setResult(computed); setState('result'); focusTimer.current = window.setTimeout(() => setFocused(false), reduced ? 60 : 520); busyRef.current = false }, remaining) }
    catch (cause) { const remaining = Math.max(0, (reduced ? 80 : MIN_AI_REVEAL_MS) - (performance.now() - started)); timer.current = window.setTimeout(() => { setError(cause instanceof Error ? cause.message : errorFallback); setState('error'); focusTimer.current = window.setTimeout(() => setFocused(false), reduced ? 60 : 520); busyRef.current = false }, remaining) }
  }
  const surfaceClassName = `ai-surface ai-surface-${state} ai-surface-${variant}${focused ? ' ai-surface-focused' : ''} ${className}`
  const content = <>{state === 'idle' && <button type="button" className="ai-trigger" onClick={start}><span className="ai-trigger-icon"><Sparkles size={17} /></span><span className="ai-trigger-copy"><small>{brandLabel}</small><strong>{idleHint ?? idleLabel}</strong></span><span className="ai-trigger-action">{idleLabel}<ArrowRight size={15} /></span></button>}{state === 'thinking' && <AiThinkingState stages={stages} brandLabel={brandLabel} thinkingLabel={thinkingLabel} />}{state === 'result' && result !== null && renderResult(result, reset)}{state === 'error' && <div className="ai-error-state" role="alert"><AlertCircle size={20} /><div><strong>{errorTitle}</strong><p>{error}</p></div><button type="button" className="btn btn-secondary" onClick={reset}>{backLabel}</button></div>}</>
  return <>{focused && createPortal(<div className="ai-analysis-overlay" aria-hidden="true" />, document.body)}<div ref={wrapperRef} className={surfaceClassName} style={focused && portalRect ? { visibility: 'hidden', minHeight: portalRect.height } : undefined}>{!focused && content}</div>{focused && portalRect && createPortal(<div className={surfaceClassName} style={{ position: 'fixed', top: portalRect.top, left: portalRect.left, width: portalRect.width }}>{content}</div>, document.body)}</>
}
