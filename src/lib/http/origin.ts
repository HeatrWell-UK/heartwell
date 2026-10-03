// The site's public origin for a request.
//
// Behind a hosting proxy (Hostinger from Phase 18B, Vercel now) the request
// the app sees can carry an internal host, so redirects are built from the
// forwarded host instead. A forwarded host is trusted only when it is one of
// ours, so a forged header can't send anyone elsewhere.

import { SITE_URL } from '@/config/site'

const SITE_HOST = new URL(SITE_URL).host

function isOurHost(host: string): boolean {
  return (
    host === SITE_HOST ||
    host === `www.${SITE_HOST}` ||
    host.endsWith('.vercel.app') ||
    /^localhost(:\d+)?$/.test(host) ||
    /^127\.0\.0\.1(:\d+)?$/.test(host)
  )
}

export function externalOrigin(headers: Headers, fallbackOrigin?: string): string {
  const host = (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').split(',')[0]?.trim() ?? ''
  const proto = (headers.get('x-forwarded-proto') ?? '').split(',')[0]?.trim() || (host.startsWith('localhost') ? 'http' : 'https')
  if (host && isOurHost(host)) return `${proto}://${host}`
  return fallbackOrigin && isOurHost(new URL(fallbackOrigin).host) ? fallbackOrigin : SITE_URL
}

/** A same-site path to return to after signing in, or the fallback. Never another site. */
export function safeNextPath(value: unknown, fallback = '/admin'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
