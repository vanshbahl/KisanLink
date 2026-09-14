import { ChevronRight, PackageCheck, Phone, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BehtarSaudaTeaser } from '../../components/farmer/BehtarSauda'
import { HomeAiTrigger } from '../../components/farmer/FarmerAi'
import { FreshnessRing } from '../../components/farmer/FreshnessRing'
import { Money } from '../../components/farmer/Money'
import { TaskRow } from '../../components/farmer/TaskRow'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { ProductImage } from '../../components/ProductImage'
import { useAuth } from '../../contexts/AuthContext'
import { useFarmerText } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { assessFreshness, FRESHNESS_URGENCY } from '../../services/cropFreshness'
import { getCropDeals, getFarmerDeal } from '../../services/farmerDeal'
import { isRescueActive } from '../../services/farmerRescue'
import { buildFarmerTasks } from '../../services/farmerTasks'
import { prototypeService } from '../../services/prototypeService'

/**
 * Farmer home.
 *
 * One column, one rhythm, read top to bottom the way a farmer opens the app:
 *
 *   1. What is happening?        -> one sentence from real data (or nothing)
 *   2. What needs me today?      -> the task layer, at most three rows
 *   3. How are my crops?         -> a strip of the live crops, each with its selling window
 *   4. Can I sell?               -> the one dominant action
 *   5. Money and orders          -> one row, two cells, both tappable
 *
 * The previous version put a dark better-deal card between two white rows; the deal now
 * lives where it belongs — as a task when it beats the mandi, in the AI line when it is the
 * most useful thing to say, and on the crop it applies to. Nothing on this screen is a
 * widget that could not be reached by tapping through it.
 */
const MAX_TASKS = 3
const MAX_CROPS = 4

export function FarmerHome() {
  const { user } = useAuth()
  const { f, language, pick } = useFarmerText()

  const { data, loading, error, refresh } = useAsyncData(async () => {
    const [listings, orders, pickups, earnings] = await Promise.all([
      prototypeService.getMyListings(),
      prototypeService.getOrders(),
      prototypeService.getPickups(),
      prototypeService.getEarnings(),
    ])
    // Only this farm's orders — getOrders() spans the shared prototype story.
    const mine = new Set(listings.map((item) => item.id))
    const myOrders = orders.filter((order) => mine.has(order.listingId))
    const [deal, cropDeals] = await Promise.all([getFarmerDeal(listings), getCropDeals(listings)])
    return {
      listings,
      cropDeals,
      running: myOrders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled').length,
      pending: earnings.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.net, 0),
      tasks: buildFarmerTasks({ listings, orders: myOrders, pickups, earnings, deal }, language),
    }
  }, [language], { live: true })

  if (loading && !data) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <div className="page f-page error-panel">
        <h2>{f('somethingWrong')}</h2>
        <button className="btn btn-primary btn-large" onClick={refresh}>{f('retry')}</button>
      </div>
    )
  }

  const tasks = data.tasks.slice(0, MAX_TASKS)
  // The name the farmer gave at onboarding, falling back to the demo account's.
  const firstName = (user?.name || 'Vansh').split(' ')[0]

  // Live crops, the one with the least selling time first, so the strip reads as a priority.
  const crops = data.listings
    .filter((item) => item.status === 'active')
    .sort((a, b) => FRESHNESS_URGENCY[assessFreshness(b).stage] - FRESHNESS_URGENCY[assessFreshness(a).stage])
    .slice(0, MAX_CROPS)

  return (
    <div className="page f-page f-home">
      <header className="f-greet">
        <h1>{f('greeting', { name: firstName })}</h1>
        <HomeAiTrigger listings={data.listings} cropDeals={data.cropDeals} pick={pick} />
      </header>

      <section className="f-today" aria-labelledby="f-today-heading">
        <h2 id="f-today-heading" className="f-section-heading">{f('todayHeading')}</h2>
        {tasks.length ? (
          <div className="f-task-list">
            {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        ) : (
          <p className="f-today-quiet">
            <Sprout size={20} aria-hidden="true" />
            <span><strong>{f('nothingToday')}</strong><small>{f('nothingTodayHint')}</small></span>
          </p>
        )}
      </section>

      <section className="f-home-crops" aria-labelledby="f-crops-heading">
        <div className="f-home-crops-head">
          <h2 id="f-crops-heading" className="f-section-heading">{f('yourCrops')}</h2>
          {crops.length > 0 && <Link to="/farmer/fasal">{f('seeAllCrops')}<ChevronRight size={17} /></Link>}
        </div>
        {crops.length ? (
          <ul className="f-crop-strip">
            {crops.map((item) => {
              const rescue = isRescueActive(item)
              const price = rescue ? (item.rescueDiscountPricePerKg ?? item.pricePerKg) : item.pricePerKg
              return (
                <li key={item.id}>
                  <Link to={`/farmer/fasal/${item.id}`} className={`f-crop-tile${rescue ? ' is-fast' : ''}`}>
                    <ProductImage imageSrc={item.imageSrc} visual={item.visual} alt="" size="mini" />
                    <span className="f-crop-tile-copy">
                      <strong>{pick(item.crop, item.cropHi)}</strong>
                      <small>₹{price}{f('perKg')} · {item.remainingKg} {f('kg')}</small>
                    </span>
                    <FreshnessRing listing={item} size="card" className="f-crop-fresh" />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="f-today-quiet">
            <Sprout size={20} aria-hidden="true" />
            <span><strong>{f('homeNoCrops')}</strong><small>{f('homeNoCropsHint')}</small></span>
          </p>
        )}
      </section>

      <Link className="btn btn-primary btn-large btn-full f-big-action" to="/farmer/sell">
        <Sprout size={22} />{crops.length ? f('sellCrop') : f('addFirstCrop')}
      </Link>

      {/* One quiet pointer to the opportunities screen; renders nothing when no deal is open. */}
      <BehtarSaudaTeaser listings={data.listings} />

      <div className="f-home-status">
        <Link className="f-home-cell" to="/farmer/paisa">
          <span>{f('waitingForYou')}</span>
          <Money value={data.pending} size="lg" tone="good" />
        </Link>
        <Link className="f-home-cell" to="/farmer/orders">
          <span>{f('myOrders')}</span>
          <strong className="f-home-cell-line">
            <PackageCheck size={18} aria-hidden="true" />
            {data.running ? f('homeOrdersLine', { count: data.running }) : f('homeNoOrders')}
          </strong>
        </Link>
      </div>

      <a className="f-help" href="tel:18001234567">
        <Phone size={19} />
        <span>{f('callHelp')}<small>{f('helpNumber')}</small></span>
      </a>
    </div>
  )
}
