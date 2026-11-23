// Admin → Today (Run 2, owner 24 November 2026): what staff should do now,
// most urgent first. The weak step in November was confirmation (orders
// placed, then never confirmed), so a new order waiting for contact leads the
// page. Pure: the loader feeds it rows; tests feed it fixtures.

import { purchaseWindow, type PurchaseWindow } from '@/lib/tracking/purchase-window'

export interface TodayOrder {
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
}

export interface TodayPurchase {
  orderId: string
  status: string
}

export type TaskKind = 'contact_new' | 'chase' | 'verify' | 'send_purchase' | 'stale_hold' | 'deliver_soon'

export interface TodayTask {
  kind: TaskKind
  order: TodayOrder
  /** Plain words: what to do and why. */
  why: string
  /** For sorting inside a group: smaller first. */
  rank: number
  window?: PurchaseWindow | null
}

export const TASK_TITLE: Record<TaskKind, string> = {
  contact_new: 'New orders: message them now',
  chase: 'Still waiting for the customer',
  verify: 'Confirmed by the customer: check it with them, then Verify',
  send_purchase: 'Genuine sales waiting to go to Meta',
  stale_hold: 'On hold for over a week',
  deliver_soon: 'Delivery in the next 7 days',
}

export const TASK_ORDER: TaskKind[] = ['contact_new', 'send_purchase', 'verify', 'chase', 'deliver_soon', 'stale_hold']

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** "12 min", "3 h", "2 days". */
export function ago(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MIN))} min`
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`
  const d = Math.floor(ms / DAY)
  return `${d} ${d === 1 ? 'day' : 'days'}`
}

/** How far back Today looks (60 days of orders is plenty for open work). */
export function todaySince(now: Date = new Date()): string {
  return new Date(now.getTime() - 60 * DAY).toISOString()
}

export function todayTasks(orders: TodayOrder[], purchases: TodayPurchase[], now: Date = new Date()): TodayTask[] {
  const held = new Map(purchases.map((p) => [p.orderId, p.status]))
  const tasks: TodayTask[] = []
  const t = now.getTime()
  for (const o of orders) {
    if (o.is_test) continue
    const placed = t - Date.parse(o.created_at)
    if (o.status === 'pending_cod' && !o.held_at) {
      if (placed < 2 * HOUR) tasks.push({ kind: 'contact_new', order: o, rank: placed, why: `Placed ${ago(placed)} ago. Send them their details on WhatsApp while they’re still looking.` })
      else tasks.push({ kind: 'chase', order: o, rank: -placed, why: `Placed ${ago(placed)} ago and not confirmed. A WhatsApp nudge with their confirm link, or Hold if you can’t reach them.` })
    }
    if (o.held_at && t - Date.parse(o.held_at) > 7 * DAY) {
      tasks.push({ kind: 'stale_hold', order: o, rank: Date.parse(o.held_at), why: `On hold ${ago(t - Date.parse(o.held_at))}: ${o.hold_reason ?? 'no reason given'}. Check in, release or cancel.` })
    }
    if ((o.status === 'confirmed' || o.status === 'delivered') && !o.held_at) {
      if (!o.staff_verified_at) {
        const w = purchaseWindow(o.confirmed_at, now)
        tasks.push({
          kind: 'verify',
          order: o,
          rank: w ? w.expiresAt.getTime() : Number.MAX_SAFE_INTEGER,
          window: w,
          why: `${o.confirmed_by === 'customer' ? 'They pressed Confirm themselves' : 'Confirmed'}${o.confirmed_at ? ` ${ago(t - Date.parse(o.confirmed_at))} ago` : ''}. Ring or WhatsApp them; once the details are right, press Verify on the order.`,
        })
      } else if (held.get(o.id) === 'held' || held.get(o.id) === 'failed') {
        const w = purchaseWindow(o.confirmed_at, now)
        if (w && !w.expired) tasks.push({ kind: 'send_purchase', order: o, rank: w.expiresAt.getTime(), window: w, why: 'Verified sale. Press Send Purchase on the order (consent is checked when it sends).' })
      }
    }
    if (o.status === 'confirmed' && !o.held_at && o.preferred_delivery_date) {
      const day = Date.parse(`${o.preferred_delivery_date}T12:00:00Z`)
      if (day >= t - DAY && day <= t + 7 * DAY) tasks.push({ kind: 'deliver_soon', order: o, rank: day, why: `Preferred delivery ${o.preferred_delivery_date}. Book the van and ring them the day before.` })
    }
  }
  return tasks.sort((a, b) => TASK_ORDER.indexOf(a.kind) - TASK_ORDER.indexOf(b.kind) || a.rank - b.rank)
}
