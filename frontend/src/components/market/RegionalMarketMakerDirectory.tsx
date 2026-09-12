import { MapPinned } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MarketView } from '../../services/marketMakerService'
import { MultiCropCorridorCard } from './MultiCropCorridorCard'

export function RegionalMarketMakerDirectory({ views }: { views: MarketView[] }) {
  const regionalViews = useMemo(() => views.filter((view) => view.board.isMultiCrop), [views])
  const [selectedId, setSelectedId] = useState('')
  if (!regionalViews.length) return null

  const selected = regionalViews.find((view) => view.board.id === selectedId) ?? regionalViews[0]

  return (
    <section className="section-block" aria-labelledby="regional-market-maker-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><MapPinned size={15} /> Regional Market Maker</span>
          <h2 id="regional-market-maker-heading">NCR multi-crop corridor directory</h2>
          <p>Compare live pooled corridors without changing the existing Sonipat single-crop market.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }} role="list" aria-label="Regional corridors">
        {regionalViews.map((view) => (
          <button
            key={view.board.id}
            type="button"
            className={view.board.id === selected.board.id ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSelectedId(view.board.id)}
          >
            {view.board.regions?.[0]?.name ?? view.board.corridor}
          </button>
        ))}
      </div>
      <MultiCropCorridorCard board={selected.board} math={selected.math} />
    </section>
  )
}
