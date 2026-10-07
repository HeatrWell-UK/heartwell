// Meta and Google tracking: the public IDs and the rules that decide whether
// anything may be sent at all. Safe in the browser (no secrets here; the
// Conversions API token and the GA4 API secret are read on the server only).
//
// The hard rule: real events go out only from the live domain AND with
// APP_ENV=production. Everywhere else (staging, previews, a laptop) the most
// that happens is a Meta *test* event or a dry run the admin can inspect.

import { APP_ENV } from './env'

export const TRACKING = {
  /** Meta Pixel (dataset) ID, e.g. 123456789012345. Public by design. */
  metaPixelId: (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '').trim() || null,
  /** GA4 Measurement ID, e.g. G-ABC123XYZ. Public by design. */
  ga4Id: (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? '').trim() || null,
  /** The only hostnames that may send real events. */
  productionHosts: ['heartwellfurniture.co.uk', 'www.heartwellfurniture.co.uk'] as readonly string[],
}

/** Dry run: build and log, send nothing. Test: Meta's Test events and GA4's validator only. Live: real events. */
export type TrackingMode = 'dry_run' | 'test' | 'live'
export const TRACKING_MODES: TrackingMode[] = ['dry_run', 'test', 'live']

export const CONSENT_COOKIE = 'hw-consent'
/** Set from the admin on staff phones and computers: nothing from that device ever counts. */
export const STAFF_COOKIE = 'hw-staff'

/** Pages whose address carries something private (order IDs, review and newsletter links): no Pixel, no GA4. */
export const PRIVATE_PATHS = ['/order/', '/confirm-order/', '/track-order', '/review/', '/newsletter/', '/admin', '/login']

export const isPrivatePath = (path: string) => PRIVATE_PATHS.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p))

export const isProductionHost = (host: string | null | undefined) => Boolean(host) && TRACKING.productionHosts.includes(host!.split(':')[0]!.toLowerCase())

/** True only on the live domain of a production build. */
export const liveAllowed = (host: string | null | undefined, appEnv: string = APP_ENV) => appEnv === 'production' && isProductionHost(host)

export interface PlatformSetup {
  /** Enough to send real events. */
  configured: boolean
  /** Enough to send test events. */
  testable: boolean
}

/**
 * What actually happens to an event: the admin's setting, cut back by what's
 * possible. Never live off the live domain or for test traffic; test needs
 * the test setup; anything unset is a dry run.
 */
export function effectiveMode(setting: TrackingMode, setup: PlatformSetup, ctx: { liveAllowed: boolean; isTest: boolean }): TrackingMode {
  if (!setup.configured || setting === 'dry_run') return 'dry_run'
  let mode: TrackingMode = setting
  if (mode === 'live' && (!ctx.liveAllowed || ctx.isTest)) mode = 'test'
  if (mode === 'test' && !setup.testable) mode = 'dry_run'
  return mode
}
