import { ArrowLeft, ArrowRight, Building2, Check, Mail, Phone, ShoppingBasket, Sprout } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { authService } from '../services/authService'
import type { Role } from '../types'

const roles: Array<{ role: Role; label: string; hint: string; icon: typeof Sprout }> = [
  { role: 'farmer', label: 'Farmer', hint: 'Sell your harvest directly', icon: Sprout },
  { role: 'consumer', label: 'Consumer', hint: 'Buy fresh from nearby farms', icon: ShoppingBasket },
  { role: 'bulk', label: 'Bulk Buyer', hint: 'Source produce at scale', icon: Building2 },
]

export function AuthPage() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login'
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('farmer')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const cleanPhone = useMemo(() => phone.replace(/\D/g, '').slice(-10), [phone])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (cleanPhone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return }
    setError('')
    setLoading(true)
    await authService.requestOtp({ phone: cleanPhone, role, mode })
    navigate('/verify')
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Logo light />
        <div><span className="eyebrow light"><Sprout size={15} /> India’s farm-direct network</span><h1>Better value begins with a direct connection.</h1><p>A single trusted marketplace for growers, homes, and food businesses.</p></div>
        <ul><li><Check size={18} /> Phone-first, simple sign in</li><li><Check size={18} /> Transparent farm pricing</li><li><Check size={18} /> Profiles tailored to your role</li></ul>
      </section>
      <section className="auth-form-panel">
        <div className="auth-mobile-logo"><Logo /></div>
        <Link to="/" className="back-link"><ArrowLeft size={17} /> Back</Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">Welcome to KisanLink</span>
          <h2>{mode === 'signup' ? 'Create your account' : 'Sign in to continue'}</h2>
          <p>{mode === 'signup' ? 'Choose how you’ll use KisanLink. You can update your profile later.' : 'Enter your mobile number to receive a secure verification code.'}</p>

          <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setParams({ mode: 'login' })}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setParams({ mode: 'signup' })}>Create account</button></div>

          <form onSubmit={submit}>
            <fieldset><legend>I am a</legend><div className="role-picker">{roles.map((item) => { const Icon = item.icon; return <button type="button" key={item.role} className={role === item.role ? 'active' : ''} onClick={() => setRole(item.role)}><Icon size={21} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>{role === item.role && <Check className="role-check" size={15} />}</button> })}</div></fieldset>
            <label className="field-label" htmlFor="phone">Mobile number</label>
            <div className={`phone-field ${error ? 'field-error' : ''}`}><Phone size={19} /><span>+91</span><input id="phone" inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-full btn-large" disabled={loading}>{loading ? <><i className="spinner spinner-light" /> Sending verification code…</> : <>Continue <ArrowRight size={19} /></>}</button>
          </form>
          <p className="auth-alt"><Mail size={16} /> Email sign in for buyers will be available soon.</p>
          <p className="terms">By continuing, you agree to KisanLink’s prototype Terms & Privacy Notice.</p>
          <div className="demo-numbers"><strong>Demo numbers</strong><span>Farmer 9876543210 · Consumer 9811122233 · Bulk 9899001122</span></div>
        </div>
      </section>
    </main>
  )
}
