// The server copy of a browser event (Conversions API), sharing the browser's
// event ID so Meta keeps one. Only for visitors who accepted marketing
// cookies; never from staff devices. Always answers 204: tracking must never
// get in the way of a page.

import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { SITE_URL } from '@/config/site'
import { CONSENT_COOKIE, effectiveMode, isPrivatePath, liveAllowed, STAFF_COOKIE } from '@/config/tracking'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { parseConsent } from '@/lib/tracking/consent'
import { metaEvent } from '@/lib/tracking/meta-event'
import { getTrackingSettings, logTracking, META_SETUP, sendToMeta } from '@/lib/tracking/server'
import { BROWSER_EVENTS, type BrowserEventName } from '@/lib/tracking/events'
import type { Json } from '@/types/database'

export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.enum(BROWSER_EVENTS as unknown as [BrowserEventName, ...BrowserEventName[]]),
  eventId: z.uuid(),
  path: z.string().startsWith('/').max(300),
  visitorId: z.uuid().nullable().optional(),
  data: z
    .object({
      value: z.number().min(0).max(1_000_000).optional(),
      contentIds: z.array(z.string().max(64)).max(30).optional(),
      contents: z.array(z.object({ id: z.string().max(64), quantity: z.number().int().min(1).max(99), item_price: z.number().min(0).max(100_000) })).max(30).optional(),
      contentName: z.string().max(200).optional(),
      numItems: z.number().int().min(0).max(300).optional(),
    })
    .default({}),
})

const done = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value === '1') return done()
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value)
  if (!consent.marketing) return done()
  if (!rateLimit(`track:${await clientIp()}`, 120, 60_000)) return done()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return done()
  const e = parsed.data
  if (isPrivatePath(e.path)) return done()

  const h = await headers()
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''
  const { mode: setting } = await getTrackingSettings()
  const isTest = APP_ENV !== 'production'
  const mode = effectiveMode(setting, META_SETUP, { liveAllowed: liveAllowed(host), isTest })
  const payload = metaEvent({
    name: e.name,
    eventId: e.eventId,
    time: new Date(),
    actionSource: 'website',
    sourceUrl: `${SITE_URL}${e.path}`,
    user: {
      externalId: e.visitorId ?? null,
      // Consent was given above, so the browser's identifiers may go with it (D10).
      ip: await clientIp(),
      userAgent: h.get('user-agent')?.slice(0, 400) ?? null,
      fbp: jar.get('_fbp')?.value ?? null,
      fbc: jar.get('_fbc')?.value ?? null,
    },
    custom: e.data,
  })

  if (mode === 'dry_run') {
    await logTracking({ source: 'browser_mirror', platform: 'meta', event_name: e.name, event_id: e.eventId, mode, status: 'logged', is_test: isTest, payload: payload as unknown as Json, response: null })
    return done()
  }
  const result = await sendToMeta([payload], mode)
  // Live events are logged only when something went wrong; test events always, so they can be checked.
  if (mode === 'test' || !result.ok) {
    await logTracking({ source: 'browser_mirror', platform: 'meta', event_name: e.name, event_id: e.eventId, mode, status: result.ok ? 'sent' : 'failed', is_test: isTest, payload: payload as unknown as Json, response: result.body })
  }
  return done()
}
