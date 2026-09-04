import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations, type TranslationKey } from '../i18n'
import { useAuth } from './AuthContext'
import type { Language } from '../types'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const LANGUAGE_KEY = 'kisanlink_language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [farmerLanguage, setFarmerLanguage] = useState<Language>(() => localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en')
  const language: Language = session && session.role !== 'farmer' ? 'en' : farmerLanguage

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage(next: Language) {
      localStorage.setItem(LANGUAGE_KEY, next)
      setFarmerLanguage(next)
    },
    t(key: TranslationKey, values = {}) {
      return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), translations[language][key] as string)
    },
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
