/**
 * Calendar-day helpers that stay in the viewer's own timezone.
 *
 * `new Date(y, m, d).toISOString().slice(0, 10)` is the obvious way to write "today plus n
 * days" and is wrong east of Greenwich: local midnight in IST is 18:30 UTC the *previous*
 * day, so every seeded date landed one day early and "tomorrow's pickup" rendered as
 * "today". These build the string from local components instead, so a date only ever means
 * the day the user is actually looking at.
 */

/** yyyy-mm-dd for today plus `offset` days, in local time. */
export function localDay(offset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return toLocalIso(date)
}

/** yyyy-mm-dd for a Date, in local time. */
export function toLocalIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Whole days from today to a yyyy-mm-dd date; negative for past dates. */
export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`)
  if (!Number.isFinite(target.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
