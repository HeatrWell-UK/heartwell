import { describe, expect, it } from 'vitest'
import { orderJourney } from '@/lib/checkout/journey'

const states = (status: string) => orderJourney(status)?.map((s) => s.state)

describe('an order’s journey', () => {
  it('shows what’s done, the one step that’s next and what happens there', () => {
    expect(orderJourney('pending_cod')!.map((s) => s.key)).toEqual(['placed', 'confirmed', 'delivered'])
    expect(states('pending_cod')).toEqual(['done', 'current', 'upcoming'])
    expect(orderJourney('pending_cod')![1]!.hint).toMatch(/Ask for confirmation/)
    expect(states('confirmed')).toEqual(['done', 'done', 'current'])
    expect(orderJourney('confirmed')![2]!.hint).toMatch(/book your delivery day/)
    expect(states('delivered')).toEqual(['done', 'done', 'done'])
    expect(orderJourney('delivered')!.every((s) => s.hint === null)).toBe(true)
  })

  it('treats the old processing and shipped stages as confirmed', () => {
    expect(states('processing')).toEqual(['done', 'done', 'current'])
    expect(states('shipped')).toEqual(['done', 'done', 'current'])
  })

  it('dates only the steps that have happened', () => {
    const steps = orderJourney('confirmed', { createdAt: '2026-10-15T09:00:00Z', confirmedAt: '2026-10-15T10:00:00Z' })!
    expect(steps.map((s) => s.at)).toEqual(['2026-10-15T09:00:00Z', '2026-10-15T10:00:00Z', null])
  })

  it('has no journey for a cancelled order or an unknown status', () => {
    expect(orderJourney('cancelled')).toBeNull()
    expect(orderJourney('something-else')).toBeNull()
  })
})
