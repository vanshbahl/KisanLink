import { ArrowRight, Boxes, ChevronRight, ClipboardCheck, PackageCheck, Plus, Radar, Sprout, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MarketplaceAiTrigger } from '../../components/ai/MarketplaceAiTrigger'
import { MarketplaceInsightResult } from '../../components/ai/MarketplaceInsightResult'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ProductImage } from '../../components/ProductImage'
import { useAuth } from '../../contexts/AuthContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { procurementPulse } from '../../services/bulkIntelligenceService'
import { inspectionService } from '../../services/inspectionService'
import { marketMakerService, type MarketView } from '../../services/marketMakerService'
import { phase2Service } from '../../services/phase2Service'
import { prototypeService } from '../../services/prototypeService'
import type { LotTrail } from '../../types'
import { buildAttention, dispatchAdvice, type AttentionKind } from './attention'
import { AiNote, Badge, ErrorState, FillBar, SectionHead, isActiveOrder, kg, money, orderEta, orderLabel, orderTone, perKg, poolEstimate, buyerCurrentPerKg } from './shared'

const ATTENTION_ICON: Record<AttentionKind, typeof Sprout> = {
  receipt: ClipboardCheck, arriving: Truck, match_ready: Radar, accept_match: PackageCheck, price: Sprout, short: Boxes,
}

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * Bulk Buyer home: the procurement desk's morning read.
 *
 *   1. Who and where                      -> greeting, receiving site
 *   2. The two things a buyer does        -> procure, browse
 *   3. What needs a decision today        -> at most three rows, each about a real crop
 *   4. The one Market Maker opportunity   -> one card, never repeated elsewhere on Home
 *   5. What could be ordered right now    -> three supply cards
 *   6. What is already moving             -> compact list of active orders
 *
 * No KPI grid: totals that nobody acts on were removed rather than restyled.
 */
export function BulkHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [rfqs, orders, pools, listings, profile, state, market] = await Promise.all([
      phase2Service.rfqs(), phase2Service.bulkOrders(), phase2Service.supplyPools(), phase2Service.listings(), phase2Service.bulkProfile(), prototypeService.getState(), marketMakerService.board(),
    ])
    const active = orders.filter(isActiveOrder)
    const lotCodes = [...new Set(active.flatMap((order) => order.contributions.map((item) => item.lotCode)).filter((code): code is string => Boolean(code)))]
    const trailList = await Promise.all(lotCodes.map((code) => inspectionService.getLotTrail(code)))
    const trails: Record<string, LotTrail | undefined> = {}
    lotCodes.forEach((code, index) => { trails[code] = trailList[index] })
    return {
      rfqs, orders, pools, listings, profile, market, vehicles: state.vehicles, deliveries: state.deliveries,
      attention: buildAttention({ rfqs, orders, deliveries: state.deliveries, market, trails }),
    }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Unable to load the procurement desk" onRetry={refresh} />

  const firstName = data.profile.representative.split(' ')[0]
  const site = data.profile.deliveryAddresses[0]?.split(',')[0] ?? user?.location ?? 'Delhi NCR'
  const activeOrders = data.orders.filter(isActiveOrder).slice(0, 4)
  const market = data.market
  const advice = market ? dispatchAdvice(market) : null

  return (
    <div className="page b-page b-home">
      <header className="b-home-head">
        <h1>FreshKart Procurement</h1>
        <Link to="/bulk/profile" className="b-avatar" aria-label="Profile"><span>{user?.avatarInitials ?? 'FP'}</span></Link>
      </header>

      <div className="b-context">
        <strong>{greeting()}, {firstName}</strong>
        <span>{site}</span>
      </div>

      <div className="b-primary-actions">
        <Link className="btn btn-primary btn-large" to="/bulk/procure?new=1"><Plus size={18} /> Procure Produce</Link>
        <Link className="btn btn-secondary btn-large" to="/bulk/supply">Browse Supply</Link>
      </div>

      <section aria-labelledby="b-attn-heading">
        <SectionHead id="b-attn-heading" title="Needs your attention" />
        {data.attention.length ? (
          <ul className="b-attn-list">
            {data.attention.map((item) => {
              const Icon = ATTENTION_ICON[item.kind]
              return (
                <li key={item.id}>
                  <Link to={item.to} className={`b-attn${item.urgent ? ' is-urgent' : ''}`}>
                    <span className="b-attn-icon"><Icon size={19} /></span>
                    <span className="b-attn-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <span className="b-attn-action">{item.action}<ChevronRight size={16} /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="b-quiet"><Sprout size={18} aria-hidden="true" /><span><strong>Nothing waiting on you</strong><small>Requirements are matched and orders are moving.</small></span></p>
        )}
        <MarketplaceAiTrigger
          variant="inline"
          className="b-pulse"
          idleLabel="Ask"
          idleHint="Which requirement or supply signal needs a decision today?"
          stages={['Reviewing open requirements', 'Checking available supply', 'Comparing price signals', 'Checking delivery readiness']}
          run={() => procurementPulse(data.rfqs, data.listings)}
          renderResult={(insight, reset) => (
            <MarketplaceInsightResult
              {...insight}
              onClose={reset}
              onCta={() => insight.href ? navigate(insight.href.replace('/bulk/requests', '/bulk/procure')) : reset()}
              footer="Uses the active requirements, listing availability and current supply-pool data."
            />
          )}
        />
      </section>

      {market && advice && (
        <section aria-labelledby="b-mm-heading">
          <SectionHead id="b-mm-heading" title="Market Maker opportunity" to="/bulk/market" linkLabel="All opportunities" />
          <MarketOpportunityCard market={market} advice={advice} />
        </section>
      )}

      <section aria-labelledby="b-supply-heading">
        <SectionHead id="b-supply-heading" title="Supply ready now" to="/bulk/supply" />
        <div className="b-supply-mini-grid">
          {data.pools.slice(0, 3).map((pool) => {
            const estimate = poolEstimate(pool, data.listings, data.vehicles)
            return (
              <Link to={`/bulk/supply/${pool.id}`} key={pool.id} className="b-supply-mini">
                <ProductImage imageSrc={pool.imageSrc} alt="" visual={pool.visual} size="mini" />
                <span className="b-supply-mini-copy">
                  <strong>{pool.product}</strong>
                  <small>{kg(pool.totalQuantityKg)} · {pool.farmerCount} farm{pool.farmerCount === 1 ? '' : 's'} · {pool.grade}</small>
                  <span className="b-supply-mini-price">{perKg(estimate.landedPerKg)} landed{estimate.savingPerKg > 0 && <em> · save ₹{estimate.savingPerKg.toFixed(0)}/kg</em>}</span>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="b-active-heading">
        <SectionHead id="b-active-heading" title="Active procurement" to="/bulk/orders" />
        {activeOrders.length ? (
          <ul className="b-order-mini-list">
            {activeOrders.map((order) => {
              const delivery = data.deliveries.find((entry) => entry.orderRefs.includes(order.id))
              const step = Math.max(0, ['confirmed', 'farmers_preparing', 'pickup_scheduled', 'consolidating', 'in_transit', 'delivered'].indexOf(order.status))
              return (
                <li key={order.id}>
                  <Link to={`/bulk/orders/${order.id}`} className="b-order-mini">
                    <span className="b-order-mini-copy">
                      <strong>{kg(order.orderedQuantityKg)} {order.crop}</strong>
                      <small>{orderLabel[order.status]} · arriving {orderEta(order, delivery)}</small>
                      <FillBar pct={(step / 5) * 100} tone="green" label={`${orderLabel[order.status]}`} />
                    </span>
                    <span className="b-order-mini-side">
                      <Badge tone={orderTone(order.status)}>{orderLabel[order.status]}</Badge>
                      {order.traditionalEstimate > order.total && <small className="b-good">{money(order.traditionalEstimate - order.total)} saved</small>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="b-quiet"><PackageCheck size={18} aria-hidden="true" /><span><strong>No orders in progress</strong><small>Accept a matched requirement to create one.</small></span></p>
        )}
      </section>
    </div>
  )
}

/**
 * The single Market Maker surface on Home. Crop, pooled against required, farms, landed
 * price, saving, truck utilisation, and one sentence on whether to dispatch now or wait.
 */
export function MarketOpportunityCard({ market, advice, compact = false }: { market: MarketView; advice: ReturnType<typeof dispatchAdvice>; compact?: boolean }) {
  const { board, math } = market
  const created = board.status === 'created'
  const structural = math.blockers.find((item) => item.kind !== 'demand')
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg : math.committedKg
  const landed = math.viable || created ? math.deliveredPerKg : math.deliveredAtThresholdPerKg
  const savingPerKg = Math.max(0, buyerCurrentPerKg(market) - landed)
  const farms = math.allocations.filter((entry) => entry.allocatedKg > 0).length || board.lots.length
  return (
    <article className={`b-mm-card${created ? ' is-created' : math.viable ? ' is-viable' : structural ? ' is-blocked' : ''}`}>
      <header className="b-mm-card-head">
        <div>
          <span className="b-mm-eyebrow"><Radar size={14} /> {board.corridor} corridor</span>
          <h3>{board.crop} · {board.grade}</h3>
        </div>
        <Badge tone={created ? 'green' : math.viable ? 'green' : structural ? 'red' : 'amber'}>
          {created ? 'Market created' : math.viable ? 'Ready to dispatch' : structural ? 'Blocked' : `${kg(math.gapKg)} to go`}
        </Badge>
      </header>
      <div className="b-mm-pool">
        <strong>{kg(math.committedKg)}<small> pooled of {kg(threshold)} required</small></strong>
        <FillBar pct={Math.min(100, math.progressPct)} tone={math.viable ? 'green' : 'harvest'} label={`${math.committedKg} of ${threshold} kg`} />
      </div>
      <dl className="b-mm-stats">
        <div><dt>Farms</dt><dd>{farms}</dd></div>
        <div><dt>Landed</dt><dd>{perKg(landed)}</dd></div>
        <div><dt>Saving</dt><dd className="b-good">₹{savingPerKg.toFixed(2)}/kg</dd></div>
        <div><dt>Truck</dt><dd>{math.utilisationPct}%</dd></div>
      </dl>
      <AiNote tone={advice.tone} text={advice.text} />
      {!compact && (
        <Link className="btn btn-secondary b-mm-card-cta" to="/bulk/market">
          {created ? 'View market' : math.viable ? 'Create the direct market' : 'Add your requirement'} <ArrowRight size={15} />
        </Link>
      )}
    </article>
  )
}
