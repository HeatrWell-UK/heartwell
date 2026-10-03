// Whether each outside service has its settings, for the admin Status page.
// Only presence is checked here; values are read where they're used.

const has = (...names: string[]) => names.every((n) => (process.env[n] ?? '') !== '')

export const INTEGRATIONS = {
  /** Hostinger SMTP for order emails (Phase 10). */
  smtp: has('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'),
  /** Meta Pixel and Conversions API (Phase 14). */
  metaTracking: has('NEXT_PUBLIC_META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN'),
} as const

/** The deployed commit, for display only. Hosts set different variables. */
export const BUILD_COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'local').slice(0, 7)
