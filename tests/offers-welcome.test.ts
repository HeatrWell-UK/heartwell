import { describe, expect, it } from 'vitest'
import { bestOffer, shortOfMinimum, timeLeft, timeLeftText, welcomeOff } from '@/lib/offers/welcome'
import { dealFor, dealLabel } from '@/lib/catalogue/deal'
import { explainOrderError } from '@/lib/checkout/order'
import { offerName } from '@/lib/email/order-emails'
import { formatPrice } from '@/lib/format'

describe('welcome offer', () => {
  it('takes the amount off every piece, never more than the pieces cost', () => {
    expect(welcomeOff(1, 799, 20)).toBe(20)
    expect(welcomeOff(3, 1500, 20)).toBe(60)
    expect(welcomeOff(2, 30, 20)).toBe(30)
    expect(welcomeOff(0, 799, 20)).toBe(0)
    expect(welcomeOff(2, 799, 0)).toBe(0)
  })

  it('counts down in whole minutes, never showing more time than there is', () => {
    const now = Date.parse('2026-10-22T12:00:00Z')
    const ends = new Date(now + 47 * 3_600_000 + 12 * 60_000 + 59_000)
    expect(timeLeft(ends, now)).toEqual({ hours: 47, minutes: 12 })
    expect(timeLeft(new Date(now + 59_000), now)).toEqual({ hours: 0, minutes: 0 })
    expect(timeLeft(new Date(now), now)).toBeNull()
    expect(timeLeft(new Date(now - 1), now)).toBeNull()
    expect(timeLeftText({ hours: 47, minutes: 1 })).toBe('47 hours 1 minute')
    expect(timeLeftText({ hours: 1, minutes: 0 })).toBe('1 hour 0 minutes')
    expect(timeLeftText({ hours: 0, minutes: 12 })).toBe('12 minutes')
  })

  it('gives one offer per order: whichever takes more off, a tie keeping the ad offer', () => {
    expect(bestOffer(40, 30)).toEqual({ kind: 'welcome', amount: 40 })
    expect(bestOffer(20, 50)).toEqual({ kind: 'ad', amount: 50 })
    expect(bestOffer(20, 20)).toEqual({ kind: 'ad', amount: 20 })
    expect(bestOffer(0, 0)).toEqual({ kind: null, amount: 0 })
  })
})

describe('minimum order', () => {
  it('says how much more a basket needs', () => {
    expect(shortOfMinimum(249, 400)).toBe(151)
    expect(shortOfMinimum(399.5, 400)).toBe(0.5)
    expect(shortOfMinimum(400, 400)).toBe(0)
    expect(shortOfMinimum(900, 400)).toBe(0)
    expect(shortOfMinimum(149, 0)).toBe(0)
  })

  it('explains the database’s refusal with the real figure', () => {
    expect(explainOrderError('BELOW_MINIMUM: 400.00')).toMatchObject({ code: 'BELOW_MINIMUM', field: 'basket', message: expect.stringContaining('£400 ') })
    expect(explainOrderError('BELOW_MINIMUM: 399.50').message).toContain('£399.50')
  })
})

describe('was-prices', () => {
  it('shows a deal only below a higher was-price, rounding the percentage down', () => {
    expect(dealFor(800, 1000)).toEqual({ was: 1000, save: 200, percent: 20 })
    expect(dealFor(801, 1000)).toEqual({ was: 1000, save: 199, percent: 19 })
    expect(dealFor(800, 800)).toBeNull()
    expect(dealFor(800, 750)).toBeNull()
    expect(dealFor(800, null)).toBeNull()
    expect(dealLabel(dealFor(800, 1000)!, formatPrice)).toBe('20% off')
    expect(dealLabel(dealFor(995, 1000)!, formatPrice)).toBe('£5 off')
  })
})

describe('order emails', () => {
  it('name the offer an order had', () => {
    expect(offerName({ offerSource: 'welcome', promotionCode: null })).toBe('Welcome offer')
    expect(offerName({ offerSource: 'manual_code', promotionCode: 'HEARTSOFA' })).toBe('Offer (HEARTSOFA)')
    expect(offerName({ offerSource: 'paid_entitlement', promotionCode: null })).toBe('Offer')
  })
})
