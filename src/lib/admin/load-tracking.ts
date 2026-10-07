import 'server-only'
import { createClient } from '@/lib/supabase/server'

// The admin Tracking page's data, read with the admin's session: the
// settings, the conversion outbox (with each order's reference and state) and
// the latest tracking log.

export async function loadTracking() {
  const db = await createClient()
  const [settings, outbox, counts, log, sentThenCancelled] = await Promise.all([
    db.from('shop_settings').select('tracking_mode, purchase_mode, purchase_hold_minutes').single(),
    db
      .from('conversion_outbox')
      .select('id, platform, event_name, status, send_after, attempts, sent_at, skip_reason, response, error, created_at, order:orders(id, reference, status, is_test, total_amount)')
      .order('created_at', { ascending: false })
      .limit(60),
    db.from('conversion_outbox').select('status').limit(5000),
    db.from('tracking_log').select('id, created_at, source, platform, event_name, mode, status, is_test, payload, response').order('created_at', { ascending: false }).limit(40),
    db.from('conversion_outbox').select('id, sent_at, order:orders!inner(id, reference, status)').eq('event_name', 'Purchase').eq('status', 'sent').eq('order.status', 'cancelled').limit(20),
  ])
  for (const r of [settings, outbox, counts, log, sentThenCancelled]) if (r.error) throw new Error(`Tracking: ${r.error.message}`)
  const tally: Record<string, number> = {}
  for (const r of counts.data ?? []) tally[r.status] = (tally[r.status] ?? 0) + 1
  return {
    settings: settings.data!,
    outbox: outbox.data ?? [],
    tally,
    log: log.data ?? [],
    sentThenCancelled: sentThenCancelled.data ?? [],
  }
}

export type TrackingData = Awaited<ReturnType<typeof loadTracking>>
