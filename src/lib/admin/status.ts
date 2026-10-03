// The admin Status page's verdicts: green, amber or red, each with a reason a
// shop owner can act on. Pure, so it can be tested without a database.

export type Level = 'ok' | 'warn' | 'error'

export interface StatusCheck {
  key: string
  title: string
  level: Level
  summary: string
  details?: { label: string; value: string }[]
}

/** The shape public.admin_status() returns. */
export interface AdminStatusData {
  database: { time: string; postgres: string; migrations: number; latest_migration: string | null }
  catalogue: { products: number; active_products: number; variants: number; categories: number; materials: number }
  orders: { real: number; test: number; awaiting_confirmation: number; latest: string | null }
  admins: number
  settings: Record<string, unknown>
  cron: { name: string; schedule: string; active: boolean; last_status: string | null; last_run: string | null; last_message: string | null }[]
  jobs: { job: string; status: string; started_at: string; finished_at: string | null; error: string | null }[]
  email: { last_sent: string | null; last_failed: string | null; failed_24h: number }
  conversions: { pending: number; failed: number; last_sent: string | null }
  orderflow: { enabled: boolean; configured: boolean; last_push: string | null }
}

export interface StatusContext {
  appEnv: 'development' | 'staging' | 'production'
  siteUrl: string
  indexable: boolean
  commit: string
  supabaseConfigured: boolean
  secretKeyConfigured: boolean
  smtpConfigured: boolean
  trackingConfigured: boolean
}

const when = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
        new Date(iso),
      )
    : 'never'

const worst = (levels: Level[]): Level => (levels.includes('error') ? 'error' : levels.includes('warn') ? 'warn' : 'ok')

export function buildStatusChecks(
  ctx: StatusContext,
  data: AdminStatusData | null,
  dbError: string | null,
): StatusCheck[] {
  const checks: StatusCheck[] = []

  // Database
  if (!ctx.supabaseConfigured) {
    checks.push({
      key: 'database',
      title: 'Database',
      level: 'error',
      summary: 'Not connected: the Supabase address and publishable key are missing from the hosting settings.',
    })
  } else if (dbError || !data) {
    checks.push({ key: 'database', title: 'Database', level: 'error', summary: `Can't read the database: ${dbError ?? 'no reply'}.` })
  } else {
    checks.push({
      key: 'database',
      title: 'Database',
      level: 'ok',
      summary: `Connected. ${data.database.migrations} migrations applied.`,
      details: [
        { label: 'Latest migration', value: data.database.latest_migration ?? 'none' },
        { label: 'Postgres', value: data.database.postgres },
      ],
    })
  }

  // Environment
  checks.push({
    key: 'environment',
    title: 'Environment',
    level: 'ok',
    summary:
      ctx.appEnv === 'production'
        ? 'Live settings.'
        : 'Staging settings: hidden from search engines, tracking off, test orders only.',
    details: [
      { label: 'Environment', value: ctx.appEnv },
      { label: 'Site address', value: ctx.siteUrl },
      { label: 'Search engines', value: ctx.indexable ? 'Allowed' : 'Blocked until go-live' },
      { label: 'Build', value: ctx.commit },
    ],
  })

  if (!data) return checks

  // Server key
  checks.push({
    key: 'server_key',
    title: 'Server key',
    level: ctx.secretKeyConfigured ? 'ok' : 'warn',
    summary: ctx.secretKeyConfigured
      ? 'Set. The checkout can place orders.'
      : 'Not set yet. The checkout needs it to place orders (Phase 10).',
  })

  // Catalogue
  checks.push({
    key: 'catalogue',
    title: 'Catalogue',
    level: data.catalogue.active_products > 0 ? 'ok' : 'warn',
    summary:
      data.catalogue.active_products > 0
        ? `${data.catalogue.active_products} products on sale.`
        : 'No products yet. They arrive with the catalogue import (Phase 5).',
    details: [
      { label: 'Products', value: `${data.catalogue.active_products} live of ${data.catalogue.products}` },
      { label: 'Colourways', value: String(data.catalogue.variants) },
      { label: 'Categories', value: String(data.catalogue.categories) },
      { label: 'Fabrics and finishes', value: String(data.catalogue.materials) },
    ],
  })

  // Orders
  checks.push({
    key: 'orders',
    title: 'Orders',
    level: 'ok',
    summary:
      data.orders.real === 0
        ? 'No real orders yet.'
        : `${data.orders.real} real orders; ${data.orders.awaiting_confirmation} waiting for the customer to confirm.`,
    details: [
      { label: 'Test orders', value: String(data.orders.test) },
      { label: 'Latest real order', value: when(data.orders.latest) },
    ],
  })

  // Email
  if (!ctx.smtpConfigured) {
    checks.push({ key: 'email', title: 'Email', level: 'warn', summary: 'Not set up yet. Order emails arrive in Phase 10.' })
  } else {
    const failing = data.email.failed_24h > 0
    checks.push({
      key: 'email',
      title: 'Email',
      level: failing ? 'error' : 'ok',
      summary: failing
        ? `${data.email.failed_24h} emails failed in the last 24 hours. Check the email log.`
        : `Working. Last email sent ${when(data.email.last_sent)}.`,
    })
  }

  // Scheduled jobs
  const jobLevels: Level[] = []
  const jobDetails = data.cron.map((j) => {
    const level: Level = !j.active ? 'warn' : j.last_status === 'failed' ? 'error' : j.last_status ? 'ok' : 'warn'
    jobLevels.push(level)
    const state = !j.active
      ? 'paused'
      : j.last_status === 'failed'
        ? `failed ${when(j.last_run)}: ${j.last_message ?? 'no message'}`
        : j.last_status
          ? `ran ${when(j.last_run)}`
          : 'waiting for its first run'
    return { label: j.name.replace(/^heartwell-/, ''), value: state }
  })
  const jobsLevel = data.cron.length === 0 ? 'error' : worst(jobLevels)
  checks.push({
    key: 'jobs',
    title: 'Scheduled jobs',
    level: jobsLevel,
    summary:
      data.cron.length === 0
        ? 'No scheduled jobs found.'
        : jobsLevel === 'error'
          ? 'A scheduled job is failing.'
          : jobsLevel === 'warn'
            ? 'Set up. Some haven’t run yet.'
            : 'All running.',
    details: jobDetails,
  })

  // Tracking
  checks.push({
    key: 'tracking',
    title: 'Meta and Google tracking',
    level: !ctx.trackingConfigured ? 'warn' : data.conversions.failed > 0 ? 'error' : 'ok',
    summary: !ctx.trackingConfigured
      ? 'Not set up yet (Phase 14). Nothing is sent to Meta or Google.'
      : data.conversions.failed > 0
        ? `${data.conversions.failed} conversions failed to send.`
        : `Working. Last conversion sent ${when(data.conversions.last_sent)}.`,
  })

  // OrderFlow
  checks.push({
    key: 'orderflow',
    title: 'OrderFlow',
    level: !data.orderflow.enabled ? 'warn' : data.orderflow.configured ? 'ok' : 'error',
    summary: !data.orderflow.enabled
      ? 'Off. It’s connected in Phase 17; until then orders stay here only.'
      : data.orderflow.configured
        ? `On. Last order sent ${when(data.orderflow.last_push)}.`
        : 'Switched on, but the OrderFlow address or key is missing.',
  })

  return checks
}

export function overallLevel(checks: StatusCheck[]): Level {
  return worst(checks.map((c) => c.level))
}
