import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Edit3, Eye, PackageCheck, Sprout } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BetterDealCard } from '../../components/farmer/BetterDealCard'
import { CropActions } from '../../components/farmer/CropActions'
import { LotQualityCard } from '../../components/inspection/LotQualityCard'
import { ProductImage } from '../../components/ProductImage'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useFarmerText, relativeDay } from '../../i18n/farmer'
import { getFarmerDeal, type FarmerDeal } from '../../services/farmerDeal'
import { inspectionService } from '../../services/inspectionService'
import { prototypeService } from '../../services/prototypeService'
import { daysUntil } from '../../utils/dates'
import type { CustodyStage, FarmerListing } from '../../types'

/**
 * One crop.
 *
 * Reached by tapping a crop rather than by pressing a "Manage" button, so the page can be
 * about the crop instead of about administering it: what it fetches, how much is left, what
 * has happened to it, and — when one is open — the better deal that applies to it.
 *
 * The secondary operations are not repeated here as another row of buttons; the same `⋯`
 * sheet the list uses is reused, so there is exactly one place a farmer learns to find them.
 */
export function FarmerCropDetail() {
  const { id } = useParams()
  const { f, language, pick } = useFarmerText()
  const navigate = useNavigate()
  const [item, setItem] = useState<FarmerListing | null | undefined>(undefined)
  const [deal, setDeal] = useState<FarmerDeal | null>(null)
  const [pickupStage, setPickupStage] = useState<CustodyStage | undefined>()

  const load = () => { if (id) void prototypeService.getListing(id).then(setItem) }
  useEffect(load, [id])
  useEffect(() => { void getFarmerDeal().then(setDeal) }, [])
  useEffect(() => {
    if (!item?.lotCode) return
    void inspectionService.getLotTrail(item.lotCode)
      .then((trail) => setPickupStage(trail?.stages.find((stage) => stage.checkpoint === 'LOGISTICS_PICKUP')))
  }, [item?.lotCode])

  if (item === undefined) return <DashboardSkeleton />
  if (!item) {
    return (
      <div className="page f-page f-empty">
        <Sprout size={34} aria-hidden="true" />
        <h2>{f('noCrops')}</h2>
        <Link className="btn btn-primary btn-large" to="/farmer/fasal">{f('seeMyCrops')}</Link>
      </div>
    )
  }

  const crop = pick(item.crop, item.cropHi)
  const rescue = Boolean(item.isUrgentRescue || item.rescueStatus === 'RESCUE_ACTIVE')
  const price = rescue ? (item.rescueDiscountPricePerKg ?? item.pricePerKg) : item.pricePerKg
  const dealApplies = deal && deal.cropEn.toLowerCase() === item.crop.toLowerCase() && deal.gainPerKg > 0

  return (
    <div className="page f-page f-crop-detail">
      <button type="button" className="back-link" onClick={() => navigate('/farmer/fasal')}>
        <ArrowLeft size={18} />{f('myCrops')}
      </button>

      <header className="f-crop-hero">
        <ProductImage imageSrc={item.imageSrc} visual={item.visual} alt={item.crop} size="hero" />
        <div className="f-crop-hero-copy">
          {rescue && <span className="f-crop-status is-fast">{f('sellItFastOn')}</span>}
          <h1>{crop}</h1>
          <div className="f-crop-hero-price">
            <strong>₹{price}<small>{f('perKg')}</small></strong>
            {rescue && <s>₹{item.pricePerKg}</s>}
          </div>
          <dl className="f-facts is-inline">
            <div><dt>{f('left')}</dt><dd>{item.remainingKg} {f('kg')}</dd></div>
            <div><dt>{f('promised')}</dt><dd>{item.allocatedKg} {f('kg')}</dd></div>
            <div><dt>{f('mandiRate')}</dt><dd>₹{item.mandiPricePerKg}{f('perKg')}</dd></div>
          </dl>
        </div>
      </header>

      {/* Only the action row is reused, not the whole card — the hero above already says
          which crop this is and what it fetches, and repeating that inside a nested card was
          the exact card-in-a-card pattern this redesign is removing. The verb and the `⋯`
          sheet are identical to the list, so there is still one behaviour to learn. */}
      {item.status !== 'sold' && <CropActions item={item} deal={deal} onChanged={load} />}

      {dealApplies && deal && <BetterDealCard deal={deal} compact />}

      {item.lotCode && (
        <LotQualityCard
          quantityKg={item.quantityKg}
          containerCount={item.containerCount}
          photoCount={item.overviewPhotos?.length ?? 0}
          pickupStage={pickupStage}
        />
      )}

      <section className="f-card">
        <h2>{f('whatHappened')}</h2>
        <ol className="f-history">
          <li>
            <span><Check size={15} /></span>
            <div><strong>{f('putOnSale')}</strong><small>{relativeDay(language, item.createdAt, daysUntil(item.createdAt))}</small></div>
          </li>
          {item.views > 0 && (
            <li>
              <span><Eye size={15} /></span>
              <div>
                <strong>{f('buyersLooked', { views: item.views })}</strong>
                <small>{f('buyersAsked', { count: item.inquiries })}</small>
              </div>
            </li>
          )}
          {item.allocatedKg > 0 && (
            <li>
              <span><PackageCheck size={15} /></span>
              <div><strong>{f('orderCame', { qty: item.allocatedKg })}</strong></div>
            </li>
          )}
          <li>
            <span><Edit3 size={15} /></span>
            <div><strong>{f('quantityChanged', { qty: item.remainingKg })}</strong></div>
          </li>
          {item.assisted && (
            <li>
              <span><Check size={15} /></span>
              <div><strong>{f('helpedBy')}</strong></div>
            </li>
          )}
        </ol>
      </section>
    </div>
  )
}
