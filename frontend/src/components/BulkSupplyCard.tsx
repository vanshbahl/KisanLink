import { ArrowRight, BadgeCheck, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BulkSupply } from '../types'
import { ProductImage } from './ProductImage'
import { useLanguage } from '../contexts/LanguageContext'

export function BulkSupplyCard({ supply }: { supply: BulkSupply }) {
  const { t } = useLanguage()
  return (
    <article className="bulk-card">
      <ProductImage imageSrc={supply.imageSrc} alt={supply.product} visual={supply.visual} size="mini" />
      <div className="bulk-card-content">
        <div className="bulk-card-title"><h3>{supply.product}</h3><span><BadgeCheck size={14} />{t('verifiedSupply')}</span></div>
        <p><MapPin size={15} />{supply.locations}</p>
        <div className="bulk-amount"><div><span>{t('availableSupply')}</span><strong>{t('tonnes', { count: supply.availableTonnes })}</strong></div><div><span>{t('starting')}</span><strong>₹{supply.startingPrice}{t('perKg')}</strong></div></div>
        <div className="bulk-meta"><span>{t('moq', { count: supply.moqKg })}</span><span><Users size={14} /> {t('farmersCount', { count: supply.farmerCount })}</span></div>
        <Link to={`/bulk/supply/${supply.id}`} className="btn btn-secondary">{t('viewSupply')} <ArrowRight size={16} /></Link>
      </div>
    </article>
  )
}
