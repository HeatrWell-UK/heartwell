import { describe, expect, it } from 'vitest'
import { ALLOWED_MOVES, dualTime, NEXT_STEP, searchFilter, stageAheadOfStatus, statusMessage, STATUSES, whatsAppTo } from '@/lib/admin/orders'
import { toEmailData, type OrderRowForView } from '@/lib/admin/order-view'
import { customerStatusEmail } from '@/lib/email/order-emails'

/** public.order_status_allowed, written out exactly as the migration has it. */
function databaseAllows(from: string, to: string): boolean {
  if (from === to) return true
  if (from === 'pending_cod') return ['confirmed', 'cancelled'].includes(to)
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(from)) return ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(to)
  return false
}

describe('status moves', () => {
  it('offers exactly the moves the database allows', () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (from === to) continue
        expect(ALLOWED_MOVES[from].includes(to), `${from} -> ${to}`).toBe(databaseAllows(from, to))
      }
    }
  })

  it('has a next step for every open status, each one allowed', () => {
    for (const [from, next] of Object.entries(NEXT_STEP)) expect(databaseAllows(from, next!.status)).toBe(true)
    expect(NEXT_STEP.delivered).toBeUndefined()
    expect(NEXT_STEP.cancelled).toBeUndefined()
  })

  it('warns when a later stage was recorded than the status shows', () => {
    const base = { confirmedAt: '2026-10-01T10:00:00Z', processingAt: '2026-10-02T10:00:00Z', shippedAt: null, deliveredAt: null }
    expect(stageAheadOfStatus({ ...base, status: 'confirmed' })).toEqual({ status: 'processing', at: '2026-10-02T10:00:00Z' })
    expect(stageAheadOfStatus({ ...base, status: 'processing' })).toBeNull()
    expect(stageAheadOfStatus({ ...base, status: 'cancelled' })).toBeNull()
  })
})

describe('times', () => {
  it('shows one moment in UK and Pakistan time', () => {
    expect(dualTime('2026-10-06T09:30:00Z')).toEqual({ uk: '6 Oct 10:30', pk: '6 Oct 14:30' })
    expect(dualTime('2026-12-06T09:30:00Z')).toEqual({ uk: '6 Dec 09:30', pk: '6 Dec 14:30' })
    expect(dualTime(null)).toBeNull()
    expect(dualTime('nonsense')).toBeNull()
  })
})

describe('WhatsApp messages', () => {
  const o = { reference: 'HW-100200', customerName: 'Ann Smith', customerPhone: '07700 900123', totalAmount: 749, cancellationReason: 'customer asked' }
  const links = { confirmUrl: 'https://example.test/confirm-order/x', trackUrl: 'https://example.test/track-order' }

  it('writes one for every status, by first name', () => {
    for (const s of STATUSES) expect(statusMessage(o, s, links)).toMatch(/^Hi Ann,/)
    expect(statusMessage(o, 'pending_cod', links)).toContain(links.confirmUrl)
    expect(statusMessage(o, 'shipped', links)).toContain('£749')
    expect(statusMessage(o, 'shipped', links)).toContain(links.trackUrl)
    expect(statusMessage(o, 'cancelled', links)).toContain('customer asked')
  })

  it('links to the customer’s own WhatsApp, or nothing for a number that isn’t UK', () => {
    expect(whatsAppTo('07700 900123', 'Hi')).toBe('https://wa.me/447700900123?text=Hi')
    expect(whatsAppTo('+1 212 555 0100')).toBeNull()
  })
})

describe('search', () => {
  it('searches reference, name, email, postcode and phone, keeping the filter safe', () => {
    const f = searchFilter('ann')!
    expect(f).toContain('customer_name.ilike.%ann%')
    expect(f).toContain('reference.ilike.%ann%')
    expect(searchFilter('a')).toBeNull()
    expect(searchFilter('ann),status.eq.cancelled(')).not.toMatch(/[()]/)
  })

  it('finds a phone number however it was spaced, and a reference from its digits', () => {
    const f = searchFilter('07700900123')!
    expect(f).toContain('customer_phone.ilike.%0%7%7%0%0%9%0%0%1%2%3%')
    expect(searchFilter('100105')).toContain('reference.ilike.%100105%')
    expect(searchFilter('ls6 2ab')).toContain('postcode.ilike.%LS62AB%')
  })
})

const row: OrderRowForView = {
  id: 'o1',
  reference: 'HW-100300',
  is_test: false,
  customer_name: 'Ann Smith',
  customer_email: 'ann@example.co.uk',
  customer_phone: '07700 900123',
  shipping_address: '1 Leaf Street',
  postcode: 'LS6 2AB',
  preferred_delivery_date: null,
  special_instructions: null,
  has_made_to_order: false,
  items_subtotal: 749,
  discount_amount: 0,
  promotion_code: null,
  delivery_floor: 1,
  delivery_has_lift: false,
  fee_upstairs: 20,
  fee_assembly: 0,
  removal_seats: null,
  fee_removal: 0,
  delivery_total: 50,
  total_amount: 799,
  order_items: [{ title: 'Sample Corner', custom_title: null, sku: 'SC-1', colour_name: 'Grey', material_code: null, material_name: null, material_collection: null, quantity: 1, unit_price: 749 }],
}

describe('admin order view', () => {
  it('lists the standard extras and any agreed delivery charge on top', () => {
    const v = toEmailData(row)
    expect(v.extras).toEqual([
      { label: 'Carrying upstairs', detail: '1st floor', amount: 20 },
      { label: 'Delivery (agreed)', amount: 30 },
    ])
  })

  it('emails the customer for the statuses they hear about', () => {
    const shop = { email: 'shop@example.test', phoneDisplay: '07848 477056', whatsAppHref: null }
    const shipped = customerStatusEmail(toEmailData(row), 'shipped', { trackUrl: 'https://example.test/track-order', shop })
    expect(shipped.subject).toBe('Your Heartwell order HW-100300 is on its way')
    expect(shipped.html).toContain('£799')
    expect(shipped.html).toContain('Track my order')
    const cancelled = customerStatusEmail(toEmailData(row), 'cancelled', { trackUrl: '', shop, cancellationReason: 'out of stock' })
    expect(cancelled.text).toContain('out of stock')
    expect(cancelled.html).not.toContain('Track my order')
  })
})
