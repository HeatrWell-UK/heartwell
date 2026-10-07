// Saves a WhatsApp enquiry with the reference the browser put in the message.
// Called in the background as WhatsApp opens: it always answers 204, and a
// failure here never reaches the customer.

import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { WA_REFERENCE } from '@/lib/whatsapp/handoff'

export const dynamic = 'force-dynamic'

const Body = z.object({
  reference: z.string().regex(WA_REFERENCE),
  context: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
  page: z.string().startsWith('/').max(500),
  productId: z.uuid().optional(),
  variantId: z.uuid().optional(),
  productName: z.string().max(200).optional(),
  visit: z.object({ visitorId: z.uuid(), sessionId: z.uuid(), arrivalId: z.uuid() }).nullable().optional(),
})

const done = () => new Response(null, { status: 204 })

export async function POST(request: Request) {
  if (!SUPABASE_SECRET_CONFIGURED) return done()
  if (!rateLimit(`wa:${await clientIp()}`, 30, 60_000)) return done()
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return done()
  const e = parsed.data
  const { error } = await createAdminClient().rpc('create_whatsapp_enquiry', {
    p_input: {
      reference: e.reference,
      page_url: e.page,
      page_context: e.context,
      product_id: e.productId ?? null,
      variant_id: e.variantId ?? null,
      product_name: e.productName ?? null,
      attribution: e.visit ? { visitor_id: e.visit.visitorId, session_id: e.visit.sessionId, arrival_id: e.visit.arrivalId } : {},
      // Everything outside the live site is a test.
      is_test: APP_ENV !== 'production',
    },
  })
  if (error) console.error('whatsapp enquiry not saved', e.reference, error.message)
  return done()
}
