import { ArrowRight, BadgeIndianRupee, Building2, Leaf, ShieldCheck, ShoppingBasket, Sprout, Truck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { ProduceArtwork } from '../components/ProduceArtwork'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from '../types'
import { roleHome, roleLabel } from '../utils/routes'

export function WelcomePage() {
  const { loginDemo } = useAuth()
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState<Role | null>(null)

  const enterDemo = async (role: Role) => {
    setLoadingRole(role)
    await loginDemo(role)
    navigate(roleHome(role))
  }

  return (
    <main className="welcome-page">
      <header className="welcome-header"><Logo /><Link to="/auth" className="btn btn-ghost">Sign in</Link></header>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <span className="eyebrow"><Sprout size={15} /> Fresh produce. Fairer trade.</span>
          <h1>From good farms,<br /><em>straight to you.</em></h1>
          <p>KisanLink connects farmers, families, and food businesses—so growers earn more and buyers pay less.</p>
          <div className="welcome-actions"><Link to="/auth?mode=signup" className="btn btn-primary btn-large">Get started <ArrowRight size={19} /></Link><a href="#demo" className="btn btn-secondary btn-large">Explore demo</a></div>
          <div className="welcome-proof"><span><ShieldCheck size={17} /> Verified farmers</span><span><BadgeIndianRupee size={17} /> Transparent pricing</span><span><Truck size={17} /> Pickup support</span></div>
        </div>
        <div className="hero-visual" aria-label="Fresh produce from verified farms">
          <div className="hero-card hero-card-main"><ProduceArtwork imageSrc="/assets/produce/tomato.webp" alt="Fresh tomatoes" visual="tomato" size="hero" /><div><span>Harvested today</span><h2>Fresh Tomatoes</h2><p>Ramesh Farms · Sonipat</p><strong>₹31 <small>/ kg</small></strong></div></div>
          <div className="hero-float hero-float-top"><Leaf size={18} /><span><strong>90%</strong> reaches farmers</span></div>
          <div className="hero-float hero-float-bottom"><span className="avatar-stack"><i>RK</i><i>HS</i><i>+4</i></span><span><strong>6 verified farms</strong> near Delhi NCR</span></div>
          <span className="hero-shape hero-shape-one" /><span className="hero-shape hero-shape-two" />
        </div>
      </section>

      <section id="demo" className="demo-entry">
        <div><span className="eyebrow">Guided product preview</span><h2>Explore KisanLink your way</h2><p>Step into a ready-to-use demo account. You can switch roles anytime from Profile.</p></div>
        <div className="demo-role-grid">
          {([
            ['farmer', Sprout, 'Ramesh Kumar', 'Simple selling, orders & insights'],
            ['consumer', ShoppingBasket, 'Aarav Mehta', 'Fresh local produce & fair pricing'],
            ['bulk', Building2, 'FreshKart', 'Nearby supply & procurement overview'],
          ] as Array<[Role, LucideIcon, string, string]>).map(([role, RoleIcon, name, description]) => (
            <button key={role} onClick={() => enterDemo(role)} disabled={Boolean(loadingRole)} className="demo-role-card">
              <span className={`demo-role-icon role-${role}`}><RoleIcon size={24} /></span>
              <span><small>{roleLabel(role)} demo</small><strong>{name}</strong><p>{description}</p></span>
              <span className="demo-arrow">{loadingRole === role ? <i className="spinner" /> : <ArrowRight size={19} />}</span>
            </button>
          ))}
        </div>
      </section>
      <footer className="welcome-footer"><Logo /><p>Freshly connected across Delhi NCR & Haryana.</p><span>Team Aeris · SIH 2026</span></footer>
    </main>
  )
}
