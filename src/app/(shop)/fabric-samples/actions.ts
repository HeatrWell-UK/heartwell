'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { formatUkPhone, isUkPhone } from '@/lib/checkout/phone'
import { testReason } from '@/lib/checkout/order'
import { sendSampleEmails } from '@/lib/leads/notify'

export type SampleField = 'name' | 'phone' | 'email' | 'postcode' | 'address' | 'fabrics'
export type SampleResult = { ok: true } | { ok: false; message: string; field?: SampleField }

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  postcode: z.string().trim().min(5).max(10),
  address: z.string().trim().min(5).max(400),
  materialIds: z.array(z.uuid()).min(1).max(20),
  website: z.string().max(200),
  visit: z.object({ visitorId: z.uuid(), sessionId: z.uuid() }).nullable(),
})

const MESSAGES: Record<string, { message: string; field?: SampleField }> = {
  NO_SAMPLES: { message: 'Choose at least one fabric.', field: 'fabrics' },
  SAMPLE_LIMIT: { message: 'That’s more samples than we can send at once. Please choose fewer.', field: 'fabrics' },
  UNAVAILABLE_MATERIAL: { message: 'One of those fabrics has just sold out. Please choose another.', field: 'fabrics' },
  INVALID_POSTCODE: { message: 'Please check the postcode.', field: 'postcode' },
}

export async function requestSamples(input: unknown): Promise<SampleResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.path[0]
    const field = first === 'materialIds' ? 'fabrics' : (first as SampleField | undefined)
    const words: Record<string, string> = {
      name: 'Please give your name.',
      email: 'Please check your email address.',
      postcode: 'Please check the postcode.',
      address: 'Please give the address to post them to.',
      fabrics: 'Choose at least one fabric.',
    }
    return { ok: false, message: (field && words[field]) ?? 'Please check your details.', field }
  }
  const r = parsed.data
  // A bot filled in the hidden field: say thanks, keep nothing.
  if (r.website) return { ok: true }
  if (!isUkPhone(r.phone)) return { ok: false, message: 'Please give a UK mobile or landline, so we can arrange the £5 with you.', field: 'phone' }
  if (!rateLimit(`samples:${await clientIp()}`, 5, 60 * 60_000)) {
    return { ok: false, message: 'That’s a lot of sample requests. Please message us on WhatsApp and we’ll sort it out.' }
  }
  if (!SUPABASE_SECRET_CONFIGURED) return { ok: false, message: 'We can’t take sample requests online just now. Please message us on WhatsApp.' }

  const h = await headers()
  const admin = createAdminClient()
  const isTest = testReason({ name: r.name, email: r.email }, APP_ENV) !== null
  const { data, error } = await admin.rpc('request_samples', {
    p_input: {
      customer_name: r.name,
      customer_email: r.email,
      customer_phone: formatUkPhone(r.phone),
      postcode: r.postcode,
      shipping_address: r.address,
      material_ids: r.materialIds,
      visitor_id: r.visit?.visitorId ?? null,
      session_id: r.visit?.sessionId ?? null,
      customer_ip: await clientIp(),
      customer_user_agent: h.get('user-agent')?.slice(0, 400) ?? null,
      is_test: isTest,
    },
  })
  if (error) {
    const known = MESSAGES[error.message.match(/^([A-Z_]+)/)?.[1] ?? '']
    if (known) return { ok: false, ...known }
    console.error('sample request failed', error.message)
    return { ok: false, message: 'We couldn’t send that request. Please try again, or message us on WhatsApp.' }
  }

  const id = (data as { id: string }).id
  after(async () => {
    try {
      const { data: request } = await admin
        .from('sample_requests')
        .select('postcode, sample_request_items(material_code, material_name, material_collection)')
        .eq('id', id)
        .single()
      await sendSampleEmails({
        name: r.name,
        email: r.email,
        phone: formatUkPhone(r.phone),
        address: r.address,
        postcode: request?.postcode ?? r.postcode,
        fabrics: (request?.sample_request_items ?? []).map((i) => ({ code: i.material_code, name: i.material_name, collection: i.material_collection })),
        isTest,
      })
    } catch (e) {
      console.error('sample emails failed', id, e)
    }
  })
  return { ok: true }
}
