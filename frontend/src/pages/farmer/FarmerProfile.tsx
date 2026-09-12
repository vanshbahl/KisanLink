import { useEffect, useState, type FormEvent } from 'react'
import { Building2, CheckCircle2, LogOut, Phone, ShoppingBasket, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText } from '../../i18n/farmer'
import { prototypeService } from '../../services/prototypeService'
import { roleHome } from '../../utils/routes'
import type { FarmerProfileData } from '../../types'

/**
 * Profile.
 *
 * Same fields as before, grouped by the question each one answers rather than by which
 * system owns it: about you, about the farm, where the money arrives. The language switch
 * sits here as well as in the header, because Profile is where a farmer looks for it.
 *
 * The demo role-switcher is kept — it is the spine of the four-role demo — but demoted to
 * the bottom under its own quiet heading, so it never competes with the farmer's own data.
 */
export function FarmerProfile() {
  const { f, language, setLanguage } = useFarmerText()
  const { showToast } = useToast()
  const { switchRole, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<FarmerProfileData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { void prototypeService.getProfile().then(setProfile) }, [])
  if (!profile) return <DashboardSkeleton />

  const update = <K extends keyof FarmerProfileData>(key: K, value: FarmerProfileData[K]) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    await prototypeService.saveProfile({ ...profile, language })
    setSaving(false)
    showToast(f('profileSaved'))
  }

  const switchDemo = async (role: 'consumer' | 'bulk' | 'logistics') => {
    await switchRole(role)
    navigate(roleHome(role))
  }

  return (
    <div className="page f-page f-profile">
      <header className="f-page-head"><h1>{f('profileTitle')}</h1></header>

      <form onSubmit={submit}>
        <section className="f-card">
          <h2>{f('aboutYou')}</h2>
          <div className="f-form-grid">
            <label className="f-field">
              <span>{f('yourName')}</span>
              <input value={profile.name} onChange={(event) => update('name', event.target.value)} />
            </label>
            <label className="f-field">
              <span>{f('yourPhone')}</span>
              <input type="tel" inputMode="tel" autoComplete="tel" maxLength={10} value={profile.phone} onChange={(event) => update('phone', event.target.value)} />
            </label>
            <div className="f-field f-field-wide">
              <span>{f('appLanguage')}</span>
              <div className="f-chips f-lang-chips" role="group" aria-label={f('appLanguage')}>
                <button type="button" className={language === 'hi' ? 'is-active' : ''} aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>हिन्दी</button>
                <button type="button" className={language === 'en' ? 'is-active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
              </div>
            </div>
          </div>
        </section>

        <section className="f-card">
          <h2>{f('farmInfo')}</h2>
          <div className="f-form-grid">
            <label className="f-field"><span>{f('farmName')}</span><input value={profile.farmName} onChange={(event) => update('farmName', event.target.value)} /></label>
            <label className="f-field"><span>{f('village')}</span><input value={profile.village} onChange={(event) => update('village', event.target.value)} /></label>
            <label className="f-field"><span>{f('district')}</span><input value={profile.district} onChange={(event) => update('district', event.target.value)} /></label>
            <label className="f-field"><span>{f('state')}</span><input value={profile.state} onChange={(event) => update('state', event.target.value)} /></label>
            <label className="f-field">
              <span>{f('farmSize')}</span>
              <input type="number" inputMode="decimal" min="0" max="500" step="0.5" value={profile.farmSizeAcres} onChange={(event) => update('farmSizeAcres', Number(event.target.value))} />
            </label>
            <label className="f-field"><span>{f('mainCrops')}</span><input value={profile.mainCrops} onChange={(event) => update('mainCrops', event.target.value)} /></label>
            <label className="f-field f-field-wide">
              <span>{f('pickupAddressLabel')}</span>
              <textarea rows={2} value={profile.pickupLocation} onChange={(event) => update('pickupLocation', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="f-card">
          <h2>{f('moneyGoesTo')}</h2>
          <div className="f-form-grid">
            <label className="f-field">
              <span>{f('payoutMethod')}</span>
              <select value={profile.payoutMethod} onChange={(event) => update('payoutMethod', event.target.value as FarmerProfileData['payoutMethod'])}>
                <option value="UPI">{f('upi')}</option>
                <option value="Bank account">{f('bankAccount')}</option>
              </select>
            </label>
            <label className="f-field">
              <span>{f('accountNumber')}</span>
              <input value={profile.payoutMasked} onChange={(event) => update('payoutMasked', event.target.value)} />
            </label>
          </div>
          <ul className="f-verified">
            {profile.farmerVerified && <li><CheckCircle2 size={18} />{f('farmerVerified')}</li>}
            {profile.farmVerified && <li><CheckCircle2 size={18} />{f('farmVerified')}</li>}
            <li><CheckCircle2 size={18} />{f('idVerified', { status: profile.identityStatus })}</li>
          </ul>
        </section>

        <div className="f-profile-actions">
          <button className="btn btn-primary btn-large btn-full" disabled={saving}>{saving ? f('loading') : f('saveChanges')}</button>
          <a className="btn btn-secondary btn-large btn-full" href="tel:18001234567"><Phone size={19} />{f('callHelp')}</a>
        </div>
      </form>

      <section className="f-demo">
        <h2 className="f-section-heading">{f('demoHeading')}</h2>
        <div className="f-demo-grid">
          <button type="button" onClick={() => switchDemo('consumer')}><ShoppingBasket size={21} /><span>Consumer</span></button>
          <button type="button" onClick={() => switchDemo('bulk')}><Building2 size={21} /><span>Bulk Buyer</span></button>
          <button type="button" onClick={() => switchDemo('logistics')}><Truck size={21} /><span>Logistics</span></button>
          <button type="button" onClick={() => { logout(); window.location.replace('/') }}><LogOut size={21} /><span>{f('logOut')}</span></button>
        </div>
      </section>
    </div>
  )
}
