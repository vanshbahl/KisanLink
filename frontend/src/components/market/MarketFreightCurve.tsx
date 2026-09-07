import { useEffect, useState } from 'react'
import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'

/**
 * The single graphic that explains the whole feature: delivered price per kilogram against
 * committed volume. The curve is literally `floor + fixedTrip/kg + fee`, so it falls steeply
 * and then flattens. Where it crosses the price buyers will switch at is the break-even
 * volume — the same number the engine computes. Nothing here is fitted or smoothed.
 *
 * On a phone the plot is re-proportioned rather than scaled down: a narrower, taller viewBox
 * keeps every label readable instead of shrinking a laptop chart into illegibility.
 */
export function MarketFreightCurve({ board, math }: { board: MarketMakerBoard; math: MarketMath }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const onChange = () => setNarrow(query.matches)
    onChange()
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const W = narrow ? 360 : 660
  const H = narrow ? 300 : 260
  const PAD = narrow ? { top: 16, right: 14, bottom: 30, left: 16 } : { top: 18, right: 18, bottom: 34, left: 46 }

  const yMax = board.buyerCurrentPerKg + 4
  const yMin = board.farmerFloorPerKg
  const xMax = Math.max(math.capacityKg || 0, math.thresholdKg || 0, math.committedKg) * 1.02 || 400
  const delivered = (x: number) => board.farmerFloorPerKg + math.freightTotal / Math.max(1, x) + math.platformFeePerKg
  const xMin = Math.max(1, math.freightTotal / Math.max(0.01, yMax - board.farmerFloorPerKg - math.platformFeePerKg))

  const sx = (x: number) => PAD.left + ((x - xMin) / Math.max(1, xMax - xMin)) * (W - PAD.left - PAD.right)
  const sy = (y: number) => PAD.top + (1 - (y - yMin) / Math.max(0.01, yMax - yMin)) * (H - PAD.top - PAD.bottom)
  const clampX = (x: number) => Math.min(xMax, Math.max(xMin, x))

  const samples = Array.from({ length: 90 }, (_, index) => xMin + ((xMax - xMin) * index) / 89)
  const path = samples.map((x, index) => `${index === 0 ? 'M' : 'L'}${sx(x).toFixed(1)} ${sy(delivered(x)).toFixed(1)}`).join(' ')

  const thresholdX = Number.isFinite(math.thresholdKg) ? clampX(math.thresholdKg) : xMax
  const liveX = clampX(Math.max(math.committedKg, xMin))
  const liveY = delivered(Math.max(math.committedKg, xMin))
  const ceilingY = sy(board.buyerCeilingPerKg)

  // Region where the trip pays for itself: past break-even and under the switching price.
  const viableRegion = `M${sx(thresholdX)} ${ceilingY} L${sx(xMax)} ${ceilingY} L${sx(xMax)} ${sy(yMin)} L${sx(thresholdX)} ${sy(yMin)} Z`
  const ticks = [xMin, thresholdX, xMax].filter((value, index, list) => list.indexOf(value) === index)

  return (
    <figure className={`mm-curve ${math.viable ? 'is-viable' : ''} ${narrow ? 'is-narrow' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={l(`Delivered price falls as committed volume rises, crossing the buyer switching price at around ${math.thresholdKg} kg`, `पक्की मात्रा बढ़ने पर डिलीवरी कीमत घटती है और लगभग ${math.thresholdKg} किलो पर खरीदार की सीमा तक आती है`)}>
        <path className="mm-curve-region" d={viableRegion} />
        <line className="mm-curve-axis" x1={PAD.left} y1={sy(yMin)} x2={W - PAD.right} y2={sy(yMin)} />

        <g className="mm-curve-ref">
          <line x1={PAD.left} y1={sy(board.buyerCurrentPerKg)} x2={W - PAD.right} y2={sy(board.buyerCurrentPerKg)} strokeDasharray="2 5" />
          <text x={W - PAD.right} y={sy(board.buyerCurrentPerKg) - 7} textAnchor="end">{l('Today', 'आज')} ₹{board.buyerCurrentPerKg}</text>
        </g>
        <g className="mm-curve-ceiling">
          <line x1={PAD.left} y1={ceilingY} x2={W - PAD.right} y2={ceilingY} strokeDasharray="7 6" />
          <text x={PAD.left + 2} y={ceilingY + 16}>{l('Buyer limit', 'खरीदार सीमा')} ₹{board.buyerCeilingPerKg}</text>
        </g>
        <g className="mm-curve-floor">
          <line x1={PAD.left} y1={sy(board.farmerFloorPerKg)} x2={W - PAD.right} y2={sy(board.farmerFloorPerKg)} />
          <text x={PAD.left + 2} y={sy(board.farmerFloorPerKg) - 7}>{l('Farmer price', 'किसान कीमत')} ₹{board.farmerFloorPerKg}</text>
        </g>

        <path className="mm-curve-line" d={path} fill="none" />

        <g className="mm-curve-threshold">
          <line x1={sx(thresholdX)} y1={PAD.top} x2={sx(thresholdX)} y2={sy(yMin)} />
          <circle cx={sx(thresholdX)} cy={ceilingY} r={narrow ? 4 : 5} />
        </g>

        <g className={`mm-curve-live ${math.viable ? 'is-good' : 'is-short'}`}>
          <line x1={sx(liveX)} y1={sy(liveY)} x2={sx(liveX)} y2={sy(yMin)} />
          <circle cx={sx(liveX)} cy={sy(liveY)} r={narrow ? 5.5 : 7} />
          <text x={sx(liveX)} y={Math.max(PAD.top + 11, sy(liveY) - 15)} textAnchor={sx(liveX) > W * 0.68 ? 'end' : 'middle'}>
            ₹{math.deliveredPerKg.toFixed(2)} · {math.committedKg} kg
          </text>
        </g>

        <g className="mm-curve-ticks">
          {ticks.map((value) => (
            <text key={value} x={sx(value)} y={H - 10} textAnchor={value === xMin ? 'start' : value === xMax ? 'end' : 'middle'}>
              {Math.round(value).toLocaleString('en-IN')} kg
            </text>
          ))}
        </g>
      </svg>
      <figcaption>
        {l('The', '')} <strong>₹{math.freightTotal.toLocaleString('en-IN')}</strong> {l('trip cost stays fixed and is shared across every kilogram. Break-even is', 'की यात्रा लागत तय रहती है और हर किलो में बंटती है। ज़रूरी मात्रा')} <strong>{Number.isFinite(math.thresholdKg) ? `${math.thresholdKg.toLocaleString('en-IN')} kg` : l('out of reach', 'अभी संभव नहीं')}</strong>.
      </figcaption>
    </figure>
  )
}
