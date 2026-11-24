// The Christmas and New Year sofa event. Run 2 (24 November 2026) set the
// season; Run 3 (owner's final scope, same day) made it ONE personal 14-day
// window per visitor, new or returning, capped at the season's end
// (1 February 2027 00:00 UK time): GBP 50 off EACH sofa and chair, per unit,
// made to order or imported; only pieces the shop excludes from offers (tier
// EXCLUDED: the Sims Footstool) are left out. List prices untouched, no
// was-prices, never a percentage. During the season the welcome and ad offers
// are not used; afterwards they resume. The database (calculate_order_offer,
// issue_seasonal_offer, migration season_offer_14_day) is the authority;
// this mirrors it for display. Pure: shared by the browser, the server and tests.

import type { OfferTier, TierAmounts } from './paid'

export interface EventSettings {
  enabled: boolean
  name: string
  /** ISO instant the event starts (inclusive). */
  startsAt: string
  /** ISO instant the event ends (exclusive: 1 Feb 2027 00:00 London). */
  endsAt: string
  /** Pounds off each eligible sofa or chair. */
  mtoAmount: number
  /** Hours in each visitor's window (capped at endsAt). */
  windowHours: number
  /** Changing it gives everyone one fresh window. */
  generation: string
}

export const NO_EVENT: EventSettings = { enabled: false, name: '', startsAt: '1970-01-01T00:00:00Z', endsAt: '1970-01-01T00:00:00Z', mtoAmount: 0, windowHours: 336, generation: '' }

/** The three parts of the season, by the UK calendar: the copy changes, the offer doesn't. */
export type EventPhase = 'christmas' | 'year_end' | 'new_year'

/** The date in the UK (year, month 1–12, day) for an instant. */
export function londonDate(at: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Has the event's start passed (true after it ends, too)? */
export const eventStarted = (s: EventSettings, at: Date = new Date()) => at.getTime() >= Date.parse(s.startsAt)

/** Today's date in the UK, YYYY-MM-DD. */
export function todayIsoLondon(at: Date = new Date()): string {
  const d = londonDate(at)
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/** True while the event is on at this instant. */
export function eventLive(s: EventSettings, at: Date = new Date()): boolean {
  if (!s.enabled || !(s.mtoAmount > 0)) return false
  const t = at.getTime()
  return t >= Date.parse(s.startsAt) && t < Date.parse(s.endsAt)
}

/** Which part of the season it is, or null when the event isn't on. Matches public.event_phase(). */
export function eventPhase(s: EventSettings, at: Date = new Date()): EventPhase | null {
  if (!eventLive(s, at)) return null
  const d = londonDate(at)
  // November counts as the Christmas run-up (if the owner ever starts the event early).
  if (d.month === 11 || (d.month === 12 && d.day < 25)) return 'christmas'
  if (d.month === 12) return 'year_end'
  return 'new_year'
}

/** The last day of the event in words, from its exclusive end ("31 January"). */
export function eventLastDay(s: EventSettings): string {
  const last = new Date(Date.parse(s.endsAt) - 1)
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long' }).format(last)
}

export interface EventCopy {
  /** Short name for the season part ("Christmas sofa event"). */
  title: string
  /** The announcement bar, long form. */
  band: string
  /** The announcement bar on phones. */
  bandShort: string
  /** The line under a price. */
  note: string
  /** The season's code: recognised at checkout, adds nothing on top of the window. */
  code: 'CHRISTMAS' | 'NEWYEAR'
  /** Its own page. */
  href: '/christmas' | '/new-year'
}

/** What the offer is, in the same words everywhere. */
export const offerWords = (amount: number) => `£${Math.round(amount)} off each sofa and chair`

/**
 * The words for each part of the season: always "£50 off each sofa and chair"
 * (never a percentage, never "save" against an older price), the visitor's own
 * window (said near the price, from the real end time), never a Christmas
 * delivery promise (that comes only from the delivery settings, christmas.ts).
 */
export function eventCopy(phase: EventPhase, amount: number, lastDay: string): EventCopy {
  const off = offerWords(amount)
  switch (phase) {
    case 'christmas':
      return {
        title: 'Christmas sofa event',
        band: `Christmas sofa event: ${off} for 14 days from your first visit (season ends ${lastDay}).`,
        bandShort: `Christmas: ${off}`,
        note: 'Christmas sofa event: your 14-day offer, taken off automatically.',
        code: 'CHRISTMAS',
        href: '/christmas',
      }
    case 'year_end':
      return {
        title: 'Boxing week sofa event',
        band: `Boxing week and year-end: ${off} for 14 days from your first visit (season ends ${lastDay}).`,
        bandShort: `Boxing week: ${off}`,
        note: 'Boxing week sofa event: your 14-day offer, taken off automatically.',
        code: 'NEWYEAR',
        href: '/new-year',
      }
    case 'new_year':
      return {
        title: 'New Year sofa event',
        band: `New Year sofa event: ${off} for 14 days from your first visit (season ends ${lastDay}).`,
        bandShort: `New Year: ${off}`,
        note: 'New Year sofa event: your 14-day offer, taken off automatically.',
        code: 'NEWYEAR',
        href: '/new-year',
      }
  }
}

/** A piece counts for the event unless the shop excludes it from offers (Run 3: imported pieces count too). */
export const eventEligible = (tier: OfferTier | null | undefined) => tier !== 'EXCLUDED'

export interface OfferLine {
  madeToOrder: boolean
  tier: OfferTier | null
  unitPrice: number
  quantity: number
}

const TIER_RANK: Record<OfferTier, number> = { HIGH: 4, MID: 3, STANDARD: 2, EXCLUDED: 1 }
const round2 = (n: number) => Math.round(n * 100) / 100

function tierOff(lines: OfferLine[], amounts: TierAmounts): number {
  const tiers = lines.map((l) => l.tier).filter((t): t is OfferTier => t !== null)
  if (tiers.length === 0) return 0
  const best = tiers.reduce((a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a))
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  return best === 'EXCLUDED' ? 0 : Math.min(subtotal, amounts[best])
}

function welcomeOffFor(lines: OfferLine[], amount: number): number {
  const pieces = lines.reduce((s, l) => s + l.quantity, 0)
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  return pieces > 0 && amount > 0 ? Math.min(subtotal, round2(amount * pieces)) : 0
}

export type OfferChoice = 'event' | 'welcome' | 'ad' | null

export interface OfferOutcome {
  kind: OfferChoice
  amount: number
  /** The event's part (eligible units). */
  eventAmount: number
  eventUnits: number
  /** Kept for the basket's layout; always 0 since Run 3 (one offer per piece, the season's). */
  restAmount: number
  restKind: 'welcome' | 'ad' | null
}

/**
 * The one offer an order gets, as the database works it out:
 *   in the season: amount off each eligible unit while this visitor's window is live, otherwise nothing;
 *   outside it: the best tier (ad visit or code) or the welcome offer on every piece.
 */
export function orderOffer(
  lines: OfferLine[],
  opts: { event: boolean; entitled: boolean; eventAmount: number; ad: boolean; amounts: TierAmounts; welcome: boolean; welcomeAmount: number },
): OfferOutcome {
  const none: OfferOutcome = { kind: null, amount: 0, eventAmount: 0, eventUnits: 0, restAmount: 0, restKind: null }
  if (opts.event) {
    if (!opts.entitled || !(opts.eventAmount > 0)) return none
    const eligible = lines.filter((l) => eventEligible(l.tier))
    const ev = round2(eligible.reduce((s, l) => s + Math.min(l.unitPrice * l.quantity, opts.eventAmount * l.quantity), 0))
    return ev > 0 ? { ...none, kind: 'event', amount: ev, eventAmount: ev, eventUnits: eligible.reduce((s, l) => s + l.quantity, 0) } : none
  }
  const adA = opts.ad ? tierOff(lines, opts.amounts) : 0
  const welA = opts.welcome ? welcomeOffFor(lines, opts.welcomeAmount) : 0
  return adA > 0 && adA >= welA ? { ...none, kind: 'ad', amount: adA } : welA > 0 ? { ...none, kind: 'welcome', amount: welA } : none
}

/** The visitor's window: live (with its end), ended, or not known yet / none. */
export type WindowState = { kind: 'live'; ends: Date } | { kind: 'ended'; ended: Date } | { kind: 'none' }

export function windowState(untilIso: string | null | undefined, generationCookie: string | null | undefined, generation: string, now = Date.now()): WindowState {
  if (!untilIso || !generation || generationCookie !== generation) return { kind: 'none' }
  const t = Date.parse(untilIso)
  if (!Number.isFinite(t)) return { kind: 'none' }
  return t > now ? { kind: 'live', ends: new Date(t) } : { kind: 'ended', ended: new Date(t) }
}

/** "13 days 4 hours", "5 hours 12 minutes": the real time left, rounded down. */
export function windowLeftText(ends: Date, now = Date.now()): string {
  const ms = ends.getTime() - now
  if (!(ms > 0)) return 'ended'
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  return d > 0 ? `${part(d, 'day')} ${part(h, 'hour')}` : `${part(h, 'hour')} ${part(m, 'minute')}`
}
