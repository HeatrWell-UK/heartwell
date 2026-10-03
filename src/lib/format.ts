// British formatting for money and dates, used everywhere a customer reads them.

const GBP_WHOLE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const GBP_PENCE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 })

/** £749 for whole pounds, £12.50 when there are pence. */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? GBP_WHOLE.format(amount) : GBP_PENCE.format(amount)
}

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * "Tuesday 6 October", "Tuesday 6 October 2026" or "6 October 2026", assembled
 * from parts so the house style (no commas) never depends on the browser's
 * date patterns. timeZone 'UTC' is for calendar dates already pinned to a day.
 */
export function ukDate(
  date: Date,
  { weekday = true, year = false, timeZone = 'Europe/London' }: { weekday?: boolean; year?: boolean; timeZone?: string } = {},
): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: weekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: year ? 'numeric' : undefined,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return [weekday ? get('weekday') : null, get('day'), get('month'), year ? get('year') : null].filter(Boolean).join(' ')
}

/** "Tuesday 6 October" */
export function formatLongDate(date: Date): string {
  return ukDate(date)
}

/** "06/10/2026" */
export function formatShortDate(date: Date): string {
  return SHORT_DATE.format(date)
}
