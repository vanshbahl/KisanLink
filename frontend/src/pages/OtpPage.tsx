import { ArrowLeft, CheckCircle2, LockKeyhole, RotateCcw } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { authService } from '../services/authService'
import { roleHome } from '../utils/routes'

export function OtpPage() {
  const pending = authService.getPendingAuth()
  const { verifyOtp } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => { refs.current[0]?.focus() }, [])
  if (!pending) return <Navigate to="/auth" replace />

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      const session = await verifyOtp(digits.join(''))
      showToast(t('phoneVerified'))
      navigate(roleHome(session.role), { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('verificationFailed'))
    } finally { setLoading(false) }
  }

  return (
    <main className="otp-page">
      <header><Logo /><div><LanguageSwitcher compact /><Link to="/auth" className="back-link"><ArrowLeft size={17} /> {t('changeNumber')}</Link></div></header>
      <section className="otp-card">
        <span className="otp-lock"><LockKeyhole size={25} /></span>
        <span className="eyebrow">{t('oneLastStep')}</span>
        <h1>{t('checkPhone')}</h1>
        <p>{t('sentCode')} <strong>+91 {pending.phone.slice(0, 5)} {pending.phone.slice(5)}</strong></p>
        <div className="demo-otp"><CheckCircle2 size={18} /><span>{t('demoOtp')} <strong>123456</strong></span></div>
        <form onSubmit={submit}>
          <div className="otp-inputs">{digits.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node }} aria-label={t('otpDigit', { count: index + 1 })} inputMode="numeric" value={digit} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => onKeyDown(index, event)} />)}</div>
          {error && <p className="form-error centered">{error}</p>}
          <button className="btn btn-primary btn-large btn-full" disabled={loading}>{loading ? <><i className="spinner spinner-light" /> {t('verifying')}</> : t('verifyContinue')}</button>
        </form>
        <button className="resend-button" onClick={() => showToast(t('codeSent'))}><RotateCcw size={16} /> {t('resendCode')}</button>
        <p className="secure-note">{t('noSms')}</p>
      </section>
    </main>
  )
}
