import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations, type TranslationKey } from '../i18n/translations'
import type { Language } from '../types'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const LANGUAGE_KEY = 'kisanlink_language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en')

  const value = useMemo(() => ({
    language,
    setLanguage(next: Language) {
      localStorage.setItem(LANGUAGE_KEY, next)
      setLanguageState(next)
    },
    t(key: TranslationKey) {
      return translations[language][key]
    },
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
