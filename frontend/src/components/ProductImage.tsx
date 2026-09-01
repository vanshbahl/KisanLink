import { Sprout } from 'lucide-react'
import { useState } from 'react'
import type { ProduceListing } from '../types'

export function ProductImage({ imageSrc, alt, visual, size = 'card' }: { imageSrc?: string; alt: string; visual: ProduceListing['visual']; size?: 'card' | 'hero' | 'mini' }) {
  const [failed, setFailed] = useState(!imageSrc)
  return (
    <div className={`product-image-frame produce-${visual} produce-${size}`}>
      {failed ? <span className="product-image-fallback"><Sprout size={size === 'mini' ? 24 : 36} aria-hidden="true" /></span> : <img className="product-image" src={imageSrc} alt={alt} loading={size === 'hero' ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />}
    </div>
  )
}
