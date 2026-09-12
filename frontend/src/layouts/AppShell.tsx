import {
  BarChart3, Boxes, ClipboardList, Heart, HelpCircle, Home,
  LayoutDashboard, ListChecks, MapPinned, PackageCheck, Radar, ShoppingBag, Sprout, Truck, UserRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Logo } from '../components/Logo'
import { NotificationCenter } from '../components/NotificationCenter'
import { GlobalModeIndicator } from '../components/GlobalModeIndicator'
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
  /** Renders as the elevated centre action. Exactly one per mobile list, always slot 3. */
  primary?: boolean
}

interface RoleNav {
  /** Exactly five entries, in display order, with the primary one in the middle slot. */
  mobile: NavItemConfig[]
  /** Sidebar destinations — the mobile five plus anything that only fits on a large screen. */
  desktop: NavItemConfig[]
  /**
   * True when Profile is not reachable from the mobile bar, so the mobile header owns the
   * avatar instead. Keeps profile access role-aware in one place rather than per page.
   */
  headerProfile: boolean
}

const navByRole: Record<Role, RoleNav> = {
  farmer: {
    mobile: [
      { labelKey: 'home', to: '/farmer', icon: Home, end: true },
      { labelKey: 'orders', to: '/farmer/orders', icon: PackageCheck },
      { labelKey: 'produce', to: '/farmer/produce', icon: Sprout, primary: true },
      { labelKey: 'marketMakerNav', to: '/farmer/market', icon: Radar },
      { labelKey: 'profile', to: '/farmer/profile', icon: UserRound },
    ],
    desktop: [
      { labelKey: 'home', to: '/farmer', icon: Home, end: true },
      { labelKey: 'orders', to: '/farmer/orders', icon: PackageCheck },
      { labelKey: 'produce', to: '/farmer/produce', icon: Sprout, primary: true },
      { labelKey: 'marketMakerNav', to: '/farmer/market', icon: Radar },
      { labelKey: 'earnings', to: '/farmer/earnings', icon: BarChart3 },
      { labelKey: 'demandInsights', to: '/farmer/insights', icon: BarChart3 },
      { labelKey: 'pickupSupport', to: '/farmer/pickups', icon: Boxes },
      { labelKey: 'profile', to: '/farmer/profile', icon: UserRound },
    ],
    headerProfile: false,
  },
  consumer: {
    mobile: [
      { labelKey: 'home', to: '/consumer', icon: Home, end: true },
      { labelKey: 'orders', to: '/consumer/orders', icon: PackageCheck },
      { labelKey: 'cart', to: '/consumer/cart', icon: ShoppingBag, primary: true },
      { labelKey: 'marketMakerNav', to: '/consumer/market', icon: Radar },
      { labelKey: 'profile', to: '/consumer/profile', icon: UserRound },
    ],
    desktop: [
      { labelKey: 'home', to: '/consumer', icon: Home, end: true },
      { labelKey: 'orders', to: '/consumer/orders', icon: PackageCheck },
      { labelKey: 'cart', to: '/consumer/cart', icon: ShoppingBag, primary: true },
      { labelKey: 'marketMakerNav', to: '/consumer/market', icon: Radar },
      { labelKey: 'saved', to: '/consumer/saved', icon: Heart },
      { labelKey: 'profile', to: '/consumer/profile', icon: UserRound },
    ],
    headerProfile: false,
  },
  bulk: {
    mobile: [
      { labelKey: 'overview', to: '/bulk', icon: LayoutDashboard, end: true },
      { labelKey: 'supply', to: '/bulk/supply', icon: Boxes },
      { labelKey: 'requests', to: '/bulk/requests', icon: ClipboardList, primary: true },
      { labelKey: 'orders', to: '/bulk/orders', icon: ListChecks },
      { labelKey: 'marketMakerNav', to: '/bulk/market', icon: Radar },
    ],
    desktop: [
      { labelKey: 'overview', to: '/bulk', icon: LayoutDashboard, end: true },
      { labelKey: 'supply', to: '/bulk/supply', icon: Boxes },
      { labelKey: 'requests', to: '/bulk/requests', icon: ClipboardList, primary: true },
      { labelKey: 'orders', to: '/bulk/orders', icon: ListChecks },
      { labelKey: 'marketMakerNav', to: '/bulk/market', icon: Radar },
      { labelKey: 'profile', to: '/bulk/profile', icon: UserRound },
    ],
    headerProfile: true,
  },
  logistics: {
    mobile: [
      { labelKey: 'overview', to: '/logistics', icon: LayoutDashboard, end: true },
      { labelKey: 'pickups', to: '/logistics/pickups', icon: Boxes },
      { labelKey: 'routes', to: '/logistics/routes', icon: MapPinned, primary: true },
      { labelKey: 'deliveries', to: '/logistics/deliveries', icon: PackageCheck },
      { labelKey: 'marketMakerNav', to: '/logistics/market', icon: Radar },
    ],
    desktop: [
      { labelKey: 'overview', to: '/logistics', icon: LayoutDashboard, end: true },
      { labelKey: 'pickups', to: '/logistics/pickups', icon: Boxes },
      { labelKey: 'routes', to: '/logistics/routes', icon: MapPinned, primary: true },
      { labelKey: 'deliveries', to: '/logistics/deliveries', icon: PackageCheck },
      { labelKey: 'marketMakerNav', to: '/logistics/market', icon: Radar },
      { labelKey: 'vehicles', to: '/logistics/vehicles', icon: Truck },
      { labelKey: 'profile', to: '/logistics/profile', icon: UserRound },
    ],
    headerProfile: true,
  },
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
          {nav.desktop.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>
        <div className="sidebar-footer">
          {session.role === 'farmer' ? <a href="tel:18001234567"><HelpCircle size={19} /><span>{t('callSupport')}<small>1800 123 4567</small></span></a> : <div className="impact-mini"><BarChart3 size={20} /><span>{t('transparentPricing')}<strong>{t('farmerReceivesMore')}</strong></span></div>}
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-header">
          <Logo />
          <div>
            {session.role === 'farmer' && <LanguageSwitcher compact />}
            <GlobalModeIndicator />
            <NotificationCenter />
            {nav.headerProfile && (
              <NavLink to={`/${session.role}/profile`} className="header-avatar" aria-label={t('profile')} title={t('profile')}>
                <span>{user.avatarInitials}</span>
              </NavLink>
            )}
          </div>
        </header>
        <header className="desktop-topbar">
          <div><span>{t('deliveringTo')}</span><strong>{session.role === 'farmer' ? t('location') : user.location}</strong></div>
          <div>{session.role === 'farmer' && <LanguageSwitcher />}<GlobalModeIndicator /><NotificationCenter /><NavLink to={`/${session.role}/profile`} className="topbar-profile"><span>{user.avatarInitials}</span><div><strong>{user.name}</strong><small>{t(roleKey[session.role])}</small></div></NavLink></div>
        </header>
        <main className="app-main"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label={`${t(roleKey[session.role])} ${t('overview')}`}>
        {nav.mobile.map((item) => <NavItem key={item.to} item={item} mobile />)}
      </nav>
    </div>
  )
}

function NavItem({ item, mobile = false }: { item: NavItemConfig; mobile?: boolean }) {
  const { t } = useLanguage()
  const Icon = item.icon
  const elevated = mobile && item.primary
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `${isActive ? 'active' : ''} ${item.primary ? 'nav-primary' : ''}`}>
      {/* Every slot gets the same fixed icon box; the elevated action nests a larger bubble
          inside it so its layout footprint — and therefore the label baseline — is identical. */}
      <span className="nav-icon">
        {elevated ? <span className="nav-bubble"><Icon size={22} /></span> : <Icon size={mobile ? 21 : 20} />}
      </span>
      <span className="nav-label">{t(item.labelKey)}</span>
    </NavLink>
  )
}
