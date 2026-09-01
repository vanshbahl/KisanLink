import { Building2, ChevronRight, CircleHelp, Languages, LogOut, MapPin, Phone, Settings, ShieldCheck, ShoppingBasket, Sprout, UserRound, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { SupportCard } from '../components/SupportCard'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { Role } from '../types'
import { roleHome } from '../utils/routes'
import { roleKey } from '../i18n'

const roleOptions: Array<{ role: Role; icon: LucideIcon }> = [{ role: 'farmer', icon: Sprout }, { role: 'consumer', icon: ShoppingBasket }, { role: 'bulk', icon: Building2 }]

export function ProfilePage() {
  const { session, user, logout, switchRole } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()
  const navigate = useNavigate()
  if (!session || !user) return null

  const switchDemo = async (role: Role) => {
    if (role === session.role) return
    await switchRole(role)
    showToast(t('switchedRole', { role: t(roleKey[role]) }))
    navigate(roleHome(role))
  }
  const signOut = () => {
    logout()
    window.location.replace('/')
  }

  return (
    <div className="page profile-page">
      <div className="page-title-row"><div><span className="eyebrow">{t('accountPreferences')}</span><h1>{t('yourProfile')}</h1><p>{t('profileCopy')}</p></div></div>
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-identity"><span className={`profile-avatar avatar-${session.role}`}>{user.avatarInitials}</span><div><StatusLine role={session.role} /><h2>{user.name}</h2><p>{user.farmName ?? user.company ?? t(roleKey[session.role])}</p></div></div>
          <div className="profile-detail-list">
            <div><Phone size={19} /><span><small>{t('mobileNumber')}</small><strong>+91 {user.phone.slice(0, 5)} {user.phone.slice(5)}</strong></span></div>
            <div><MapPin size={19} /><span><small>{t('locationLabel')}</small><strong>{user.location}</strong></span></div>
            {session.role === 'farmer' && <div><Sprout size={19} /><span><small>{t('farm')}</small><strong>{user.farmName}</strong></span></div>}
            {session.role === 'bulk' && <><div><UserRound size={19} /><span><small>{t('representative')}</small><strong>{user.representative}</strong></span></div><div><Building2 size={19} /><span><small>{t('gstDetails')}</small><strong>{user.gst}</strong></span></div></>}
          </div>
          <button className="btn btn-secondary btn-full" onClick={() => showToast(t('editProfileToast'))}>{t('editProfile')}</button>
        </section>

        <section className="profile-settings-card">
          <h2>{t('preferences')}</h2>
          <div className="settings-row"><span className="settings-icon"><Languages size={20} /></span><div><strong>{t('appLanguage')}</strong><small>{t('languageInstant')}</small></div><LanguageSwitcher compact /></div>
          <button className="settings-row" onClick={() => showToast(t('settingsSaved'))}><span className="settings-icon"><Settings size={20} /></span><div><strong>{t('accountSettings')}</strong><small>{t('notificationPreferences')}</small></div><ChevronRight size={18} /></button>
          {session.role === 'consumer' && <button className="settings-row" onClick={() => showToast(t('addressesNext'))}><span className="settings-icon"><MapPin size={20} /></span><div><strong>{t('savedAddresses')}</strong><small>{t('homeDwarka')}</small></div><ChevronRight size={18} /></button>}
          {session.role === 'bulk' && <button className="settings-row" onClick={() => showToast(t('verificationNext'))}><span className="settings-icon"><ShieldCheck size={20} /></span><div><strong>{t('businessVerification')}</strong><small>{t('completeGst')}</small></div><ChevronRight size={18} /></button>}
          <button className="settings-row" onClick={() => showToast(t('helpOpened'))}><span className="settings-icon"><CircleHelp size={20} /></span><div><strong>{t('helpCentre')}</strong><small>{t('faqsGuidance')}</small></div><ChevronRight size={18} /></button>
          <button className="settings-row logout-row" onClick={signOut}><span className="settings-icon"><LogOut size={20} /></span><div><strong>{t('logOut')}</strong><small>{t('endSession')}</small></div><ChevronRight size={18} /></button>
        </section>

        <section className="demo-switch-card"><div><span className="eyebrow">{t('demoControls')}</span><h2>{t('switchDemoRole')}</h2><p>{t('switchDemoCopy')}</p></div><div className="demo-switch-options">{roleOptions.map((option) => { const RoleIcon = option.icon; return <button key={option.role} className={session.role === option.role ? 'active' : ''} onClick={() => switchDemo(option.role)}><span><RoleIcon size={22} /></span><strong>{t(roleKey[option.role])}</strong>{session.role === option.role && <small>{t('current')}</small>}</button> })}</div></section>
      </div>
      {session.role === 'farmer' && <SupportCard />}
    </div>
  )
}

function StatusLine({ role }: { role: Role }) {
  const { t } = useLanguage()
  return <span className="profile-role"><ShieldCheck size={14} /> {t('verifiedRole', { role: t(roleKey[role]) })}</span>
}
