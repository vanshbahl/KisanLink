import { ArrowLeft, ArrowRight, Building2, Check, Phone, ShoppingBasket, Sprout, Truck } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useLanguage } from '../contexts/LanguageContext'
import { authService } from '../services/authService'
import type { Role } from '../types'
import { roleKey, type TranslationKey } from '../i18n'

const roles: Array<{ role: Role; hintKey: TranslationKey; icon: typeof Sprout }> = [
  { role: 'farmer', hintKey: 'farmerHint', icon: Sprout },
  { role: 'consumer', hintKey: 'consumerHint', icon: ShoppingBasket },
  { role: 'bulk', hintKey: 'bulkHint', icon: Building2 },
  { role: 'logistics', hintKey: 'logisticsHint', icon: Truck },
]

export function AuthPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('farmer')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const cleanPhone = useMemo(() => phone.replace(/\D/g, '').slice(-10), [phone])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (cleanPhone.length !== 10) { setError(t('phoneError')); return }
    setError('')
    setLoading(true)
    await authService.requestOtp({ phone: cleanPhone, role })
    navigate('/verify')
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Logo light />
        <div><span className="eyebrow light"><Sprout size={15} /> {t('indiaNetwork')}</span><h1>{t('authHeadline')}</h1><p>{t('authCopy')}</p></div>
        <ul><li><Check size={18} /> {t('phoneSimple')}</li><li><Check size={18} /> {t('transparentFarmPricing')}</li><li><Check size={18} /> {t('tailoredProfiles')}</li></ul>
      </section>
      <section className="auth-form-panel">
        <header className="auth-form-header">
          <div className="auth-mobile-logo"><Logo /></div>
          <Link to="/" className="back-link"><ArrowLeft size={17} /> {t('back')}</Link>
          <LanguageSwitcher compact />
        </header>
        <div className="auth-form-wrap">
          <span className="eyebrow">{t('welcome')}</span>
          <h2>{t('welcome')}</h2>
          <p>{t('loginCopy')}</p>

          <form onSubmit={submit}>
            <fieldset><legend>{t('iAmA')}</legend><div className="role-picker">{roles.map((item) => { const Icon = item.icon; return <button type="button" key={item.role} className={role === item.role ? 'active' : ''} onClick={() => setRole(item.role)}><Icon size={21} /><span><strong>{t(roleKey[item.role])}</strong><small>{t(item.hintKey)}</small></span>{role === item.role && <Check className="role-check" size={15} />}</button> })}</div></fieldset>
            <label className="field-label" htmlFor="phone">{t('mobileNumber')}</label>
            <div className={`phone-field ${error ? 'field-error' : ''}`}><Phone size={19} /><span>+91</span><input id="phone" inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-full btn-large" disabled={loading}>{loading ? <><i className="spinner spinner-light" /> {t('sendingCode')}</> : <>{t('continue')} <ArrowRight size={19} /></>}</button>
          </form>
          <p className="terms">{t('terms')}</p>
          <div className="demo-numbers"><strong>{t('demoNumbers')}</strong><div>{[{ role: 'farmer' as Role, phone: '9876543210' }, { role: 'consumer' as Role, phone: '9811122233' }, { role: 'bulk' as Role, phone: '9899001122' }, { role: 'logistics' as Role, phone: '9877004455' }].map((demo) => <button type="button" key={demo.role} onClick={() => { setRole(demo.role); setPhone(demo.phone); setError('') }}>{t(roleKey[demo.role])} · {demo.phone}</button>)}</div></div>
        </div>
      </section>
    </main>
  )
}
