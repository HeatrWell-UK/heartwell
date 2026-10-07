'use server'

import { revalidatePath } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/config/site'
import { SMTP_CONFIGURED } from '@/config/email'
import { sendEmail } from '@/lib/email/send'
import { basketReminderEmail } from '@/lib/email/lead-emails'
import { shopLine } from '@/lib/leads/notify'
import { basketLines } from '@/lib/admin/load-leads'

// Working the leads: posting samples, answering messages and sending the one
// basket reminder a shopper asked for. Writes go through the admin's session
// (row level security allows admins only).

export type LeadResult = { ok: true; message: string } | { ok: false; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGN_IN: LeadResult = { ok: false, message: 'Please sign in again.' }
const done = (message: string): LeadResult => {
  revalidatePath('/admin/leads')
  revalidatePath('/admin')
  return { ok: true, message }
}

export async function setSampleStatus(id: string, status: 'pending' | 'posted' | 'cancelled'): Promise<LeadResult> {
  if (!UUID.test(id) || !['pending', 'posted', 'cancelled'].includes(status)) return { ok: false, message: 'Unknown request.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient())
    .from('sample_requests')
    .update({ status, posted_at: status === 'posted' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  return done(status === 'posted' ? 'Marked as posted.' : status === 'cancelled' ? 'Cancelled.' : 'Back in the queue.')
}

export async function setMessageStatus(id: string, status: 'new' | 'replied' | 'closed'): Promise<LeadResult> {
  if (!UUID.test(id) || !['new', 'replied', 'closed'].includes(status)) return { ok: false, message: 'Unknown message.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient())
    .from('contact_messages')
    .update({ status, replied_at: status === 'replied' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  return done(status === 'replied' ? 'Marked as replied.' : status === 'closed' ? 'Closed.' : 'Marked as new.')
}

/** The single reminder the shopper agreed to, by email. */
export async function emailBasketReminder(id: string): Promise<LeadResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown reminder.' }
  if (await adminGuard()) return SIGN_IN
  if (!SMTP_CONFIGURED) return { ok: false, message: 'Email isn’t set up yet (SMTP_PASSWORD), so nothing was sent.' }
  const db = await createClient()
  const { data: lead, error } = await db.from('basket_reminder_leads').select('id, email, email_opt_in, basket, status, reminder_sent_at').eq('id', id).maybeSingle()
  if (error || !lead) return { ok: false, message: 'That reminder has gone (it may have been converted or expired).' }
  if (lead.status !== 'active' || !lead.email_opt_in || !lead.email) return { ok: false, message: 'They didn’t ask for an email reminder.' }
  if (lead.reminder_sent_at) return { ok: false, message: 'A reminder has already been sent. They asked for one, so we don’t send another.' }
  const lines = basketLines(lead.basket).map((l) => ({ title: `${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.title}`, option: l.option, href: `${SITE_URL}/products/${l.slug}` }))
  if (lines.length === 0) return { ok: false, message: 'Their basket was empty.' }
  const email = basketReminderEmail({ name: null, lines, shop: shopLine() })
  const sent = await sendEmail({ kind: 'basket_reminder', to: lead.email, ...email, toCustomer: true })
  if (sent !== 'sent') return { ok: false, message: 'The email didn’t send. See Status for email problems.' }
  await db.from('basket_reminder_leads').update({ reminder_sent_at: new Date().toISOString() }).eq('id', id)
  return done('Reminder sent.')
}

/** After a WhatsApp reminder, or when nothing more should be sent. */
export async function markBasketDone(id: string, how: 'whatsapp' | 'done'): Promise<LeadResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown reminder.' }
  if (await adminGuard()) return SIGN_IN
  const now = new Date().toISOString()
  const { error } = await (await createClient())
    .from('basket_reminder_leads')
    .update(how === 'whatsapp' ? { reminder_sent_at: now } : { status: 'done', done_at: now })
    .eq('id', id)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  return done(how === 'whatsapp' ? 'Noted as reminded on WhatsApp.' : 'Marked as done.')
}
