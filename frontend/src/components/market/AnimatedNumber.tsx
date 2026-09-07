import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../ai/useReducedMotion'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Tweens between values so a market's economics visibly *move* when demand changes, rather
 * than snapping to a new figure. Reduced-motion users get the final value immediately.
 */
export function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', durationMs = 780 }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; durationMs?: number
}) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduced) { fromRef.current = value; setShown(value); return }
    const from = fromRef.current
    if (from === value) return
    const started = performance.now()
    const step = (stamp: number) => {
      const progress = Math.min(1, (stamp - started) / durationMs)
      setShown(from + (value - from) * easeOutCubic(progress))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
      else fromRef.current = value
    }
    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [value, durationMs, reduced])

  const safe = Number.isFinite(shown) ? shown : 0
  return <>{prefix}{safe.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>
}
