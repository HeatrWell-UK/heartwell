// The Christmas and New Year season's window (Run 3, owner 24 November 2026).
// The page posts this device's random ID; the database grants ONE 14-day
// window per visitor per season generation (new or returning visitors alike),
// capped at the season's end, and never resets it. The browser's own token
// cookie wins over the device ID, so neither a new ID nor a second tab earns a
// second window. The token goes in an httpOnly cookie that checkout sends
// back; two readable cookies carry only the end time and the generation.
//
// Like the welcome and ad offers, these cookies hold no tracking data and make
// the offer work, so they don't wait for cookie consent (listed on the cookies page).

import { cookies } from 'next/headers'
import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { OFFER_COOKIE, OFFER_GENERATION_COOKIE, OFFER_UNTIL_COOKIE, offerToken, SEASON_COOKIE_DAYS } from '@/lib/offers/paid'
import { eventLive } from '@/lib/offers/event'
import { getOfferSettings } from '@/lib/offers/server'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const Body = z.object({ visitorId: z.uuid() })

const none = () => Response.json({ offer: null })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return none()
  if (!rateLimit(`season:${await clientIp()}`, 30, 60_000)) return none()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return none()
  if (!eventLive((await getOfferSettings()).event)) return none()

  const jar = await cookies()
  const { data, error } = await createAdminClient().rpc('issue_seasonal_offer', {
    p_visitor_id: parsed.data.visitorId,
    p_token: offerToken(jar.get(OFFER_COOKIE)?.value) ?? undefined,
  })
  if (error || !data) {
    if (error) console.error('season offer failed', error.message)
    return none()
  }
  const offer = data as { token: string; expires_at: string; live: boolean; generation: string }
  const until = new Date(offer.expires_at).toISOString()
  const base = { path: '/', maxAge: SEASON_COOKIE_DAYS * 86_400, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' }
  jar.set(OFFER_COOKIE, offer.token, { ...base, httpOnly: true })
  jar.set(OFFER_UNTIL_COOKIE, until, base)
  jar.set(OFFER_GENERATION_COOKIE, offer.generation, base)
  return Response.json({ offer: { until, live: offer.live } })
}
