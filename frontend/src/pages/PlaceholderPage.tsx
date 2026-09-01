import { ArrowLeft, BellRing, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { roleHome } from '../utils/routes'

interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
  features?: string[]
  tone?: 'green' | 'amber' | 'soil'
}

export function PlaceholderPage({ eyebrow, title, description, features = [], tone = 'green' }: PlaceholderPageProps) {
  const { session } = useAuth()
  const { showToast } = useToast()
  const home = session ? roleHome(session.role) : '/'
  return (
    <div className="page placeholder-page">
      <Link to={home} className="back-link"><ArrowLeft size={17} /> Back to dashboard</Link>
      <section className={`placeholder-hero placeholder-${tone}`}>
        <span className="placeholder-icon"><Sparkles size={30} /></span>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="phase-badge"><Clock3 size={16} /> Coming in the next prototype phase</div>
      </section>
      {features.length > 0 && <section className="placeholder-features"><h2>What you’ll be able to do</h2><div>{features.map((feature) => <article key={feature}><CheckCircle2 size={20} /><span>{feature}</span></article>)}</div></section>}
      <div className="placeholder-actions"><Link to={home} className="btn btn-primary">Return to dashboard</Link><button className="btn btn-secondary" onClick={() => showToast('We’ll highlight this feature in the next demo')}><BellRing size={17} /> Keep me updated</button></div>
    </div>
  )
}
