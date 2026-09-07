import { Boxes, Calculator, Gauge, Route, Sparkles } from 'lucide-react'
import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'

/**
 * How the market is actually assembled, in the order the engine assembles it. Each step
 * carries the live number it produced, so this reads as an explanation of *this* corridor
 * rather than as generic marketing copy.
 */
export function MarketHowItWorks({ board, math }: { board: MarketMakerBoard; math: MarketMath }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'

  const steps = [
    { icon: Boxes, title: l('Farms offer produce', 'किसान फसल देते हैं'), value: `${math.offeredKg.toLocaleString('en-IN')} kg`, line: l('Lots too small to sell direct on their own.', 'अकेले सीधे बेचने के लिए बहुत कम मात्रा।') },
    { icon: Gauge, title: l('Demand is pooled', 'मांग जोड़ी जाती है'), value: `${math.committedKg.toLocaleString('en-IN')} kg`, line: l(`${math.bulkKg} kg business + ${math.consumerKg} kg households.`, `${math.bulkKg} किलो व्यवसाय + ${math.consumerKg} किलो परिवार।`) },
    { icon: Route, title: l('A vehicle is matched', 'वाहन जोड़ा जाता है'), value: math.vehicle ? `${math.capacityKg} kg` : l('none', 'नहीं'), line: math.vehicle ? l(`${math.vehicle.type} over ${board.routeDistanceKm} km.`, `${math.vehicle.typeHi} · ${board.routeDistanceKm} किमी।`) : l('No vehicle is free for this corridor.', 'इस कॉरिडोर के लिए वाहन खाली नहीं।') },
    { icon: Calculator, title: l('Break-even is computed', 'ज़रूरी मात्रा निकाली जाती है'), value: `${threshold} kg`, line: l(`₹${math.freightTotal.toLocaleString('en-IN')} trip cost split across the load.`, `₹${math.freightTotal.toLocaleString('en-IN')} की लागत पूरे भार में बंटती है।`) },
    { icon: Sparkles, title: l('KisanLink recommends the next step', 'किसानलिंक अगला कदम बताता है'), value: math.viable ? l('Create', 'बनाएं') : l('Wait', 'रुकें'), line: math.viable ? l('Enough volume — the market can be created.', 'मात्रा पूरी — बाज़ार बन सकता है।') : l(`${math.gapKg} kg more demand unlocks it.`, `${math.gapKg} किलो और मांग से यह खुलेगा।`) },
  ]

  return (
    <section className="section-block mm-how">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{l('How it works', 'यह कैसे काम करता है')}</span>
          <h2>{l('From scattered lots to one direct trip', 'बिखरी फसल से एक सीधी यात्रा तक')}</h2>
        </div>
      </div>
      <ol className="mm-how-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="mm-how-index">{index + 1}</span>
            <span className="mm-how-icon"><step.icon size={16} /></span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.line}</small>
            </div>
            <b>{step.value}</b>
          </li>
        ))}
      </ol>
    </section>
  )
}
