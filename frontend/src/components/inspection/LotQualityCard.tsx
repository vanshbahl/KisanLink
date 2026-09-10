import { Camera, Check, Clock, Package2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { CustodyStage } from '../../types'
import { InspectionStatusBadge } from './InspectionStatusBadge'

const copy = {
  en: {
    heading: 'QUALITY & PICKUP',
    declared: 'Lot declared',
    qty: (kg: number) => `${kg} kg`,
    crates: (n: number) => `${n} crates`,
    photos: 'Photos attached',
    photosNone: 'No photos yet',
    independent: 'Independent sample inspection',
    pending: 'Pending logistics pickup',
  },
  hi: {
    heading: 'गुणवत्ता और पिकअप',
    declared: 'लॉट घोषित',
    qty: (kg: number) => `${kg} किलो`,
    crates: (n: number) => `${n} क्रेट`,
    photos: 'फ़ोटो जोड़ी गई',
    photosNone: 'अभी कोई फ़ोटो नहीं',
    independent: 'स्वतंत्र नमूना जांच',
    pending: 'लॉजिस्टिक्स पिकअप का इंतज़ार',
  },
}

/**
 * The farmer's compact quality summary - kept deliberately simple. The farmer is never
 * responsible for proving the quality of the whole lot; that happens independently at
 * pickup. Never claims "verified fresh" here - only that the lot was declared.
 */
export function LotQualityCard({
  quantityKg,
  containerCount,
  photoCount,
  pickupStage,
}: {
  quantityKg: number
  containerCount?: number
  photoCount: number
  /** The LOGISTICS_PICKUP custody stage, once one exists. */
  pickupStage?: CustodyStage
}) {
  const { language } = useLanguage()
  const c = copy[language]

  return (
    <div className="lot-quality-card">
      <div className="lot-quality-head"><Package2 size={15} /><span>{c.heading}</span></div>
      <div className="lot-quality-declared">
        <span className="lot-quality-label"><Check size={13} className="lot-quality-check" /> {c.declared}</span>
        <ul>
          <li><Check size={12} /> {c.qty(quantityKg)}</li>
          {containerCount !== undefined && <li><Check size={12} /> {c.crates(containerCount)}</li>}
          <li className={photoCount ? '' : 'muted'}>
            {photoCount ? <Check size={12} /> : <Camera size={12} />} {photoCount ? c.photos : c.photosNone}
          </li>
        </ul>
      </div>
      <div className="lot-quality-inspection">
        <span className="lot-quality-label"><Clock size={13} /> {c.independent}</span>
        {pickupStage ? <InspectionStatusBadge status={pickupStage.status} /> : <span className="lot-quality-pending">{c.pending}</span>}
      </div>
    </div>
  )
}
