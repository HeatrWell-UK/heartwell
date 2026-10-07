// The conversion outbox's sender: Purchase and OrderDelivered to Meta, and
// purchase to GA4, built from the database's own order, never the browser.
// buildConversion is pure (tested); processConversion applies the mode.

import { effectiveMode, type TrackingMode } from '@/config/tracking'
import type { Json } from '@/types/database'
import { actionSourceFor, metaEvent, tooOldForMeta } from './meta-event'
import { ga4Purchase } from './ga4-event'

export interface OutboxOrder {
  is_test: boolean
  status: string
  source: string
  created_at: string
  confirmed_at: string | null
  delivered_at: string | null
  total_amount: number
  customer_email: string | null
  customer_phone: string
  customer_name: string
  postcode: string
  tracking_consent: string
  customer_ip: string | null
  customer_user_agent: string | null
  meta_fbp: string | null
  meta_fbc: string | null
  visitor_id: string | null
  ga_client_id: string | null
  items: { variant_id: string | null; quantity: number; unit_price: number; title: string; option: string | null }[]
}

export interface OutboxRow {
  id: string
  platform: 'meta' | 'ga4' | 'google_ads'
  event_name: string
  event_id: string
  attempts: number
  order: OutboxOrder | null
}

export type Built = { platform: 'meta' | 'ga4'; payload: Record<string, unknown> } | { skip: string }

export function buildConversion(row: OutboxRow, siteUrl: string, now = new Date()): Built {
  const o = row.order
  if (!o) return { skip: 'the order no longer exists' }
  if (o.status === 'cancelled') return { skip: 'order cancelled' }
  const consented = o.tracking_consent === 'granted'
  const website = o.source === 'website'

  if (row.platform === 'meta') {
    const at = row.event_name === 'OrderDelivered' ? o.delivered_at : o.confirmed_at
    if (!at) return { skip: 'no date for this event' }
    const time = new Date(at)
    if (tooOldForMeta(time, now)) return { skip: 'more than 7 days old (Meta refuses these)' }
    const contents = o.items.filter((i) => i.variant_id).map((i) => ({ id: i.variant_id!, quantity: i.quantity, item_price: Number(i.unit_price) }))
    return {
      platform: 'meta',
      payload: metaEvent({
        name: row.event_name,
        eventId: row.event_id,
        time,
        actionSource: actionSourceFor(o.source),
        sourceUrl: `${siteUrl}/checkout`,
        user: {
          email: o.customer_email,
          phone: o.customer_phone,
          name: o.customer_name,
          postcode: o.postcode,
          externalId: o.visitor_id,
          // The browser's identifiers only when the customer accepted marketing cookies (D10).
          ...(consented && website ? { ip: o.customer_ip, userAgent: o.customer_user_agent, fbp: o.meta_fbp, fbc: o.meta_fbc } : {}),
        },
        custom: { value: Number(o.total_amount), contents, numItems: o.items.reduce((n, i) => n + i.quantity, 0) },
      }),
    }
  }

  if (row.platform === 'ga4') {
    if (!o.confirmed_at) return { skip: 'not confirmed' }
    return {
      platform: 'ga4',
      payload: ga4Purchase(
        {
          eventId: row.event_id,
          clientId: o.ga_client_id,
          consented,
          time: new Date(o.confirmed_at),
          value: Number(o.total_amount),
          items: o.items.map((i) => ({ variantId: i.variant_id, title: i.title, option: i.option, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
        },
        now,
      ),
    }
  }
  return { skip: `${row.platform} isn’t set up` }
}

export interface ReportResult {
  id: string
  status: 'sent' | 'failed' | 'skipped'
  skip_reason?: string
  response?: Json | null
  error?: Json | null
  log?: { platform: 'meta' | 'ga4'; event_name: string; event_id: string; mode: TrackingMode; status: 'logged' | 'sent' | 'failed'; is_test: boolean; payload: Json; response: Json | null }
}

export interface Sender {
  setup: { meta: { configured: boolean; testable: boolean }; ga4: { configured: boolean; testable: boolean } }
  meta: (events: object[], mode: 'test' | 'live') => Promise<{ ok: boolean; body: Json | null }>
  ga4: (payload: object, mode: 'test' | 'live') => Promise<{ ok: boolean; body: Json | null }>
}

/** One outbox row, start to finish, in whatever mode applies. Never throws. */
export async function processConversion(row: OutboxRow, ctx: { setting: TrackingMode; liveAllowed: boolean; siteUrl: string; send: Sender }): Promise<ReportResult> {
  const built = buildConversion(row, ctx.siteUrl)
  if ('skip' in built) return { id: row.id, status: 'skipped', skip_reason: built.skip }
  const isTest = row.order?.is_test ?? true
  const mode = effectiveMode(ctx.setting, ctx.send.setup[built.platform], { liveAllowed: ctx.liveAllowed, isTest })
  const log = { platform: built.platform, event_name: row.event_name, event_id: row.event_id, is_test: isTest, payload: built.payload as unknown as Json }

  if (mode === 'dry_run') {
    return {
      id: row.id,
      status: 'skipped',
      skip_reason: isTest ? 'test order: built, not sent (dry run)' : 'built, not sent: tracking isn’t live (dry run)',
      log: { ...log, mode, status: 'logged', response: null },
    }
  }
  try {
    const result = built.platform === 'meta' ? await ctx.send.meta([built.payload], mode) : await ctx.send.ga4(built.payload, mode)
    if (mode === 'test') {
      // Test events never count, so the row is closed either way.
      return {
        id: row.id,
        status: 'skipped',
        skip_reason: result.ok ? 'sent as a test event' : 'test event refused (see the response)',
        response: result.body,
        log: { ...log, mode, status: result.ok ? 'sent' : 'failed', response: result.body },
      }
    }
    return result.ok
      ? { id: row.id, status: 'sent', response: result.body }
      : { id: row.id, status: 'failed', error: result.body, log: { ...log, mode, status: 'failed', response: result.body } }
  } catch (e) {
    return { id: row.id, status: 'failed', error: { message: e instanceof Error ? e.message : String(e) } }
  }
}
