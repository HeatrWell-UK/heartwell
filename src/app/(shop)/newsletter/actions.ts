'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { sendNewsletterConfirm } from '@/lib/leads/notify'

// Newsletter sign-up with double opt-in: nothing is sent until the person taps
// the link in the confirmation email, and every email can stop them in a tap.

export type NewsletterResult = { ok: true; message: string } | { ok: false; message: string }

export async function subscribe(rawEmail: string, website: string): Promise<NewsletterResult> {
  const email = z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(rawEmail)
  if (!email.success) return { ok: false, message: 'Please check your email address.' }
  if (website) return { ok: true, message: 'Check your inbox and tap the link to confirm.' }
  if (!rateLimit(`newsletter:${await clientIp()}`, 5, 60 * 60_000)) return { ok: false, message: 'Please try again later.' }
  if (!SUPABASE_SECRET_CONFIGURED) return { ok: false, message: 'Sign-up isn’t available just now. Please try again later.' }

  const h = await headers()
  const { data, error } = await createAdminClient().rpc('newsletter_subscribe', {
    p_email: email.data,
    p_ip: await clientIp(),
    p_user_agent: h.get('user-agent')?.slice(0, 400) ?? undefined,
  })
  if (error) {
    console.error('newsletter subscribe failed', error.message)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
  const r = data as { outcome: string; email?: string; confirm_token?: string }
  if (r.outcome === 'invalid_email') return { ok: false, message: 'Please check your email address.' }
  if (r.outcome === 'already_confirmed') return { ok: true, message: 'You’re already signed up. Thank you.' }
  if (r.outcome === 'throttled') return { ok: true, message: 'We’ve just emailed you a link. Please check your inbox (and junk folder).' }
  if (r.confirm_token) {
    const token = r.confirm_token
    after(async () => {
      try {
        await sendNewsletterConfirm(email.data, token)
      } catch (e) {
        console.error('newsletter confirm email failed', e)
      }
    })
  }
  return { ok: true, message: 'Nearly there: check your inbox and tap the link to confirm.' }
}

const TOKEN = z.uuid()

/** The button on the confirm page (a press, so link scanners can't confirm on someone's behalf). */
export async function confirmSubscription(token: string): Promise<{ ok: boolean; unsubscribeToken?: string }> {
  if (!TOKEN.safeParse(token).success || !SUPABASE_SECRET_CONFIGURED) return { ok: false }
  if (!rateLimit(`newsletter-confirm:${await clientIp()}`, 20, 60 * 60_000)) return { ok: false }
  const { data, error } = await createAdminClient().rpc('newsletter_confirm', { p_token: token })
  if (error) return { ok: false }
  const r = data as { outcome: string; unsubscribe_token?: string }
  return r.outcome === 'confirmed' || r.outcome === 'already_confirmed' ? { ok: true, unsubscribeToken: r.unsubscribe_token } : { ok: false }
}

export async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!TOKEN.safeParse(token).success || !SUPABASE_SECRET_CONFIGURED) return { ok: false }
  if (!rateLimit(`newsletter-stop:${await clientIp()}`, 20, 60 * 60_000)) return { ok: false }
  const { data, error } = await createAdminClient().rpc('newsletter_unsubscribe', { p_token: token })
  if (error) return { ok: false }
  return { ok: (data as { outcome: string }).outcome === 'unsubscribed' }
}
