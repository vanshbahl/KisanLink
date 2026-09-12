import { ChevronRight, PackageCheck, Phone, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BetterDealCard } from '../../components/farmer/BetterDealCard'
import { Money } from '../../components/farmer/Money'
import { TaskRow } from '../../components/farmer/TaskRow'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useAuth } from '../../contexts/AuthContext'
import { useFarmerText } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getFarmerDeal } from '../../services/farmerDeal'
import { buildFarmerTasks } from '../../services/farmerTasks'
import { prototypeService } from '../../services/prototypeService'

/**
 * Farmer home.
 *
 * The old dashboard opened with three KPI tiles, two AI cards, a four-tile action grid and a
 * price panel — seven blocks before the farmer could do anything. This screen answers the
 * four questions that actually bring a farmer into the app, in the order they matter:
 *
 *   1. What needs me today?     -> the task layer, derived from real records
 *   2. Can I sell?              -> one dominant action
 *   3. Is the price good?       -> one better-deal card
 *   4. When do I get paid?      -> one money line
 *
 * At most three tasks are shown. A farmer with a quiet day gets told it is quiet, rather
 * than being handed manufactured suggestions to make the screen look busy.
 */
const MAX_TASKS = 3

export function FarmerHome() {
  const { user } = useAuth()
  const { f, language } = useFarmerText()

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
    const deal = await getFarmerDeal(listings)
    return {
      deal,
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
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="page f-page f-home">
      <header className="f-greet">
        <h1>{f('greeting', { name: firstName })}</h1>
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

      <nav className="f-primary-actions" aria-label={f('todayHeading')}>
        <Link className="btn btn-primary f-big-action" to="/farmer/sell">
          <Sprout size={22} />{f('sellCrop')}
        </Link>
        <Link className="btn btn-secondary f-big-action" to="/farmer/orders">
          <PackageCheck size={22} />{f('myOrders')}
        </Link>
      </nav>

      {data.deal && <BetterDealCard deal={data.deal} compact />}

      <Link className="f-money-strip" to="/farmer/paisa">
        <span>{f('waitingForYou')}</span>
        <Money value={data.pending} size="lg" tone="good" />
        <ChevronRight size={20} aria-hidden="true" />
      </Link>

      <a className="f-help" href="tel:18001234567">
        <Phone size={19} />
        <span>{f('callHelp')}<small>{f('helpNumber')}</small></span>
      </a>
    </div>
  )
}
