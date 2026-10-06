// The orders admin's rules, as pure functions: statuses and the next step,
// the WhatsApp message for each status, UK and Pakistan times, search.

import { formatPrice } from '@/lib/format'
import { ukPhoneDigits } from '@/lib/checkout/phone'

export const STATUSES = ['pending_cod', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_cod: 'Waiting to confirm',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'On its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** The one button that moves an order on. Corrections and cancelling sit behind a fold. */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending_cod: { status: 'confirmed', label: 'Mark confirmed' },
  confirmed: { status: 'processing', label: 'Start processing' },
  processing: { status: 'shipped', label: 'Mark on its way' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
}

/**
 * Where each status may move, exactly as public.order_status_allowed decides:
 * a waiting order is confirmed or cancelled; after that any stage can be
 * corrected; a cancelled order is final.
 */
export const ALLOWED_MOVES: Record<OrderStatus, OrderStatus[]> = {
  pending_cod: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['confirmed', 'shipped', 'delivered', 'cancelled'],
  shipped: ['confirmed', 'processing', 'delivered', 'cancelled'],
  delivered: ['confirmed', 'processing', 'shipped', 'cancelled'],
  cancelled: [],
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
 * back). Timestamps are stamped once, so this is worth a look.
 */
export function stageAheadOfStatus(o: Stamps): { status: OrderStatus; at: string } | null {
  if (!isStatus(o.status) || o.status === 'cancelled') return null
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

/** Orders still waiting on someone: the default view. */
export const NEEDS_ATTENTION: OrderStatus[] = ['pending_cod', 'confirmed', 'processing']

export const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'all', label: 'All' },
  { key: 'pending_cod', label: 'Waiting' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'On its way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'test', label: 'Test' },
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

/** The WhatsApp message staff send the customer for each status. */
export function statusMessage(o: StatusMessageOrder, status: OrderStatus, links: { confirmUrl: string; trackUrl: string }): string {
  const hi = `Hi ${firstName(o.customerName)}`
  switch (status) {
    case 'pending_cod':
      return `${hi}, thank you for your Heartwell order ${o.reference}. Please tap here to confirm it, and we'll book your delivery: ${links.confirmUrl}`
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
