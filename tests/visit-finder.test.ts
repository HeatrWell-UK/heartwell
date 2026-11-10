import { describe, expect, it } from 'vitest'
import { deviceLabel } from '@/lib/attribution/device'
import { referenceKind, visitStepFor, VISIT_REFERENCE } from '@/lib/attribution/visit'
import { clock, dayAndClock, duration, instantOf, matchedLabel, nowIn, pageLabel, sourceLabel, stepLabel } from '@/lib/admin/visits'

describe('device labels', () => {
  it('names the phone and the app, never more', () => {
    const iphoneInstagram =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.30.85 (iPhone15,3; iOS 18_1; en_GB; en-GB; scale=3.00; 1290x2796; 663297456)'
    const samsungFacebook =
      'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.66.81;]'
    const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
    const androidChrome = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
    const windowsEdge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
    const iphoneFacebook = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/488.0.0.40.108;FBBV/123;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5]'
    expect(deviceLabel(iphoneInstagram)).toBe('iPhone, Instagram app')
    expect(deviceLabel(samsungFacebook)).toBe('Samsung, Facebook app')
    expect(deviceLabel(iphoneFacebook)).toBe('iPhone, Facebook app')
    expect(deviceLabel(iphoneSafari)).toBe('iPhone, Safari')
    expect(deviceLabel(androidChrome)).toBe('Android, Chrome')
    expect(deviceLabel(windowsEdge)).toBe('Windows computer, Edge')
    expect(deviceLabel('')).toBeNull()
    expect(deviceLabel(null)).toBeNull()
    expect(deviceLabel('curl/8.0')).toBeNull()
  })
})

describe('visit references and steps', () => {
  it('tells a visit reference from a WhatsApp one', () => {
    expect(VISIT_REFERENCE.test('HW-V-261106-K7P2QX')).toBe(true)
    expect(referenceKind(' hw-v-261106-k7p2qx ')).toBe('visit')
    expect(referenceKind('HW-WA-261106-K7P2QX')).toBe('whatsapp')
    expect(referenceKind('')).toBe('none')
    expect(referenceKind('HW-100123')).toBe('invalid')
    expect(referenceKind('HW-V-2611-K7P2QX')).toBe('invalid')
  })

  it('notes basket adds, checkout and call taps, not what has its own record', () => {
    expect(visitStepFor('AddToCart', { contentName: 'Rio 3+2 Seater', value: 899 })).toEqual({ type: 'add_to_basket', name: 'Rio 3+2 Seater', value: 899 })
    expect(visitStepFor('InitiateCheckout', { value: 1299 })).toEqual({ type: 'checkout_start', value: 1299 })
    expect(visitStepFor('Contact', { contentName: 'Phone call' })).toEqual({ type: 'phone_click' })
    expect(visitStepFor('Contact', { contentName: 'Rio 3+2 Seater' })).toBeNull()
    expect(visitStepFor('Lead', { contentName: 'Basket reminder' })).toBeNull()
    expect(visitStepFor('ViewContent')).toBeNull()
    expect(visitStepFor('OrderPlaced')).toBeNull()
  })
})

describe('what staff read', () => {
  it('names pages the way staff say them', () => {
    expect(pageLabel('/products/rio-3-2-seater', 'Rio 3+2 Seater High Back')).toBe('Rio 3+2 Seater High Back')
    expect(pageLabel('/products/rio-3-2-seater', null)).toBe('rio 3 2 seater')
    expect(pageLabel('/ranges/rio', 'Rio')).toBe('Rio range')
    expect(pageLabel('/sofas/corner-sofas', 'Corner sofas')).toBe('Corner sofas')
    expect(pageLabel('/')).toBe('the home page')
    expect(pageLabel('/basket/')).toBe('the basket')
    expect(pageLabel('/something-new')).toBe('/something-new')
  })

  it('says each step in words', () => {
    const at = '2026-11-06T14:02:00Z'
    expect(stepLabel({ at, kind: 'page_view', path: '/products/rio', title: 'Rio 5 Seater Corner' })).toBe('Viewed Rio 5 Seater Corner')
    expect(stepLabel({ at, kind: 'add_to_basket', title: 'Rio 5 Seater Corner', value: 749 })).toBe('Added Rio 5 Seater Corner to the basket (£749)')
    expect(stepLabel({ at, kind: 'checkout_start', value: null })).toBe('Started checkout')
    expect(stepLabel({ at, kind: 'phone_click' })).toBe('Tapped “Call us”')
    expect(stepLabel({ at, kind: 'whatsapp', title: 'Rio 5 Seater Corner', ref: 'HW-WA-261106-AAAAAA' })).toBe('Tapped WhatsApp about Rio 5 Seater Corner')
    expect(stepLabel({ at, kind: 'basket_reminder', title: 'WhatsApp' })).toBe('Asked for a basket reminder by WhatsApp')
    expect(stepLabel({ at, kind: 'samples', value: 3 })).toBe('Asked for 3 fabric samples')
    expect(stepLabel({ at, kind: 'whatsapp_opened', title: 'Rio 5 Seater Corner' })).toBe('WhatsApp opened')
    expect(stepLabel({ at, kind: 'whatsapp_stuck' })).toBe('WhatsApp didn’t open (we showed other ways to reach us)')
    expect(stepLabel({ at, kind: 'whatsapp_callback' })).toBe('Left their number for us to WhatsApp them')
    expect(stepLabel({ at, kind: 'order', ref: 'HW-100140', title: 'pending_cod', source: 'website' })).toBe('Placed website order HW-100140 (waiting for the customer to confirm)')
    expect(stepLabel({ at, kind: 'order', ref: 'HW-100141', title: 'confirmed', source: 'phone' })).toBe('Already linked to phone order HW-100141')
  })

  it('says where a visit came from', () => {
    const none = { source: null, medium: null, campaign: null, content: null, referrer: null }
    expect(sourceLabel({ ...none, from_ad: true, source: 'facebook', medium: 'paid_social', campaign: 'heartwell-sales-nov26', content: 'R3' })).toBe('From Meta ad R3 (campaign heartwell-sales-nov26)')
    expect(sourceLabel({ ...none, from_ad: true })).toBe('From a Meta ad')
    expect(sourceLabel({ ...none, from_ad: false, source: 'facebook', medium: 'social', campaign: 'range-rio' })).toBe('From a Facebook post (range-rio)')
    expect(sourceLabel({ ...none, from_ad: false, referrer: 'www.google.com' })).toBe('From google.com')
    expect(sourceLabel({ ...none, from_ad: false })).toBe('Came straight to the site')
    expect(matchedLabel(['basket_reminder', 'order'])).toBe('Same phone or email as a basket reminder and a website order')
    expect(matchedLabel([])).toBeNull()
  })

  it('works in UK and Pakistan time, either side of the clocks changing', () => {
    // 6 November: UK on GMT, Pakistan five hours ahead.
    expect(clock('2026-11-06T14:02:00Z', 'uk')).toBe('14:02')
    expect(clock('2026-11-06T14:02:00Z', 'pk')).toBe('19:02')
    expect(dayAndClock('2026-11-06T23:30:00Z', 'pk')).toBe('7 Nov 04:30')
    expect(nowIn('uk', new Date('2026-11-06T14:02:30Z'))).toEqual({ date: '2026-11-06', time: '14:02' })
    expect(instantOf('2026-11-06', '19:02', 'pk')?.toISOString()).toBe('2026-11-06T14:02:00.000Z')
    expect(instantOf('2026-11-06', '14:02', 'uk')?.toISOString()).toBe('2026-11-06T14:02:00.000Z')
    // Summer: the UK on BST, an hour ahead of GMT.
    expect(instantOf('2026-07-01', '09:00', 'uk')?.toISOString()).toBe('2026-07-01T08:00:00.000Z')
    expect(instantOf('2026-13-01', '09:00', 'uk')).toBeNull()
    expect(instantOf('2026-07-01', '9am', 'uk')).toBeNull()
  })

  it('says how long a visit lasted', () => {
    expect(duration('2026-11-06T14:02:00Z', '2026-11-06T14:02:20Z')).toBe('under a minute')
    expect(duration('2026-11-06T14:02:00Z', '2026-11-06T14:19:00Z')).toBe('17 min')
    expect(duration('2026-11-06T14:00:00Z', '2026-11-06T15:30:00Z')).toBe('1 h 30 min')
  })
})
