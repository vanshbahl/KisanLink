import { ArrowDown, IndianRupee, Route, Sprout } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export function PriceTransparency({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage()
  return (
    <article className={`price-transparency ${compact ? 'price-compact' : ''}`}>
      <div className="price-heading">
        <div>
          <span className="eyebrow">{t('transparentDesign')}</span>
          <h2>{t('everyRupee')}</h2>
        </div>
        <span className="price-icon"><IndianRupee size={21} /></span>
      </div>
      <div className="price-flow">
        <div className="price-total"><span>{t('consumerPays')}</span><strong>₹31</strong><small>{t('perKgWords')}</small></div>
        <ArrowDown className="price-arrow" size={18} />
        <div className="price-splits">
          <div><span className="split-icon farmer"><Sprout size={18} /></span><p>{t('farmerReceives')}</p><strong>₹28</strong></div>
          <div><span className="split-icon logistics"><Route size={18} /></span><p>{t('logistics')}</p><strong>₹2</strong></div>
          <div><span className="split-icon platform">K</span><p>{t('platform')}</p><strong>₹1</strong></div>
        </div>
      </div>
      <p className="price-note">{t('noHidden')}</p>
    </article>
  )
}
