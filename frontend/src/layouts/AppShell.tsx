import {
  BarChart3, Boxes, ClipboardList, Heart, HelpCircle, Home,
  LayoutDashboard, ListChecks, MapPinned, PackageCheck, Search, ShoppingBag, Sprout, Truck, UserRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Logo } from '../components/Logo'
import { NotificationCenter } from '../components/NotificationCenter'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../types'
import { roleKey, type TranslationKey } from '../i18n'

interface NavItemConfig {
  labelKey: TranslationKey
  to: string
  icon: LucideIcon
  end?: boolean
  primary?: boolean
  desktopOnly?: boolean
}

const navByRole: Record<Role, NavItemConfig[]> = {
  farmer: [
    { labelKey: 'home', to: '/farmer', icon: Home, end: true },
    { labelKey: 'produce', to: '/farmer/produce', icon: Sprout },
    { labelKey: 'sell', to: '/farmer/sell', icon: ShoppingBag, primary: true },
    { labelKey: 'orders', to: '/farmer/orders', icon: PackageCheck },
    { labelKey: 'earnings', to: '/farmer/earnings', icon: BarChart3, desktopOnly: true },
    { labelKey: 'demandInsights', to: '/farmer/insights', icon: BarChart3, desktopOnly: true },
    { labelKey: 'pickupSupport', to: '/farmer/pickups', icon: Boxes, desktopOnly: true },
    { labelKey: 'profile', to: '/farmer/profile', icon: UserRound },
  ],
  consumer: [
    { labelKey: 'home', to: '/consumer', icon: Home, end: true },
    { labelKey: 'explore', to: '/consumer/explore', icon: Search },
    { labelKey: 'cart', to: '/consumer/cart', icon: ShoppingBag, primary: true },
    { labelKey: 'orders', to: '/consumer/orders', icon: PackageCheck },
    { labelKey: 'saved', to: '/consumer/saved', icon: Heart, desktopOnly: true },
    { labelKey: 'profile', to: '/consumer/profile', icon: UserRound },
  ],
  bulk: [
    { labelKey: 'overview', to: '/bulk', icon: LayoutDashboard, end: true },
    { labelKey: 'supply', to: '/bulk/supply', icon: Boxes },
    { labelKey: 'requests', to: '/bulk/requests', icon: ClipboardList },
    { labelKey: 'orders', to: '/bulk/orders', icon: ListChecks },
    { labelKey: 'profile', to: '/bulk/profile', icon: UserRound },
  ],
  logistics: [
    { labelKey: 'overview', to: '/logistics', icon: LayoutDashboard, end: true },
    { labelKey: 'pickups', to: '/logistics/pickups', icon: Boxes },
    { labelKey: 'deliveries', to: '/logistics/deliveries', icon: PackageCheck },
    { labelKey: 'routes', to: '/logistics/routes', icon: MapPinned },
    { labelKey: 'vehicles', to: '/logistics/vehicles', icon: Truck },
    { labelKey: 'profile', to: '/logistics/profile', icon: UserRound },
  ],
}

export function AppShell() {
  const { session, user } = useAuth()
  const { t } = useLanguage()
  if (!session || !user) return null
  const nav = navByRole[session.role]

  return (
    <div className={`app-shell shell-${session.role}`}>
      <aside className="desktop-sidebar">
        <Logo light />
        <div className="sidebar-role"><span>{t(roleKey[session.role])}</span><strong>{user.name}</strong><small>{session.role === 'farmer' ? t('location') : user.location}</small></div>
        <nav aria-label={`${t(roleKey[session.role])} ${t('overview')}`}>
          {nav.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>
        <div className="sidebar-footer">
          {session.role === 'farmer' ? <a href="tel:18001234567"><HelpCircle size={19} /><span>{t('callSupport')}<small>1800 123 4567</small></span></a> : <div className="impact-mini"><BarChart3 size={20} /><span>{t('transparentPricing')}<strong>{t('farmerReceivesMore')}</strong></span></div>}
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-header">
          <Logo />
          <div>{session.role === 'farmer' && <LanguageSwitcher compact />}<NotificationCenter /></div>
        </header>
        <header className="desktop-topbar">
          <div><span>{t('deliveringTo')}</span><strong>{session.role === 'farmer' ? t('location') : user.location}</strong></div>
          <div>{session.role === 'farmer' && <LanguageSwitcher />}<NotificationCenter /><NavLink to={`/${session.role}/profile`} className="topbar-profile"><span>{user.avatarInitials}</span><div><strong>{user.name}</strong><small>{t(roleKey[session.role])}</small></div></NavLink></div>
        </header>
        <main className="app-main"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label={`${t(roleKey[session.role])} ${t('overview')}`}>
        {nav.filter((item) => !item.desktopOnly).map((item) => <NavItem key={item.to} item={item} mobile />)}
      </nav>
    </div>
  )
}

function NavItem({ item, mobile = false }: { item: NavItemConfig; mobile?: boolean }) {
  const { t } = useLanguage()
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `${isActive ? 'active' : ''} ${item.primary ? 'nav-primary' : ''}`}>
      <span className={mobile && item.primary ? 'nav-primary-icon' : ''}><Icon size={mobile ? 21 : 20} /></span>
      <span>{t(item.labelKey)}</span>
    </NavLink>
  )
}
