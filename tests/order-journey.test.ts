import { describe, expect, it } from 'vitest'
import { orderJourney } from '@/lib/checkout/journey'

const states = (status: string) => orderJourney(status)?.map((s) => s.state)

describe('an order’s journey', () => {
  it('shows what’s done, the one step that’s next and what happens there', () => {
    expect(states('pending_cod')).toEqual(['done', 'current', 'upcoming', 'upcoming', 'upcoming'])
    expect(orderJourney('pending_cod')![1]!.hint).toMatch(/Confirm my order/)
    expect(states('confirmed')).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming'])
    expect(orderJourney('confirmed')![2]!.hint).toMatch(/book your delivery day/)
    expect(states('shipped')).toEqual(['done', 'done', 'done', 'done', 'current'])
    expect(states('delivered')).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(orderJourney('delivered')!.every((s) => s.hint === null)).toBe(true)
  })

  it('dates only the steps that have happened', () => {
    const steps = orderJourney('confirmed', { createdAt: '2026-10-15T09:00:00Z', confirmedAt: '2026-10-15T10:00:00Z', processingAt: null })!
    expect(steps.map((s) => s.at)).toEqual(['2026-10-15T09:00:00Z', '2026-10-15T10:00:00Z', null, null, null])
  })

  it('has no journey for a cancelled order or an unknown status', () => {
    expect(orderJourney('cancelled')).toBeNull()
    expect(orderJourney('something-else')).toBeNull()
  })
})
