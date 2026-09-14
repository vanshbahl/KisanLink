import { useState } from 'react'
import { ArrowLeft, Handshake } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { OpportunityCard, OpportunitySheet } from '../../components/farmer/BehtarSauda'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOpportunities, type Opportunity } from '../../services/farmerOpportunities'
import { prototypeService } from '../../services/prototypeService'

/**
 * "बेहतर सौदा" — the farmer's opportunity marketplace.
 *
 * Answers one question: what better deals are open for me right now? Every row is an
 * `Opportunity` from `farmerOpportunities.ts`, already ranked for this farmer, and the
 * screen knows nothing about where a row came from beyond what the row carries. A second
 * source of deals (a bulk RFQ, a consumer pool) is a new builder in that module, not a new
 * screen.
 *
 * Tapping a row opens the deal in the shared sheet. Joining reuses what the crop page's
 * Market Maker already does: with a live listing for the crop, the listing takes the deal
 * price and is tagged with the board; without one, the farmer lists the crop first, and the
 * sell flow carries the board tag through so the new listing joins the same deal.
 */
export function FarmerSauda() {
  const { f, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, refresh } = useAsyncData(() => getOpportunities(), [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <div className="page f-page error-panel">
        <h2>{f('somethingWrong')}</h2>
        <button className="btn btn-primary btn-large" onClick={refresh}>{f('retry')}</button>
      </div>
    )
  }

  const opened = data.find((row) => row.id === openId) ?? null

  const join = async (opportunity: Opportunity) => {
    const crop = pick(opportunity.cropEn, opportunity.cropHi)
    if (!opportunity.listingId) {
      // No live listing for this crop: list it, carrying the board so the listing joins the deal.
      setOpenId(null)
      navigate(`/farmer/sell?crop=${encodeURIComponent(opportunity.cropEn)}&deal=${encodeURIComponent(opportunity.boardId)}`)
      return
    }
    setBusy(true)
    try {
      await prototypeService.patchListing(opportunity.listingId, {
        pricePerKg: opportunity.offeredPerKg,
        priceLocked: true,
        marketMakerId: opportunity.boardId,
        status: 'active',
      })
      showToast(f('saudaJoinedToast', { crop, price: `₹${opportunity.offeredPerKg}` }))
      setOpenId(null)
    } catch { showToast(f('somethingWrong')) }
    finally { setBusy(false); refresh() }
  }

  return (
    <div className="page f-page f-sauda-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />{f('back')}
      </button>

      <header className="f-sauda-page-head">
        <span className="f-sauda-page-mark" aria-hidden="true"><Handshake size={22} /></span>
        <div>
          <p className="f-sauda-eyebrow">{f('saudaPoweredBy')}</p>
          <h1>{f('saudaTitle')}</h1>
          <p className="f-sauda-page-sub">{f('saudaSubtitle')}</p>
        </div>
      </header>

      {data.length ? (
        <section className="f-opp-list" aria-label={f('saudaTitle')}>
          {data.map((row) => (
            <OpportunityCard key={row.id} opportunity={row} onOpen={() => setOpenId(row.id)} />
          ))}
        </section>
      ) : (
        <div className="f-empty">
          <Handshake size={34} aria-hidden="true" />
          <h2>{f('saudaEmpty')}</h2>
          <p>{f('saudaEmptyHint')}</p>
          <Link className="btn btn-primary btn-large" to="/farmer/sell">{f('sellCrop')}</Link>
        </div>
      )}

      {data.length > 0 && <p className="f-note">{f('marketDisclaimer')}</p>}

      {opened && (
        <OpportunitySheet
          opportunity={opened}
          open
          busy={busy}
          onClose={() => setOpenId(null)}
          onJoin={() => { void join(opened) }}
        />
      )}
    </div>
  )
}
