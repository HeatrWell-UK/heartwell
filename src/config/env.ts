// Which environment this build is running in, decided by our own settings so the
// same code behaves the same on Vercel (during the build phase) and on Hostinger
// (from launch). Nothing here reads VERCEL_ENV or any other host-specific flag.

export type AppEnv = 'development' | 'staging' | 'production'

function readAppEnv(): AppEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV
  if (raw === 'production' || raw === 'staging') return raw
  return 'development'
}

/** development locally, staging on preview deployments, production on the live site. */
export const APP_ENV: AppEnv = readAppEnv()

/**
 * Whether search engines may index this deployment. Off everywhere until the
 * go-live phase sets SITE_INDEXABLE=true on the real domain, so previews and
 * the pre-launch site never compete with the live one in Google.
 */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === 'true' && APP_ENV === 'production'
