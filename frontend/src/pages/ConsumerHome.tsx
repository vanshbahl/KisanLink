import { ArrowRight, Heart, MapPin, Search, Sprout, Truck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GlobalModeIndicator } from '../components/GlobalModeIndicator'
import { ConsumerMarketMakerDeal } from '../components/consumer/ConsumerMarketMakerDeal'
import { ConsumerMarketplace } from '../components/marketplace/ConsumerMarketplace'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { freshPick } from '../services/consumerIntelligenceService'
import { phase2Service } from '../services/phase2Service'

export function ConsumerHome() {
  const { user } = useAuth()
  const { hash } = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState(user?.location || 'Dwarka, New Delhi')
  const locations = [...new Set([user?.location || 'Dwarka, New Delhi', 'Dwarka, New Delhi', 'Rohini, New Delhi', 'Sector 62, Noida', 'DLF Phase 3, Gurugram'])]
  const [whyOpen, setWhyOpen] = useState(false)
  const { data: intelligenceListings } = useAsyncData(() => phase2Service.listings())

  const insight = freshPick(intelligenceListings ?? [])

  useEffect(() => {
    if (hash !== '#marketplace') return
    let tries = 0
    const settle = window.setInterval(() => {
      const target = document.getElementById('marketplace')
      tries += 1
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 76
        if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: 'auto' })
        else { window.clearInterval(settle); return }
      }
      if (tries > 12) window.clearInterval(settle)
    }, 150)
    return () => window.clearInterval(settle)
  }, [hash])

  return (
    <div className="page consumer-page consumer-home">
      <header className="consumer-home-head">
        <label className="consumer-location-select"><MapPin size={18} /><select aria-label="Delivery location (demo selection)" value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)}>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
        <button className="icon-button" aria-label={searchOpen ? 'Close search' : 'Search produce'} aria-expanded={searchOpen} aria-controls="consumer-search" onClick={() => setSearchOpen(!searchOpen)}>{searchOpen ? <X size={19} /> : <Search size={19} />}</button>
      </header>

      {insight.listingId && <Link className="consumer-top-insight" to={`/consumer/listing/${insight.listingId}`}><span><strong>Kisan Intelligence</strong><span>{intelligenceListings?.find((listing) => listing.id === insight.listingId)?.crop}: ₹{insight.price}/kg{(insight.retail ?? 0) > (insight.price ?? 0) ? `, ₹${Math.round((insight.retail ?? 0) - (insight.price ?? 0))}/kg below local retail.` : '. A pick based on freshness and stock.'}</span></span><ArrowRight size={18} /></Link>}
      <ConsumerMarketMakerDeal />
      <ConsumerMarketplace searchOpen={searchOpen} />

      <button className="consumer-why-row" type="button" onClick={() => setWhyOpen(true)}>
        <span className="consumer-why-icon"><Sprout size={20} /></span>
        <span><strong>How KisanLink works</strong><small>Farmers earn more. You pay less.</small></span>
        <span>See how <ArrowRight size={15} /></span>
      </button>

      <footer className="consumer-connection"><GlobalModeIndicator compact /></footer>

      {whyOpen && <div className="consumer-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWhyOpen(false) }}>
        <section className="consumer-why-sheet" role="dialog" aria-modal="true" aria-labelledby="consumer-why-title">
          <header><div><span>Farm to your door</span><h2 id="consumer-why-title">A shorter produce journey</h2></div><button className="icon-button" onClick={() => setWhyOpen(false)} aria-label="Close"><X size={19} /></button></header>
          <div className="consumer-why-flow">
            <span><Sprout size={22} /><strong>Farm</strong><small>Freshly harvested</small></span><ArrowRight size={18} />
            <span><Truck size={22} /><strong>Pooled pickup</strong><small>One fuller route</small></span><ArrowRight size={18} />
            <span><Heart size={22} /><strong>You</strong><small>Fair local price</small></span>
          </div>
          <p>Nearby orders share one pickup route. That helps farmers keep more of the price while buyers pay less than local retail.</p>
          <Link className="btn btn-secondary btn-full" to="/consumer/how-it-works" onClick={() => setWhyOpen(false)}>View the full journey</Link>
        </section>
      </div>}
    </div>
  )
}
