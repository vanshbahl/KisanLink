import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { usePrefersReducedMotion } from './useReducedMotion'
import { AiThinkingState } from './AiThinkingState'
import { revealMs, settleMs } from './aiTiming'

type AiPanelState = 'idle' | 'thinking' | 'result' | 'error'
type PortalRect = { top: number; left: number; width: number }

/** Keeps the elevated card fully on screen even when its anchor sits near the viewport edge. */
const VIEWPORT_MARGIN = 16
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

/**
 * Shared, role-neutral Kisan Intelligence interaction lifecycle used by every module.
 *
 * `run` is the real async AI/API call — we always await it and never fake completion before it
 * settles. The shared reveal window from `aiTiming` only ever adds a floor on top of that real
 * latency, so the processing state reads as deliberate instead of flashing by.
 *
 * While active, the card is elevated above a page-covering dark/blurred overlay. The overlay and
 * the active card are rendered as portal siblings of `document.body` — never nested — so the card
 * can never inherit the overlay's blur/dimming, regardless of where this trigger sits in the page.
 * The in-flow wrapper stays mounted as an invisible placeholder holding the floating card's
 * measured height, so returning to the normal page never reflows the surrounding layout.
 */
export function MarketplaceAiTrigger<T>({ idleLabel, idleHint, stages, run, renderResult, className = '', variant = 'card', brandLabel = 'Kisan Intelligence', thinkingLabel = 'Combining signals', errorTitle = 'Analysis could not complete', backLabel = 'Go back', errorFallback = 'This prototype analysis could not complete.' }: {
  idleLabel: string; idleHint?: string; stages: string[]; run: () => T | Promise<T>; renderResult: (result: T, reset: () => void) => ReactNode
  className?: string; variant?: 'card' | 'inline'; brandLabel?: string; thinkingLabel?: string; errorTitle?: string; backLabel?: string; errorFallback?: string
}) {
  const [state, setState] = useState<AiPanelState>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [rect, setRect] = useState<PortalRect | null>(null)
  const [reserved, setReserved] = useState<number | null>(null)

  const reduced = usePrefersReducedMotion()
  const revealTimer = useRef<number | null>(null)
  const settleTimer = useRef<number | null>(null)
  const releaseTimer = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  const clearTimers = () => { for (const ref of [revealTimer, settleTimer, releaseTimer]) { if (ref.current) window.clearTimeout(ref.current); ref.current = null } }
  useEffect(() => clearTimers, [])

  /**
   * Position the floating card over its own placeholder. The card is measured *after* render so a
   * tall result (or a stage list that grows the processing panel) is still clamped into view.
   */
  const measure = useCallback(() => {
    const anchor = wrapperRef.current?.getBoundingClientRect()
    if (!anchor) return
    const height = floatRef.current?.offsetHeight ?? anchor.height
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN
    setRect({ top: clamp(anchor.top, VIEWPORT_MARGIN, maxTop), left: anchor.left, width: anchor.width })
    if (height > 0) setReserved(height)
  }, [])

  // The overlay makes background scrolling meaningless, and locking it keeps the elevated card
  // welded to its placeholder. The scrollbar width is compensated so the page never shifts.
  useEffect(() => {
    if (!focused) return
    const { body } = document
    const gap = window.innerWidth - document.documentElement.clientWidth
    const previousPadding = body.style.paddingRight
    body.classList.add('ai-analysis-active')
    if (gap > 0) body.style.paddingRight = `${gap}px`
    return () => { body.classList.remove('ai-analysis-active'); body.style.paddingRight = previousPadding }
  }, [focused])

  useLayoutEffect(() => { if (focused) measure() }, [focused, state, measure])

  useEffect(() => {
    if (!focused) return
    const node = floatRef.current
    const observer = node && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(node!)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.addEventListener('scroll', measure, true)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('orientationchange', measure); window.removeEventListener('scroll', measure, true) }
  }, [focused, measure])

  const reset = useCallback(() => {
    clearTimers()
    busyRef.current = false
    setFocused(false)
    setState('idle')
    setResult(null)
    setError('')
    // Hold the reserved height across the return transition, then let the layout settle back.
    releaseTimer.current = window.setTimeout(() => setReserved(null), reduced ? 0 : 320)
  }, [reduced])

  // Escape dismisses a finished insight, whether it is still elevated or has settled back into
  // the page. An in-flight analysis is left alone: the underlying call is already running and
  // cancelling mid-way would strand it.
  useEffect(() => {
    if (state !== 'result' && state !== 'error') return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') reset() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, reset])

  const start = async () => {
    if (busyRef.current) return
    busyRef.current = true
    clearTimers()
    const anchor = wrapperRef.current?.getBoundingClientRect()
    if (anchor) setRect({ top: anchor.top, left: anchor.left, width: anchor.width })
    setError('')
    setState('thinking')
    setFocused(true)
    const started = performance.now()
    // Settle back onto the page shortly after the result lands, so the reveal reads as one motion.
    const land = (apply: () => void) => {
      const remaining = Math.max(0, revealMs(reduced) - (performance.now() - started))
      revealTimer.current = window.setTimeout(() => {
        apply()
        settleTimer.current = window.setTimeout(() => setFocused(false), settleMs(reduced))
        busyRef.current = false
      }, remaining)
    }
    try { const computed = await Promise.resolve(run()); land(() => { setResult(computed); setState('result') }) }
    catch (cause) { land(() => { setError(cause instanceof Error ? cause.message : errorFallback); setState('error') }) }
  }

  const surfaceClassName = `ai-surface ai-surface-${state} ai-surface-${variant}${focused ? ' ai-surface-focused' : ''} ${className}`.trim()
  const content = <>
    {state === 'idle' && <button type="button" className="ai-trigger" onClick={start}><span className="ai-trigger-icon"><Sparkles size={17} /></span><span className="ai-trigger-copy"><small>{brandLabel}</small><strong>{idleHint ?? idleLabel}</strong></span><span className="ai-trigger-action">{idleLabel}<ArrowRight size={15} /></span></button>}
    {state === 'thinking' && <AiThinkingState stages={stages} brandLabel={brandLabel} thinkingLabel={thinkingLabel} durationMs={revealMs(reduced)} />}
    {state === 'result' && result !== null && renderResult(result, reset)}
    {state === 'error' && <div className="ai-error-state" role="alert"><AlertCircle size={20} /><div><strong>{errorTitle}</strong><p>{error}</p></div><button type="button" className="btn btn-secondary" onClick={reset}>{backLabel}</button></div>}
  </>

  return <>
    {focused && createPortal(<div className="ai-analysis-overlay" aria-hidden="true" />, document.body)}
    <div ref={wrapperRef} className={`${surfaceClassName}${focused ? ' ai-surface-placeholder' : ''}`} style={reserved ? { minHeight: reserved } : undefined}>{!focused && content}</div>
    {focused && rect && createPortal(<div ref={floatRef} className={surfaceClassName} style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}>{content}</div>, document.body)}
  </>
}
