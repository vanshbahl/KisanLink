import {
  BarChart3, Bell, Boxes, ClipboardList, Heart, HelpCircle, Home, IndianRupee,
  LayoutDashboard, ListChecks, PackageCheck, Search, ShoppingBag, Sprout, UserRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Logo } from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { Role } from '../types'
import { roleLabel } from '../utils/routes'

const navByRole = {
  farmer: [
    { label: 'Home', labelHi: 'मुख्य', to: '/farmer', icon: Home, end: true },
    { label: 'Produce', labelHi: 'फसल', to: '/farmer/produce', icon: Sprout },
    { label: 'Sell', labelHi: 'बेचें', to: '/farmer/sell', icon: ShoppingBag, primary: true },
    { label: 'Orders', labelHi: 'ऑर्डर', to: '/farmer/orders', icon: PackageCheck },
    { label: 'Profile', labelHi: 'प्रोफ़ाइल', to: '/farmer/profile', icon: UserRound },
  ],
  consumer: [
    { label: 'Home', to: '/consumer', icon: Home, end: true },
    { label: 'Explore', to: '/consumer/explore', icon: Search },
    { label: 'Orders', to: '/consumer/orders', icon: ShoppingBag },
    { label: 'Saved', to: '/consumer/saved', icon: Heart },
    { label: 'Profile', to: '/consumer/profile', icon: UserRound },
  ],
  bulk: [
    { label: 'Overview', to: '/bulk', icon: LayoutDashboard, end: true },
    { label: 'Supply', to: '/bulk/supply', icon: Boxes },
    { label: 'Requests', to: '/bulk/requests', icon: ClipboardList },
    { label: 'Orders', to: '/bulk/orders', icon: ListChecks },
    { label: 'Profile', to: '/bulk/profile', icon: UserRound },
  ],
} satisfies Record<Role, Array<{ label: string; labelHi?: string; to: string; icon: typeof Home; end?: boolean; primary?: boolean }>>

export function AppShell() {
  const { session, user } = useAuth()
  const { language } = useLanguage()
  if (!session || !user) return null
  const nav = navByRole[session.role]

  return (
    <div className={`app-shell shell-${session.role}`}>
      <aside className="desktop-sidebar">
        <Logo light />
        <div className="sidebar-role"><span>{roleLabel(session.role)}</span><strong>{user.name}</strong><small>{user.location}</small></div>
        <nav aria-label={`${roleLabel(session.role)} navigation`}>
          {nav.map((item) => <NavItem key={item.to} item={item} language={language} />)}
        </nav>
        <div className="sidebar-footer">
          {session.role === 'farmer' ? <a href="tel:18001234567"><HelpCircle size={19} /><span>Call Support<small>1800 123 4567</small></span></a> : <div className="impact-mini"><BarChart3 size={20} /><span>Fair trade impact<strong>₹6.4L earned by farmers</strong></span></div>}
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-header">
          <Logo />
          <div>{session.role === 'farmer' && <LanguageSwitcher compact />}<button aria-label="Notifications" className="icon-button"><Bell size={20} /><span className="notification-dot" /></button></div>
        </header>
        <header className="desktop-topbar">
          <div><span>Delivering to</span><strong>{user.location}</strong></div>
          <div>{session.role === 'farmer' && <LanguageSwitcher />}<button className="icon-button" aria-label="Notifications"><Bell size={20} /><span className="notification-dot" /></button><NavLink to={`/${session.role}/profile`} className="topbar-profile"><span>{user.avatarInitials}</span><div><strong>{user.name}</strong><small>{roleLabel(session.role)}</small></div></NavLink></div>
        </header>
        <main className="app-main"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label={`${roleLabel(session.role)} mobile navigation`}>
        {nav.map((item) => <NavItem key={item.to} item={item} language={language} mobile />)}
      </nav>
    </div>
  )
}

function NavItem({ item, language, mobile = false }: { item: (typeof navByRole)[Role][number]; language: string; mobile?: boolean }) {
  const Icon = item.icon
  const label = language === 'hi' && item.labelHi ? item.labelHi : item.label
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `${isActive ? 'active' : ''} ${item.primary ? 'nav-primary' : ''}`}>
      <span className={mobile && item.primary ? 'nav-primary-icon' : ''}><Icon size={mobile ? 21 : 20} /></span>
      <span>{label}</span>
    </NavLink>
  )
}
