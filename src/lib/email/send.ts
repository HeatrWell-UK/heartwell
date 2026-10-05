import 'server-only'
import { createTransport, type Transporter } from 'nodemailer'
import { APP_ENV } from '@/config/env'
import { EMAIL, SMTP_CONFIGURED } from '@/config/email'
import { createAdminClient } from '@/lib/supabase/admin'

export interface OutgoingEmail {
  /** What kind of email this is, for the log: order_customer, order_shop, order_confirmed_shop… */
  kind: string
  to: string
  /** Copies (shop emails only). */
  cc?: string
  subject: string
  html: string
  text: string
  orderId?: string
  /** True for emails written to a customer: redirected to the test inbox outside production. */
  toCustomer: boolean
}

let transporter: Transporter | null = null

function transport(): Transporter {
  transporter ??= createTransport({
    host: EMAIL.smtpHost,
    port: EMAIL.smtpPort,
    secure: EMAIL.smtpPort === 465,
    auth: { user: EMAIL.smtpUser, pass: EMAIL.smtpPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  return transporter
}

async function log(entry: {
  kind: string
  orderId?: string
  recipient: string
  intended?: string
  subject: string
  status: 'sent' | 'failed' | 'skipped'
  messageId?: string
  error?: string
}) {
  try {
    await createAdminClient()
      .from('email_log')
      .insert({
        kind: entry.kind,
        order_id: entry.orderId ?? null,
        recipient: entry.recipient,
        intended_recipient: entry.intended ?? null,
        subject: entry.subject.slice(0, 300),
        status: entry.status,
        provider_message_id: entry.messageId ?? null,
        error: entry.error?.slice(0, 1000) ?? null,
      })
  } catch (error) {
    // The log itself failing must not hide the send result: say so in the server log.
    console.error('email_log insert failed', error)
  }
}

/**
 * Sends one email and records the outcome in email_log. Never throws: an
 * email problem must never undo an order. Outside production, customer
 * emails go to the test inbox instead (the log keeps the intended address).
 */
export async function sendEmail(email: OutgoingEmail): Promise<'sent' | 'failed' | 'skipped'> {
  const redirect = email.toCustomer && APP_ENV !== 'production'
  const to = redirect ? EMAIL.testInbox : email.to
  const subject = redirect ? `[Test] ${email.subject}` : email.subject
  const html = redirect
    ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:#5E4F52;background:#F4E7C6;padding:8px 12px">Test site: this email was meant for ${escapeForNote(email.to)}.</p>${email.html}`
    : email.html

  if (!SMTP_CONFIGURED) {
    await log({ kind: email.kind, orderId: email.orderId, recipient: to, intended: redirect ? email.to : undefined, subject, status: 'skipped', error: 'SMTP is not set up (SMTP_PASSWORD missing)' })
    return 'skipped'
  }
  try {
    const info = await transport().sendMail({
      from: EMAIL.from,
      replyTo: EMAIL.replyTo,
      to,
      cc: email.cc || undefined,
      subject,
      html,
      text: email.text,
    })
    await log({ kind: email.kind, orderId: email.orderId, recipient: to, intended: redirect ? email.to : undefined, subject, status: 'sent', messageId: info.messageId })
    return 'sent'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`email ${email.kind} failed`, message)
    await log({ kind: email.kind, orderId: email.orderId, recipient: to, intended: redirect ? email.to : undefined, subject, status: 'failed', error: message })
    return 'failed'
  }
}

function escapeForNote(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
