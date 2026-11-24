// Report periods for Admin → Website, Journeys and Business (Run 3): Today,
// 7 days, 30 days, this month or custom dates, in UK days, plus the device and
// source filters. Pure: the pages pass searchParams, tests pass fixtures.

import { londonLocalToIso } from './season-form'

export const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
] as const
export type PeriodKey = (typeof PERIODS)[number]['key']

export const DEVICES = ['mobile', 'tablet', 'desktop', 'unknown'] as const
export const SOURCES = ['meta', 'google', 'direct', 'other', 'unattributed'] as const

export interface Period {
  key: PeriodKey
  from: string
  to: string
  /** "7 days to 24 Nov" etc. */
  label: string
  device: string | null
  source: string | null
}

const DAY = 86_400_000
const isoDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d)
const startOfUkDay = (day: string) => londonLocalToIso(`${day}T00:00`)!
const addDays = (day: string, n: number) => isoDay(new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY))
const short = (day: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function periodFrom(params: Params, now = new Date()): Period {
  const today = isoDay(now)
  const raw = one(params.period) as PeriodKey
  const key: PeriodKey = PERIODS.some((p) => p.key === raw) ? raw : '30d'
  const device = (DEVICES as readonly string[]).includes(one(params.device)) ? one(params.device) : null
  const source = (SOURCES as readonly string[]).includes(one(params.source)) ? one(params.source) : null
  const tomorrow = addDays(today, 1)
  let fromDay = addDays(today, -29)
  let toDay = tomorrow
  if (key === 'today') fromDay = today
  if (key === '7d') fromDay = addDays(today, -6)
  if (key === 'month') fromDay = `${today.slice(0, 8)}01`
  if (key === 'custom') {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(one(params.from)) ? one(params.from) : addDays(today, -29)
    const t = /^\d{4}-\d{2}-\d{2}$/.test(one(params.to)) ? one(params.to) : today
    const [a, b] = f <= t ? [f, t] : [t, f]
    fromDay = a < addDays(b, -365) ? addDays(b, -365) : a
    toDay = addDays(b, 1)
  }
  const lastDay = addDays(toDay, -1)
  const label = fromDay === lastDay ? short(fromDay) : `${short(fromDay)} to ${short(lastDay)}`
  return { key, from: startOfUkDay(fromDay), to: startOfUkDay(toDay), label, device, source }
}

/** The page's address with one filter changed. */
export function periodHref(base: string, p: Period, change: Partial<Record<'period' | 'device' | 'source', string | null>>): string {
  const q = new URLSearchParams()
  const period = change.period !== undefined ? change.period : p.key
  if (period && period !== '30d') q.set('period', period)
  if (period === 'custom') {
    q.set('from', isoDay(new Date(p.from)))
    q.set('to', isoDay(new Date(Date.parse(p.to) - 1)))
  }
  const device = change.device !== undefined ? change.device : p.device
  const source = change.source !== undefined ? change.source : p.source
  if (device) q.set('device', device)
  if (source) q.set('source', source)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

/** "12.5%" or "–" when there's nothing to divide by. */
export const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : '–')
