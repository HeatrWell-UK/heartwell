// The shop's own journey analytics (Run 3): a step of a visit as a code from
// the taxonomy (src/lib/journey/taxonomy.ts), with the visitor's ANALYTICS
// consent. Never sent to Meta or Google. Every field is checked against the
// allowlist and anything else is dropped; the browser's event ID makes a resend
// harmless (unique in the database). Staff devices and private pages aren't
// recorded; QA visits (?qa=1) are saved as test rows that reports exclude. Kept 90 days. Always answers 204.

import { cookies } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { CONSENT_COOKIE, isPrivatePath, STAFF_COOKIE } from '@/config/tracking'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { CODE, FIELD_CATEGORIES, JOURNEY_EVENTS, OUTCOMES, PAGE_TYPES } from '@/lib/journey/taxonomy'
import { parseConsent } from '@/lib/tracking/consent'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const code = z.string().regex(CODE)

const Body = z
  .object({
    eventId: z.uuid(),
    sessionId: z.uuid(),
    // Only with advertising consent, to join the visit's source.
    visitorId: z.uuid().optional(),
    arrivalId: z.uuid().optional(),
    event: z.enum(JOURNEY_EVENTS),
    path: z.string().startsWith('/').max(300).regex(/^[^?#]*$/),
    pageType: z.enum(PAGE_TYPES),
    step: code.optional(),
    outcome: z.enum(OUTCOMES).optional(),
    errorCode: code.optional(),
    fieldCategory: z.enum(FIELD_CATEGORIES).optional(),
    ctaPosition: code.optional(),
    section: code.optional(),
    optionCode: code.optional(),
    destination: code.optional(),
    lastEvent: z.enum(JOURNEY_EVENTS).optional(),
    navigation: z.enum(['load', 'spa', 'back_forward', 'reload']).optional(),
    deviceClass: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    scrollPercent: z.number().int().min(0).max(100).optional(),
    sequence: z.number().int().min(0).max(100000).optional(),
    elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
    quantity: z.number().int().min(1).max(99).optional(),
    variantId: z.uuid().optional(),
    // A QA visit (?qa=1): saved as a test row, which every report excludes (Run 4).
    qa: z.literal(true).optional(),
  })
  .strict()

const done = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return done()
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value === '1') return done()
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value)
  if (!consent.analytics) return done()
  if (!rateLimit(`journey:${await clientIp()}`, 240, 60_000)) return done()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success || isPrivatePath(parsed.data.path)) return done()
  const b = parsed.data
  const metadata: Record<string, string | number> = { data_class: 'consented_journey', event_id: b.eventId, event: b.event, page_type: b.pageType }
  const put = (k: string, v: string | number | undefined) => {
    if (v !== undefined) metadata[k] = v
  }
  put('step', b.step)
  put('outcome', b.outcome)
  put('error_code', b.errorCode)
  put('field_category', b.fieldCategory)
  put('cta_position', b.ctaPosition)
  put('section', b.section)
  put('option_code', b.optionCode)
  put('destination', b.destination)
  put('last_event', b.lastEvent)
  put('navigation', b.navigation)
  put('device_class', b.deviceClass)
  put('scroll_percent', b.scrollPercent)
  put('sequence', b.sequence)
  put('elapsed_ms', b.elapsedMs)
  put('quantity', b.quantity)

  const db = createAdminClient()
  const productId = b.variantId ? ((await db.from('product_variants').select('product_id').eq('id', b.variantId).maybeSingle()).data?.product_id ?? null) : null
  // The advertising IDs only with advertising consent (they join the visit's source); otherwise the journey stands alone.
  const ad = consent.marketing
  const { error } = await db.from('attribution_actions').insert({
    visitor_id: ad ? (b.visitorId ?? null) : null,
    session_id: b.sessionId,
    arrival_id: ad ? (b.arrivalId ?? null) : null,
    action_type: 'journey_event',
    page_url: b.path,
    metadata,
    product_id: productId,
    variant_id: productId ? b.variantId : null,
    is_test: APP_ENV !== 'production' || b.qa === true,
  })
  // 23505: the same event again (a resend): already saved.
  if (error && error.code !== '23505') console.error('journey event not saved', b.event, error.message)
  return done()
}
