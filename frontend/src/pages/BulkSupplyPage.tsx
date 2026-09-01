import { ShieldCheck } from 'lucide-react'
import { BulkSupplyCard } from '../components/BulkSupplyCard'
import { bulkSupplies } from '../data/insights'
import { useLanguage } from '../contexts/LanguageContext'

export function BulkSupplyPage() {
  const { t } = useLanguage()
  return <div className="page"><div className="page-title-row"><div><span className="eyebrow">{t('verifiedFarmerNetwork')}</span><h1>{t('nearbyBulk')}</h1><p>{t('bulkSupplyCopy')}</p></div></div><div className="bulk-card-grid bulk-grid-wide">{bulkSupplies.map((supply) => <BulkSupplyCard key={supply.id} supply={supply} />)}</div><div className="gentle-banner"><ShieldCheck size={25} /><div><strong>{t('deterministicData')}</strong><p>{t('phase2Aggregation')}</p></div></div></div>
}
