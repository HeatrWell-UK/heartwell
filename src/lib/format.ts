// British formatting for money and dates, used everywhere a customer reads them.

const GBP_WHOLE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const GBP_PENCE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 })

/** £749 for whole pounds, £12.50 when there are pence. */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? GBP_WHOLE.format(amount) : GBP_PENCE.format(amount)
}

const LONG_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' })
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric' })

/** "Tuesday 6 October" */
export function formatLongDate(date: Date): string {
  return LONG_DATE.format(date)
}

/** "06/10/2026" */
export function formatShortDate(date: Date): string {
  return SHORT_DATE.format(date)
}
