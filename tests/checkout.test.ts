import { describe, expect, it } from 'vitest'
import { formatUkPhone, isUkPhone, ukPhoneDigits } from '@/lib/checkout/phone'
import { explainOrderError, OrderInput, orderPayload, pricingPayload, testReason } from '@/lib/checkout/order'
import { askToConfirmHref, copyBlock, customerOrderEmail, escapeHtml, shopConfirmedEmail, shopOrderEmail, type OrderEmailData } from '@/lib/email/order-emails'

const V = '11111111-1111-4111-8111-111111111111'
const M = '22222222-2222-4222-8222-222222222222'

describe('UK phone numbers', () => {
  it('accepts the ways people type them', () => {
    for (const raw of ['07700 900123', '+44 7700 900123', '0044 7700 900123', '+44 (0)7700 900123', '07700-900-123', '0113 496 0000']) {
      expect(isUkPhone(raw)).toBe(true)
    }
    expect(ukPhoneDigits('07700 900123')).toBe('447700900123')
    expect(ukPhoneDigits('+44 (0)7700 900123')).toBe('447700900123')
  })

  it('refuses what isn’t a UK number', () => {
    for (const raw of ['', '12345', '+1 212 555 0100', '07700', 'call me']) expect(isUkPhone(raw)).toBe(false)
  })

  it('formats for display and the order record', () => {
    expect(formatUkPhone('+447700900123')).toBe('07700 900123')
    expect(formatUkPhone('01134960000')).toBe('0113 4960000')
  })
})

const order = (over: Partial<Record<string, unknown>> = {}) =>
  OrderInput.parse({
    items: [{ id: 'line-1', variantId: V, materialId: M, quantity: 2 }],
    extras: { floor: 2, hasLift: true, assembly: true, removal: false, removalSeats: 3 },
    promotionCode: ' extra20 ',
    name: '  Ann   Smith ',
    phone: '+44 7700 900123',
    email: 'Ann@Example.co.uk ',
    postcode: 'LS6 2AB',
    shippingAddress: '1 Leaf Street,\n Headingley ',
    preferredDate: '',
    notes: ' Side gate ',
    expectedTotal: 1078,
    visitor: null,
    website: '',
    ...over,
  })

describe('checkout input', () => {
  it('builds exactly what price_order and place_order expect', () => {
    expect(pricingPayload(order())).toEqual({
      items: [{ item_id: 'line-1', variant_id: V, material_id: M, quantity: 2 }],
      extras: { floor: 2, has_lift: true, assembly: true, removal: false, removal_seats: null },
      promotion_code: 'EXTRA20',
      offer_entitlement_token: null,
    })
    const p = orderPayload(order(), { appEnv: 'production', mixedAreaEvidence: null })
    expect(p).toMatchObject({
      customer_name: 'Ann Smith',
      customer_phone: '07700 900123',
      customer_email: 'ann@example.co.uk',
      shipping_address: '1 Leaf Street, Headingley',
      special_instructions: 'Side gate',
      preferred_delivery_date: null,
      expected_total: 1078,
      is_test: false,
      test_reason: null,
      attribution: {},
    })
  })

  it('turns empty optional fields into nulls and a ground floor into no lift', () => {
    const p = orderPayload(order({ email: '', notes: '', extras: { floor: 0, hasLift: true, assembly: false, removal: true, removalSeats: 4 } }), {
      appEnv: 'production',
      mixedAreaEvidence: 'mainland',
    })
    expect(p).toMatchObject({ customer_email: null, special_instructions: null, mixed_area_evidence: 'mainland' })
    expect(p.extras).toEqual({ floor: 0, has_lift: false, assembly: false, removal: true, removal_seats: 4 })
  })

  it('marks every order outside production as a test, and test details in production', () => {
    expect(testReason({ name: 'Ann Smith', email: 'ann@example.co.uk' }, 'staging')).toBe('placed on staging')
    expect(testReason({ name: 'Ann Smith', email: 'ann@example.co.uk' }, 'production')).toBeNull()
    expect(testReason({ name: 'Test Order', email: '' }, 'production')).toBe('test details')
    expect(testReason({ name: 'Ann', email: 'someone@example.com' }, 'production')).toBe('test details')
    expect(orderPayload(order(), { appEnv: 'staging', mixedAreaEvidence: null }).is_test).toBe(true)
  })

  it('refuses bad input before it reaches the database', () => {
    expect(OrderInput.safeParse({ ...order(), phone: '12345' }).success).toBe(false)
    expect(OrderInput.safeParse({ ...order(), email: 'not-an-email' }).success).toBe(false)
    expect(OrderInput.safeParse({ ...order(), items: [] }).success).toBe(false)
    expect(OrderInput.safeParse({ ...order(), items: [{ id: 'x', variantId: 'nope', materialId: null, quantity: 1 }] }).success).toBe(false)
    expect(OrderInput.safeParse({ ...order(), preferredDate: '06/10/2026' }).success).toBe(false)
  })

  it('explains every database refusal in plain words, pointing at the field', () => {
    expect(explainOrderError('PRICE_MISMATCH: quoted 1 but current prices give 2')).toMatchObject({ code: 'PRICE_MISMATCH', field: 'basket' })
    expect(explainOrderError('NOT_MAINLAND: northern_ireland')).toMatchObject({ field: 'postcode' })
    expect(explainOrderError('DELIVERY_DATE_TOO_SOON: earliest is 2026-10-10')).toMatchObject({ field: 'date' })
    expect(explainOrderError('BAD_PHONE')).toMatchObject({ field: 'phone' })
    expect(explainOrderError('UNAVAILABLE_ITEMS: abc')).toMatchObject({ field: 'basket' })
    expect(explainOrderError('something unexpected')).toMatchObject({ code: 'UNKNOWN' })
    for (const code of ['MISSING_NAME', 'BAD_EMAIL', 'MISSING_ADDRESS', 'INVALID_POSTCODE', 'EMPTY_BASKET', 'TOO_MANY_LINES']) {
      expect(explainOrderError(code).message.length).toBeGreaterThan(10)
    }
  })
})

const emailOrder: OrderEmailData = {
  id: '33333333-3333-4333-8333-333333333333',
  reference: 'HW-100123',
  isTest: false,
  customerName: 'Ann <b>Smith</b>',
  customerEmail: 'ann@example.co.uk',
  customerPhone: '07700 900123',
  shippingAddress: '1 Leaf Street, Headingley',
  postcode: 'LS6 2AB',
  preferredDate: '2026-10-20',
  notes: 'Side gate & bins',
  hasMadeToOrder: true,
  items: [{ title: 'Sample Corner', option: 'Claret, Plush Soft Velvet (PL10)', sku: 'SC-1', quantity: 2, unitPrice: 499 }],
  itemsSubtotal: 998,
  discountAmount: 20,
  promotionCode: 'EXTRA20',
  extras: [{ label: 'Carrying upstairs', detail: '2nd floor', amount: 30 }],
  deliveryTotal: 30,
  totalAmount: 1008,
}
const confirmUrl = `https://example.test/confirm-order/${emailOrder.id}`

describe('order emails', () => {
  it('asks the customer to confirm, with the link, totals and no unescaped input', () => {
    const e = customerOrderEmail(emailOrder, {
      confirmUrl,
      windowLabel: 'Tue 6 – Thu 8 October',
      shop: { email: 'shop@example.test', phoneDisplay: '07848 477056', whatsAppHref: 'https://wa.me/447848477056' },
      now: new Date('2026-10-06T10:00:00Z'),
    })
    expect(e.subject).toBe('Please confirm your Heartwell order HW-100123')
    expect(e.html).toContain(confirmUrl)
    expect(e.html).toContain('Confirm my order')
    expect(e.html).toContain('£1,008')
    expect(e.html).toContain('Ann &lt;b&gt;Smith&lt;/b&gt;'.split(' ')[0])
    expect(e.html).not.toContain('<b>Smith</b>')
    expect(e.html).toContain('can’t be returned for a change of mind')
    expect(e.text).toContain(confirmUrl)
    expect(e.text).toContain('To pay on delivery: £1,008')
    expect(e.text).toContain('Tuesday 20 October')
  })

  it('gives the shop the customer, a WhatsApp ask-to-confirm link and a copy block with SKUs', () => {
    const e = shopOrderEmail({ ...emailOrder, isTest: true }, { confirmUrl, adminUrl: 'https://example.test/admin' })
    expect(e.subject).toBe('[TEST] New order HW-100123: £1,008, waiting for the customer to confirm')
    const ask = askToConfirmHref(emailOrder, confirmUrl)!
    expect(ask.startsWith('https://wa.me/447700900123?text=')).toBe(true)
    expect(decodeURIComponent(ask)).toContain(confirmUrl)
    expect(e.html).toContain(escapeHtml(ask))
    const block = copyBlock(emailOrder)
    expect(block).toContain('[SC-1]')
    expect(block).toContain('To collect on delivery: £1,008')
    expect(block).toContain('Notes: Side gate & bins')
    expect(e.html).toContain('Side gate &amp; bins')
  })

  it('tells the shop when the customer confirms', () => {
    const e = shopConfirmedEmail(emailOrder, { adminUrl: 'https://example.test/admin' })
    expect(e.subject).toBe('HW-100123 confirmed by the customer: £1,008')
    expect(e.text).toContain('Ring 07700 900123')
  })
})

describe('address tidying', () => {
  it('joins lines once, without doubled or trailing commas', () => {
    const tidy = (shippingAddress: string) => orderPayload(order({ shippingAddress }), { appEnv: 'production', mixedAreaEvidence: null }).shipping_address
    expect(tidy('1 Leaf Street,\n Headingley,')).toBe('1 Leaf Street, Headingley')
    expect(tidy('Flat 2,,  1 Leaf Street ,Leeds')).toBe('Flat 2, 1 Leaf Street, Leeds')
  })
})
