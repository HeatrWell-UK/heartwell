import { describe, expect, it } from 'vitest'
import { buildStatusChecks, feedSummary, type AdminStatusData, type StatusContext } from '@/lib/admin/status'
import { ORDER_STATUSES, pushVerdict } from '@/lib/admin/orderflow'
import { STATUSES } from '@/lib/admin/orders'
import { alertEmail, healthVerdict, problemsFrom, STALE_AFTER_MS } from '@/lib/monitoring/alerts'
import { comparison, digestEmail, weekLabel, type DigestData } from '@/lib/reports/digest'

const ctx: StatusContext = {
  appEnv: 'production',
  siteUrl: 'https://heartwellfurniture.co.uk',
  indexable: true,
  commit: 'abc1234',
  supabaseConfigured: true,
  secretKeyConfigured: true,
  smtpConfigured: true,
  addressLookupConfigured: true,
  photoUploadsConfigured: true,
  trackingConfigured: true,
}

const data: AdminStatusData = {
  database: { time: '2026-10-13T10:00:00Z', postgres: '17', migrations: 21, latest_migration: 'health_state' },
  catalogue: { products: 64, active_products: 64, variants: 105, categories: 9, materials: 70 },
  orders: { real: 3, test: 1, awaiting_confirmation: 1, latest: '2026-10-13T09:00:00Z' },
  admins: 1,
  settings: { tracking_mode: 'live' },
  cron: [{ name: 'heartwell-health-check', schedule: '7 * * * *', active: true, last_status: 'succeeded', last_run: '2026-10-13T09:07:00Z', last_message: null }],
  jobs: [{ job: 'health-check', status: 'ok', started_at: '2026-10-13T09:07:00Z', finished_at: '2026-10-13T09:07:02Z', error: null }],
  email: { last_sent: '2026-10-13T09:00:00Z', last_failed: null, failed_24h: 0 },
  conversions: { pending: 0, failed: 0, last_sent: '2026-10-13T08:00:00Z' },
  orderflow: { enabled: true, configured: true, last_push: '2026-10-13T09:00:00Z', last_ok: '2026-10-13T09:00:00Z', failed_24h: 0, last_error: null },
  feed: { last_fetched: '2026-10-13T09:30:00Z', items: 82 },
}

const levelOf = (d: AdminStatusData, key: string) => buildStatusChecks(ctx, d, null, feedSummary(d), Date.parse('2026-10-13T10:00:00Z')).find((c) => c.key === key)

describe('OrderFlow on the Health card', () => {
  it('is green when on and accepting orders', () => {
    expect(levelOf(data, 'orderflow')).toMatchObject({ level: 'ok' })
  })

  it('is red when orders aren’t accepted, saying why', () => {
    const d = { ...data, orderflow: { ...data.orderflow, failed_24h: 2, last_error: 'OrderFlow refused the key (401)' } }
    const check = levelOf(d, 'orderflow')!
    expect(check.level).toBe('error')
    expect(check.summary).toContain('2 orders not accepted')
    expect(check.summary).toContain('401')
  })

  it('is red when switched on without the Vault values, and amber while off', () => {
    expect(levelOf({ ...data, orderflow: { ...data.orderflow, configured: false } }, 'orderflow')!.level).toBe('error')
    expect(levelOf({ ...data, orderflow: { ...data.orderflow, enabled: false } }, 'orderflow')).toMatchObject({ level: 'warn' })
    expect(levelOf({ ...data, orderflow: { ...data.orderflow, enabled: false } }, 'orderflow')!.summary).toMatch(/^Ready but switched off/)
  })

  it('reads the catalogue feed from the same snapshot', () => {
    expect(levelOf(data, 'catalogue_feed')).toMatchObject({ level: 'ok' })
    expect(feedSummary({ ...data, feed: null })).toEqual({ lastFetched: null, items: 0 })
  })

  it('tells each push’s outcome in words', () => {
    expect(pushVerdict({ checked_at: null, error: null, outcome: null, status_code: null })).toMatchObject({ tone: 'wait' })
    expect(pushVerdict({ checked_at: 'x', error: null, outcome: 'created', status_code: 200 })).toEqual({ tone: 'ok', text: 'Accepted: created' })
    expect(pushVerdict({ checked_at: 'x', error: 'OrderFlow refused the key (401)', outcome: null, status_code: 401 })).toMatchObject({ tone: 'bad' })
  })

  it('lists exactly the statuses an order can have, for OrderFlow’s mapping', () => {
    expect(ORDER_STATUSES.map((s) => s.status)).toEqual([...STATUSES])
  })
})

describe('alerts', () => {
  it('raises only what the Health card shows in red', () => {
    const d = { ...data, email: { ...data.email, failed_24h: 3 }, orderflow: { ...data.orderflow, failed_24h: 1 } }
    const problems = problemsFrom(buildStatusChecks(ctx, d, null, feedSummary(d), Date.parse('2026-10-13T10:00:00Z')))
    expect(problems.map((p) => p.key).sort()).toEqual(['email', 'orderflow'])
    expect(problemsFrom(buildStatusChecks(ctx, data, null, feedSummary(data), Date.parse('2026-10-13T10:00:00Z')))).toEqual([])
  })

  it('writes one email for what broke and what was fixed', () => {
    const email = alertEmail([{ key: 'email', title: 'Email', summary: '3 emails failed in the last 24 hours.', since: '2026-10-13T08:00:00Z' }], [{ key: 'orderflow', title: 'OrderFlow' }], {
      statusUrl: 'https://heartwellfurniture.co.uk/admin/status',
      appEnv: 'production',
    })
    expect(email.subject).toBe('Heartwell needs attention: Email')
    expect(email.text).toContain('Email: 3 emails failed in the last 24 hours. (since Tue 13 Oct 09:00)')
    expect(email.text).toContain('Fixed: OrderFlow.')
    expect(email.html).toContain('/admin/status')
  })

  it('says when everything is back to normal, and marks staging', () => {
    const email = alertEmail([], [{ key: 'email', title: 'Email' }], { statusUrl: 'https://x.test/admin/status', appEnv: 'staging' })
    expect(email.subject).toBe('[pre-launch] Heartwell is back to normal: Email')
  })

  it('keeps the uptime monitor green only while nothing is red and the check still runs', () => {
    const now = Date.parse('2026-10-13T10:00:00Z')
    expect(healthVerdict({ red: 0, last_check: '2026-10-13T09:07:00Z' }, now)).toEqual({ ok: true, red: 0, stale: false })
    expect(healthVerdict({ red: 1, last_check: '2026-10-13T09:07:00Z' }, now)).toMatchObject({ ok: false, red: 1 })
    expect(healthVerdict({ red: 0, last_check: new Date(now - STALE_AFTER_MS - 1000).toISOString() }, now)).toMatchObject({ ok: false, stale: true })
    expect(healthVerdict({ red: 0, last_check: null }, now)).toMatchObject({ ok: false, stale: true })
    expect(healthVerdict(null, now)).toMatchObject({ ok: false })
  })
})

describe('Monday digest', () => {
  const digest: DigestData = {
    from: '2026-10-04T23:00:00Z',
    to: '2026-10-11T23:00:00Z',
    orders: { placed: 5, confirmed: 3, confirmed_value: 2147, delivered: 2, delivered_value: 1398, cancelled: 1, prev_confirmed: 1, prev_confirmed_value: 699, awaiting_confirmation: 2 },
    channels: [
      { channel: 'Meta ads', campaign: 'Autumn <corners>', ad: 'Grey corner video', orders: 2, value: 1448 },
      { channel: 'WhatsApp', campaign: null, ad: null, orders: 1, value: 699 },
    ],
    funnel: { visits: 420, ad_visits: 310, whatsapp: 12, samples: 3, messages: 2, reminders: 4, newsletter: 1 },
    landing: [{ page: '/products/roma-corner', visits: 120, orders: 2 }],
  }

  it('covers Monday to Sunday, UK time', () => {
    expect(weekLabel(digest)).toBe('Monday 5 October to Sunday 11 October 2026')
  })

  it('compares with the week before', () => {
    expect(comparison(3, 1)).toBe('up from 1 the week before')
    expect(comparison(699, 2147, true)).toBe('down from £2,147 the week before')
    expect(comparison(2, 2)).toBe('the same as the week before')
  })

  it('leads with confirmed orders and their value, and shows where they came from', () => {
    const email = digestEmail(digest, { adminUrl: 'https://heartwellfurniture.co.uk/admin', appEnv: 'production' })
    expect(email.subject).toBe('Last week at Heartwell: 3 orders confirmed, £2,147')
    expect(email.text).toContain('3 confirmed, £2,147: up from 1 the week before.')
    expect(email.text).toContain('- Meta ads / Autumn <corners> / Grey corner video: 2, £1,448')
    expect(email.html).toContain('Autumn &lt;corners&gt;')
    expect(email.html).not.toContain('Autumn <corners>')
    expect(email.text).toContain('/products/roma-corner: 120 visits, 2 orders')
    expect(email.text).not.toMatch(/undefined|NaN|null/)
  })

  it('reads well in a quiet week', () => {
    const quiet = { ...digest, orders: { ...digest.orders, confirmed: 0, confirmed_value: 0, prev_confirmed: 0, prev_confirmed_value: 0 }, channels: [], landing: [] }
    const email = digestEmail(quiet, { adminUrl: 'https://x.test/admin', appEnv: 'staging' })
    expect(email.subject).toBe('[pre-launch] Last week at Heartwell: 0 orders confirmed, £0')
    expect(email.text).not.toContain('Where confirmed orders came from')
  })
})
