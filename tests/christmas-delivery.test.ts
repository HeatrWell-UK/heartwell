import { describe, expect, it } from 'vitest'
import { backWorkingDays, christmasDelivery, type ChristmasFacts } from '@/lib/delivery/christmas'

const unknown: ChristmasFacts = { lastDeliveryDate: null, closedDates: [], madeToOrderLeadDays: null, maxWorkingDays: 4, noDeliveryDays: [1] }

describe('Christmas delivery is never promised without the owner’s facts', () => {
  it('outside the Christmas part of the event: nothing', () => {
    expect(christmasDelivery(unknown, { christmasPhase: false, madeToOrder: true, todayIso: '2026-12-26' })).toEqual({ kind: 'hidden' })
  })

  it('facts not set: ask, no date (today’s live state)', () => {
    expect(christmasDelivery(unknown, { christmasPhase: true, madeToOrder: false, todayIso: '2026-12-05' })).toEqual({ kind: 'ask' })
  })

  it('made-to-order without a making time: ask, even when the last day is known', () => {
    expect(christmasDelivery({ ...unknown, lastDeliveryDate: '2026-12-23' }, { christmasPhase: true, madeToOrder: true, todayIso: '2026-12-05' })).toEqual({ kind: 'ask' })
  })

  it('stock piece: last day minus 4 working days, skipping Mondays', () => {
    // 23 Dec 2026 is a Wednesday: back 4 delivery days (22, 20, 19, 18), skipping Monday 21st → Fri 18th.
    const facts = { ...unknown, lastDeliveryDate: '2026-12-23' }
    expect(christmasDelivery(facts, { christmasPhase: true, madeToOrder: false, todayIso: '2026-12-05' })).toEqual({ kind: 'order_by', date: '2026-12-18' })
    expect(christmasDelivery(facts, { christmasPhase: true, madeToOrder: false, todayIso: '2026-12-19' })).toEqual({ kind: 'too_late' })
  })

  it('made-to-order adds the making time and skips closed days', () => {
    const facts = { ...unknown, lastDeliveryDate: '2026-12-23', madeToOrderLeadDays: 10, closedDates: ['2026-12-12'] }
    expect(backWorkingDays('2026-12-23', 14, facts)).toBe('2026-12-05')
    expect(christmasDelivery(facts, { christmasPhase: true, madeToOrder: true, todayIso: '2026-12-01' })).toEqual({ kind: 'order_by', date: '2026-12-05' })
  })
})
