import type { Category } from '../types'
import { Sparkles } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryKey } from '../i18n'

export function CategoryChip({ name, imageSrc, active, onClick }: { name: Category | 'All'; imageSrc?: string; active: boolean; onClick: () => void }) {
  const { t } = useLanguage()
  return <button className={`category-chip ${active ? 'active' : ''}`} onClick={onClick}>{imageSrc ? <img src={imageSrc} alt="" /> : <Sparkles size={16} />}{t(categoryKey[name])}</button>
}
