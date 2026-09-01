import { ArrowRight, PackageOpen, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProduceArtwork } from '../components/ProduceArtwork'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { farmerService } from '../services/farmerService'

export function FarmerProducePage() {
  const { language } = useLanguage()
  const { data, loading } = useAsyncData(() => farmerService.getListings())
  if (loading) return <DashboardSkeleton />
  return (
    <div className="page">
      <div className="page-title-row"><div><span className="eyebrow">{language === 'hi' ? 'आपकी उपज' : 'Your harvest'}</span><h1>{language === 'hi' ? 'मेरी फसल' : 'My Produce'}</h1><p>{language === 'hi' ? 'आपकी सभी सक्रिय फसलों की जानकारी।' : 'Everything you are currently offering to buyers.'}</p></div><Link className="btn btn-primary" to="/farmer/sell"><Sprout size={18} /> {language === 'hi' ? 'नई फसल बेचें' : 'Sell new produce'}</Link></div>
      <div className="farmer-listing-grid">{data?.map((listing) => <article className="farmer-listing" key={listing.id}><ProduceArtwork emoji={listing.emoji} visual={listing.visual} size="mini" /><div><div><h2>{listing.product}</h2><StatusBadge tone="green">Active</StatusBadge></div><p><PackageOpen size={15} /> {listing.availableKg} kg available</p><strong>₹{listing.pricePerKg}/kg <small>Direct price</small></strong></div><Link to="/farmer/produce/details">Manage <ArrowRight size={16} /></Link></article>)}</div>
      <article className="gentle-banner"><span>💡</span><div><strong>Buyer interest is highest for tomatoes this week.</strong><p>Keeping your quantity up to date helps us find the right buyers.</p></div><Link to="/farmer/insights">See insight</Link></article>
    </div>
  )
}
