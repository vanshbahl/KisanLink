import { ArrowLeft, BellRing, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import { placeholderTranslations, type PlaceholderId } from '../i18n/placeholders'
import { roleHome } from '../utils/routes'

interface PlaceholderPageProps {
  copyId: PlaceholderId
  tone?: 'green' | 'amber' | 'soil'
}

export function PlaceholderPage({ copyId, tone = 'green' }: PlaceholderPageProps) {
  const { session } = useAuth()
  const { language, t } = useLanguage()
  const { showToast } = useToast()
  const home = session ? roleHome(session.role) : '/'
  const copy = placeholderTranslations[language][copyId]
  return (
    <div className="page placeholder-page">
      <Link to={home} className="back-link"><ArrowLeft size={17} /> {t('backDashboard')}</Link>
      <section className={`placeholder-hero placeholder-${tone}`}>
        <span className="placeholder-icon"><Sparkles size={30} /></span>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="phase-badge"><Clock3 size={16} /> {t('comingNextPhase')}</div>
      </section>
      <section className="placeholder-features"><h2>{t('whatYouCanDo')}</h2><div>{copy.features.map((feature) => <article key={feature}><CheckCircle2 size={20} /><span>{feature}</span></article>)}</div></section>
      <div className="placeholder-actions"><Link to={home} className="btn btn-primary">{t('returnDashboard')}</Link><button className="btn btn-secondary" onClick={() => showToast(t('featureNextDemo'))}><BellRing size={17} /> {t('keepUpdated')}</button></div>
    </div>
  )
}
