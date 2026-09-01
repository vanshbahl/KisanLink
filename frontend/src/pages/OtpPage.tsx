import { ArrowLeft, CheckCircle2, LockKeyhole, RotateCcw } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { authService } from '../services/authService'
import { roleHome } from '../utils/routes'

export function OtpPage() {
  const pending = authService.getPendingAuth()
  const { verifyOtp } = useAuth()
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
      showToast('Phone verified successfully')
      navigate(roleHome(session.role), { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed')
    } finally { setLoading(false) }
  }

  return (
    <main className="otp-page">
      <header><Logo /><Link to="/auth" className="back-link"><ArrowLeft size={17} /> Change number</Link></header>
      <section className="otp-card">
        <span className="otp-lock"><LockKeyhole size={25} /></span>
        <span className="eyebrow">One last step</span>
        <h1>Check your phone</h1>
        <p>We sent a 6-digit verification code to <strong>+91 {pending.phone.slice(0, 5)} {pending.phone.slice(5)}</strong></p>
        <div className="demo-otp"><CheckCircle2 size={18} /><span>Demo OTP <strong>123456</strong></span></div>
        <form onSubmit={submit}>
          <div className="otp-inputs">{digits.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node }} aria-label={`OTP digit ${index + 1}`} inputMode="numeric" value={digit} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => onKeyDown(index, event)} />)}</div>
          {error && <p className="form-error centered">{error}</p>}
          <button className="btn btn-primary btn-large btn-full" disabled={loading}>{loading ? <><i className="spinner spinner-light" /> Verifying…</> : 'Verify & continue'}</button>
        </form>
        <button className="resend-button" onClick={() => showToast('A new demo code has been sent')}><RotateCcw size={16} /> Resend code</button>
        <p className="secure-note">For this prototype, no SMS is actually sent.</p>
      </section>
    </main>
  )
}
