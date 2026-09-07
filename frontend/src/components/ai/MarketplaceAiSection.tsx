import type { ComponentProps } from 'react'
import { MarketplaceAiTrigger } from './MarketplaceAiTrigger'

type TriggerProps<T> = ComponentProps<typeof MarketplaceAiTrigger<T>>

/**
 * The standard page-level Kisan Intelligence slot: a marketplace section heading above one
 * shared AI trigger. Keeps the heading, spacing and eyebrow identical across Consumer, Bulk
 * and Logistics instead of every page re-writing the same wrapper markup.
 */
export function MarketplaceAiSection<T>({ title, eyebrow = 'Kisan Intelligence', subtitle, sectionClassName = '', ...trigger }: TriggerProps<T> & { title: string; eyebrow?: string; subtitle?: string; sectionClassName?: string }) {
  return (
    <section className={`section-block ai-section-slot ${sectionClassName}`.trim()}>
      <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{subtitle && <p className="ai-section-subtitle">{subtitle}</p>}</div></div>
      <MarketplaceAiTrigger<T> {...(trigger as TriggerProps<T>)} />
    </section>
  )
}
