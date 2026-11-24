// Admin → Workstation (Run 4): every open task in one place, grouped Urgent /
// Needs action / Waiting on customer / Needs review / Completed, each linking
// to the guarded record where the real action is (Verify, Send Purchase, Hold
// live on the order page, never here). Pure: the page feeds it rows, tests
// feed it fixtures. Rules match Admin → Today and the Meta page:
//   - a Purchase is actionable only when staff have verified the order, it's
//     held or failed, and Meta's 7-day window is still open;
//   - skipped (no consent, test, cancelled) and sent rows are never "pending";
//   - a customer's own Confirm is not a verified sale.

import { purchaseWindow, type PurchaseWindow } from '@/lib/tracking/purchase-window'

export type WorkGroup = 'urgent' | 'action' | 'waiting' | 'review' | 'done'
export type WorkKind =
  | 'new_order'
  | 'awaiting_customer'
  | 'verify'
  | 'send_purchase'
  | 'signal_failed'
  | 'delivered_signal'
  | 'source_review'
  | 'stale_hold'
  | 'deliver_soon'
  | 'contact_message'
  | 'sample_request'
  | 'basket_reminder'
  | 'verified'
  | 'signal_sent'

export const GROUP_TITLE: Record<WorkGroup, string> = {
  urgent: 'Urgent',
  action: 'Needs action',
  waiting: 'Waiting on customer',
  review: 'Needs review',
  done: 'Completed (last 14 days)',
}
export const GROUP_ORDER: WorkGroup[] = ['urgent', 'action', 'waiting', 'review', 'done']

export const KIND_LABEL: Record<WorkKind, string> = {
  new_order: 'New order',
  awaiting_customer: 'Waiting for confirmation',
  verify: 'Verify the sale',
  send_purchase: 'Send Purchase to Meta',
  signal_failed: 'Signal failed',
  delivered_signal: 'Delivery signal',
  source_review: 'Source review',
  stale_hold: 'Long hold',
  deliver_soon: 'Delivery soon',
  contact_message: 'Contact message',
  sample_request: 'Sample request',
  basket_reminder: 'Basket reminder',
  verified: 'Verified',
  signal_sent: 'Signal sent',
}

export interface WsOrder {
  id: string
  reference: string | null
  customer_name: string
  status: string
  created_at: string
  confirmed_at: string | null
  confirmed_by: string | null
  staff_verified_at: string | null
  held_at: string | null
  hold_reason: string | null
  preferred_delivery_date: string | null
  total_amount: number
  is_test: boolean
  has_source: boolean
}
export interface WsSignal {
  order_id: string
  event_name: string
  status: string
  sent_at: string | null
  skip_reason: string | null
}
export interface WsLead {
  id: string
  kind: 'contact_message' | 'sample_request' | 'basket_reminder'
  created_at: string
  label: string
}

export interface WorkItem {
  key: string
  group: WorkGroup
  kind: WorkKind
  ref: string
  title: string
  why: string
  href: string
  at: string
  window?: PurchaseWindow | null
  /** Sort inside its group: smaller first. */
  rank: number
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

export function workstationItems(input: { orders: WsOrder[]; signals: WsSignal[]; leads: WsLead[] }, now: Date = new Date()): WorkItem[] {
  const t = now.getTime()
  const items: WorkItem[] = []
  const byOrder = new Map<string, WsSignal[]>()
  for (const s of input.signals) byOrder.set(s.order_id, [...(byOrder.get(s.order_id) ?? []), s])

  for (const o of input.orders) {
    if (o.is_test) continue
    const ref = o.reference ?? o.id.slice(0, 8)
    const href = `/admin/orders/${o.id}`
    const base = { ref, title: `${ref} · ${o.customer_name}`, href }
    const placed = t - Date.parse(o.created_at)
    const signals = byOrder.get(o.id) ?? []
    const purchase = signals.find((s) => s.event_name === 'Purchase')
    const delivered = signals.find((s) => s.event_name === 'OrderDelivered')
    const open = o.status !== 'cancelled'

    if (o.status === 'pending_cod' && !o.held_at) {
      if (placed < 2 * HOUR) items.push({ ...base, key: `new-${o.id}`, group: 'urgent', kind: 'new_order', at: o.created_at, rank: placed, why: 'Placed in the last 2 hours. Send their details on WhatsApp now.' })
      else items.push({ ...base, key: `wait-${o.id}`, group: 'waiting', kind: 'awaiting_customer', at: o.created_at, rank: -placed, why: 'Not confirmed yet. Nudge on WhatsApp with their confirm link, or Hold.' })
    }

    if ((o.status === 'confirmed' || o.status === 'delivered') && !o.held_at && !o.staff_verified_at) {
      const w = purchaseWindow(o.confirmed_at, now)
      const urgent = Boolean(w && !w.expired && w.urgent)
      items.push({
        ...base,
        key: `verify-${o.id}`,
        group: urgent ? 'urgent' : 'action',
        kind: 'verify',
        at: o.confirmed_at ?? o.created_at,
        window: w,
        rank: w ? w.expiresAt.getTime() : Number.MAX_SAFE_INTEGER,
        why: `${o.confirmed_by === 'customer' ? 'The customer pressed Confirm themselves: not a verified sale yet.' : 'Confirmed.'} Check the details with them, then press Verify on the order.${w?.expired ? ' Meta’s 7-day window has passed, so no Purchase will be sent.' : ''}`,
      })
    }

    if (o.staff_verified_at && open && purchase && (purchase.status === 'held' || purchase.status === 'failed')) {
      const w = purchaseWindow(o.confirmed_at, now)
      if (w && !w.expired) {
        items.push({ ...base, key: `send-${o.id}`, group: 'urgent', kind: 'send_purchase', at: o.staff_verified_at, window: w, rank: w.expiresAt.getTime(), why: `Verified sale, Purchase ${purchase.status}. Open the order and press Send Purchase (consent is checked when it sends).` })
      }
    }
    if (purchase?.status === 'failed' && !o.staff_verified_at) {
      items.push({ ...base, key: `fail-${o.id}`, group: 'review', kind: 'signal_failed', at: o.created_at, rank: -placed, why: 'Purchase send failed and the order isn’t verified. Check the order before anything is sent.' })
    }
    if (delivered && (delivered.status === 'held' || delivered.status === 'failed') && o.status === 'delivered') {
      items.push({ ...base, key: `deliv-${o.id}`, group: 'review', kind: 'delivered_signal', at: o.created_at, rank: -placed, why: `Delivery signal ${delivered.status}. Review on the order.` })
    }

    if (open && !o.has_source && placed <= 30 * DAY) {
      items.push({ ...base, key: `src-${o.id}`, group: 'review', kind: 'source_review', at: o.created_at, rank: -placed, why: 'No click ID, tagged link or staff answer. Add the source on the order if you know it; unknown is allowed.' })
    }
    if (o.held_at && t - Date.parse(o.held_at) > 7 * DAY && open) {
      items.push({ ...base, key: `hold-${o.id}`, group: 'review', kind: 'stale_hold', at: o.held_at, rank: Date.parse(o.held_at), why: `On hold over a week: ${o.hold_reason ?? 'no reason given'}.` })
    }
    if (o.status === 'confirmed' && !o.held_at && o.preferred_delivery_date) {
      const day = Date.parse(`${o.preferred_delivery_date}T12:00:00Z`)
      if (day >= t - DAY && day <= t + 7 * DAY) items.push({ ...base, key: `deliver-${o.id}`, group: 'action', kind: 'deliver_soon', at: o.created_at, rank: day, why: `Preferred delivery ${o.preferred_delivery_date}. Book the van and ring the day before.` })
    }

    if (o.staff_verified_at && t - Date.parse(o.staff_verified_at) <= 14 * DAY) {
      items.push({ ...base, key: `done-v-${o.id}`, group: 'done', kind: 'verified', at: o.staff_verified_at, rank: -Date.parse(o.staff_verified_at), why: 'Staff verified.' })
    }
    for (const s of signals) {
      if (s.status === 'sent' && s.sent_at && t - Date.parse(s.sent_at) <= 14 * DAY) {
        items.push({ ...base, key: `done-s-${o.id}-${s.event_name}`, group: 'done', kind: 'signal_sent', at: s.sent_at, rank: -Date.parse(s.sent_at), why: `${s.event_name} sent to Meta.` })
      }
    }
  }

  for (const l of input.leads) {
    const age = t - Date.parse(l.created_at)
    items.push({
      key: `lead-${l.kind}-${l.id}`,
      group: l.kind === 'basket_reminder' ? 'waiting' : 'action',
      kind: l.kind,
      ref: l.kind === 'contact_message' ? 'Message' : l.kind === 'sample_request' ? 'Samples' : 'Basket',
      title: l.label,
      href: '/admin/leads',
      at: l.created_at,
      rank: -age,
      why: l.kind === 'contact_message' ? 'New contact message: reply.' : l.kind === 'sample_request' ? 'Samples to post.' : 'Asked for a basket reminder.',
    })
  }

  return items.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.rank - b.rank)
}

/** Filter by kind and order reference / name (case-insensitive). */
export function filterItems(items: WorkItem[], kind: string | null, q: string | null): WorkItem[] {
  const needle = (q ?? '').trim().toLowerCase()
  return items.filter((i) => (!kind || i.kind === kind) && (!needle || i.title.toLowerCase().includes(needle)))
}

/** "24 Nov 18:05 UK · 23:05 PK": both clocks the team works in. */
export function dualTime(iso: string): string {
  const d = new Date(iso)
  const f = (tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
  const pk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(d)
  return `${f('Europe/London')} UK · ${pk} PK`
}
