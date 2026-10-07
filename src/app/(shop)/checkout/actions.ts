'use server'

import { after } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { ADDRESS_LOOKUP_CONFIGURED, findAddresses, LookupError } from '@/lib/address/lookup'
import { classifyDeliveryPostcode, resolveDeliveryPostcode } from '@/lib/delivery/postcode'
import { explainOrderError, OrderInput, orderPayload, pricingPayload, QuoteInput, testReason, type OrderTracking, type PlainError } from '@/lib/checkout/order'
import { CONSENT_COOKIE, STAFF_COOKIE } from '@/config/tracking'
import { parseConsent } from '@/lib/tracking/consent'
import { ga4ClientIdFromCookie } from '@/lib/tracking/ga4-event'
import { sendOrderPlacedEmails } from '@/lib/checkout/notify'
import { isUkPhone, formatUkPhone } from '@/lib/checkout/phone'

const UNAVAILABLE: PlainError = {
  code: 'UNAVAILABLE',
  message: 'Sorry, online checkout isn’t available just now. Please ring us and we’ll take your order by phone.',
}
const SLOW_DOWN: PlainError = { code: 'RATE_LIMITED', message: 'That’s a lot of tries in a short time. Please wait a minute and try again.' }

export interface CheckoutQuote {
  itemsSubtotal: number
  discountAmount: number
  discountTier: string | null
  codeValid: boolean
  promotionCode: string | null
  delivery: { floor: number; hasLift: boolean; upstairs: number; assembly: number; removalSeats: number | null; removal: number; total: number }
  deliveryTotal: number
  total: number
  hasMadeToOrder: boolean
}

const num = (v: unknown) => Number(v ?? 0)

/** The database's own price for this basket and these extras: the figure the order must match. */
export async function quoteCheckout(input: unknown): Promise<{ ok: true; quote: CheckoutQuote } | { ok: false; error: PlainError }> {
  const parsed = QuoteInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: { code: 'BAD_INPUT', field: 'basket', message: 'Please check your basket.' } }
  if (!rateLimit(`quote:${await clientIp()}`, 120, 60_000)) return { ok: false, error: SLOW_DOWN }
  if (!SUPABASE_SECRET_CONFIGURED) return { ok: false, error: UNAVAILABLE }

  const { data, error } = await createAdminClient().rpc('price_order', { p_input: pricingPayload(parsed.data) })
  if (error) return { ok: false, error: explainOrderError(error.message) }
  const r = data as Record<string, unknown>
  const d = (r.delivery ?? {}) as Record<string, unknown>
  return {
    ok: true,
    quote: {
      itemsSubtotal: num(r.items_subtotal),
      discountAmount: num(r.discount_amount),
      discountTier: (r.discount_tier as string | null) ?? null,
      codeValid: r.code_valid === true,
      promotionCode: (r.promotion_code as string | null) ?? null,
      delivery: {
        floor: num(d.floor),
        hasLift: d.has_lift === true,
        upstairs: num(d.upstairs),
        assembly: num(d.assembly),
        removalSeats: d.removal_seats === null || d.removal_seats === undefined ? null : num(d.removal_seats),
        removal: num(d.removal),
        total: num(d.total),
      },
      deliveryTotal: num(r.delivery_total),
      total: num(r.total_amount),
      hasMadeToOrder: r.has_made_to_order === true,
    },
  }
}

/** Addresses at a postcode, when a lookup provider is set up. */
export async function lookupAddresses(postcode: unknown): Promise<{ available: boolean; addresses: string[]; notFound?: boolean }> {
  if (typeof postcode !== 'string' || postcode.length > 10 || !ADDRESS_LOOKUP_CONFIGURED) return { available: false, addresses: [] }
  if (classifyDeliveryPostcode(postcode).kind === 'invalid') return { available: true, addresses: [], notFound: true }
  if (!rateLimit(`lookup:${await clientIp()}`, 30, 60_000)) return { available: false, addresses: [] }
  try {
    return { available: true, addresses: await findAddresses(postcode) }
  } catch (error) {
    if (error instanceof LookupError && error.kind === 'not_found') return { available: true, addresses: [], notFound: true }
    return { available: false, addresses: [] }
  }
}

export type PlaceOrderResult = { ok: true; id: string; reference: string } | { ok: false; error: PlainError }

/**
 * Places the order. The database prices it again from the catalogue and
 * settings, checks the postcode, and refuses it if the total the customer saw
 * doesn't match. Emails go out after the response, so a slow mail server
 * never holds up (or undoes) an order.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = OrderInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = String(issue?.path[0] ?? '')
    const known = ['name', 'phone', 'email', 'postcode', 'date'] as const
    return {
      ok: false,
      error: {
        code: 'BAD_INPUT',
        field: field === 'shippingAddress' ? 'address' : field === 'preferredDate' ? 'date' : (known as readonly string[]).includes(field) ? (field as PlainError['field']) : 'basket',
        message: issue?.message && !issue.message.startsWith('Invalid') ? issue.message : 'Please check the details you entered.',
      },
    }
  }
  const order = parsed.data
  if (order.website) return { ok: false, error: explainOrderError('') }
  if (!rateLimit(`order:${await clientIp()}`, 6, 10 * 60_000)) return { ok: false, error: SLOW_DOWN }
  if (!SUPABASE_SECRET_CONFIGURED) return { ok: false, error: UNAVAILABLE }

  // The same postcode decision the database makes, using the address lookup for the two mixed districts.
  const { classification, evidence } = await resolveDeliveryPostcode(order.postcode, findAddresses)
  if (classification.kind === 'invalid') return { ok: false, error: explainOrderError('INVALID_POSTCODE') }
  if (classification.kind !== 'classified' || classification.zone !== 'MAINLAND_STANDARD') return { ok: false, error: explainOrderError('NOT_MAINLAND') }

  // Consent and Meta's and Google's cookies come from the request itself, never from the page.
  const jar = await cookies()
  const tracking: OrderTracking = {
    consent: parseConsent(jar.get(CONSENT_COOKIE)?.value),
    staffDevice: jar.get(STAFF_COOKIE)?.value === '1',
    fbp: jar.get('_fbp')?.value ?? null,
    fbc: jar.get('_fbc')?.value ?? null,
    gaClientId: ga4ClientIdFromCookie(jar.get('_ga')?.value),
    ip: await clientIp(),
    userAgent: (await headers()).get('user-agent')?.slice(0, 400) ?? null,
  }
  const payload = orderPayload({ ...order, postcode: classification.postcode }, { appEnv: APP_ENV, mixedAreaEvidence: evidence, tracking })
  const { data, error } = await createAdminClient().rpc('place_order', { p_input: payload })
  if (error) return { ok: false, error: explainOrderError(error.message) }

  const placed = data as { id: string; reference: string }
  after(async () => {
    try {
      await sendOrderPlacedEmails(placed.id)
    } catch (e) {
      console.error('order emails failed', placed.id, e)
    }
  })
  return { ok: true, id: placed.id, reference: placed.reference }
}

const ReminderInput = z.object({
  visitor: z.object({ visitorId: z.uuid(), sessionId: z.uuid(), arrivalId: z.uuid() }),
  email: z.union([z.literal(''), z.email().max(254)]),
  phone: z.string().max(30),
  emailOptIn: z.boolean(),
  whatsAppOptIn: z.boolean(),
  name: z.string().max(120),
  basket: z.array(z.object({ title: z.string().max(200), option: z.string().max(200), quantity: z.number().int().min(1).max(10), slug: z.string().max(200) })).max(30),
})

/**
 * "Remind me about my basket": saved only with the shopper's tick, kept at
 * most 90 days, and marked converted automatically if they go on to order.
 */
export async function saveBasketReminder(input: unknown): Promise<{ ok: boolean }> {
  const parsed = ReminderInput.safeParse(input)
  if (!parsed.success || !SUPABASE_SECRET_CONFIGURED) return { ok: false }
  const r = parsed.data
  const phoneOk = isUkPhone(r.phone)
  const emailOptIn = r.emailOptIn && r.email !== ''
  const whatsAppOptIn = r.whatsAppOptIn && phoneOk
  if (!emailOptIn && !whatsAppOptIn) return { ok: false }
  if (!rateLimit(`reminder:${await clientIp()}`, 10, 10 * 60_000)) return { ok: false }
  const { error } = await createAdminClient()
    .from('basket_reminder_leads')
    .upsert(
      {
        visitor_id: r.visitor.visitorId,
        session_id: r.visitor.sessionId,
        arrival_id: r.visitor.arrivalId,
        email: r.email || null,
        phone: phoneOk ? formatUkPhone(r.phone) : null,
        email_opt_in: emailOptIn,
        whatsapp_opt_in: whatsAppOptIn,
        consent_copy_version: 'checkout-2026-10',
        basket: r.basket,
        is_test: testReason({ name: r.name, email: r.email }, APP_ENV) !== null,
        status: 'active',
      },
      { onConflict: 'session_id' },
    )
  return { ok: !error }
}
