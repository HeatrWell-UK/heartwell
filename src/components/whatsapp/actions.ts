'use server'

import { z } from 'zod'
import { CONTACT } from '@/config/contact'
import { SMTP_CONFIGURED } from '@/config/email'
import { APP_ENV } from '@/config/env'
import { formatUkPhone, isUkPhone } from '@/lib/checkout/phone'
import { testReason } from '@/lib/checkout/order'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { sendCallbackEmail } from '@/lib/leads/notify'
import { WA_REFERENCE } from '@/lib/whatsapp/handoff'

// "Message me on WhatsApp": a customer leaves their mobile number and the shop
// is emailed straight away to message them (the help sheet, 10 November 2026).
// The number goes in that email only: nothing is stored, nothing goes to Meta.

const Input = z.object({
  name: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  product: z.string().trim().max(200).optional(),
  reference: z.string().regex(WA_REFERENCE).nullable(),
  // The page's path only: no query string.
  page: z.string().startsWith('/').max(300).regex(/^[^?#]*$/),
  website: z.string().max(200),
})

export type CallbackResult = { ok: true; phone: string } | { ok: false; message: string }

const callUs = CONTACT.phoneDisplay ? ` Please call us on ${CONTACT.phoneDisplay} instead.` : ''

export async function requestWhatsAppCallback(input: unknown): Promise<CallbackResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please check your mobile number.' }
  const c = parsed.data
  // The hidden field only robots fill in.
  if (c.website) return { ok: true, phone: '' }
  if (!isUkPhone(c.phone)) return { ok: false, message: 'Please check your mobile number, for example 07700 900123.' }
  if (!rateLimit(`wa-callback:${await clientIp()}`, 5, 60 * 60_000)) return { ok: false, message: `That’s a lot of requests.${callUs}` }
  if (!SMTP_CONFIGURED) return { ok: false, message: `Sorry, we can’t take numbers here just now.${callUs}` }

  const phone = formatUkPhone(c.phone)
  const status = await sendCallbackEmail({
    name: c.name || null,
    phone,
    product: c.product || null,
    reference: c.reference,
    page: c.page,
    isTest: testReason({ name: c.name, email: '' }, APP_ENV) !== null,
  })
  if (status !== 'sent') return { ok: false, message: `Sorry, that didn’t go through.${callUs}` }
  return { ok: true, phone }
}
