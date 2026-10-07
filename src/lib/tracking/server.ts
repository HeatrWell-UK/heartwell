// Sending to Meta and GA4 from the server, and the tracking log. Secrets are
// read here only. Never throws: a tracking problem must never affect an
// order, a page or a form.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { TRACKING, type PlatformSetup, type TrackingMode } from '@/config/tracking'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SETTINGS_TAG } from '@/lib/product/load'
import type { Json } from '@/types/database'
import { META_API_VERSION } from './meta-event'

const env = (name: string) => (process.env[name] ?? '').trim()
const META_TOKEN = env('META_CAPI_ACCESS_TOKEN')
const META_TEST_CODE = env('META_TEST_EVENT_CODE')
const GA4_SECRET = env('GA4_API_SECRET')

export const META_SETUP: PlatformSetup = {
  configured: Boolean(TRACKING.metaPixelId && META_TOKEN),
  testable: Boolean(TRACKING.metaPixelId && META_TOKEN && META_TEST_CODE),
}
/** GA4's validation endpoint needs no extra setup, so a configured GA4 can always test. */
export const GA4_SETUP: PlatformSetup = { configured: Boolean(TRACKING.ga4Id && GA4_SECRET), testable: Boolean(TRACKING.ga4Id && GA4_SECRET) }

/** Which parts are set, for the admin (presence only, never values). */
export const TRACKING_SETUP = {
  metaPixelId: Boolean(TRACKING.metaPixelId),
  metaToken: Boolean(META_TOKEN),
  metaTestCode: Boolean(META_TEST_CODE),
  ga4Id: Boolean(TRACKING.ga4Id),
  ga4Secret: Boolean(GA4_SECRET),
}

/** The admin's tracking setting (shop_settings), cached with the other settings. */
export const getTrackingSettings = unstable_cache(
  async (): Promise<{ mode: TrackingMode; purchaseMode: 'automatic' | 'manual'; holdMinutes: number }> => {
    if (!SUPABASE_CONFIGURED) return { mode: 'dry_run', purchaseMode: 'automatic', holdMinutes: 30 }
    const { data, error } = await createPublicClient().from('shop_settings').select('tracking_mode, purchase_mode, purchase_hold_minutes').single()
    if (error || !data) return { mode: 'dry_run', purchaseMode: 'automatic', holdMinutes: 30 }
    return { mode: data.tracking_mode as TrackingMode, purchaseMode: data.purchase_mode as 'automatic' | 'manual', holdMinutes: data.purchase_hold_minutes }
  },
  ['tracking-settings-v1'],
  { revalidate: 300, tags: [SETTINGS_TAG] },
)

export interface SendResult {
  ok: boolean
  status: number
  body: Json | null
}

const failure = (e: unknown): SendResult => ({ ok: false, status: 0, body: { message: e instanceof Error ? e.message : String(e) } })

/** Conversions API. Test mode adds the test event code, so events land only in Events Manager → Test events. */
export async function sendToMeta(events: object[], mode: 'test' | 'live'): Promise<SendResult> {
  if (!META_SETUP.configured) return { ok: false, status: 0, body: { message: 'Meta isn’t set up' } }
  try {
    const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${TRACKING.metaPixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The token goes in the body, never in a URL that could end up in a log.
      body: JSON.stringify({ data: events, access_token: META_TOKEN, ...(mode === 'test' ? { test_event_code: META_TEST_CODE } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await res.json().catch(() => null)) as Json | null
    return { ok: res.ok, status: res.status, body }
  } catch (e) {
    return failure(e)
  }
}

/** Measurement Protocol. Test mode uses GA4's validator, which checks the event and records nothing. */
export async function sendToGa4(payload: object, mode: 'test' | 'live'): Promise<SendResult> {
  if (!GA4_SETUP.configured) return { ok: false, status: 0, body: { message: 'GA4 isn’t set up' } }
  const path = mode === 'test' ? 'debug/mp/collect' : 'mp/collect'
  try {
    const res = await fetch(`https://www.google-analytics.com/${path}?measurement_id=${encodeURIComponent(TRACKING.ga4Id!)}&api_secret=${encodeURIComponent(GA4_SECRET)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    const text = await res.text().catch(() => '')
    const body = (text ? (JSON.parse(text) as Json) : null) as Json | null
    // The validator answers 200 with a list of problems; an empty list means it would be accepted.
    const problems = mode === 'test' && body && typeof body === 'object' && !Array.isArray(body) ? ((body as { validationMessages?: unknown[] }).validationMessages ?? []) : []
    return { ok: res.ok && problems.length === 0, status: res.status, body }
  } catch (e) {
    return failure(e)
  }
}

export interface LogRow {
  source: 'browser_mirror' | 'outbox'
  platform: 'meta' | 'ga4'
  event_name: string
  event_id: string | null
  mode: TrackingMode
  status: 'logged' | 'sent' | 'failed'
  is_test: boolean
  payload: Json
  response: Json | null
}

/** For the admin's Tracking page. Needs the server key; skipped quietly without it. */
export async function logTracking(row: LogRow): Promise<void> {
  if (!SUPABASE_SECRET_CONFIGURED) return
  try {
    await createAdminClient().from('tracking_log').insert(row)
  } catch (e) {
    console.error('tracking log failed', e)
  }
}
