'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { APP_ENV } from '@/config/env'
import { SMTP_CONFIGURED } from '@/config/email'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { formatUkPhone, isUkPhone } from '@/lib/checkout/phone'
import { testReason } from '@/lib/checkout/order'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/leads/topics'
import { sendContactEmails } from '@/lib/leads/notify'

export type ContactField = 'name' | 'email' | 'phone' | 'message' | 'orderReference'
export type ContactResult = { ok: true } | { ok: false; message: string; field?: ContactField }

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: z.string().trim().max(30),
  topic: z.enum(Object.keys(CONTACT_TOPICS) as [ContactTopic, ...ContactTopic[]]),
  orderReference: z.string().trim().toUpperCase().max(20),
  message: z.string().trim().min(2).max(4000),
  website: z.string().max(200),
  visitorId: z.uuid().nullable(),
})

const WORDS: Record<string, string> = {
  name: 'Please give your name.',
  email: 'Please check your email address, so we can reply.',
  message: 'Please write your message.',
  orderReference: 'Please check the order number, e.g. HW-100231.',
}

export async function sendContactMessage(input: unknown): Promise<ContactResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0] as ContactField | undefined
    return { ok: false, message: (field && WORDS[field]) ?? 'Please check your details.', field }
  }
  const m = parsed.data
  if (m.website) return { ok: true }
  if (m.phone && !isUkPhone(m.phone)) return { ok: false, message: 'Please check the phone number, or leave it blank.', field: 'phone' }
  if (m.orderReference && !/^HW-?\d{6}$/.test(m.orderReference)) return { ok: false, message: WORDS.orderReference!, field: 'orderReference' }
  if (!rateLimit(`contact:${await clientIp()}`, 5, 60 * 60_000)) return { ok: false, message: 'That’s a lot of messages. Please message us on WhatsApp instead.' }
  if (!SUPABASE_SECRET_CONFIGURED && !SMTP_CONFIGURED) return { ok: false, message: 'We can’t take messages here just now. Please WhatsApp, ring or email us instead.' }

  const isTest = testReason({ name: m.name, email: m.email }, APP_ENV) !== null
  const message = {
    name: m.name,
    email: m.email,
    phone: m.phone ? formatUkPhone(m.phone) : null,
    topic: m.topic,
    orderReference: m.orderReference ? m.orderReference.replace(/^HW-?/, 'HW-') : null,
    message: m.message,
    isTest,
  }

  if (SUPABASE_SECRET_CONFIGURED) {
    const h = await headers()
    const { error } = await createAdminClient()
      .from('contact_messages')
      .insert({
        name: message.name,
        email: message.email,
        phone: message.phone,
        topic: message.topic,
        order_reference: message.orderReference,
        message: message.message,
        visitor_id: m.visitorId,
        customer_ip: await clientIp(),
        customer_user_agent: h.get('user-agent')?.slice(0, 400) ?? null,
        is_test: isTest,
      })
    if (error) {
      console.error('contact message not saved', error.message)
      // Still emailed to the shop below when email works; otherwise say so.
      if (!SMTP_CONFIGURED) return { ok: false, message: 'We couldn’t send that. Please try again, or WhatsApp us.' }
    }
  }

  after(async () => {
    try {
      await sendContactEmails(message)
    } catch (e) {
      console.error('contact emails failed', e)
    }
  })
  return { ok: true }
}
