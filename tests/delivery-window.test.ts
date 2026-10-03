import { describe, expect, it } from 'vitest'
import {
  deliveryWindow,
  earliestPreferredDate,
  formatDeliveryDate,
  isValidAgreedDate,
  isValidPreferredDate,
  latestPreferredDate,
} from '@/lib/delivery/window'
import { deliveryLines, floorName, quoteDelivery, type DeliverySettings } from '@/lib/delivery/pricing'

const settings = {
  delivery_min_working_days: 2,
  delivery_max_working_days: 4,
  preferred_date_min_days: 4,
  preferred_date_max_days: 180,
}

describe('deliveryWindow', () => {
  it('counts working days only', () => {
    // Friday 2 October 2026, midday: Tue 6 to Thu 8 October.
    const w = deliveryWindow(settings, new Date('2026-10-02T12:00:00Z'))
    expect([w.fromISO, w.toISO]).toEqual(['2026-10-06', '2026-10-08'])
    expect(w.label).toBe('Tue 6 – Thu 8 October')
  })

  it('uses the UK date, not UTC, just after midnight in summer time', () => {
    // 23:30 UTC on Sunday 4 October is 00:30 on Monday 5 October in London.
    const w = deliveryWindow(settings, new Date('2026-10-04T23:30:00Z'))
    expect(w.fromISO).toBe('2026-10-07')
  })

  it('names both months when the window crosses one', () => {
    const w = deliveryWindow(settings, new Date('2026-10-28T12:00:00Z'))
    expect(w.label).toBe('Fri 30 October – Tue 3 November')
  })
})

describe('preferred delivery day', () => {
  const now = new Date('2026-10-04T12:00:00Z')

  it('opens four days ahead and closes at 180', () => {
    expect(earliestPreferredDate(settings, now)).toBe('2026-10-08')
    expect(latestPreferredDate(settings, now)).toBe('2027-04-02')
    expect(isValidPreferredDate('2026-10-07', settings, now)).toBe(false)
    expect(isValidPreferredDate('2026-10-08', settings, now)).toBe(true)
    expect(isValidPreferredDate('2027-04-03', settings, now)).toBe(false)
  })

  it('rejects days that do not exist', () => {
    expect(isValidPreferredDate('2027-02-30', settings, now)).toBe(false)
    expect(isValidPreferredDate('8/10/2026', settings, now)).toBe(false)
  })

  it('lets the shop agree any day from today for a year', () => {
    expect(isValidAgreedDate('2026-10-04', now)).toBe(true)
    expect(isValidAgreedDate('2026-10-03', now)).toBe(false)
    expect(isValidAgreedDate('2027-10-05', now)).toBe(false)
  })

  it('writes dates the British way, with the year only when needed', () => {
    expect(formatDeliveryDate('2026-10-10', now)).toBe('Saturday 10 October')
    expect(formatDeliveryDate('2027-01-09', now)).toBe('Saturday 9 January 2027')
  })
})

describe('delivery lines', () => {
  const s: DeliverySettings = {
    upstairs_first_floor: 20, upstairs_per_extra_floor: 10, max_floor: 20, assembly_fee: 20,
    removal_per_seat: 10, removal_min_seats: 1, removal_max_seats: 10, removal_default_seats: 3,
  }

  it('lists each chargeable extra', () => {
    const q = quoteDelivery({ floor: 2, hasLift: false, assembly: true, removal: true, removalSeats: 5 }, s)
    expect(deliveryLines(q, s)).toEqual([
      { key: 'upstairs', label: 'Carrying upstairs', detail: '2nd floor', amount: 30 },
      { key: 'assembly', label: 'Assembly in your room', amount: 20 },
      { key: 'removal', label: 'Taking your old sofa away', detail: '5 seats at £10 each', amount: 50 },
    ])
  })

  it('names floors', () => {
    expect([0, 1, 2, 3, 4, 11, 21].map(floorName)).toEqual([
      'Ground floor', '1st floor', '2nd floor', '3rd floor', '4th floor', '11th floor', '21st floor',
    ])
  })
})
