// How a visit began (first-party): campaign tags, landing page and referring
// site, saved against our own visitor, session and arrival IDs so orders,
// enquiries and leads can be credited to the ad that brought them. Meta's
// identifiers (fbclid, _fbp, _fbc) are saved only with marketing consent.
// Always answers 204.

import { cookies } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { CONSENT_COOKIE, STAFF_COOKIE } from '@/config/tracking'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { parseConsent } from '@/lib/tracking/consent'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const tag = z.string().trim().max(200).optional()
const Body = z.object({
  visit: z.object({ visitorId: z.uuid(), sessionId: z.uuid(), arrivalId: z.uuid() }),
  touch: z.object({ source: tag, medium: tag, campaign: tag, content: tag, term: tag, landing: z.string().startsWith('/').max(300).optional(), referrer: z.string().max(200).optional() }),
  fbclid: z.string().max(500).optional(),
  productId: z.uuid().optional(),
  variantId: z.uuid().optional(),
})

const done = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return done()
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value === '1') return done()
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value)
  // Our own statistics are on unless the visitor switched them off.
  if (!consent.statistics) return done()
  if (!rateLimit(`attribution:${await clientIp()}`, 60, 60_000)) return done()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return done()
  const { visit, touch, fbclid, productId, variantId } = parsed.data
  const marketing = consent.marketing
  const db = createAdminClient()
  const hasTags = Boolean(touch.source || touch.medium || touch.campaign || touch.content || touch.term)
  const meta = marketing ? { fbclid: fbclid ?? null, meta_fbp: jar.get('_fbp')?.value ?? null, meta_fbc: jar.get('_fbc')?.value ?? null } : {}

  const { data: existing } = await db.from('attribution_sessions').select('id').eq('arrival_id', visit.arrivalId).maybeSingle()
  if (!existing) {
    await db.from('attribution_sessions').insert({
      visitor_id: visit.visitorId,
      session_id: visit.sessionId,
      arrival_id: visit.arrivalId,
      first_touch_source: touch.source ?? null,
      first_touch_medium: touch.medium ?? null,
      first_touch_campaign: touch.campaign ?? null,
      first_touch_content: touch.content ?? null,
      first_touch_term: touch.term ?? null,
      last_touch_source: touch.source ?? null,
      last_touch_medium: touch.medium ?? null,
      last_touch_campaign: touch.campaign ?? null,
      last_touch_content: touch.content ?? null,
      last_touch_term: touch.term ?? null,
      landing_page: touch.landing ?? null,
      referrer: touch.referrer ?? null,
      initial_product_id: productId ?? null,
      initial_variant_id: variantId ?? null,
      is_test: APP_ENV !== 'production',
      ...meta,
    })
  } else {
    await db
      .from('attribution_sessions')
      .update({
        last_seen_at: new Date().toISOString(),
        ...(hasTags
          ? {
              last_touch_source: touch.source ?? null,
              last_touch_medium: touch.medium ?? null,
              last_touch_campaign: touch.campaign ?? null,
              last_touch_content: touch.content ?? null,
              last_touch_term: touch.term ?? null,
            }
          : {}),
        ...(marketing ? Object.fromEntries(Object.entries(meta).filter(([, v]) => v)) : {}),
      })
      .eq('arrival_id', visit.arrivalId)
  }
  return done()
}
