// The orders admin's rules, as pure functions: statuses and the next step,
// the WhatsApp message for each status, UK and Pakistan times, search.

import { formatPrice } from '@/lib/format'
import { ukPhoneDigits } from '@/lib/checkout/phone'

export const STATUSES = ['pending_cod', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_cod: 'Waiting',
  confirmed: 'Confirmed',
  // Old stages (owner, 17 November 2026: Waiting, Confirmed, Delivered only). No order ever used them.
  processing: 'Processing (old)',
  shipped: 'On its way (old)',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** The one button that moves an order on: Waiting → Confirmed → Delivered. Corrections, hold and cancelling sit behind a fold. */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending_cod: { status: 'confirmed', label: 'Mark confirmed' },
  confirmed: { status: 'delivered', label: 'Mark delivered' },
  processing: { status: 'delivered', label: 'Mark delivered' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
}

/**
 * Where each status may move, exactly as public.order_status_allowed decides:
 * Waiting is confirmed or cancelled; Confirmed is delivered or cancelled;
 * Delivered can be put back to Confirmed; cancelled is final. A confirmed
 * order goes back to Waiting only by putting it on hold (canHold).
 */
export const ALLOWED_MOVES: Record<OrderStatus, OrderStatus[]> = {
  pending_cod: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  processing: ['confirmed', 'delivered', 'cancelled'],
  shipped: ['confirmed', 'delivered', 'cancelled'],
  delivered: ['confirmed', 'cancelled'],
  cancelled: [],
}

/** Only an open order can be put on hold: a waiting one stays Waiting, a confirmed one goes back to Waiting. */
export const canHold = (status: string) => status === 'pending_cod' || status === 'confirmed'

/** The reasons staff pick from when holding an order (owner: can't reach them, or they asked to wait). */
export const HOLD_REASONS = ['Can’t reach the customer', 'Customer asked to wait until they’re sure'] as const

/** The reason saved with a hold: a listed reason, a note, or both. */
export function holdReason(choice: string, note: string): string | null {
  const picked = (HOLD_REASONS as readonly string[]).includes(choice) ? choice : ''
  const extra = note.trim().slice(0, 200)
  return (picked && extra ? `${picked}: ${extra}` : picked || extra) || null
}

const RANK: Partial<Record<OrderStatus, number>> = { pending_cod: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4 }

export interface Stamps {
  status: string
  confirmedAt: string | null
  processingAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
}

/**
 * A later stage recorded than the current status shows (a correction moved it
 * back). Timestamps are stamped once, so this is worth a look. A waiting order
 * that was confirmed before was put on hold, which is intended: no warning.
 */
export function stageAheadOfStatus(o: Stamps): { status: OrderStatus; at: string } | null {
  if (!isStatus(o.status) || o.status === 'cancelled' || o.status === 'pending_cod') return null
  const stages: [OrderStatus, string | null][] = [
    ['confirmed', o.confirmedAt],
    ['processing', o.processingAt],
    ['shipped', o.shippedAt],
    ['delivered', o.deliveredAt],
  ]
  const furthest = stages.filter(([, at]) => at).at(-1)
  if (!furthest) return null
  return (RANK[furthest[0]] ?? -1) > (RANK[o.status] ?? -1) ? { status: furthest[0], at: furthest[1]! } : null
}

export const isStatus = (s: string): s is OrderStatus => (STATUSES as readonly string[]).includes(s)

/** Orders still waiting on someone (Waiting, on hold or not, and Confirmed): the default view. */
export const NEEDS_ATTENTION: OrderStatus[] = ['pending_cod', 'confirmed']

/** The admin's tabs (owner, 17 November 2026): Waiting, Confirmed, Delivered, Hold, Cancelled and Test. */
export const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'pending_cod', label: 'Waiting' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'hold', label: 'Hold' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'test', label: 'Test' },
  { key: 'all', label: 'All' },
] as const
export type FilterKey = (typeof FILTERS)[number]['key']
export const isFilter = (s: string | undefined): s is FilterKey => FILTERS.some((f) => f.key === s)

const UK = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const PK = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

/** One moment in UK and Pakistan time, so both teams talk about the same minute. */
export function dualTime(value: string | null | undefined): { uk: string; pk: string } | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return { uk: UK.format(d).replace(',', ''), pk: PK.format(d).replace(',', '') }
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there'

export interface StatusMessageOrder {
  reference: string
  customerName: string
  customerPhone: string
  totalAmount: number
  cancellationReason?: string | null
}

/**
 * The WhatsApp message staff send the customer for each status. For an order
 * waiting to be confirmed, the page passes confirmRequestMessage (the details
 * and "reply CONFIRM", src/lib/email/order-emails.ts) as `confirmRequest`.
 */
export function statusMessage(o: StatusMessageOrder, status: OrderStatus, links: { trackUrl: string; confirmRequest?: string }): string {
  const hi = `Hi ${firstName(o.customerName)}`
  switch (status) {
    case 'pending_cod':
      return (
        links.confirmRequest ??
        `${hi}, thank you for your Heartwell order ${o.reference}. If everything in it is right, please reply CONFIRM and we'll ring you to book your delivery day. If anything needs changing, just tell us here.`
      )
    case 'confirmed':
      return `${hi}, thank you for confirming your Heartwell order ${o.reference}. Which days suit you for delivery?`
    case 'processing':
      return `${hi}, your Heartwell order ${o.reference} is being prepared. We'll be in touch to confirm your delivery day.`
    case 'shipped':
      return `${hi}, your Heartwell order ${o.reference} is on its way. The driver will ring before arriving. The amount to pay on delivery is ${formatPrice(o.totalAmount)}, in cash or by bank transfer. Track it here: ${links.trackUrl}`
    case 'delivered':
      return `${hi}, thank you for choosing Heartwell. We hope you love it! If anything isn't right, just reply here and we'll sort it out.`
    case 'cancelled':
      return `${hi}, your Heartwell order ${o.reference} has been cancelled${o.cancellationReason ? ` (${o.cancellationReason})` : ''}. If that's not what you expected, please reply here.`
  }
}

/**
 * The WhatsApp message for an order put on hold: nothing is delivered until
 * they're ready, and their confirm link is there for when they are.
 */
export function holdMessage(o: Pick<StatusMessageOrder, 'reference' | 'customerName'>, confirmUrl: string): string {
  return `Hi ${firstName(o.customerName)}, we've put your Heartwell order ${o.reference} on hold for now, so nothing will be delivered until you're ready. When you are, check your details and press Confirm here: ${confirmUrl} (or just reply here). If you'd rather cancel, tell us here too.`
}

export function whatsAppTo(phone: string, message?: string): string | null {
  const digits = ukPhoneDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

/**
 * A search box entry as a PostgREST or() filter over reference, name, email,
 * phone and postcode. Only safe characters survive, so it can't break the
 * filter; a phone number typed without spaces still finds "07700 900123".
 */
export function searchFilter(q: string): string | null {
  const clean = q.replace(/[^A-Za-z0-9@.+\- ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  if (clean.length < 2) return null
  const like = (v: string) => `%${v}%`
  const digits = clean.replace(/\D/g, '')
  const parts = [
    `reference.ilike.${like(clean)}`,
    `customer_name.ilike.${like(clean)}`,
    `customer_email.ilike.${like(clean)}`,
    `postcode.ilike.${like(clean)}`,
    `postcode.ilike.${like(clean.toUpperCase().replace(/\s/g, ''))}`,
    `customer_phone.ilike.${like(clean)}`,
  ]
  // A phone number or reference typed as plain digits matches whatever spacing it was stored with.
  if (digits.length >= 5) parts.push(`customer_phone.ilike.%${digits.split('').join('%')}%`, `reference.ilike.%${digits}%`)
  return parts.join(',')
}
