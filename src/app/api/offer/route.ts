// The automatic offer for ad visitors. The page posts the address it landed
// on; the server decides again whether it came from an ad (never trusting
// the page's verdict), asks the database for the visitor's entitlement and
// keeps its token in an httpOnly cookie that checkout sends back. A second
// cookie, readable by the page, carries only the end date for the offer strip.
//
// The offer is part of what the visitor was promised in the ad, so it doesn't
// wait for cookie consent: these two cookies hold no tracking data.

import { cookies } from 'next/headers'
import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { classifyPaidLanding, OFFER_COOKIE, OFFER_UNTIL_COOKIE } from '@/lib/offers/paid'
import { getOfferSettings } from '@/lib/offers/server'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const Body = z.object({
  visitorId: z.uuid(),
  arrivalId: z.uuid().optional(),
  search: z.string().max(2000),
})

const none = () => Response.json({ offer: null })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return none()
  if (!rateLimit(`offer:${await clientIp()}`, 20, 60_000)) return none()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return none()
  const source = classifyPaidLanding(parsed.data.search)
  if (!source) return none()
  const settings = await getOfferSettings()
  if (!settings.adOffer) return none()

  const { data, error } = await createAdminClient().rpc('issue_paid_offer_entitlement', {
    p_visitor_id: parsed.data.visitorId,
    p_source: source,
    p_arrival_id: parsed.data.arrivalId,
  })
  if (error || !data) {
    console.error('offer entitlement failed', error?.message)
    return none()
  }
  const offer = data as { token: string; expires_at: string }
  const expires = new Date(offer.expires_at)
  const jar = await cookies()
  const base = { path: '/', expires, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' }
  jar.set(OFFER_COOKIE, offer.token, { ...base, httpOnly: true })
  jar.set(OFFER_UNTIL_COOKIE, expires.toISOString(), base)
  return Response.json({ offer: { until: expires.toISOString() } })
}
