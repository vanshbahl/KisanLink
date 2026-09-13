import { ArrowRight, Check, Hammer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { translations } from '../i18n'
import { CHOOSE_LANGUAGE_HEADING, discoverLocale, FALLBACK_LANGUAGE, isFunctionalLanguage, LANGUAGE_OPTIONS, rememberDetectedRegion, type DiscoveryLanguage, type LocaleDiscovery } from '../services/localeDiscovery'
import type { Language } from '../types'

/**
 * Splash and language discovery, shown once per browser session before the phone number.
 *
 * Flow: splash (logo, coarse location read) -> language picker (header in the detected
 * language, detected language preselected) -> /auth. Only Hindi and English are wired up;
 * the other options say so and keep the user here. The choice is persisted through
 * `LanguageProvider.setLanguage`, the same store the in-app switcher writes to.
 */
export const LANGUAGE_CHOSEN_KEY = 'kisanlink_language_chosen'
export const hasChosenLanguage = () => { try { return sessionStorage.getItem(LANGUAGE_CHOSEN_KEY) === '1' } catch { return false } }

/** Keep the logo on screen long enough to read as a splash, even when detection is instant. */
const MIN_SPLASH_MS = 1100

const copy = {
  hi: {
    fromLocation: 'आपके इलाके के हिसाब से {lang} चुनी गई है',
    changeLater: 'आप इसे बाद में भी बदल सकते हैं',
    inDevelopment: '{lang} अभी तैयार हो रही है। फिलहाल हिन्दी या English चुनें।',
  },
  en: {
    fromLocation: '{lang} was picked for your area',
    changeLater: 'You can change this later too',
    inDevelopment: '{lang} is still being built. Please pick Hindi or English for now.',
  },
} satisfies Record<Language, Record<string, string>>

const nativeName = (code: DiscoveryLanguage) => LANGUAGE_OPTIONS.find((option) => option.code === code)?.native ?? code

export function LanguageSplashPage() {
  const { setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [discovery, setDiscovery] = useState<LocaleDiscovery | null>(null)
  const [selected, setSelected] = useState<DiscoveryLanguage>(FALLBACK_LANGUAGE)
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([discoverLocale(), new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS))]).then(([result]) => {
      if (!active) return
      // Farmer onboarding prefills district and state from this same read.
      rememberDetectedRegion(result)
      setDiscovery(result)
      setSelected(result.language)
    })
    return () => { active = false }
  }, [])

  if (!discovery) {
    return (
      <main className="lang-splash" aria-busy="true">
        <div className="lang-splash-loading">
          <img className="lang-splash-mark" src="/assets/brand/kisanlink-official.png" alt="" />
          <strong className="lang-splash-word">Kisan<span>Link</span></strong>
          <span className="lang-splash-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </main>
    )
  }

  // Secondary copy follows the last functional choice, so picking Tamil after Hindi keeps the
  // explanation in Hindi rather than in a language we cannot render yet.
  const functional: Language = isFunctionalLanguage(selected) ? selected : isFunctionalLanguage(discovery.language) ? discovery.language : FALLBACK_LANGUAGE
  const text = copy[functional]
  const hint = discovery.source === 'location' ? text.fromLocation.replace('{lang}', nativeName(discovery.language)) : text.changeLater

  const choose = (code: DiscoveryLanguage) => {
    setSelected(code)
    setShowNotice(!isFunctionalLanguage(code))
  }

  const proceed = () => {
    if (!isFunctionalLanguage(selected)) { setShowNotice(true); return }
    setLanguage(selected)
    try { sessionStorage.setItem(LANGUAGE_CHOSEN_KEY, '1') } catch { /* private mode: the gate simply shows the splash again */ }
    navigate('/auth')
  }

  return (
    <main className="lang-splash">
      <section className="lang-picker">
        <img className="lang-picker-mark" src="/assets/brand/kisanlink-official.png" alt="" />
        <h1 lang={discovery.language}>{CHOOSE_LANGUAGE_HEADING[discovery.language]}</h1>
        <p className="lang-picker-hint">{hint}</p>

        <div className="lang-grid" role="radiogroup" aria-label={CHOOSE_LANGUAGE_HEADING[discovery.language]}>
          {LANGUAGE_OPTIONS.map((option) => {
            const active = option.code === selected
            return (
              <button type="button" key={option.code} role="radio" aria-checked={active} lang={option.code} className={`lang-option ${active ? 'active' : ''}`} onClick={() => choose(option.code)}>
                <span><strong>{option.native}</strong>{option.native !== option.latin && <small>{option.latin}</small>}</span>
                {active && <Check size={16} className="lang-option-check" />}
              </button>
            )
          })}
        </div>

        <div className="lang-picker-footer">
          {showNotice && !isFunctionalLanguage(selected) && (
            <p className="lang-notice" role="status"><Hammer size={16} /> {text.inDevelopment.replace('{lang}', nativeName(selected))}</p>
          )}
          <button type="button" className="btn btn-primary btn-full btn-large" onClick={proceed}>{translations[functional].continue} <ArrowRight size={19} /></button>
        </div>
      </section>
    </main>
  )
}
