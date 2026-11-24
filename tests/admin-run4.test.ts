import { describe, expect, it } from 'vitest'
import { activeHref, activePhoneTab, ADMIN_GROUPS, ALL_NAV_ITEMS, MORE_GROUPS, PHONE_TABS } from '@/lib/admin/nav'
import { filterItems, workstationItems, type WsOrder, type WsSignal } from '@/lib/admin/workstation'

describe('admin navigation (one source of truth)', () => {
  it('lists every page exactly once, in five groups', () => {
    const hrefs = ALL_NAV_ITEMS.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(ADMIN_GROUPS.map((g) => g.label)).toEqual(['Daily work', 'Website & business', 'Marketing', 'Shop', 'System'])
    for (const h of ['/admin/workstation', '/admin/source-review', '/admin/meta', '/admin/today', '/admin/tracking']) expect(hrefs).toContain(h)
  })
  it('phones: Home, Orders, Leads, Catalogue, More; More holds the rest', () => {
    expect(PHONE_TABS.map((t) => t.label)).toEqual(['Home', 'Orders', 'Leads', 'Catalogue', 'More'])
    const more = MORE_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    expect(more).toContain('/admin/workstation')
    expect(more).not.toContain('/admin/orders')
    expect(more.length + PHONE_TABS.length - 1).toBe(ALL_NAV_ITEMS.length)
  })
  it('selects the right item for nested pages', () => {
    expect(activeHref('/admin')).toBe('/admin')
    expect(activeHref('/admin/orders/abc')).toBe('/admin/orders')
    expect(activeHref('/admin/today')).toBe('/admin/today')
    expect(activePhoneTab('/admin/orders/abc')).toBe('/admin/orders')
    expect(activePhoneTab('/admin/meta')).toBe('/admin/more')
    expect(activePhoneTab('/admin/catalogue/products/x')).toBe('/admin/catalogue')
  })
})

const now = new Date('2026-11-24T18:00:00Z')
const order = (o: Partial<WsOrder>): WsOrder => ({
  id: 'o1',
  reference: 'HW-1',
  customer_name: 'A',
  status: 'pending_cod',
  created_at: '2026-11-24T17:30:00Z',
  confirmed_at: null,
  confirmed_by: null,
  staff_verified_at: null,
  held_at: null,
  hold_reason: null,
  preferred_delivery_date: null,
  total_amount: 649,
  is_test: false,
  has_source: true,
  ...o,
})
const sig = (s: Partial<WsSignal>): WsSignal => ({ order_id: 'o1', event_name: 'Purchase', status: 'held', sent_at: null, skip_reason: null, ...s })

describe('workstation rules', () => {
  it('new order is urgent, an older unconfirmed one waits on the customer', () => {
    expect(workstationItems({ orders: [order({})], signals: [], leads: [] }, now)[0]).toMatchObject({ group: 'urgent', kind: 'new_order' })
    expect(workstationItems({ orders: [order({ created_at: '2026-11-23T10:00:00Z' })], signals: [], leads: [] }, now)[0]).toMatchObject({ group: 'waiting' })
  })
  it('customer self-confirmed needs staff Verify; urgent near the Meta deadline', () => {
    const close = workstationItems({ orders: [order({ status: 'confirmed', confirmed_by: 'customer', confirmed_at: '2026-11-18T19:00:00Z' })], signals: [sig({})], leads: [] }, now)
    expect(close.find((i) => i.kind === 'verify')).toMatchObject({ group: 'urgent' })
    expect(close.some((i) => i.kind === 'send_purchase')).toBe(false)
  })
  it('send Purchase only for verified, held/failed, within 7 days; never for skipped, sent, expired or cancelled', () => {
    const verified = order({ status: 'confirmed', confirmed_at: '2026-11-23T10:00:00Z', staff_verified_at: '2026-11-24T10:00:00Z' })
    expect(workstationItems({ orders: [verified], signals: [sig({})], leads: [] }, now).some((i) => i.kind === 'send_purchase')).toBe(true)
    expect(workstationItems({ orders: [verified], signals: [sig({ status: 'skipped' })], leads: [] }, now).some((i) => i.kind === 'send_purchase')).toBe(false)
    expect(workstationItems({ orders: [verified], signals: [sig({ status: 'sent', sent_at: '2026-11-24T11:00:00Z' })], leads: [] }, now).some((i) => i.kind === 'send_purchase')).toBe(false)
    expect(workstationItems({ orders: [{ ...verified, confirmed_at: '2026-11-10T10:00:00Z' }], signals: [sig({})], leads: [] }, now).some((i) => i.kind === 'send_purchase')).toBe(false)
    expect(workstationItems({ orders: [{ ...verified, status: 'cancelled' }], signals: [sig({})], leads: [] }, now).some((i) => i.kind === 'send_purchase')).toBe(false)
  })
  it('source review for unknown sources only; test orders ignored; search by reference', () => {
    const items = workstationItems({ orders: [order({ has_source: false }), order({ id: 'o2', reference: 'HW-2', is_test: true, has_source: false })], signals: [], leads: [] }, now)
    expect(items.filter((i) => i.kind === 'source_review')).toHaveLength(1)
    expect(filterItems(items, null, 'hw-1').length).toBeGreaterThan(0)
    expect(filterItems(items, null, 'HW-2')).toHaveLength(0)
  })
})
