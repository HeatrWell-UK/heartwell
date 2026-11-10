// Our own record of a visit, for matching a phone or WhatsApp order to the
// advert that brought the customer. The browser notes the steps below (the
// database adds WhatsApp taps, basket reminders, samples, contact messages
// and orders from their own records), staff find the visit in the admin by
// time or contact details, and its HW-V reference links it to the order.

import type { BrowserEventName, EventData } from '@/lib/tracking/events'
import { WA_REFERENCE } from '@/lib/whatsapp/handoff'

/** HW-V-261106-K7P2QX: the UK date the visit began, then six characters. */
export const VISIT_REFERENCE = /^HW-V-\d{6}-[A-Z0-9]{6}$/

export type ReferenceKind = 'visit' | 'whatsapp' | 'none' | 'invalid'

/** Which kind of reference staff typed (any case, spaces trimmed). */
export function referenceKind(raw: string): ReferenceKind {
  const ref = raw.trim().toUpperCase()
  if (!ref) return 'none'
  if (VISIT_REFERENCE.test(ref)) return 'visit'
  if (WA_REFERENCE.test(ref)) return 'whatsapp'
  return 'invalid'
}

/**
 * What the browser notes (/api/visit). The WhatsApp hand-off notes (10 November
 * 2026) say whether WhatsApp opened after a tap (src/lib/whatsapp/help.ts), and
 * when a customer left their number for us to message them.
 */
export const VISIT_STEPS = ['page_view', 'add_to_basket', 'checkout_start', 'phone_click', 'whatsapp_opened', 'whatsapp_stuck', 'whatsapp_callback'] as const
export type VisitStep = (typeof VISIT_STEPS)[number]

/**
 * The step a funnel event adds to the visit's record, if any. Page views are
 * noted on every page; WhatsApp taps, basket reminders, samples and orders
 * already have their own records, so they aren't noted twice.
 */
export function visitStepFor(name: BrowserEventName, data: EventData = {}): { type: VisitStep; name?: string; value?: number } | null {
  if (name === 'AddToCart') return { type: 'add_to_basket', ...(data.contentName ? { name: data.contentName } : {}), ...(data.value !== undefined ? { value: data.value } : {}) }
  if (name === 'InitiateCheckout') return { type: 'checkout_start', ...(data.value !== undefined ? { value: data.value } : {}) }
  if (name === 'Contact' && data.contentName === 'Phone call') return { type: 'phone_click' }
  return null
}
