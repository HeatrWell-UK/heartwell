// The Christmas and New Year sofa event (owner, 24 November 2026, Run 2):
// 1 December 2026 00:00 to 31 January 2027 23:59:59, UK time, ending by itself
// on 1 February. £50 off each made-to-order sofa, per sofa, for every visitor,
// no code needed; list prices untouched, no was-prices. Pieces the shop
// excludes from offers (tier EXCLUDED) are left out; imported pieces keep
// their own offers. The database (calculate_order_offer, migration
// seasonal_event) is the authority; this mirrors it for display. Pure: shared
// by the browser, the server and tests.

import type { OfferTier, TierAmounts } from './paid'

export interface EventSettings {
  enabled: boolean
  name: string
  /** ISO instant the event starts (inclusive). */
  startsAt: string
  /** ISO instant the event ends (exclusive: 1 Feb 2027 00:00 London). */
  endsAt: string
  /** Pounds off each made-to-order sofa. */
  mtoAmount: number
}

export const NO_EVENT: EventSettings = { enabled: false, name: '', startsAt: '1970-01-01T00:00:00Z', endsAt: '1970-01-01T00:00:00Z', mtoAmount: 0 }

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
  if (d.month === 12) return d.day < 25 ? 'christmas' : 'year_end'
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
}

/**
 * The words for each part of the season. Always "£50 off each made-to-order
 * sofa" (never "50%", never "save" against an older price), always the real
 * last day, never a Christmas delivery promise (that comes only from the
 * delivery settings, christmas.ts).
 */
export function eventCopy(phase: EventPhase, amount: number, lastDay: string): EventCopy {
  const off = `£${Math.round(amount)} off each made-to-order sofa`
  switch (phase) {
    case 'christmas':
      return {
        title: 'Christmas sofa event',
        band: `Christmas sofa event: ${off} until ${lastDay}. Pay in full on delivery.`,
        bandShort: `Christmas: ${off}`,
        note: `Christmas sofa event, until ${lastDay}. No code needed.`,
      }
    case 'year_end':
      return {
        title: 'Boxing week sofa event',
        band: `Boxing week and year-end: ${off} until ${lastDay}. Pay in full on delivery.`,
        bandShort: `Boxing week: ${off}`,
        note: `Boxing week and year-end event, until ${lastDay}. No code needed.`,
      }
    case 'new_year':
      return {
        title: 'New Year sofa event',
        band: `New Year sofa event: ${off} until ${lastDay}. Pay in full on delivery.`,
        bandShort: `New Year: ${off}`,
        note: `New Year sofa event, until ${lastDay}. No code needed.`,
      }
  }
}

/** A piece counts for the event when it is made to order and not excluded from offers. */
export const eventEligible = (madeToOrder: boolean, tier: OfferTier | null | undefined) => madeToOrder && tier !== 'EXCLUDED'

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
  /** The event's part (made-to-order units). */
  eventAmount: number
  eventUnits: number
  /** What the other pieces got alongside the event, and from which offer. */
  restAmount: number
  restKind: 'welcome' | 'ad' | null
}

/**
 * The one offer an order gets, as the database works it out:
 *   A. without the event: the best tier (ad visit or code) or the welcome offer on every piece;
 *   B. with the event: £amount on each eligible unit, plus the better of tier or welcome on the other pieces.
 * The bigger wins; a tie goes to the event. Never stacked on a unit.
 */
export function orderOffer(
  lines: OfferLine[],
  opts: { event: boolean; eventAmount: number; ad: boolean; amounts: TierAmounts; welcome: boolean; welcomeAmount: number },
): OfferOutcome {
  const none: OfferOutcome = { kind: null, amount: 0, eventAmount: 0, eventUnits: 0, restAmount: 0, restKind: null }
  const adA = opts.ad ? tierOff(lines, opts.amounts) : 0
  const welA = opts.welcome ? welcomeOffFor(lines, opts.welcomeAmount) : 0
  const planA: OfferOutcome =
    adA > 0 && adA >= welA ? { ...none, kind: 'ad', amount: adA } : welA > 0 ? { ...none, kind: 'welcome', amount: welA } : none

  if (!opts.event || !(opts.eventAmount > 0)) return planA
  const eligible = lines.filter((l) => eventEligible(l.madeToOrder, l.tier))
  const rest = lines.filter((l) => !eventEligible(l.madeToOrder, l.tier))
  const ev = round2(eligible.reduce((s, l) => s + Math.min(l.unitPrice * l.quantity, opts.eventAmount * l.quantity), 0))
  if (ev <= 0) return planA
  const adR = opts.ad ? tierOff(rest, opts.amounts) : 0
  const welR = opts.welcome ? welcomeOffFor(rest, opts.welcomeAmount) : 0
  const restKind = adR > 0 && adR >= welR ? 'ad' : welR > 0 ? 'welcome' : null
  const restAmount = restKind === 'ad' ? adR : restKind === 'welcome' ? welR : 0
  const planB = round2(ev + restAmount)
  if (planB >= planA.amount) {
    return { kind: 'event', amount: planB, eventAmount: ev, eventUnits: eligible.reduce((s, l) => s + l.quantity, 0), restAmount, restKind }
  }
  return planA
}
