import { describe, expect, it } from 'vitest'
import {
  eventCopy,
  eventEligible,
  eventLastDay,
  eventLive,
  eventPhase,
  offerWords,
  orderOffer,
  windowLeftText,
  windowState,
  type EventSettings,
  type OfferLine,
} from '@/lib/offers/event'

// Run 3 (owner, 24 November 2026): the season is live from release, ends 1 Feb 2027 00:00 UK time.
// Each visitor gets ONE 14-day window; £50 off each sofa and chair (made to order or imported),
// the Sims Footstool (tier EXCLUDED) left out.
const EVENT: EventSettings = {
  enabled: true,
  name: 'Christmas and New Year sofa event',
  startsAt: '2026-11-24T18:00:00Z',
  endsAt: '2027-02-01T00:00:00Z',
  mtoAmount: 50,
  windowHours: 336,
  generation: 'season_2026_27_v1',
}
const at = (iso: string) => new Date(iso)
const AMOUNTS = { HIGH: 50, MID: 30, STANDARD: 20 }
const mto = (price: number, quantity = 1, tier: OfferLine['tier'] = 'STANDARD'): OfferLine => ({ madeToOrder: true, tier, unitPrice: price, quantity })
const imported = (price: number, tier: OfferLine['tier'], quantity = 1): OfferLine => ({ madeToOrder: false, tier, unitPrice: price, quantity })
const footstool = (price = 149): OfferLine => ({ madeToOrder: false, tier: 'EXCLUDED', unitPrice: price, quantity: 1 })
const live = { event: true, entitled: true, eventAmount: 50, ad: false, amounts: AMOUNTS, welcome: false, welcomeAmount: 20 }

describe('season calendar (UK time, injected clock)', () => {
  it.each([
    ['2026-11-24T17:59:59Z', null],
    ['2026-11-24T18:00:00Z', 'christmas'],
    ['2026-12-24T23:59:59Z', 'christmas'],
    ['2026-12-25T00:00:00Z', 'year_end'],
    ['2026-12-31T23:59:59Z', 'year_end'],
    ['2027-01-01T00:00:00Z', 'new_year'],
    ['2027-01-31T23:59:59Z', 'new_year'],
    ['2027-02-01T00:00:00Z', null],
  ])('%s → %s', (iso, phase) => {
    expect(eventPhase(EVENT, at(iso))).toBe(phase)
  })

  it('is off when disabled or the amount is zero', () => {
    expect(eventLive({ ...EVENT, enabled: false }, at('2026-12-10T12:00:00Z'))).toBe(false)
    expect(eventLive({ ...EVENT, mtoAmount: 0 }, at('2026-12-10T12:00:00Z'))).toBe(false)
  })

  it('names the real last day', () => {
    expect(eventLastDay(EVENT)).toBe('31 January')
  })

  it('each part has its code and page', () => {
    expect(eventCopy('christmas', 50, '31 January')).toMatchObject({ code: 'CHRISTMAS', href: '/christmas' })
    expect(eventCopy('year_end', 50, '31 January')).toMatchObject({ code: 'NEWYEAR', href: '/new-year' })
    expect(eventCopy('new_year', 50, '31 January')).toMatchObject({ code: 'NEWYEAR', href: '/new-year' })
  })

  it('says "£50 off each sofa and chair", never a percentage, a guarantee or "made-to-order sofa" only', () => {
    expect(offerWords(50)).toBe('£50 off each sofa and chair')
    for (const phase of ['christmas', 'year_end', 'new_year'] as const) {
      const all = Object.values(eventCopy(phase, 50, '31 January')).join(' ')
      expect(all).toContain('£50 off each sofa and chair')
      expect(all).toContain('14 days')
      expect(all).not.toMatch(/%/)
      expect(all.toLowerCase()).not.toMatch(/guarantee|in time for christmas|before christmas|made-to-order sofa/)
    }
  })

  it('only the excluded tier is left out', () => {
    expect(eventEligible('HIGH')).toBe(true)
    expect(eventEligible('MID')).toBe(true)
    expect(eventEligible('STANDARD')).toBe(true)
    expect(eventEligible('EXCLUDED')).toBe(false)
  })
})

describe('the visitor’s 14-day window', () => {
  const now = Date.parse('2026-12-01T12:00:00Z')
  it('is live until its end, then ended; none for another generation or no cookie', () => {
    expect(windowState('2026-12-10T12:00:00Z', EVENT.generation, EVENT.generation, now)).toMatchObject({ kind: 'live' })
    expect(windowState('2026-11-30T12:00:00Z', EVENT.generation, EVENT.generation, now)).toMatchObject({ kind: 'ended' })
    expect(windowState('2026-12-10T12:00:00Z', 'season_old', EVENT.generation, now)).toEqual({ kind: 'none' })
    expect(windowState(null, null, EVENT.generation, now)).toEqual({ kind: 'none' })
    expect(windowState('nonsense', EVENT.generation, EVENT.generation, now)).toEqual({ kind: 'none' })
  })

  it('says the real time left', () => {
    expect(windowLeftText(new Date(now + (13 * 24 + 4) * 3_600_000 + 59_000), now)).toBe('13 days 4 hours')
    expect(windowLeftText(new Date(now + (5 * 60 + 12) * 60_000), now)).toBe('5 hours 12 minutes')
    expect(windowLeftText(new Date(now + 24 * 3_600_000), now)).toBe('1 day 0 hours')
    expect(windowLeftText(new Date(now - 1), now)).toBe('ended')
  })
})

describe('one offer per order, as the database decides', () => {
  it('£599 sofa: £50 off (pays £549)', () => {
    const o = orderOffer([mto(599)], live)
    expect(o).toMatchObject({ kind: 'event', amount: 50 })
    expect(599 - o.amount).toBe(549)
  })

  it('two £599 sofas: £100 off', () => {
    expect(orderOffer([mto(599, 2)], live).amount).toBe(100)
  })

  it('imported pieces count too (HIGH tier, £50)', () => {
    expect(orderOffer([imported(999, 'HIGH')], live)).toMatchObject({ kind: 'event', amount: 50, eventUnits: 1 })
  })

  it('three Roma (MID) pieces: £150', () => {
    expect(orderOffer([imported(649, 'MID', 3)], live).amount).toBe(150)
  })

  it('made to order + imported: £50 each, no stacking with ad or welcome', () => {
    expect(orderOffer([mto(599), imported(999, 'HIGH')], { ...live, ad: true, welcome: true })).toMatchObject({ kind: 'event', amount: 100, eventUnits: 2, restAmount: 0 })
  })

  it('two £249 chairs: £100', () => {
    expect(orderOffer([imported(249, 'STANDARD', 2)], live).amount).toBe(100)
  })

  it('the Sims Footstool gets nothing; with an armchair, only the armchair counts', () => {
    expect(orderOffer([footstool()], live)).toMatchObject({ kind: null, amount: 0 })
    expect(orderOffer([imported(399, 'STANDARD'), footstool()], live)).toMatchObject({ kind: 'event', amount: 50, eventUnits: 1 })
  })

  it('no live window: nothing (codes and ad visits add nothing in the season)', () => {
    expect(orderOffer([mto(599)], { ...live, entitled: false, ad: true, welcome: true })).toMatchObject({ kind: null, amount: 0 })
  })

  it('outside the season: the old rules (welcome per piece, tier per order)', () => {
    const off = { ...live, event: false, entitled: false, welcome: true, ad: true }
    expect(orderOffer([mto(599, 3)], off)).toMatchObject({ kind: 'welcome', amount: 60 })
    expect(orderOffer([mto(699, 1, 'HIGH')], off)).toMatchObject({ kind: 'ad', amount: 50 })
  })

  it('never takes off more than a line costs', () => {
    expect(orderOffer([mto(30)], live).amount).toBe(30)
  })
})
