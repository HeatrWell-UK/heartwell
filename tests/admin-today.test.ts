import { describe, expect, it } from 'vitest'
import { todayTasks, type TodayOrder } from '@/lib/admin/today'

const now = new Date('2026-11-23T20:00:00Z')
const base: TodayOrder = {
  id: 'o',
  reference: 'HW-1',
  customer_name: 'Test Person',
  status: 'pending_cod',
  created_at: '2026-11-23T19:50:00Z',
  confirmed_at: null,
  confirmed_by: null,
  staff_verified_at: null,
  held_at: null,
  hold_reason: null,
  preferred_delivery_date: null,
  total_amount: 599,
  is_test: false,
}
const o = (p: Partial<TodayOrder>): TodayOrder => ({ ...base, ...p })

describe('Admin → Today', () => {
  it('a new order leads the page', () => {
    const tasks = todayTasks([o({ id: 'old', created_at: '2026-11-20T10:00:00Z' }), o({ id: 'new' })], [], now)
    expect(tasks.map((t) => [t.kind, t.order.id])).toEqual([
      ['contact_new', 'new'],
      ['chase', 'old'],
    ])
  })

  it('a customer self-confirm needs Verify, and never shows as a sale to send', () => {
    const tasks = todayTasks([o({ status: 'confirmed', confirmed_by: 'customer', confirmed_at: '2026-11-18T13:41:37Z' })], [{ orderId: 'o', status: 'held' }], now)
    expect(tasks.map((t) => t.kind)).toEqual(['verify'])
  })

  it('a verified sale with a held Purchase is listed until Meta’s 7 days run out', () => {
    const verified = o({ status: 'confirmed', confirmed_by: 'staff', confirmed_at: '2026-11-20T10:00:00Z', staff_verified_at: '2026-11-20T10:00:00Z' })
    expect(todayTasks([verified], [{ orderId: 'o', status: 'held' }], now).map((t) => t.kind)).toEqual(['send_purchase'])
    expect(todayTasks([{ ...verified, confirmed_at: '2026-11-10T10:00:00Z' }], [{ orderId: 'o', status: 'held' }], now)).toEqual([])
  })

  it('held orders: only stale holds, never as new or chase', () => {
    const tasks = todayTasks([o({ held_at: '2026-11-14T10:00:00Z', hold_reason: 'Can’t reach the customer' }), o({ id: 'h2', held_at: '2026-11-22T10:00:00Z' })], [], now)
    expect(tasks.map((t) => [t.kind, t.order.id])).toEqual([['stale_hold', 'o']])
  })

  it('test orders never appear', () => {
    expect(todayTasks([o({ is_test: true })], [], now)).toEqual([])
  })

  it('deliveries due in the next week', () => {
    const tasks = todayTasks([o({ status: 'confirmed', staff_verified_at: '2026-11-20T10:00:00Z', preferred_delivery_date: '2026-11-26' })], [], now)
    expect(tasks.map((t) => t.kind)).toEqual(['deliver_soon'])
  })
})
