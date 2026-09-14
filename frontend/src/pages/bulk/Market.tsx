import { ArrowRight, Building2, MapPinned, PackageCheck, Radar, RotateCcw, Sprout, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { MarketCommitPanel } from '../../components/market/MarketCommitPanel'
import { MarketUnlockReveal, type MarketCreationResult } from '../../components/market/MarketUnlockReveal'
import { MarketWhyPanel } from '../../components/market/MarketWhyPanel'
import { MultiCropCorridorCard } from '../../components/market/MultiCropCorridorCard'
import { useToast } from '../../contexts/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import { dispatchAdvice } from './attention'
import { MarketOpportunityCard } from './Home'
import { Badge, ErrorState, FillBar, PageHead, kg, money, perKg, buyerCurrentPerKg } from './shared'

/**
 * Market opportunities for the buyer: every corridor the Market Maker is forming, what it
 * still needs, and what it saves once viable. The commit and create actions are the same
 * service calls as before; the page is a list and one detail, not an operations console.
 */
export function BulkMarketPage() {
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cropId, setCropId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<MarketCreationResult | null>(null)

  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [views, profile] = await Promise.all([marketMakerService.boards(), phase2Service.bulkProfile()])
    return { views, profile }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error || !data.views.length) return <ErrorState title="No market corridor is open" onRetry={refresh} />

  const views = [...data.views].sort((a, b) => rank(a) - rank(b))
  const selected = views.find((view) => view.board.id === selectedId) ?? views[0]
  const { board, math } = selected
  const created = board.status === 'created'
  const structural = math.blockers.find((item) => item.kind !== 'demand')

  const guard = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try { await action(); showToast(success) }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'That change could not be applied.') }
    finally { setBusy(false); refresh() }
  }

  const commit = (quantityKg: number) => guard(async () => {
    const result = await marketMakerService.commit(board.id, { source: 'bulk', party: data.profile.businessName, detail: board.destination, quantityKg, own: true, cropId: board.isMultiCrop ? cropId ?? board.crops?.[0]?.id : undefined })
    if (result.math.viable) showToast('Break-even reached. This market can be created.')
  }, `${quantityKg} kg committed to ${board.corridor}`)

  const create = async () => {
    setBusy(true)
    try {
      const result = await marketMakerService.createMarket(board.id)
      setReveal({ routeId: result.routeId, farmerOrderIds: result.farmerOrderIds, bulkOrderId: result.bulkOrderId, consumerOrderId: result.consumerOrderId, pickupIds: result.pickupIds, deliveryIds: result.deliveryIds })
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'This market could not be created.') }
    finally { setBusy(false); refresh() }
  }

  return (
    <div className="page b-page b-market">
      <PageHead title="Market opportunities" copy="Corridors where pooled demand turns a small requirement into a viable direct trip." />

      <div className="b-layout b-layout-master">
        <ul className="b-opp-list" aria-label="Corridors">
          {views.map((view) => <OpportunityRow key={view.board.id} view={view} selected={view.board.id === selected.board.id} onSelect={() => { setSelectedId(view.board.id); setCropId(undefined) }} />)}
        </ul>

        <div className="b-layout-main b-opp-detail">
          <MarketOpportunityCard market={selected} advice={dispatchAdvice(selected)} compact />

          {board.isMultiCrop && <MultiCropCorridorCard board={board} math={math} onSelectCrop={setCropId} />}

          {!created && !structural && (
            <MarketCommitPanel board={board} math={math} busy={busy} source="bulk" party={data.profile.businessName} detail={board.destination} unit={10} max={400} onCommit={commit} />
          )}

          {!created && math.viable && (
            <button type="button" className="btn btn-primary btn-large btn-full" disabled={busy} onClick={create}>
              <Zap size={18} /> Create the direct market
            </button>
          )}

          {created && (
            <div className="b-card b-created">
              <h3>This market created</h3>
              <div className="b-created-links">
                {board.bulkOrderId && <Link to={`/bulk/orders/${board.bulkOrderId}`}><Building2 size={15} /> Procurement order {board.bulkOrderId} <ArrowRight size={14} /></Link>}
                {board.farmerOrderIds?.[0] && <span><Sprout size={15} /> {board.farmerOrderIds.length} farmer order{board.farmerOrderIds.length === 1 ? '' : 's'}</span>}
                {board.pickupIds?.length ? <span><PackageCheck size={15} /> {board.pickupIds.length} farm pickups</span> : null}
                {board.routeId && <span><MapPinned size={15} /> Route {board.routeId}</span>}
              </div>
              <small className="b-meta">Each record was written into shared prototype state. Other roles see it from their own screens.</small>
            </div>
          )}

          <MarketWhyPanel board={board} math={math} defaultOpen={false} />

          <div className="b-market-foot">
            <p className="b-note">Break-even volume, freight, delivered price and payouts are computed from listings, fleet and commitments in shared prototype state.</p>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => guard(() => prototypeService.seedScenario('market'), 'Corridor reset to the forming state')}>
              <RotateCcw size={14} /> Reset corridor
            </button>
          </div>
        </div>
      </div>

      {reveal && <MarketUnlockReveal board={board} math={math} result={reveal} role="bulk" onClose={() => { setReveal(null); refresh() }} />}
    </div>
  )
}

const rank = (view: MarketView) => view.board.status === 'created' ? 2 : view.math.viable ? 0 : view.math.blockers.some((item) => item.kind !== 'demand') ? 3 : 1

function OpportunityRow({ view, selected, onSelect }: { view: MarketView; selected: boolean; onSelect: () => void }) {
  const { board, math } = view
  const created = board.status === 'created'
  const structural = math.blockers.find((item) => item.kind !== 'demand')
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg : math.committedKg
  const landed = math.viable || created ? math.deliveredPerKg : math.deliveredAtThresholdPerKg
  const savingPerKg = Math.max(0, buyerCurrentPerKg(view) - landed)
  const title = board.isMultiCrop ? `${board.crops?.map((crop) => crop.crop).join(', ') ?? board.crop}` : board.crop
  return (
    <li>
      <button type="button" className={`b-opp${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
        <div className="b-opp-head">
          <div>
            <strong>{title}</strong>
            <small><Radar size={12} /> {board.corridor}</small>
          </div>
          <Badge tone={created ? 'green' : math.viable ? 'green' : structural ? 'red' : 'amber'}>
            {created ? 'Created' : math.viable ? 'Viable' : structural ? 'Blocked' : 'Forming'}
          </Badge>
        </div>
        <div className="b-opp-progress">
          <FillBar pct={Math.min(100, math.progressPct)} tone={math.viable || created ? 'green' : 'harvest'} label={`${math.committedKg} of ${threshold} kg`} />
          <small>{kg(math.committedKg)} demand · {kg(threshold)} threshold{!math.viable && !created && math.gapKg > 0 ? ` · ${kg(math.gapKg)} still needed` : ''}</small>
        </div>
        <dl className="b-opp-facts">
          <div><dt>Landed</dt><dd>{perKg(landed)}</dd></div>
          <div><dt>Saving</dt><dd className="b-good">₹{savingPerKg.toFixed(2)}/kg</dd></div>
          {math.viable && <div><dt>On this pool</dt><dd className="b-good">{money(Math.max(0, math.buyerSavingTotal))}</dd></div>}
        </dl>
        <span className="b-opp-cta">{created ? 'View market' : math.viable ? 'Create market' : 'Add demand'} <ArrowRight size={14} /></span>
      </button>
    </li>
  )
}
