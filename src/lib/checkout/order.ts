// Checkout input, as checked on the server, and the exact shape the
// database's price_order and place_order expect. Pure, so it's tested.
// The browser sends identities, quantities and choices; never a price
// except the total it showed, which place_order must match to the penny.

import { z } from 'zod'
import { isUkPhone, formatUkPhone } from './phone'
import { consentForOrder, type Consent } from '@/lib/tracking/consent'

const Item = z.object({
  id: z.string().min(1).max(64),
  variantId: z.uuid(),
  materialId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(10),
})

const Extras = z.object({
  floor: z.number().int().min(0).max(50),
  hasLift: z.boolean(),
  assembly: z.boolean(),
  removal: z.boolean(),
  removalSeats: z.number().int().min(1).max(20).nullable(),
})

export const QuoteInput = z.object({
  items: z.array(Item).min(1).max(30),
  extras: Extras,
  promotionCode: z.string().trim().max(24).optional(),
})
export type QuoteInput = z.infer<typeof QuoteInput>

const Visitor = z.object({ visitorId: z.uuid(), sessionId: z.uuid(), arrivalId: z.uuid() })

const tag = z.string().trim().max(200).optional()
/** How the shopper found us (first-party): the latest campaign tags, landing page and referring site. */
const Attribution = z.object({
  touch: z.object({ source: tag, medium: tag, campaign: tag, content: tag, term: tag, landing: z.string().startsWith('/').max(300).optional(), referrer: z.string().max(200).optional() }).nullable(),
  fbclid: z.string().max(500).nullable(),
})

export const OrderInput = QuoteInput.extend({
  name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  phone: z.string().trim().max(30).refine(isUkPhone, 'Please enter a UK phone number, like 07700 900123.'),
  // Trimmed first: phone autofill often leaves a trailing space.
  email: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.union([z.literal(''), z.email('Please check your email address.').max(254)])),
  postcode: z.string().trim().min(5).max(10),
  shippingAddress: z.string().trim().min(5, 'Please enter your address.').max(400),
  preferredDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  notes: z.string().trim().max(1000),
  expectedTotal: z.number().nonnegative(),
  visitor: Visitor.nullable(),
  /** A field people never see; bots fill it in. */
  website: z.string().max(200),
  attribution: Attribution.optional(),
  /** Placed during a ?qa=1 visit: a test order. */
  qa: z.boolean().optional(),
})
export type OrderInput = z.infer<typeof OrderInput>

/**
 * The pricing part of the database input (price_order and place_order share
 * it). The ad-visitor offer’s token comes from its httpOnly cookie, never from
 * the page.
 */
export function pricingPayload(q: QuoteInput, offerToken: string | null = null) {
  return {
    items: q.items.map((i) => ({ item_id: i.id, variant_id: i.variantId, material_id: i.materialId, quantity: i.quantity })),
    extras: {
      floor: q.extras.floor,
      has_lift: q.extras.floor > 0 && q.extras.hasLift,
      assembly: q.extras.assembly,
      removal: q.extras.removal,
      removal_seats: q.extras.removal ? q.extras.removalSeats : null,
    },
    promotion_code: q.promotionCode?.trim().toUpperCase() || null,
    offer_entitlement_token: offerToken,
  }
}

/** Why an order is a test: staging, a staff device, a QA link, or details that say so. Test orders never count anywhere. */
export function testReason(o: Pick<OrderInput, 'name' | 'email'>, appEnv: string, flags: { qa?: boolean; staffDevice?: boolean } = {}): string | null {
  if (appEnv !== 'production') return `placed on ${appEnv}`
  if (flags.staffDevice) return 'placed on a staff device'
  if (flags.qa) return 'QA link'
  if (/\btest\b/i.test(o.name) || /^test[.+@]|@example\.(com|org|net)$/i.test(o.email)) return 'test details'
  return null
}

/** What the server knows about the shopper's tracking choices when the order is placed. */
export interface OrderTracking {
  consent: Consent
  staffDevice: boolean
  /** Meta's browser cookies, when present. */
  fbp: string | null
  fbc: string | null
  /** From GA4's _ga cookie, when analytics was accepted. */
  gaClientId: string | null
  ip: string | null
  userAgent: string | null
}

/**
 * The order's attribution and tracking fields. Campaign tags and the landing
 * page are first-party (kept unless statistics were switched off); Meta's
 * identifiers, the IP address and the browser go only with marketing consent.
 */
export function trackingPayload(o: Pick<OrderInput, 'visitor' | 'attribution'>, t: OrderTracking | undefined, now = new Date()) {
  const marketing = t?.consent.marketing ?? false
  const touch = t?.consent.statistics === false ? null : (o.attribution?.touch ?? null)
  const fbclid = marketing ? (o.attribution?.fbclid ?? null) : null
  const attribution = {
    ...(o.visitor ? { visitor_id: o.visitor.visitorId, session_id: o.visitor.sessionId, arrival_id: o.visitor.arrivalId } : {}),
    ...(touch
      ? {
          utm_source: touch.source ?? null,
          utm_medium: touch.medium ?? null,
          utm_campaign: touch.campaign ?? null,
          utm_content: touch.content ?? null,
          utm_term: touch.term ?? null,
          landing_page: touch.landing ?? null,
          referrer: touch.referrer ?? null,
        }
      : {}),
    ...(marketing
      ? {
          fbclid,
          meta_fbp: t?.fbp ?? null,
          // Meta's documented _fbc format, when the Pixel hasn't set one.
          meta_fbc: t?.fbc ?? (fbclid ? `fb.1.${now.getTime()}.${fbclid}` : null),
        }
      : {}),
    ...(t?.consent.analytics && t.gaClientId ? { ga_client_id: t.gaClientId } : {}),
  }
  return {
    tracking_consent: t ? consentForOrder(t.consent) : 'unknown',
    attribution,
    customer_ip: marketing ? (t?.ip ?? null) : null,
    customer_user_agent: marketing ? (t?.userAgent ?? null) : null,
  }
}

export function orderPayload(o: OrderInput, ctx: { appEnv: string; mixedAreaEvidence: 'island' | 'mainland' | null; tracking?: OrderTracking; offerToken?: string | null }) {
  const reason = testReason(o, ctx.appEnv, { qa: o.qa, staffDevice: ctx.tracking?.staffDevice })
  return {
    ...pricingPayload(o, ctx.offerToken ?? null),
    customer_name: o.name.replace(/\s+/g, ' ').trim(),
    customer_phone: formatUkPhone(o.phone),
    customer_email: o.email.trim().toLowerCase() || null,
    shipping_address: o.shippingAddress
      .replace(/\s*\n\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/(\s*,\s*)+/g, ', ')
      .replace(/^,\s*|,\s*$/g, '')
      .trim(),
    postcode: o.postcode,
    mixed_area_evidence: ctx.mixedAreaEvidence,
    preferred_delivery_date: o.preferredDate || null,
    special_instructions: o.notes.trim() || null,
    expected_total: o.expectedTotal,
    is_test: reason !== null,
    test_reason: reason,
    ...trackingPayload(o, ctx.tracking),
  }
}

export interface PlainError {
  code: string
  message: string
  /** The form field to point at, when there is one. */
  field?: 'name' | 'phone' | 'email' | 'postcode' | 'address' | 'date' | 'basket' | 'code'
}

/** The database's refusals, in words a customer can act on. */
export function explainOrderError(dbMessage: string): PlainError {
  const code = dbMessage.match(/^([A-Z_]+)/)?.[1] ?? 'UNKNOWN'
  switch (code) {
    case 'MISSING_NAME':
      return { code, field: 'name', message: 'Please enter your full name.' }
    case 'BAD_PHONE':
      return { code, field: 'phone', message: 'Please check your phone number. We ring to book your delivery.' }
    case 'BAD_EMAIL':
      return { code, field: 'email', message: 'Please check your email address.' }
    case 'MISSING_ADDRESS':
      return { code, field: 'address', message: 'Please enter your address.' }
    case 'INVALID_POSTCODE':
      return { code, field: 'postcode', message: 'Please check your postcode.' }
    case 'NOT_MAINLAND':
      return { code, field: 'postcode', message: 'We deliver to this postcode by arrangement, not through the online checkout. Please ask us for a quote.' }
    case 'BAD_DELIVERY_DATE':
    case 'DELIVERY_DATE_TOO_SOON':
    case 'DELIVERY_DATE_TOO_FAR':
      return { code, field: 'date', message: 'Please pick another delivery day, or leave it blank and we’ll agree one when we ring.' }
    case 'PRICE_MISMATCH':
      return { code, field: 'basket', message: 'A price has changed since you opened this page. Please check your order total and place it again.' }
    case 'UNAVAILABLE_ITEMS':
    case 'UNAVAILABLE_MATERIAL':
      return { code, field: 'basket', message: 'Something in your basket is no longer available. Please go back to your basket.' }
    case 'EMPTY_BASKET':
      return { code, field: 'basket', message: 'Your basket is empty.' }
    case 'TOO_MANY_LINES':
      return { code, field: 'basket', message: 'That’s more lines than we can take online. Please ring us and we’ll take the order by phone.' }
    default:
      return { code: 'UNKNOWN', message: 'Sorry, we couldn’t place your order just now. Please try again, or ring us and we’ll take it by phone.' }
  }
}
