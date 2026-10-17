// "When will it arrive?", as two real dates, and the preferred-day rules.
//
// The window and the preferred-day limits come from shop_settings, and a
// charged delivery area (delivery_areas) has its own, longer window; place_order
// enforces the same preferred-day limits, measured against today in the UK.
// Nothing is delivered on shop_settings.no_delivery_days (Mondays): a window
// that would start or end on one moves to the next delivery day, and customers
// can't pick one. Every calculation is pinned to Europe/London. Bank holidays
// aren't modelled: a hard-coded list goes stale silently, and "2 to 4 working
// days" already reads as approximate.

import { ukDate } from '@/lib/format'

export interface WindowSettings {
  delivery_min_working_days: number
  delivery_max_working_days: number
  preferred_date_min_days: number
  preferred_date_max_days: number
  /** ISO days with no deliveries (1 = Monday). */
  no_delivery_days?: number[]
}

/** A charged area's own delivery time, in working days. */
export interface AreaTiming {
  minWorkingDays: number
  maxWorkingDays: number
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** 1 = Monday … 7 = Sunday, for a UTC-midnight date. */
const isoDay = (d: Date) => d.getUTCDay() || 7

/** "We deliver every day except Monday." */
export function deliveryDaysText(noDeliveryDays: readonly number[] = []): string {
  const closed = [...new Set(noDeliveryDays)].filter((d) => d >= 1 && d <= 7).sort()
  if (closed.length === 0) return 'We deliver seven days a week.'
  const names = closed.map((d) => DAY_NAMES[d - 1]!)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `We deliver every day except ${list}.`
}

/** Today's date in Europe/London, as UTC midnight of that calendar day. */
export function londonToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
}

function addDays(from: Date, n: number): Date {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) left--
  }
  return d
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' })
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })
const DATE_NUMBER = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' })
const MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long' })

export interface DeliveryWindow {
  /** "Tue 6 – Thu 8 October", or "Thu 29 October – Mon 2 November" across months. */
  label: string
  fromISO: string
  toISO: string
}

/** The day itself, or the next one with deliveries. */
function nextDeliveryDay(from: Date, s: WindowSettings): Date {
  const closed = s.no_delivery_days ?? []
  let d = from
  for (let i = 0; i < 7 && closed.includes(isoDay(d)); i++) d = addDays(d, 1)
  return d
}

/** The working days a delivery takes: the area's own, or the shop's. */
function timing(s: WindowSettings, area: AreaTiming | null | undefined) {
  return area
    ? { min: area.minWorkingDays, max: area.maxWorkingDays }
    : { min: s.delivery_min_working_days, max: s.delivery_max_working_days }
}

export function deliveryWindow(s: WindowSettings, now: Date = new Date(), area: AreaTiming | null = null): DeliveryWindow {
  const today = londonToday(now)
  const t = timing(s, area)
  const from = nextDeliveryDay(addWorkingDays(today, t.min), s)
  const to = nextDeliveryDay(addWorkingDays(today, t.max), s)
  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear()
  const label = sameMonth
    ? `${DAY.format(from)} ${DATE_NUMBER.format(from)} – ${DAY.format(to)} ${DATE_NUMBER.format(to)} ${MONTH.format(to)}`
    : `${DAY_MONTH.format(from)} – ${DAY_MONTH.format(to)}`
  return { label, fromISO: iso(from), toISO: iso(to) }
}

/**
 * The first day a customer may pick. A slower area's moves back by the extra
 * working days it takes (as place_order does), then past any day without
 * deliveries.
 */
export function earliestPreferredDate(s: WindowSettings, now: Date = new Date(), area: AreaTiming | null = null): string {
  const extra = Math.max(0, timing(s, area).min - s.delivery_min_working_days)
  return iso(nextDeliveryDay(addDays(londonToday(now), s.preferred_date_min_days + extra), s))
}

/** True when nothing is delivered that day (a Monday). */
export function isNoDeliveryDay(value: string, noDeliveryDays: readonly number[] = []): boolean {
  return isRealDate(value) && noDeliveryDays.includes(isoDay(new Date(`${value}T00:00:00Z`)))
}

export function latestPreferredDate(s: WindowSettings, now: Date = new Date()): string {
  return iso(addDays(londonToday(now), s.preferred_date_max_days))
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && iso(parsed) === value
}

/** A day the customer may ask for on the website. */
export function isValidPreferredDate(value: string, s: WindowSettings, now: Date = new Date(), area: AreaTiming | null = null): boolean {
  return (
    isRealDate(value) &&
    value >= earliestPreferredDate(s, now, area) &&
    value <= latestPreferredDate(s, now) &&
    !isNoDeliveryDay(value, s.no_delivery_days)
  )
}

/** A day the shop agreed by phone or WhatsApp: not in the past, within a year. */
export function isValidAgreedDate(value: string, now: Date = new Date()): boolean {
  const today = londonToday(now)
  return isRealDate(value) && value >= iso(today) && value <= iso(addDays(today, 365))
}

/** "Saturday 10 October", with the year only when it isn't this year. */
export function formatDeliveryDate(value: string, now: Date = new Date()): string {
  if (!isRealDate(value)) return value
  const d = new Date(`${value}T00:00:00Z`)
  return ukDate(d, { timeZone: 'UTC', year: d.getUTCFullYear() !== londonToday(now).getUTCFullYear() })
}
