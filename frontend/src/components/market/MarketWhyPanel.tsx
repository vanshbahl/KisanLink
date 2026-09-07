import { ChevronDown, ChevronUp, Sigma } from 'lucide-react'
import { useState } from 'react'
import type { MarketMakerBoard } from '../../types'
import { explainMarket, type MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'

/**
 * "Why did this market become viable?" answered as arithmetic rather than as a claim. Each
 * step is one operation on a number that appears elsewhere in the app, in engine order.
 */
export function MarketWhyPanel({ board, math, defaultOpen = false }: { board: MarketMakerBoard; math: MarketMath; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const steps = language === 'hi' ? [
    { label: 'एक यात्रा की तय लागत', value: `₹${math.freightTotal.toLocaleString('en-IN')}`, note: math.vehicle ? `${math.vehicle.type} · ${board.routeDistanceKm} किमी · वाहन क्षमता ${math.vehicle.capacityKg} किलो` : 'इस कॉरिडोर के लिए अभी कोई वाहन उपलब्ध नहीं है।' },
    { label: 'खरीदार की कीमत सीमा', value: `₹${board.buyerCeilingPerKg.toFixed(2)}/किलो`, note: `पारंपरिक श्रृंखला में आज खरीदार ₹${board.buyerCurrentPerKg.toFixed(2)}/किलो देते हैं।` },
    { label: 'किसान की सुरक्षित कीमत', value: `₹${board.farmerFloorPerKg.toFixed(2)}/किलो`, note: `मंडी ₹${board.mandiPricePerKg.toFixed(2)}/किलो देती है। मार्केट मेकर किसान की कीमत कम नहीं करता।` },
    { label: 'प्लेटफ़ॉर्म शुल्क', value: `₹${math.platformFeePerKg.toFixed(2)}/किलो`, note: 'यह खरीदार से लिया जाता है, इसलिए किसान की सुरक्षित कीमत पूरी रहती है।' },
    { label: 'ढुलाई के लिए बची राशि', value: `₹${math.headroomPerKg.toFixed(2)}/किलो`, note: 'खरीदार की सीमा में से किसान की कीमत और प्लेटफ़ॉर्म शुल्क घटाने के बाद बची राशि।' },
    { label: 'बाज़ार के लिए ज़रूरी मात्रा', value: `${Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'} किलो`, note: `₹${math.freightTotal.toLocaleString('en-IN')} की तय यात्रा लागत अधिक किलो में बंटने पर प्रति किलो कीमत घटती है।` },
    { label: 'आज की पक्की मांग', value: `${math.committedKg.toLocaleString('en-IN')} किलो`, note: math.viable ? `डिलीवरी कीमत ₹${math.deliveredPerKg.toFixed(2)}/किलो है, इसलिए बाज़ार संभव है।` : `बाज़ार बनने के लिए ${math.gapKg} किलो मांग और चाहिए।` },
  ] : explainMarket(board, math)

  return (
    <section className="mm-why">
      <button type="button" className="mm-why-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="mm-why-icon"><Sigma size={15} /></span>
        <span>
          <small>{l('Inspectable economics', 'जांचने योग्य गणना')}</small>
          <strong>{math.viable ? l('Why this market is viable', 'यह बाज़ार क्यों संभव है') : l('Why this market is not viable yet', 'यह बाज़ार अभी क्यों संभव नहीं है')}</strong>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <ol className="mm-why-steps">
          {steps.map((step, index) => (
            <li key={step.label} style={{ animationDelay: `${index * 45}ms` }}>
              <i>{index + 1}</i>
              <div><span>{step.label}</span><p>{step.note}</p></div>
              <strong>{step.value}</strong>
            </li>
          ))}
        </ol>
      )}
      {open && <p className="mm-why-footer">{l('Every figure above is computed from listing, fleet and commitment records in shared prototype state. No prediction or model output is involved.', 'ऊपर का हर आंकड़ा साझा प्रोटोटाइप में लिस्टिंग, वाहन और पक्की मांग से निकाला गया है। इसमें कोई भविष्यवाणी या मॉडल आउटपुट शामिल नहीं है।')}</p>}
    </section>
  )
}
