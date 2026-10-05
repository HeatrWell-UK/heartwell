// Who order emails come from and go to. Addresses are settings, so moving the
// shop's email to heartwellfurniture.co.uk later is a change of settings only.
// Server only: read where emails are sent.

import 'server-only'
import { SUPPORT_EMAIL } from './site'

const env = (name: string, fallback = '') => (process.env[name] ?? '').trim() || fallback

export const EMAIL = {
  /** Hostinger SMTP. The password lives only in the hosting dashboard. */
  smtpHost: env('SMTP_HOST', 'smtp.hostinger.com'),
  smtpPort: Number(env('SMTP_PORT', '465')),
  smtpUser: env('SMTP_USER', SUPPORT_EMAIL),
  smtpPassword: env('SMTP_PASSWORD'),
  /** Shown as the sender. An alias of the SMTP mailbox (orders@), or the mailbox itself. */
  from: env('MAIL_FROM', `Heartwell <${SUPPORT_EMAIL}>`),
  /** Replies go to the customer email address. */
  replyTo: SUPPORT_EMAIL,
  /** New orders and confirmations. */
  shopTo: env('SHOP_NOTIFY_TO', SUPPORT_EMAIL),
  /** A copy of every shop notification (optional). */
  shopCopy: env('SHOP_NOTIFY_COPY'),
  /**
   * Outside production, every email meant for a customer goes here instead
   * (the intended address is kept in the email log), so staging never
   * emails a real customer.
   */
  testInbox: env('EMAIL_TEST_INBOX', SUPPORT_EMAIL),
}

export const SMTP_CONFIGURED = EMAIL.smtpPassword !== ''
