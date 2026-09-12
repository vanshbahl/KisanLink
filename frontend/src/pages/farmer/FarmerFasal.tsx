import { useState } from 'react'
import { ChevronDown, Mic, Plus, Sprout } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { CropCard } from '../../components/farmer/CropCard'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { VoiceInputModal } from '../../components/voice/VoiceInputModal'
import { useFarmerText } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getFarmerDeal } from '../../services/farmerDeal'
import { prototypeService } from '../../services/prototypeService'
import { stashVoiceDraft } from './voiceDraft'

/**
 * "मेरी फसल" — Produce and Sell Produce, which used to be two destinations, as one.
 *
 * A farmer does not think of "my listings" and "creating a listing" as separate places; they
 * think about their crops, one of which they want to sell. So this screen holds both: the
 * crops, and the way to add one — including by voice, which for many farmers is faster than
 * any form.
 *
 * Sold crops are collapsed rather than given their own tab. They are a record, not a task,
 * and four status tabs made a farmer choose a tab before seeing a single crop.
 */
const LIVE_ORDER = { active: 0, draft: 1, paused: 2, unavailable: 3, sold: 4 } as const

export function FarmerFasal() {
  const { f } = useFarmerText()
  const navigate = useNavigate()
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [showSold, setShowSold] = useState(false)

  const { data, loading, refresh } = useAsyncData(async () => {
    const listings = await prototypeService.getMyListings()
    return { listings, deal: await getFarmerDeal(listings) }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />

  const all = data?.listings ?? []
  const live = all
    .filter((item) => item.status !== 'sold')
    .sort((a, b) => LIVE_ORDER[a.status] - LIVE_ORDER[b.status])
  const sold = all.filter((item) => item.status === 'sold')

  return (
    <div className="page f-page f-fasal">
      <header className="f-page-head">
        <h1>{f('myCrops')}</h1>
        <button type="button" className="f-voice-button" onClick={() => setVoiceOpen(true)}>
          <Mic size={20} aria-hidden="true" />
          <span>{f('speakInstead')}</span>
        </button>
      </header>

      <Link className="btn btn-primary btn-large btn-full f-big-action" to="/farmer/sell">
        <Plus size={22} />{f('sellNewCrop')}
      </Link>

      {live.length ? (
        <div className="f-crop-list">
          {live.map((item) => (
            <CropCard key={item.id} item={item} deal={data?.deal ?? null} onChanged={refresh} />
          ))}
        </div>
      ) : (
        <div className="f-empty">
          <Sprout size={34} aria-hidden="true" />
          <h2>{f('noCrops')}</h2>
          <p>{f('noCropsHint')}</p>
        </div>
      )}

      {sold.length > 0 && (
        <section className="f-sold">
          <button type="button" className="f-disclose" aria-expanded={showSold} onClick={() => setShowSold(!showSold)}>
            <span>{f('soldEarlier')}</span>
            <ChevronDown size={20} className={showSold ? 'is-open' : ''} aria-hidden="true" />
          </button>
          {showSold && (
            <div className="f-crop-list">
              {sold.map((item) => (
                <CropCard key={item.id} item={item} deal={data?.deal ?? null} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Voice lands the farmer straight in the sell flow with the fields already filled,
          so speaking a sentence and reviewing it is a shorter path than the form. */}
      <VoiceInputModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={(fields) => { stashVoiceDraft(fields); navigate('/farmer/sell?voice=1') }}
      />
    </div>
  )
}
