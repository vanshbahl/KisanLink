import type { ProduceListing } from '../types'

export function ProduceArtwork({ imageSrc, alt, visual, size = 'card' }: { imageSrc: string; alt: string; visual: ProduceListing['visual']; size?: 'card' | 'hero' | 'mini' }) {
  return (
    <div className={`produce-art produce-${visual} produce-${size}`} aria-hidden="true">
      <span className="produce-orbit orbit-one" />
      <span className="produce-orbit orbit-two" />
      <img className="produce-image" src={imageSrc} alt={alt} loading={size === 'hero' ? 'eager' : 'lazy'} decoding="async" />
      <span className="produce-leaf" />
    </div>
  )
}
