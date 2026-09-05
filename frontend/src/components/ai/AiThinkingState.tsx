import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { usePrefersReducedMotion } from './useReducedMotion'

/** Staged intelligence animation shown between the AI trigger and the result surface. */
export function AiThinkingState({ stages }: { stages: string[] }) {
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
      <div className="ai-thinking-glow" aria-hidden="true" />
      <span className="ai-thinking-icon"><Sparkles size={18} /></span>
      <p className="ai-thinking-text">{activeText}</p>
      <div className="ai-thinking-dots" aria-hidden="true"><i /><i /><i /></div>
    </div>
  )
}
