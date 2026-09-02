import { ArrowRight, BadgeIndianRupee, Building2, Leaf, ShieldCheck, ShoppingBasket, Sprout, Truck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Logo } from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { Role } from '../types'
import { roleHome } from '../utils/routes'
import { roleKey, type TranslationKey } from '../i18n'

export function WelcomePage() {
  const { loginDemo } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState<Role | null>(null)

  const enterDemo = async (role: Role) => {
    setLoadingRole(role)
    await loginDemo(role)
    navigate(roleHome(role))
  }

  return (
    <main className="welcome-page">
      <header className="welcome-header"><Logo /><div className="public-header-actions"><LanguageSwitcher compact /><Link to="/auth" className="btn btn-ghost">{t('signIn')}</Link></div></header>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <span className="eyebrow"><Sprout size={15} /> {t('freshProduceFairTrade')}</span>
          <h1>{t('heroTitleStart')}<br /><em>{t('heroTitleEnd')}</em></h1>
          <p>{t('heroCopy')}</p>
          <div className="welcome-actions"><Link to="/auth?mode=signup" className="btn btn-primary btn-large">{t('getStarted')} <ArrowRight size={19} /></Link><a href="#demo" className="btn btn-secondary btn-large">{t('exploreDemo')}</a></div>
          <div className="welcome-proof"><span><ShieldCheck size={17} /> {t('verifiedFarmers')}</span><span><BadgeIndianRupee size={17} /> {t('transparentPricing')}</span><span><Truck size={17} /> {t('pickupSupport')}</span></div>
        </div>
        <div className="hero-visual" aria-label={t('heroAria')}>
          <div className="farmer-photo-card" aria-hidden="true" />
          <img className="farmer-cutout" src="/assets/hero/farmer-cutout.webp" alt="" />
          <div className="hero-float hero-float-top"><Leaf size={18} /><span><strong>90%</strong> {t('reachesFarmers')}</span></div>
          <div className="hero-float hero-float-bottom"><span className="avatar-stack"><i>RK</i><i>HS</i><i>+4</i></span><span><strong>{t('verifiedFarms')}</strong> {t('nearDelhi')}</span></div>
          <span className="hero-shape hero-shape-one" /><span className="hero-shape hero-shape-two" />
        </div>
      </section>

      <section id="demo" className="demo-entry">
        <div><span className="eyebrow">{t('guidedPreview')}</span><h2>{t('exploreYourWay')}</h2><p>{t('demoCopy')}</p></div>
        <div className="demo-role-grid">
          {([
            ['farmer', Sprout, 'Ramesh Kumar', 'farmerDemoHint'],
            ['consumer', ShoppingBasket, 'Aarav Mehta', 'consumerDemoHint'],
            ['bulk', Building2, 'FreshKart', 'bulkDemoHint'],
          ] as Array<[Role, LucideIcon, string, TranslationKey]>).map(([role, RoleIcon, name, descriptionKey]) => (
            <button key={role} onClick={() => enterDemo(role)} disabled={Boolean(loadingRole)} className="demo-role-card">
              <span className={`demo-role-icon role-${role}`}><RoleIcon size={24} /></span>
              <span><small>{t(roleKey[role])} {t('demo')}</small><strong>{name}</strong><p>{t(descriptionKey)}</p></span>
              <span className="demo-arrow">{loadingRole === role ? <i className="spinner" /> : <ArrowRight size={19} />}</span>
            </button>
          ))}
        </div>
      </section>
      <footer className="welcome-footer"><Logo /><p>{t('footerCopy')}</p><span>Team Aeris · SIH 2026</span></footer>
    </main>
  )
}
