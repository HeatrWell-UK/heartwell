// The welcome offer (owner, 22 October 2026). The page posts this device's
// random ID; the database returns the visitor's welcome offer, starting it if
// this is the first visit. A browser's own cookie token wins over the device
// ID, so neither a new ID nor cleared storage restarts an offer, and an ended
// one stays ended. The token goes in an httpOnly cookie that checkout sends
// back; a second cookie, readable by the page, carries only the end time for
// the countdown. Both last a year, well past the offer.
//
// Like the ad offer, these cookies hold no tracking data and make the offer
// work, so they don't wait for cookie consent (listed on the cookies page).

import { cookies } from 'next/headers'
import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { offerToken } from '@/lib/offers/paid'
import { WELCOME_COOKIE, WELCOME_COOKIE_DAYS, WELCOME_UNTIL_COOKIE } from '@/lib/offers/welcome'
import { getOfferSettings } from '@/lib/offers/server'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const Body = z.object({ visitorId: z.uuid() })

const none = () => Response.json({ offer: null })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return none()
  if (!rateLimit(`welcome:${await clientIp()}`, 30, 60_000)) return none()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return none()
  if (!(await getOfferSettings()).welcome.enabled) return none()

  const jar = await cookies()
  const { data, error } = await createAdminClient().rpc('issue_welcome_offer', {
    p_visitor_id: parsed.data.visitorId,
    p_token: offerToken(jar.get(WELCOME_COOKIE)?.value) ?? undefined,
  })
  if (error || !data) {
    if (error) console.error('welcome offer failed', error.message)
    return none()
  }
  const offer = data as { token: string; expires_at: string; live: boolean }
  const until = new Date(offer.expires_at).toISOString()
  const base = { path: '/', maxAge: WELCOME_COOKIE_DAYS * 86_400, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' }
  jar.set(WELCOME_COOKIE, offer.token, { ...base, httpOnly: true })
  jar.set(WELCOME_UNTIL_COOKIE, until, base)
  return Response.json({ offer: { until, live: offer.live } })
}
