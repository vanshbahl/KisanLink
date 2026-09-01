import type { ProduceListing } from '../types'

export function ProduceArtwork({ emoji, visual, size = 'card' }: { emoji: string; visual: ProduceListing['visual']; size?: 'card' | 'hero' | 'mini' }) {
  return (
    <div className={`produce-art produce-${visual} produce-${size}`} aria-hidden="true">
      <span className="produce-orbit orbit-one" />
      <span className="produce-orbit orbit-two" />
      <span className="produce-emoji">{emoji}</span>
      <span className="produce-leaf" />
    </div>
  )
}
