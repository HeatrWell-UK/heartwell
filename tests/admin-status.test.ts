import { describe, expect, it } from 'vitest'
import { buildStatusChecks, overallLevel, type AdminStatusData, type StatusContext } from '@/lib/admin/status'

const ctx: StatusContext = {
  appEnv: 'staging',
  siteUrl: 'https://heartwell-staging.vercel.app',
  indexable: false,
  commit: 'abc1234',
  supabaseConfigured: true,
  secretKeyConfigured: false,
  smtpConfigured: false,
  addressLookupConfigured: false,
  trackingConfigured: false,
}

const data: AdminStatusData = {
  database: { time: '2026-10-04T10:00:00Z', postgres: '17.6', migrations: 10, latest_migration: '20261004100900 order_line_position' },
  catalogue: { products: 0, active_products: 0, variants: 0, categories: 0, materials: 0 },
  orders: { real: 0, test: 0, awaiting_confirmation: 0, latest: null },
  admins: 1,
  settings: {},
  cron: [
    { name: 'heartwell-daily-cleanup', schedule: '15 3 * * *', active: true, last_status: null, last_run: null, last_message: null },
    { name: 'heartwell-orderflow-resend', schedule: '*/15 * * * *', active: true, last_status: 'succeeded', last_run: '2026-10-04T09:45:00Z', last_message: '1 row' },
  ],
  jobs: [],
  email: { last_sent: null, last_failed: null, failed_24h: 0 },
  conversions: { pending: 0, failed: 0, last_sent: null },
  orderflow: { enabled: false, configured: false, last_push: null },
}

const byKey = (checks: ReturnType<typeof buildStatusChecks>) => Object.fromEntries(checks.map((c) => [c.key, c.level]))

describe('admin status', () => {
  it('goes red once checkout is on but its server key or email is missing; optional parts stay amber', () => {
    const checks = buildStatusChecks(ctx, data, null)
    expect(byKey(checks)).toEqual({
      database: 'ok',
      environment: 'ok',
      server_key: 'error',
      catalogue: 'warn',
      orders: 'ok',
      email: 'error',
      address_lookup: 'warn',
      jobs: 'warn',
      tracking: 'warn',
      orderflow: 'warn',
    })
    expect(overallLevel(checks)).toBe('error')
    for (const c of checks) expect(c.summary.length).toBeGreaterThan(10)
  })

  it('is green for checkout once the server key, email and lookup are set', () => {
    const checks = buildStatusChecks({ ...ctx, secretKeyConfigured: true, smtpConfigured: true, addressLookupConfigured: true }, data, null)
    expect(byKey(checks)).toMatchObject({ server_key: 'ok', email: 'ok', address_lookup: 'ok' })
  })

  it('goes red when the database cannot be read', () => {
    const checks = buildStatusChecks(ctx, null, 'connection refused')
    expect(checks[0]).toMatchObject({ key: 'database', level: 'error' })
    expect(overallLevel(checks)).toBe('error')
  })

  it('goes red when Supabase is not configured at all', () => {
    expect(buildStatusChecks({ ...ctx, supabaseConfigured: false }, null, null)[0]?.level).toBe('error')
  })

  it('goes red when a scheduled job fails', () => {
    const failing = { ...data, cron: [{ ...data.cron[1]!, last_status: 'failed', last_message: 'boom' }] }
    expect(byKey(buildStatusChecks(ctx, failing, null)).jobs).toBe('error')
  })

  it('goes red when emails fail, once email is set up', () => {
    const failing = { ...data, email: { ...data.email, failed_24h: 2 } }
    expect(byKey(buildStatusChecks({ ...ctx, smtpConfigured: true }, failing, null)).email).toBe('error')
  })

  it('goes red when OrderFlow is on but not configured', () => {
    const broken = { ...data, orderflow: { enabled: true, configured: false, last_push: null } }
    expect(byKey(buildStatusChecks(ctx, broken, null)).orderflow).toBe('error')
  })
})
