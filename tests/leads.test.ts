import { describe, expect, it, vi } from 'vitest'
import { mintReference, platformOf, REFERENCE_ALPHABET, ukDatePart, WA_REFERENCE, whatsAppLaunch, withReference } from '@/lib/whatsapp/handoff'
import { cloudinaryVideo } from '@/lib/videos'
import { basketReminderEmail, contactShopEmail, newsletterConfirmEmail, reviewRequestEmail, sampleCustomerEmail, sampleShopEmail } from '@/lib/email/lead-emails'
import { buildStatusChecks, jobRunVerdict, type AdminStatusData } from '@/lib/admin/status'

vi.mock('server-only', () => ({}))

const IG_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0 (iPhone15,3; iOS 18_5; en_GB)'
const FB_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]'
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

describe('WhatsApp references', () => {
  it('dates them in UK time, across the clock change', () => {
    expect(ukDatePart(new Date('2026-10-06T23:30:00Z'))).toBe('261007') // BST: already the 7th in the UK
    expect(ukDatePart(new Date('2026-12-31T23:30:00Z'))).toBe('261231') // GMT: still the 31st
  })

  it('makes references the database accepts, from its own alphabet', () => {
    const ref = mintReference(new Date('2026-10-07T10:00:00Z'), () => new Uint8Array([0, 1, 31, 32, 255, 9]))
    expect(ref).toBe('HW-WA-261007-AB9A9K')
    expect(WA_REFERENCE.test(ref)).toBe(true)
    for (let i = 0; i < 50; i++) {
      const r = mintReference()
      expect(WA_REFERENCE.test(r)).toBe(true)
      expect([...r.slice(-6)].every((c) => REFERENCE_ALPHABET.includes(c))).toBe(true)
    }
  })

  it('puts the reference on its own line at the end', () => {
    expect(withReference('Hi Heartwell', 'HW-WA-261007-ABCDEF')).toBe('Hi Heartwell\n\nRef: HW-WA-261007-ABCDEF')
  })
})

describe('opening WhatsApp', () => {
  it('knows the Instagram and Facebook in-app browsers', () => {
    expect(platformOf(IG_IPHONE)).toBe('ios-in-app')
    expect(platformOf(FB_ANDROID)).toBe('android-in-app')
    expect(platformOf(SAFARI)).toBe('other')
    expect(platformOf(DESKTOP)).toBe('other')
  })

  it('uses the app’s own link inside them, with wa.me as the way back', () => {
    const text = 'Hi & hello\n\nRef: HW-WA-261007-ABCDEF'
    const encoded = encodeURIComponent(text)
    expect(whatsAppLaunch('447848477056', text, 'other')).toEqual({ url: `https://wa.me/447848477056?text=${encoded}`, fallback: null })
    expect(whatsAppLaunch('447848477056', text, 'ios-in-app')).toEqual({
      url: `whatsapp://send?phone=447848477056&text=${encoded}`,
      fallback: `https://wa.me/447848477056?text=${encoded}`,
    })
    const android = whatsAppLaunch('447848477056', text, 'android-in-app')
    expect(android.url).toMatch(/^intent:\/\/send\?phone=447848477056&text=.+#Intent;scheme=whatsapp;S\.browser_fallback_url=https%3A%2F%2Fwa\.me%2F447848477056.+;end$/)
    expect(android.fallback).toBeNull()
  })
})

describe('product videos', () => {
  it('turns any Cloudinary video link into an MP4 and a poster', () => {
    expect(cloudinaryVideo('https://res.cloudinary.com/iv3tp2iq/video/upload/v1791077733/heartwell/uploads/abc123.mov')).toEqual({
      cloud: 'iv3tp2iq',
      publicId: 'heartwell/uploads/abc123',
      mp4: 'https://res.cloudinary.com/iv3tp2iq/video/upload/q_auto/heartwell/uploads/abc123.mp4',
      poster: 'https://res.cloudinary.com/iv3tp2iq/video/upload/so_0,q_auto/heartwell/uploads/abc123.jpg',
    })
    expect(cloudinaryVideo('https://res.cloudinary.com/iv3tp2iq/video/upload/q_auto,f_auto/v17/heartwell/x.mp4')?.publicId).toBe('heartwell/x')
    expect(cloudinaryVideo('https://res.cloudinary.com/iv3tp2iq/video/upload/q_auto/clip.mp4')?.publicId).toBe('clip')
    expect(cloudinaryVideo('https://res.cloudinary.com/iv3tp2iq/video/upload/customers/clip.mp4')?.publicId).toBe('customers/clip')
  })

  it('refuses anything else', () => {
    expect(cloudinaryVideo('https://res.cloudinary.com/iv3tp2iq/image/upload/v1/a.jpg')).toBeNull()
    expect(cloudinaryVideo('https://example.com/v.mp4')).toBeNull()
  })
})

const shop = { email: 'enquiries@example.test', phoneDisplay: '07848 477056', whatsAppHref: 'https://wa.me/447848477056' }

describe('lead emails', () => {
  const fabrics = [{ code: 'CH-01', name: 'Grey <b>', collection: 'Chenille' }]

  it('tells the customer how samples work, safely escaped', () => {
    const e = sampleCustomerEmail({ name: 'Ann Smith', phone: '07700 900123', fabrics, shop })
    expect(e.html).toContain('Thank you, Ann')
    expect(e.html).toContain('Chenille Grey &lt;b&gt; (CH-01)')
    expect(e.html).not.toContain('<b>')
    expect(e.text).toContain('£5')
    expect(e.text).toContain('take the £5 off')
  })

  it('gives the shop a test flag, a WhatsApp button and a copy block', () => {
    const e = sampleShopEmail({ name: 'Ann Smith', email: 'ann@example.test', phone: '07700 900123', address: '1 Leaf St', postcode: 'LS6 2AB', fabrics, isTest: true, whatsAppToCustomer: 'https://wa.me/447700900123', adminUrl: 'https://example.test/admin' })
    expect(e.subject).toBe('[TEST] Sample request: 1 from Ann Smith')
    expect(e.html).toContain('Message them on WhatsApp')
    expect(e.text).toContain('1 Leaf St, LS6 2AB')
  })

  it('labels contact messages by topic and order', () => {
    const e = contactShopEmail({ name: 'Ann', email: 'ann@example.test', phone: null, topic: 'delivery', orderReference: 'HW-100231', message: 'When?', isTest: false, whatsAppToCustomer: null, adminUrl: 'https://example.test/admin' })
    expect(e.subject).toBe('Message from Ann: Delivery (HW-100231)')
    expect(e.html).not.toContain('Reply on WhatsApp')
  })

  it('asks for a review by product, with the private link', () => {
    const one = reviewRequestEmail({ name: 'Ann Smith', reference: 'HW-100231', reviewUrl: 'https://example.test/review/t', products: [{ title: 'Ashton 3 Seater' }], shop })
    expect(one.subject).toBe('How are you getting on with your Ashton 3 Seater?')
    expect(one.html).toContain('https://example.test/review/t')
    const two = reviewRequestEmail({ name: 'Ann', reference: 'HW-1', reviewUrl: 'u', products: [{ title: 'A' }, { title: 'B' }], shop })
    expect(two.subject).toBe('How are you getting on with your new furniture?')
  })

  it('links each basket line to its product and promises no more', () => {
    const e = basketReminderEmail({ name: null, lines: [{ title: 'Ashton', option: 'Grey', href: 'https://example.test/products/ashton' }], shop })
    expect(e.html).toContain('href="https://example.test/products/ashton"')
    expect(e.text).toContain('Ashton, Grey: https://example.test/products/ashton')
    expect(e.html).toContain('We won’t email about this basket again')
  })

  it('asks to confirm the newsletter with one button', () => {
    expect(newsletterConfirmEmail({ confirmUrl: 'https://example.test/newsletter/confirm?token=x' }).html).toContain('Yes, send me emails')
  })
})

describe('scheduled jobs on the Status page', () => {
  const now = Date.parse('2026-10-07T12:00:00Z')
  const run = (status: string, started = '2026-10-07T09:00:00Z', error: string | null = null) => ({ job: 'review-requests', status, started_at: started, finished_at: status === 'running' ? null : started, error })

  it('reads what the job itself reported', () => {
    expect(jobRunVerdict(run('ok'), now).level).toBe('ok')
    expect(jobRunVerdict(run('failed', undefined, 'SMTP down'), now)).toMatchObject({ level: 'error' })
    expect(jobRunVerdict(run('failed', undefined, 'SMTP down'), now).state).toContain('SMTP down')
    expect(jobRunVerdict(run('skipped', undefined, 'Email isn’t set up yet'), now)).toMatchObject({ level: 'warn' })
    expect(jobRunVerdict(run('running', '2026-10-07T11:50:00Z'), now)).toMatchObject({ level: 'ok', state: 'running now' })
    expect(jobRunVerdict(run('running', '2026-10-07T09:00:00Z'), now).level).toBe('error')
  })

  it('prefers the job’s own report over pg_cron’s “request sent”', () => {
    const data = {
      database: { time: '', postgres: '', migrations: 1, latest_migration: null },
      catalogue: { products: 0, active_products: 0, variants: 0, categories: 0, materials: 0 },
      orders: { real: 0, test: 0, awaiting_confirmation: 0, latest: null },
      admins: 1,
      settings: {},
      cron: [{ name: 'heartwell-review-requests', schedule: '0 9 * * *', active: true, last_status: 'succeeded', last_run: '2026-10-07T09:00:00Z', last_message: '1 row' }],
      jobs: [run('failed', undefined, 'boom')],
      email: { last_sent: null, last_failed: null, failed_24h: 0 },
      conversions: { pending: 0, failed: 0, last_sent: null },
      orderflow: { enabled: false, configured: false, last_push: null },
    } satisfies AdminStatusData
    const ctx = {
      appEnv: 'staging' as const,
      siteUrl: 'https://example.test',
      indexable: false,
      commit: 'abc',
      supabaseConfigured: true,
      secretKeyConfigured: true,
      smtpConfigured: true,
      addressLookupConfigured: true,
      photoUploadsConfigured: true,
      trackingConfigured: false,
    }
    const jobs = buildStatusChecks(ctx, data, null).find((c) => c.key === 'jobs')!
    expect(jobs.level).toBe('error')
    expect(jobs.details?.[0]).toMatchObject({ label: 'review-requests' })
  })
})
