import { describe, expect, it } from 'vitest'
import { eventCopy, eventLastDay, eventLive, eventPhase, orderOffer, type EventSettings, type OfferLine } from '@/lib/offers/event'

// The approved event (owner, 24 November 2026): 1 Dec 2026 00:00 to 31 Jan 2027 23:59:59, UK time.
const EVENT: EventSettings = {
  enabled: true,
  name: 'Christmas and New Year sofa event',
  startsAt: '2026-12-01T00:00:00Z',
  endsAt: '2027-02-01T00:00:00Z',
  mtoAmount: 50,
}
const at = (iso: string) => new Date(iso)
const AMOUNTS = { HIGH: 50, MID: 30, STANDARD: 20 }
const mto = (price: number, quantity = 1, tier: OfferLine['tier'] = 'STANDARD'): OfferLine => ({ madeToOrder: true, tier, unitPrice: price, quantity })
const imported = (price: number, tier: OfferLine['tier'], quantity = 1): OfferLine => ({ madeToOrder: false, tier, unitPrice: price, quantity })
const live = { event: true, eventAmount: 50, ad: false, amounts: AMOUNTS, welcome: false, welcomeAmount: 20 }

describe('event calendar (UK time, injected clock)', () => {
  it.each([
    ['2026-11-30T23:59:59Z', null],
    ['2026-12-01T00:00:00Z', 'christmas'],
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

  it('never says 50% or a Christmas delivery promise', () => {
    for (const phase of ['christmas', 'year_end', 'new_year'] as const) {
      const c = eventCopy(phase, 50, '31 January')
      const all = Object.values(c).join(' ')
      expect(all).toContain('£50 off each made-to-order sofa')
      expect(all).not.toMatch(/50\s*%/)
      expect(all.toLowerCase()).not.toMatch(/guarantee|in time for christmas|before christmas/)
    }
  })
})

describe('one offer per order, as the database decides', () => {
  it('£599 made-to-order sofa: £50 off (pays £549)', () => {
    const o = orderOffer([mto(599)], live)
    expect(o).toMatchObject({ kind: 'event', amount: 50 })
    expect(599 - o.amount).toBe(549)
  })

  it('two £599 sofas: £100 off', () => {
    expect(orderOffer([mto(599, 2)], live).amount).toBe(100)
  })

  it('imported alone: no event, tier with a code or ad visit', () => {
    expect(orderOffer([imported(999, 'HIGH')], live)).toMatchObject({ kind: null, amount: 0 })
    expect(orderOffer([imported(999, 'HIGH')], { ...live, ad: true })).toMatchObject({ kind: 'ad', amount: 50 })
  })

  it('mixed made-to-order + imported with an ad visit: £50 + the imported tier', () => {
    expect(orderOffer([mto(599), imported(999, 'HIGH')], { ...live, ad: true })).toMatchObject({ kind: 'event', amount: 100, restKind: 'ad', restAmount: 50 })
  })

  it('mixed with the welcome offer: £50 + £20 on the imported piece', () => {
    expect(orderOffer([mto(599), imported(599, 'MID')], { ...live, welcome: true })).toMatchObject({ kind: 'event', amount: 70, restKind: 'welcome' })
  })

  it('no stacking: Rio corner (HIGH, made to order) with an ad visit stays at £50', () => {
    expect(orderOffer([mto(699, 1, 'HIGH')], { ...live, ad: true, welcome: true }).amount).toBe(50)
  })

  it('excluded pieces get nothing from the event', () => {
    expect(orderOffer([mto(149, 1, 'EXCLUDED')], live)).toMatchObject({ kind: null, amount: 0 })
  })

  it('outside the event: the old rules (welcome per piece, tier per order)', () => {
    const off = { ...live, event: false, welcome: true, ad: true }
    expect(orderOffer([mto(599, 3)], off)).toMatchObject({ kind: 'welcome', amount: 60 })
    expect(orderOffer([mto(699, 1, 'HIGH')], off)).toMatchObject({ kind: 'ad', amount: 50 })
  })

  it('never takes off more than a line costs', () => {
    expect(orderOffer([mto(30)], live).amount).toBe(30)
  })
})
