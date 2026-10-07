import 'server-only'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { EMAIL } from '@/config/email'
import { SITE_URL } from '@/config/site'
import { sendEmail } from '@/lib/email/send'
import { ukPhoneDigits } from '@/lib/checkout/phone'
import {
  contactCustomerEmail,
  contactShopEmail,
  newsletterConfirmEmail,
  reviewRequestEmail,
  sampleCustomerEmail,
  sampleShopEmail,
  type SampleFabric,
  type ShopLine,
} from '@/lib/email/lead-emails'
import type { ContactTopic } from './topics'

// The emails behind the lead forms, sent just after the response so a slow
// mail server never holds up the customer. Every send is logged (email_log).

export const shopLine = (): ShopLine => ({ email: CONTACT.email, phoneDisplay: CONTACT.phoneDisplay, whatsAppHref: whatsAppHref() })

/** A WhatsApp chat with the customer, for the shop's own emails and admin. */
export function whatsAppTo(phone: string | null, message: string): string | null {
  const digits = phone ? ukPhoneDigits(phone) : null
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null
}

export async function sendSampleEmails(r: { name: string; email: string; phone: string; address: string; postcode: string; fabrics: SampleFabric[]; isTest: boolean }) {
  const first = r.name.trim().split(/\s+/)[0]
  const shop = sampleShopEmail({
    ...r,
    whatsAppToCustomer: whatsAppTo(r.phone, `Hi ${first}, it's Heartwell about your fabric samples.`),
    adminUrl: `${SITE_URL}/admin/leads?tab=samples`,
  })
  const customer = sampleCustomerEmail({ name: r.name, phone: r.phone, fabrics: r.fabrics, shop: shopLine() })
  await Promise.all([
    sendEmail({ kind: 'samples_shop', to: EMAIL.shopTo, cc: EMAIL.shopCopy, ...shop, toCustomer: false }),
    sendEmail({ kind: 'samples_customer', to: r.email, ...customer, toCustomer: true }),
  ])
}

export async function sendContactEmails(m: { name: string; email: string; phone: string | null; topic: ContactTopic; orderReference: string | null; message: string; isTest: boolean }) {
  const first = m.name.trim().split(/\s+/)[0]
  const shop = contactShopEmail({ ...m, whatsAppToCustomer: whatsAppTo(m.phone, `Hi ${first}, it's Heartwell replying to your message.`), adminUrl: `${SITE_URL}/admin/leads?tab=messages` })
  const customer = contactCustomerEmail({ name: m.name, message: m.message, shop: shopLine() })
  await Promise.all([
    sendEmail({ kind: 'contact_shop', to: EMAIL.shopTo, cc: EMAIL.shopCopy, replyTo: m.email, ...shop, toCustomer: false }),
    sendEmail({ kind: 'contact_customer', to: m.email, ...customer, toCustomer: true }),
  ])
}

export async function sendNewsletterConfirm(email: string, token: string) {
  const message = newsletterConfirmEmail({ confirmUrl: `${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}` })
  await sendEmail({ kind: 'newsletter_confirm', to: email, ...message, toCustomer: true })
}

export interface ReviewRequestRow {
  order_id: string
  reference: string
  customer_name: string
  customer_email: string | null
  review_token: string
  is_test: boolean
  products: { title: string; image: string | null }[]
}

/** The "how's your sofa?" email with the order's private review link. */
export async function sendReviewRequest(o: ReviewRequestRow): Promise<'sent' | 'failed' | 'skipped'> {
  if (!o.customer_email) return 'skipped'
  const email = reviewRequestEmail({
    name: o.customer_name,
    reference: o.reference,
    reviewUrl: `${SITE_URL}/review/${o.review_token}`,
    products: o.products,
    shop: shopLine(),
  })
  return sendEmail({ kind: 'review_request', to: o.customer_email, ...email, orderId: o.order_id, toCustomer: true })
}
