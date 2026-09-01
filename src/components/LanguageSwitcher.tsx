import { Languages } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage()
  const { showToast } = useToast()

  const change = (next: 'en' | 'hi') => {
    setLanguage(next)
    showToast(next === 'hi' ? 'भाषा हिन्दी में बदल दी गई' : 'Language changed to English')
  }

  return (
    <div className={`language-switcher ${compact ? 'language-switcher-compact' : ''}`} aria-label="Select language">
      {!compact && <Languages size={17} />}
      <button className={language === 'en' ? 'active' : ''} onClick={() => change('en')}>EN</button>
      <span />
      <button className={language === 'hi' ? 'active' : ''} onClick={() => change('hi')}>हि</button>
    </div>
  )
}
