import { Languages } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { translations } from '../i18n'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage()
  const { showToast } = useToast()

  const change = (next: 'en' | 'hi') => {
    setLanguage(next)
    showToast(translations[next].languageChanged)
  }

  return (
    <div className={`language-switcher ${compact ? 'language-switcher-compact' : ''}`} role="group" aria-label={t('selectLanguage')}>
      {!compact && <Languages size={17} />}
      <button type="button" aria-pressed={language === 'en'} className={language === 'en' ? 'active' : ''} onClick={() => change('en')}>EN</button>
      <span />
      <button type="button" aria-pressed={language === 'hi'} className={language === 'hi' ? 'active' : ''} onClick={() => change('hi')}>हि</button>
    </div>
  )
}
