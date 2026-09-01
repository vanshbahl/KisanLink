import { Building2, ChevronRight, CircleHelp, Languages, LogOut, MapPin, Phone, Settings, ShieldCheck, Sprout, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { SupportCard } from '../components/SupportCard'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Role } from '../types'
import { roleHome, roleLabel } from '../utils/routes'

const roleOptions: Array<{ role: Role; emoji: string }> = [{ role: 'farmer', emoji: '🌾' }, { role: 'consumer', emoji: '🧺' }, { role: 'bulk', emoji: '🏢' }]

export function ProfilePage() {
  const { session, user, logout, switchRole } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  if (!session || !user) return null

  const switchDemo = async (role: Role) => {
    if (role === session.role) return
    await switchRole(role)
    showToast(`Switched to ${roleLabel(role)} demo`)
    navigate(roleHome(role))
  }
  const signOut = () => { logout(); navigate('/', { replace: true }) }

  return (
    <div className="page profile-page">
      <div className="page-title-row"><div><span className="eyebrow">Account & preferences</span><h1>Your profile</h1><p>Manage the details used across your KisanLink experience.</p></div></div>
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-identity"><span className={`profile-avatar avatar-${session.role}`}>{user.avatarInitials}</span><div><StatusLine role={session.role} /><h2>{user.name}</h2><p>{user.farmName ?? user.company ?? roleLabel(session.role)}</p></div></div>
          <div className="profile-detail-list">
            <div><Phone size={19} /><span><small>Mobile number</small><strong>+91 {user.phone.slice(0, 5)} {user.phone.slice(5)}</strong></span></div>
            <div><MapPin size={19} /><span><small>Location</small><strong>{user.location}</strong></span></div>
            {session.role === 'farmer' && <div><Sprout size={19} /><span><small>Farm</small><strong>{user.farmName}</strong></span></div>}
            {session.role === 'bulk' && <><div><UserRound size={19} /><span><small>Representative</small><strong>{user.representative}</strong></span></div><div><Building2 size={19} /><span><small>GST details</small><strong>{user.gst}</strong></span></div></>}
          </div>
          <button className="btn btn-secondary btn-full" onClick={() => showToast('Profile editing is ready for the next phase')}>Edit profile</button>
        </section>

        <section className="profile-settings-card">
          <h2>Preferences</h2>
          {session.role === 'farmer' && <div className="settings-row"><span className="settings-icon"><Languages size={20} /></span><div><strong>App language</strong><small>Updates the farmer experience instantly</small></div><LanguageSwitcher compact /></div>}
          <button className="settings-row" onClick={() => showToast('Settings saved for this prototype')}><span className="settings-icon"><Settings size={20} /></span><div><strong>Account settings</strong><small>Notifications and preferences</small></div><ChevronRight size={18} /></button>
          {session.role === 'consumer' && <button className="settings-row" onClick={() => showToast('Saved addresses arrive in the next phase')}><span className="settings-icon"><MapPin size={20} /></span><div><strong>Saved addresses</strong><small>Home · Dwarka, New Delhi</small></div><ChevronRight size={18} /></button>}
          {session.role === 'bulk' && <button className="settings-row" onClick={() => showToast('Business verification arrives in the next phase')}><span className="settings-icon"><ShieldCheck size={20} /></span><div><strong>Business verification</strong><small>Complete GST and company details</small></div><ChevronRight size={18} /></button>}
          <button className="settings-row" onClick={() => showToast('Help centre opened')}><span className="settings-icon"><CircleHelp size={20} /></span><div><strong>Help centre</strong><small>FAQs and product guidance</small></div><ChevronRight size={18} /></button>
          <button className="settings-row logout-row" onClick={signOut}><span className="settings-icon"><LogOut size={20} /></span><div><strong>Log out</strong><small>End this demo session</small></div><ChevronRight size={18} /></button>
        </section>

        <section className="demo-switch-card"><div><span className="eyebrow">Demo controls</span><h2>Switch demo role</h2><p>Move between product experiences without repeating sign in.</p></div><div className="demo-switch-options">{roleOptions.map((option) => <button key={option.role} className={session.role === option.role ? 'active' : ''} onClick={() => switchDemo(option.role)}><span>{option.emoji}</span><strong>{roleLabel(option.role)}</strong>{session.role === option.role && <small>Current</small>}</button>)}</div></section>
      </div>
      {session.role === 'farmer' && <SupportCard />}
    </div>
  )
}

function StatusLine({ role }: { role: Role }) {
  return <span className="profile-role"><ShieldCheck size={14} /> Verified {roleLabel(role)}</span>
}
