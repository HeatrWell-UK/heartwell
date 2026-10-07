import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { effectiveMode, isPrivatePath, liveAllowed } from '@/config/tracking'
import { consentForOrder, NO_CHOICE, parseConsent, serialiseConsent } from '@/lib/tracking/consent'
import { metaEvent, metaUserData, tooOldForMeta } from '@/lib/tracking/meta-event'
import { anonymousClientId, ga4ClientIdFromCookie, ga4Purchase } from '@/lib/tracking/ga4-event'
import { redactedLocation } from '@/lib/tracking/redact'
import { buildConversion, processConversion, type OutboxRow, type Sender } from '@/lib/tracking/conversions'
import { ga4Params, pixelParams } from '@/lib/tracking/events'
import { OrderInput, testReason, trackingPayload, type OrderTracking } from '@/lib/checkout/order'

const sha = (v: string) => createHash('sha256').update(v).digest('hex')

describe('consent', () => {
  it('round-trips through the cookie', () => {
    const raw = serialiseConsent({ marketing: true, analytics: false, statistics: true }, 1_760_000_000)
    expect(raw).toBe('1.m1a0s1.1760000000')
    expect(parseConsent(raw)).toEqual({ marketing: true, analytics: false, statistics: true, at: 1_760_000_000 })
  })

  it('treats anything unknown or old as no choice yet', () => {
    expect(parseConsent(null)).toEqual(NO_CHOICE)
    expect(parseConsent('0.m1a1s1.1760000000')).toEqual(NO_CHOICE)
    expect(parseConsent('rubbish')).toEqual(NO_CHOICE)
    expect(NO_CHOICE).toMatchObject({ marketing: false, analytics: false, statistics: true })
  })

  it('records the choice on the order', () => {
    expect(consentForOrder(NO_CHOICE)).toBe('unknown')
    expect(consentForOrder(parseConsent('1.m1a0s1.1760000000'))).toBe('granted')
    expect(consentForOrder(parseConsent('1.m0a1s1.1760000000'))).toBe('denied')
  })
})

describe('when anything may be sent', () => {
  const ready = { configured: true, testable: true }
  it('is never live off the live domain, nor for test traffic', () => {
    expect(effectiveMode('live', ready, { liveAllowed: true, isTest: false })).toBe('live')
    expect(effectiveMode('live', ready, { liveAllowed: false, isTest: false })).toBe('test')
    expect(effectiveMode('live', ready, { liveAllowed: true, isTest: true })).toBe('test')
    expect(effectiveMode('live', { configured: true, testable: false }, { liveAllowed: false, isTest: false })).toBe('dry_run')
    expect(effectiveMode('test', ready, { liveAllowed: false, isTest: true })).toBe('test')
    expect(effectiveMode('live', { configured: false, testable: false }, { liveAllowed: true, isTest: false })).toBe('dry_run')
    expect(effectiveMode('dry_run', ready, { liveAllowed: true, isTest: false })).toBe('dry_run')
  })

  it('knows the live domain and the private pages', () => {
    expect(liveAllowed('heartwellfurniture.co.uk', 'production')).toBe(true)
    expect(liveAllowed('www.heartwellfurniture.co.uk:443', 'production')).toBe(true)
    expect(liveAllowed('heartwellfurniture.co.uk', 'staging')).toBe(false)
    expect(liveAllowed('heartwell-staging.vercel.app', 'production')).toBe(false)
    for (const p of ['/order/abc', '/confirm-order/abc', '/track-order', '/review/x', '/newsletter/confirm', '/admin/tracking', '/login']) expect(isPrivatePath(p), p).toBe(true)
    for (const p of ['/', '/products/ashton', '/checkout', '/sofas']) expect(isPrivatePath(p), p).toBe(false)
  })
})

describe('Meta events', () => {
  it('hashes normalised details and nothing else leaves raw', () => {
    const u = metaUserData({ email: ' Ann@Example.co.UK ', phone: '07700 900123', name: 'Ann-Marie  Smith', postcode: 'LS6 2AB', externalId: 'ABC-123' })
    expect(u).toEqual({
      em: sha('ann@example.co.uk'),
      ph: sha('447700900123'),
      fn: sha('annmarie'),
      ln: sha('smith'),
      zp: sha('ls62ab'),
      country: sha('gb'),
      external_id: sha('abc-123'),
    })
    expect(JSON.stringify(u)).not.toMatch(/ann|7700|ls6/i)
  })

  it('adds the browser’s identifiers only when given (consent is decided before)', () => {
    expect(metaUserData({ ip: '1.2.3.4', userAgent: 'UA', fbp: 'fb.1.1.1', fbc: 'fb.1.1.x' })).toMatchObject({ client_ip_address: '1.2.3.4', client_user_agent: 'UA', fbp: 'fb.1.1.1', fbc: 'fb.1.1.x' })
    expect(metaUserData({})).toEqual({ country: sha('gb') })
  })

  it('builds the event Meta expects, with a source URL for website events only', () => {
    const at = new Date('2026-10-08T10:00:00Z')
    const web = metaEvent({ name: 'Purchase', eventId: 'e1', time: at, actionSource: 'website', sourceUrl: 'https://example.test/checkout', user: {}, custom: { value: 749.5, contents: [{ id: 'v1', quantity: 2, item_price: 374.75 }] } })
    expect(web).toMatchObject({ event_name: 'Purchase', event_time: at.getTime() / 1000, event_id: 'e1', action_source: 'website', event_source_url: 'https://example.test/checkout' })
    expect(web.custom_data).toEqual({ currency: 'GBP', value: 749.5, content_type: 'product', content_ids: ['v1'], contents: [{ id: 'v1', quantity: 2, item_price: 374.75 }], num_items: 2 })
    const chat = metaEvent({ name: 'Purchase', eventId: 'e2', time: at, actionSource: 'chat', sourceUrl: 'https://example.test/checkout', user: {}, custom: {} })
    expect(chat).not.toHaveProperty('event_source_url')
  })

  it('knows Meta’s 7-day limit', () => {
    const now = new Date('2026-10-08T10:00:00Z')
    expect(tooOldForMeta(new Date('2026-10-02T10:00:00Z'), now)).toBe(false)
    expect(tooOldForMeta(new Date('2026-09-30T10:00:00Z'), now)).toBe(true)
  })
})

describe('GA4', () => {
  it('reads the client ID from the _ga cookie', () => {
    expect(ga4ClientIdFromCookie('GA1.1.123456789.1700000000')).toBe('123456789.1700000000')
    expect(ga4ClientIdFromCookie('nonsense')).toBeNull()
  })

  it('counts revenue without consent under a stable anonymous ID', () => {
    expect(anonymousClientId('e1')).toMatch(/^\d+\.\d+$/)
    expect(anonymousClientId('e1')).toBe(anonymousClientId('e1'))
    expect(anonymousClientId('e1')).not.toBe(anonymousClientId('e2'))
    const now = new Date('2026-10-08T10:00:00Z')
    const p = ga4Purchase({ eventId: 'e1', clientId: null, consented: false, time: new Date('2026-10-08T09:00:00Z'), value: 99.999, items: [{ variantId: 'v1', title: 'Ashton', option: 'Grey', quantity: 1, unitPrice: 99.999 }] }, now)
    expect(p).toMatchObject({ client_id: anonymousClientId('e1'), timestamp_micros: Date.parse('2026-10-08T09:00:00Z') * 1000, consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' } })
    expect(p.events[0]!.params).toMatchObject({ currency: 'GBP', value: 100, transaction_id: 'e1', items: [{ item_id: 'v1', item_name: 'Ashton', item_variant: 'Grey', price: 99.999, quantity: 1 }] })
    const old = ga4Purchase({ eventId: 'e1', clientId: '1.2', consented: true, time: new Date('2026-10-01T09:00:00Z'), value: 1, items: [] }, now)
    expect(old).not.toHaveProperty('timestamp_micros')
    expect(old.consent.ad_user_data).toBe('GRANTED')
  })

  it('sees only redacted addresses', () => {
    expect(redactedLocation('https://example.test/products/ashton?variant=AHB3-G&utm_source=facebook&fbclid=abc')).toBe('https://example.test/products/ashton?utm_source=facebook')
    expect(redactedLocation('https://example.test/order/2d8293ef-5fe9-4836-89e3-dda6274b80ad?x=1')).toBe('https://example.test/private')
    expect(redactedLocation('https://example.test/confirm-order/2d8293ef')).toBe('https://example.test/private')
  })
})

describe('event parameters', () => {
  it('speaks each platform’s language', () => {
    const d = { contents: [{ id: 'v1', quantity: 1, item_price: 749 }], contentName: 'Ashton', value: 749 }
    expect(pixelParams(d)).toEqual({ currency: 'GBP', value: 749, content_type: 'product', content_ids: ['v1'], contents: d.contents, content_name: 'Ashton' })
    expect(ga4Params(d)).toEqual({ currency: 'GBP', value: 749, items: [{ item_id: 'v1', price: 749, quantity: 1, item_name: 'Ashton' }] })
  })
})

const order = (over: Partial<NonNullable<OutboxRow['order']>> = {}): NonNullable<OutboxRow['order']> => ({
  is_test: false,
  status: 'confirmed',
  source: 'website',
  created_at: '2026-10-08T08:00:00Z',
  confirmed_at: '2026-10-08T09:00:00Z',
  delivered_at: null,
  total_amount: 799,
  customer_email: 'ann@example.co.uk',
  customer_phone: '07700 900123',
  customer_name: 'Ann Smith',
  postcode: 'LS6 2AB',
  tracking_consent: 'granted',
  customer_ip: '1.2.3.4',
  customer_user_agent: 'UA',
  meta_fbp: 'fb.1.1.1',
  meta_fbc: null,
  visitor_id: 'visitor-1',
  ga_client_id: '1.2',
  items: [{ variant_id: 'v1', quantity: 1, unit_price: 749, title: 'Ashton', option: 'Grey' }],
  ...over,
})
const row = (over: Partial<OutboxRow> = {}, o = order()): OutboxRow => ({ id: 'r1', platform: 'meta', event_name: 'Purchase', event_id: 'pe-1', attempts: 1, order: o, ...over })
const NOW = new Date('2026-10-08T10:00:00Z')

describe('conversions from the outbox', () => {
  it('builds Purchase from the database’s order, never with an order ID or link', () => {
    const b = buildConversion(row(), 'https://example.test', NOW)
    if ('skip' in b) throw new Error(b.skip)
    expect(b.payload).toMatchObject({ event_name: 'Purchase', event_id: 'pe-1', action_source: 'website', event_time: Date.parse('2026-10-08T09:00:00Z') / 1000 })
    expect(b.payload.user_data).toMatchObject({ client_ip_address: '1.2.3.4', client_user_agent: 'UA', fbp: 'fb.1.1.1', em: sha('ann@example.co.uk') })
    expect(b.payload.custom_data).toMatchObject({ value: 799, content_ids: ['v1'] })
    expect(JSON.stringify(b.payload)).not.toMatch(/order_id|HW-1|confirm-order|track-order/)
  })

  it('leaves the browser’s identifiers out without consent, and for WhatsApp orders', () => {
    const denied = buildConversion(row({}, order({ tracking_consent: 'denied' })), 'https://example.test', NOW)
    const chat = buildConversion(row({}, order({ source: 'whatsapp' })), 'https://example.test', NOW)
    for (const b of [denied, chat]) {
      if ('skip' in b) throw new Error(b.skip)
      expect(b.payload.user_data).not.toHaveProperty('client_ip_address')
      expect(b.payload.user_data).toHaveProperty('ph')
    }
    if (!('skip' in chat)) expect(chat.payload.action_source).toBe('chat')
  })

  it('skips cancelled orders and events Meta would refuse', () => {
    expect(buildConversion(row({}, order({ status: 'cancelled' })), 'https://example.test', NOW)).toEqual({ skip: 'order cancelled' })
    expect(buildConversion(row({}, order({ confirmed_at: '2026-09-20T09:00:00Z' })), 'https://example.test', NOW)).toMatchObject({ skip: expect.stringMatching(/7 days/) })
    expect(buildConversion(row({ order: null }), 'https://example.test', NOW)).toMatchObject({ skip: expect.any(String) })
  })

  it('builds GA4’s purchase with the event ID as the transaction', () => {
    const b = buildConversion(row({ platform: 'ga4', event_name: 'purchase' }), 'https://example.test', NOW)
    if ('skip' in b) throw new Error(b.skip)
    expect(b.payload).toMatchObject({ client_id: '1.2', events: [{ name: 'purchase', params: { transaction_id: 'pe-1', value: 799 } }] })
  })

  const sender = (ok: boolean, setup = { configured: true, testable: true }): Sender & { calls: string[] } => {
    const calls: string[] = []
    return {
      calls,
      setup: { meta: setup, ga4: setup },
      meta: async (_e, mode) => {
        calls.push(`meta:${mode}`)
        return { ok, body: ok ? { events_received: 1 } : { error: { message: 'Invalid token' } } }
      },
      ga4: async (_p, mode) => {
        calls.push(`ga4:${mode}`)
        return { ok, body: null }
      },
    }
  }

  it('sends nothing in a dry run, but keeps what it built', async () => {
    const s = sender(true, { configured: false, testable: false })
    const r = await processConversion(row(), { setting: 'live', liveAllowed: true, siteUrl: 'https://example.test', send: s })
    expect(r).toMatchObject({ status: 'skipped', log: { mode: 'dry_run', status: 'logged' } })
    expect(s.calls).toEqual([])
  })

  it('sends test events (closed, never counted) and real ones only for real orders on the live site', async () => {
    const t = sender(true)
    expect(await processConversion(row({}, order({ is_test: true })), { setting: 'live', liveAllowed: true, siteUrl: 'https://example.test', send: t })).toMatchObject({ status: 'skipped', skip_reason: 'sent as a test event' })
    expect(await processConversion(row(), { setting: 'live', liveAllowed: false, siteUrl: 'https://example.test', send: t })).toMatchObject({ status: 'skipped' })
    expect(await processConversion(row(), { setting: 'live', liveAllowed: true, siteUrl: 'https://example.test', send: t })).toMatchObject({ status: 'sent', response: { events_received: 1 } })
    expect(t.calls).toEqual(['meta:test', 'meta:test', 'meta:live'])
    const f = sender(false)
    expect(await processConversion(row(), { setting: 'live', liveAllowed: true, siteUrl: 'https://example.test', send: f })).toMatchObject({ status: 'failed', log: { status: 'failed' } })
  })
})

describe('orders and tracking', () => {
  const base = OrderInput.parse({
    items: [{ id: 'l1', variantId: '2d8293ef-5fe9-4836-89e3-dda6274b80ad', materialId: null, quantity: 1 }],
    extras: { floor: 0, hasLift: false, assembly: false, removal: false, removalSeats: null },
    name: 'Ann Smith',
    phone: '07700 900123',
    email: 'ann@example.co.uk',
    postcode: 'LS6 2AB',
    shippingAddress: '1 Leaf Street',
    preferredDate: '',
    notes: '',
    expectedTotal: 749,
    visitor: { visitorId: '2d8293ef-5fe9-4836-89e3-dda6274b80a1', sessionId: '2d8293ef-5fe9-4836-89e3-dda6274b80a2', arrivalId: '2d8293ef-5fe9-4836-89e3-dda6274b80a3' },
    website: '',
    attribution: { touch: { source: 'facebook', medium: 'paid_social', campaign: 'autumn', landing: '/products/ashton', referrer: 'l.facebook.com' }, fbclid: 'IwAR123' },
  })
  const tracking = (consent: string): OrderTracking => ({ consent: parseConsent(consent), staffDevice: false, fbp: 'fb.1.1.1', fbc: null, gaClientId: '1.2', ip: '1.2.3.4', userAgent: 'UA' })
  const at = new Date('2026-10-08T10:00:00Z')

  it('keeps Meta’s identifiers, the IP and browser only with marketing consent', () => {
    const yes = trackingPayload(base, tracking('1.m1a1s1.1760000000'), at)
    expect(yes).toMatchObject({ tracking_consent: 'granted', customer_ip: '1.2.3.4', customer_user_agent: 'UA' })
    expect(yes.attribution).toMatchObject({ utm_source: 'facebook', landing_page: '/products/ashton', fbclid: 'IwAR123', meta_fbp: 'fb.1.1.1', meta_fbc: `fb.1.${at.getTime()}.IwAR123`, ga_client_id: '1.2' })
    const no = trackingPayload(base, tracking('1.m0a0s1.1760000000'), at)
    expect(no).toMatchObject({ tracking_consent: 'denied', customer_ip: null, customer_user_agent: null })
    expect(no.attribution).toMatchObject({ utm_source: 'facebook' })
    expect(no.attribution).not.toHaveProperty('fbclid')
    expect(no.attribution).not.toHaveProperty('ga_client_id')
    const off = trackingPayload(base, tracking('1.m0a0s0.1760000000'), at)
    expect(off.attribution).not.toHaveProperty('utm_source')
    expect(off.attribution).toHaveProperty('visitor_id')
  })

  it('makes staff-device and QA orders test orders on the live site', () => {
    expect(testReason({ name: 'Ann', email: '' }, 'production', { staffDevice: true })).toBe('placed on a staff device')
    expect(testReason({ name: 'Ann', email: '' }, 'production', { qa: true })).toBe('QA link')
    expect(testReason({ name: 'Ann', email: '' }, 'production')).toBeNull()
  })
})
