// A step of a visit (a page, a basket add, starting checkout, tapping Call),
// noted against our own visitor, session and arrival IDs so staff can match a
// phone or WhatsApp order to the visit and advert behind it (Admin → New
// order → Find their website visit). Our own statistics only: nothing here
// goes to Meta or Google. Kept 90 days. Always answers 204.

import { cookies } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { CONSENT_COOKIE, isPrivatePath, STAFF_COOKIE } from '@/config/tracking'
import { VISIT_STEPS } from '@/lib/attribution/visit'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { parseConsent } from '@/lib/tracking/consent'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const Body = z.object({
  visit: z.object({ visitorId: z.uuid(), sessionId: z.uuid(), arrivalId: z.uuid() }),
  type: z.enum(VISIT_STEPS),
  // The page's path only: no query string, so nothing from a link's address is kept.
  path: z.string().startsWith('/').max(300).regex(/^[^?#]*$/),
  name: z.string().trim().max(120).optional(),
  value: z.number().min(0).max(100000).optional(),
})

const done = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return done()
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value === '1') return done()
  if (!parseConsent(jar.get(CONSENT_COOKIE)?.value).statistics) return done()
  if (!rateLimit(`visit:${await clientIp()}`, 120, 60_000)) return done()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success || isPrivatePath(parsed.data.path)) return done()
  const { visit, type, path, name, value } = parsed.data
  const metadata = { ...(name ? { name } : {}), ...(value !== undefined ? { value: Math.round(value * 100) / 100 } : {}) }
  const { error } = await createAdminClient()
    .from('attribution_actions')
    .insert({
      visitor_id: visit.visitorId,
      session_id: visit.sessionId,
      arrival_id: visit.arrivalId,
      action_type: type,
      page_url: path,
      metadata: Object.keys(metadata).length ? metadata : null,
      is_test: APP_ENV !== 'production',
    })
  if (error) console.error('visit step not saved', type, error.message)
  return done()
}
