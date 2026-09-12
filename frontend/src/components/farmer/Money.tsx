import { money } from '../../i18n/farmer'

/**
 * One consistent treatment for every rupee amount in the farmer module.
 *
 * Money is the second thing a farmer looks for after the crop, so it gets a single
 * unmistakable style rather than inheriting whatever the surrounding card happened to use.
 * `size` is about hierarchy, not decoration: `hero` is the one number a screen is about.
 */
export function Money({ value, size = 'md', tone = 'default', unit }: {
  value: number
  size?: 'sm' | 'md' | 'lg' | 'hero'
  tone?: 'default' | 'good' | 'muted'
  /** Rendered small and attached, e.g. "/किलो". */
  unit?: string
}) {
  return (
    <strong className={`f-money f-money-${size} f-money-${tone}`}>
      {money(value)}
      {unit && <small>{unit}</small>}
    </strong>
  )
}
