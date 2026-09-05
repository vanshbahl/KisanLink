import type { ReactNode } from 'react'

export interface ReasoningFactor {
  icon: ReactNode
  label: string
  value: string
}

/** Small evidence chips used by "See why" / factor breakdowns. Stagger in via CSS animation-delay. */
export function AiReasoningFactors({ factors }: { factors: ReasoningFactor[] }) {
  return (
    <div className="ai-factor-grid">
      {factors.map((factor, index) => (
        <div className="ai-factor" key={factor.label} style={{ animationDelay: `${index * 60}ms` }}>
          <span className="ai-factor-icon">{factor.icon}</span>
          <div><small>{factor.label}</small><strong>{factor.value}</strong></div>
        </div>
      ))}
    </div>
  )
}
