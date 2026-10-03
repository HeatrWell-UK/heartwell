// "When will it arrive?", as two real dates, and the preferred-day rules.
//
// The window and the preferred-day limits come from shop_settings; place_order
// enforces the same preferred-day limits, measured against today in the UK.
// Every calculation is pinned to Europe/London. Bank holidays aren't modelled:
// a hard-coded list goes stale silently, and "2 to 4 working days" already
// reads as approximate.

import { ukDate } from '@/lib/format'

export interface WindowSettings {
  delivery_min_working_days: number
  delivery_max_working_days: number
  preferred_date_min_days: number
  preferred_date_max_days: number
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

export function deliveryWindow(s: WindowSettings, now: Date = new Date()): DeliveryWindow {
  const today = londonToday(now)
  const from = addWorkingDays(today, s.delivery_min_working_days)
  const to = addWorkingDays(today, s.delivery_max_working_days)
  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear()
  const label = sameMonth
    ? `${DAY.format(from)} ${DATE_NUMBER.format(from)} – ${DAY.format(to)} ${DATE_NUMBER.format(to)} ${MONTH.format(to)}`
    : `${DAY_MONTH.format(from)} – ${DAY_MONTH.format(to)}`
  return { label, fromISO: iso(from), toISO: iso(to) }
}

export function earliestPreferredDate(s: WindowSettings, now: Date = new Date()): string {
  return iso(addDays(londonToday(now), s.preferred_date_min_days))
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
export function isValidPreferredDate(value: string, s: WindowSettings, now: Date = new Date()): boolean {
  return isRealDate(value) && value >= earliestPreferredDate(s, now) && value <= latestPreferredDate(s, now)
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
