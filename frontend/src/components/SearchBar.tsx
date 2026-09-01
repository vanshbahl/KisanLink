import { Search, SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useLanguage()
  return (
    <label className="search-bar">
      <Search size={20} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchProduce')} />
      <button type="button" aria-label={t('searchFilters')}><SlidersHorizontal size={18} /></button>
    </label>
  )
}
