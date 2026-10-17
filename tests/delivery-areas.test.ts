// Delivery areas (owner, 17 October 2026): the website shows the same charge
// the database adds (public.delivery_area, captured in the fixture), the
// slower window, and no deliveries on Mondays.

import { describe, expect, it } from 'vitest'
import fixture from './fixtures/delivery-areas.json'
import { areaForPostcode, chargeRange, orderDeliveryLine, type DeliveryArea } from '@/lib/delivery/areas'
import { deliveryDaysText, deliveryWindow, earliestPreferredDate, isNoDeliveryDay, isValidPreferredDate } from '@/lib/delivery/window'
import { explainOrderError } from '@/lib/checkout/order'
import { checkArea, checkNoDeliveryDays, EMPTY_AREA, parseDistricts } from '@/lib/admin/delivery-areas-form'

const areas = fixture.areas as DeliveryArea[]

describe('areaForPostcode matches public.delivery_area', () => {
  for (const [postcode, slug] of fixture.answers as [string, string | null][]) {
    it(`${postcode} -> ${slug ?? 'free'}`, () => {
      expect(areaForPostcode(postcode, areas)?.slug ?? null).toBe(slug)
    })
  }

  it('puts every district in one area at most', () => {
    const all = areas.flatMap((a) => a.districts)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('charges in words', () => {
  it('gives the range, or one price when they are all the same', () => {
    expect(chargeRange(areas)).toBe('£40 to £100')
    expect(chargeRange(areas.filter((a) => a.charge === 80))).toBe('£80')
    expect(chargeRange([])).toBe('')
  })
})

describe('an order’s delivery line', () => {
  it('is free, a charged area, or a charge staff set by hand', () => {
    expect(orderDeliveryLine({ fee_area: 0, fee_upstairs: 20, delivery_total: 20 })).toEqual({ label: 'Delivery', amount: 0 })
    expect(orderDeliveryLine({ delivery_area: 'Devon', fee_area: 40, fee_assembly: 20, delivery_total: 60 })).toEqual({ label: 'Delivery to Devon', amount: 40 })
    expect(orderDeliveryLine({ fee_area: 0, delivery_total: 75 })).toEqual({ label: 'Delivery', amount: 75 })
  })
})

const settings = {
  delivery_min_working_days: 2,
  delivery_max_working_days: 4,
  preferred_date_min_days: 4,
  preferred_date_max_days: 180,
  no_delivery_days: [1],
}
const devon = areas.find((a) => a.slug === 'devon')!

describe('no deliveries on Mondays', () => {
  it('moves a window that would start on a Monday to the Tuesday', () => {
    // Thursday 1 October 2026: two working days is Monday 5th, so Tuesday 6th to Wednesday 7th.
    const w = deliveryWindow(settings, new Date('2026-10-01T12:00:00Z'))
    expect([w.fromISO, w.toISO]).toEqual(['2026-10-06', '2026-10-07'])
  })

  it('never offers a Monday as the first preferred day, and refuses one', () => {
    // Thursday 1 October + 4 days is Monday 5th.
    expect(earliestPreferredDate(settings, new Date('2026-10-01T12:00:00Z'))).toBe('2026-10-06')
    expect(isNoDeliveryDay('2026-10-12', settings.no_delivery_days)).toBe(true)
    expect(isNoDeliveryDay('2026-10-13', settings.no_delivery_days)).toBe(false)
    expect(isValidPreferredDate('2026-10-12', settings, new Date('2026-10-01T12:00:00Z'))).toBe(false)
    expect(isValidPreferredDate('2026-10-13', settings, new Date('2026-10-01T12:00:00Z'))).toBe(true)
  })

  it('says so in words', () => {
    expect(deliveryDaysText([1])).toBe('We deliver every day except Monday.')
    expect(deliveryDaysText([])).toBe('We deliver seven days a week.')
    expect(deliveryDaysText([7, 1])).toBe('We deliver every day except Monday and Sunday.')
  })

  it('explains the database’s refusal', () => {
    expect(explainOrderError('DELIVERY_DATE_CLOSED: Monday')).toMatchObject({ field: 'date', message: expect.stringContaining('We don’t deliver on Mondays.') })
  })
})

describe('a charged area’s slower delivery', () => {
  it('takes the area’s working days', () => {
    // Friday 2 October 2026: 5 to 7 working days is Friday 9th to Tuesday 13th.
    const w = deliveryWindow(settings, new Date('2026-10-02T12:00:00Z'), devon)
    expect([w.fromISO, w.toISO]).toEqual(['2026-10-09', '2026-10-13'])
  })

  it('moves the first preferred day back by the extra working days, as place_order does', () => {
    // Sunday 4 October: 4 days, plus 3 more for an area taking 5 days rather than 2, is Sunday 11th.
    const now = new Date('2026-10-04T12:00:00Z')
    expect(earliestPreferredDate(settings, now)).toBe('2026-10-08')
    expect(earliestPreferredDate(settings, now, devon)).toBe('2026-10-11')
    expect(isValidPreferredDate('2026-10-10', settings, now, devon)).toBe(false)
    expect(isValidPreferredDate('2026-10-11', settings, now, devon)).toBe(true)
  })
})

describe('the admin’s delivery areas form', () => {
  it('reads districts however they are typed, and names what isn’t one', () => {
    expect(parseDistricts('ex1, EX2\n tq3;tq3  EX2')).toEqual({ districts: ['EX1', 'EX2', 'TQ3'], bad: [] })
    expect(parseDistricts('EX4 1AA, Devon').bad).toEqual(['1AA', 'DEVON'])
  })

  it('makes a row from a good draft, and a slug from a new area’s name', () => {
    const { row } = checkArea({ ...EMPTY_AREA, name: 'Isle of Skye & Lochalsh', charge: '120', districts: 'IV40 IV41' })
    expect(row).toEqual({
      slug: 'isle-of-skye-and-lochalsh',
      name: 'Isle of Skye & Lochalsh',
      places: '',
      charge: 120,
      min_working_days: 5,
      max_working_days: 7,
      districts: ['IV40', 'IV41'],
    })
  })

  it('refuses a draft the database would', () => {
    expect(checkArea({ ...EMPTY_AREA, name: 'Devon', charge: '40', districts: '' }).problems).toContain('List at least one postcode district, like EX4.')
    expect(checkArea({ ...EMPTY_AREA, name: 'Devon', charge: 'forty', districts: 'EX1' }).row).toBeNull()
    expect(checkArea({ ...EMPTY_AREA, name: 'Devon', charge: '40', minDays: '7', maxDays: '5', districts: 'EX1' }).row).toBeNull()
  })

  it('keeps at least one delivery day', () => {
    expect(checkNoDeliveryDays([1, 1, 7])).toEqual([1, 7])
    expect(checkNoDeliveryDays([1, 2, 3, 4, 5, 6, 7])).toBeNull()
    expect(checkNoDeliveryDays('Monday')).toBeNull()
  })
})
