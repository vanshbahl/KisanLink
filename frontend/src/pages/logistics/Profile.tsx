import {
  Building2,
  LogOut,
  Save,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoControlCenter } from '../../components/DemoControlCenter'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { logisticsService } from '../../services/logisticsService'
import type { LogisticsProfileData } from '../../types'
import { roleHome } from '../../utils/routes'

import { useCopy, Field } from './shared'
export function LogisticsProfilePage() {
  const { l, language } = useCopy()
  const { showToast } = useToast()
  const { switchRole, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<LogisticsProfileData | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    logisticsService.profile().then(setProfile)
  }, [])
  if (!profile) return <DashboardSkeleton />
  const save = async () => {
    setSaving(true)
    await logisticsService.saveProfile({ ...profile, language })
    setSaving(false)
    showToast(l('Logistics profile saved', 'लॉजिस्टिक्स प्रोफ़ाइल सहेजी गई'))
  }
  const changeRole = async (role: 'farmer' | 'consumer' | 'bulk') => {
    await switchRole(role)
    navigate(roleHome(role))
  }
  return (
    <div className="page logistics-page dispatch-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">
            {l('Operations account', 'संचालन खाता')}
          </span>
          <h1>{l('Logistics profile', 'लॉजिस्टिक्स प्रोफ़ाइल')}</h1>
          <p>
            {l(
              'Hub, shift and notification preferences.',
              'हब, शिफ्ट और सूचना पसंद।',
            )}
          </p>
        </div>
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          <Save size={17} />{' '}
          {saving
            ? l('Saving…', 'सहेज रहे हैं…')
            : l('Save changes', 'बदलाव सहेजें')}
        </button>
      </div>
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-identity">
            <span className="profile-avatar avatar-logistics">KL</span>
            <div>
              <span className="profile-role">
                <Warehouse size={14} />{' '}
                {l('Verified operator demo', 'सत्यापित ऑपरेटर डेमो')}
              </span>
              <h2>{profile.name}</h2>
              <p>{profile.hub}</p>
            </div>
          </div>
          <div className="profile-form">
            <Field
              label={l('Name', 'नाम')}
              value={profile.name}
              onChange={(value) => setProfile({ ...profile, name: value })}
            />
            <Field
              label={l('Phone', 'फ़ोन')}
              type="tel"
              value={profile.phone}
              onChange={(value) => setProfile({ ...profile, phone: value })}
            />
            <Field
              label={l('Primary hub', 'मुख्य हब')}
              value={profile.hub}
              onChange={(value) => setProfile({ ...profile, hub: value })}
            />
            <Field
              label={l('Shift', 'शिफ्ट')}
              value={profile.shift}
              onChange={(value) => setProfile({ ...profile, shift: value })}
            />
          </div>
        </section>
        <section className="profile-settings-card">
          <h2>{l('Notification preferences', 'सूचना पसंद')}</h2>
          <div className="preference-group">
            {Object.entries(profile.notifications).map(([key, checked]) => (
              <label className="toggle-row" key={key}>
                <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      notifications: {
                        ...profile.notifications,
                        [key]: event.target.checked,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className="demo-switch-card logistics-demo-card">
          <div>
            <span className="eyebrow">
              {l('Demo controls', 'डेमो नियंत्रण')}
            </span>
            <h2>{l('Switch demo role', 'डेमो भूमिका बदलें')}</h2>
            <p>
              {l(
                'Move across the synchronized ecosystem without signing in again.',
                'बिना दोबारा साइन इन किए साझा सिस्टम में भूमिका बदलें।',
              )}
            </p>
          </div>
          <div className="demo-switch-options">
            <button onClick={() => changeRole('farmer')}>
              <Sprout size={21} />
              <strong>{l('Farmer', 'किसान')}</strong>
            </button>
            <button onClick={() => changeRole('consumer')}>
              <ShoppingBasket size={21} />
              <strong>{l('Consumer', 'ग्राहक')}</strong>
            </button>
            <button onClick={() => changeRole('bulk')}>
              <Building2 size={21} />
              <strong>{l('Bulk Buyer', 'थोक खरीदार')}</strong>
            </button>
            <button
              onClick={() => {
                logout()
                window.location.replace('/')
              }}
            >
              <LogOut size={21} />
              <strong>{l('Log out', 'लॉग आउट')}</strong>
            </button>
          </div>
          <DemoControlCenter />
        </section>
      </div>
    </div>
  )
}
