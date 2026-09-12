import { BadgeIndianRupee, ChevronRight, PackageCheck, Sprout, TrendingUp, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFarmerText, type FarmerKey } from '../../i18n/farmer'
import type { FarmerTask, FarmerTaskKind } from '../../services/farmerTasks'

/**
 * One line of "आज क्या करना है".
 *
 * The whole row is the link, so the tap target is the row and not a small chevron. The
 * action label is a hint about what happens next, not a second competing button — a farmer
 * should never have to choose between two controls that go to the same place.
 */
const ICONS: Record<FarmerTaskKind, typeof Sprout> = {
  driver: Truck,
  accept: PackageCheck,
  ready: Sprout,
  pickup: Truck,
  paid: BadgeIndianRupee,
  deal: TrendingUp,
}

export function TaskRow({ task }: { task: FarmerTask }) {
  const { f } = useFarmerText()
  const Icon = ICONS[task.kind]
  const urgent = task.kind === 'driver' || task.kind === 'accept'

  return (
    <Link to={task.to} className={`f-task${urgent ? ' is-urgent' : ''}`}>
      <span className="f-task-icon"><Icon size={21} /></span>
      <span className="f-task-copy">
        <strong>{f(task.titleKey as FarmerKey, task.values)}</strong>
        {task.hintKey && <small>{f(task.hintKey as FarmerKey, task.hintValues)}</small>}
      </span>
      {task.actionKey
        ? <span className="f-task-action">{f(task.actionKey as FarmerKey)}</span>
        : <ChevronRight className="f-task-chevron" size={20} aria-hidden="true" />}
    </Link>
  )
}
