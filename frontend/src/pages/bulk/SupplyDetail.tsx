import { BadgeCheck, MapPin, ShieldCheck, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ProductImage } from '../../components/ProductImage'
import { prettyWhen } from '../../components/maps/CorridorRouteMap'
import { useToast } from '../../contexts/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { phase2Service } from '../../services/phase2Service'
import { buildProcurementPlan } from '../../services/procurementEngine'
import { prototypeService } from '../../services/prototypeService'
import { CostStack, ErrorState, FarmList, Field, PageHead, isoDay, kg, money } from './shared'

/** One pooled lot: what it is made of and what a chosen quantity lands at. */
export function BulkSupplyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [pools, listings, state] = await Promise.all([phase2Service.supplyPools(), phase2Service.listings(), prototypeService.getState()])
    const pool = pools.find((item) => item.id === id)
    return pool ? { pool, listings, vehicles: state.vehicles } : null
  }, [id])
  const [quantity, setQuantity] = useState(500)
  useEffect(() => { if (data) setQuantity(Math.min(Math.max(data.pool.moqKg, 500), data.pool.totalQuantityKg)) }, [data])

  // Priced by the same engine as a requirement, so the number here is the number the
  // Market Maker will show once this pool becomes a requirement.
  const plan = useMemo(() => data ? buildProcurementPlan({
    crop: data.pool.product, grade: 'Grade A', requiredQuantityKg: Math.max(1, quantity), targetPrice: 999,
    deliveryLocation: 'Okhla Distribution Centre, New Delhi', requiredBy: isoDay(2), deliverySlot: 'Morning · 6–10 AM', packaging: '25 kg crates',
  }, data.listings, data.vehicles) : null, [data, quantity])

  if (loading && !data) return <DashboardSkeleton />
  if (!data || error || !plan) return <ErrorState title="Supply pool not found" onRetry={refresh} />
  const { pool } = data
  const valid = quantity >= pool.moqKg && quantity <= pool.totalQuantityKg
  const range = pool.startingPrice === pool.priceMax ? `₹${pool.startingPrice}/kg` : `₹${pool.startingPrice}–₹${pool.priceMax}/kg`
  const contributions = pool.matchingListings.map((listing) => ({ farmer: listing.farm, farm: listing.farm, listingId: listing.id, quantityKg: listing.remainingKg, ratePerKg: listing.pricePerKg }))

  return (
    <div className="page b-page">
      <PageHead back={{ to: '/bulk/supply', label: 'Supply' }} title={`${pool.product} · ${pool.grade}`} copy={`${pool.corridor} corridor`} />

      <div className="b-layout">
        <div className="b-layout-main">
          <article className="b-card b-pool-summary">
            <ProductImage imageSrc={pool.imageSrc} alt="" visual={pool.visual} size="mini" />
            <div>
              <span className="b-verified"><BadgeCheck size={13} /> {pool.farmerCount} verified farm{pool.farmerCount === 1 ? '' : 's'}</span>
              <dl className="b-facts">
                <div><dt>Pooled quantity</dt><dd>{kg(pool.totalQuantityKg)}</dd></div>
                <div><dt>Farm-gate range</dt><dd>{range}</dd></div>
                <div><dt>Minimum order</dt><dd>{kg(pool.moqKg)}</dd></div>
                <div><dt>Corridor</dt><dd><MapPin size={12} /> {pool.corridor}</dd></div>
              </dl>
              <p className="b-readiness"><Truck size={16} /> {pool.readiness} · expected dispatch {prettyWhen(pool.dispatch)}</p>
            </div>
          </article>

          <section className="b-card">
            <h2>How this pool is made up</h2>
            <FarmList contributions={contributions} total={pool.totalQuantityKg} />
          </section>
        </div>

        <aside className="b-layout-aside">
          <section className="b-card b-summary">
            <h2>Price this pool</h2>
            <Field label="Quantity" htmlFor="pool-qty" hint={`Minimum ${kg(pool.moqKg)} · ${kg(pool.totalQuantityKg)} pooled`} error={valid ? undefined : `Enter between ${kg(pool.moqKg)} and ${kg(pool.totalQuantityKg)}.`}>
              <div className="unit-input">
                <input id="pool-qty" type="number" inputMode="numeric" min={pool.moqKg} max={pool.totalQuantityKg} step={50} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                <span>kg</span>
              </div>
            </Field>
            <CostStack compact produce={plan.produceValue} logistics={plan.logisticsCost} platform={plan.platformFee} landedTotal={plan.landedTotal} landedPerKg={plan.landedPerKg} benchmarkPerKg={plan.benchmarkPerKg} quantityKg={plan.matchedKg} />
            <small className="b-meta">{plan.stops.length} farm{plan.stops.length === 1 ? '' : 's'} · {plan.vehicle ? `${plan.vehicle.type}, ${plan.utilisationPct}% loaded` : 'no vehicle free'} · {plan.routeDistanceKm} km run</small>
            <button className="btn btn-primary btn-full btn-large" disabled={!valid} onClick={() => navigate('/bulk/procure', { state: { crop: pool.product, quantity } })}>Procure {kg(quantity)}</button>
            <button className="btn btn-secondary btn-full" disabled={!valid} onClick={() => showToast(`${kg(quantity)} held in this demo while you create a requirement`)}>Reserve supply</button>
            <p className="b-safe"><ShieldCheck size={15} /> Prototype reservation only. No payment or contract. Order value {money(plan.landedTotal)}.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
