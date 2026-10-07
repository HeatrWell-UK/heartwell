// Emails for everything that isn't an order: fabric samples, contact messages,
// the newsletter confirmation, the review request and the basket reminder.
// Pure functions to { subject, html, text }, in the order emails' style.

import { SAMPLES } from '@/config/samples'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/leads/topics'
import { button, C, escapeHtml, firstName, h, layout, link, p, pre, WHATSAPP_GREEN, type RenderedEmail } from './layout'

export interface ShopLine {
  email: string
  phoneDisplay: string | null
  whatsAppHref: string | null
}

function contactHtml(shop: ShopLine): string {
  return [
    shop.phoneDisplay ? `call ${escapeHtml(shop.phoneDisplay)}` : null,
    shop.whatsAppHref ? link(shop.whatsAppHref, 'message us on WhatsApp') : null,
    `email ${link(`mailto:${shop.email}`, shop.email)}`,
  ]
    .filter(Boolean)
    .join(', ')
}

const contactText = (shop: ShopLine) => `Email ${shop.email}${shop.phoneDisplay ? ` or call ${shop.phoneDisplay}` : ''}.`

const test = (isTest: boolean) => (isTest ? '[TEST] ' : '')

// Samples ------------------------------------------------------------------------

export interface SampleFabric {
  code: string
  name: string
  collection: string
}

const fabricLine = (f: SampleFabric) => `${f.collection} ${f.name} (${f.code})`

export function sampleCustomerEmail(o: { name: string; phone: string; fabrics: SampleFabric[]; shop: ShopLine }): RenderedEmail {
  const subject = 'Your Heartwell fabric samples'
  const body = [
    h(`Thank you, ${firstName(o.name)}`),
    p(`We’ve got your request for ${o.fabrics.length} fabric ${o.fabrics.length === 1 ? 'sample' : 'samples'}:`),
    `<ul style="margin:0 0 14px;padding-left:20px">${o.fabrics.map((f) => `<li>${escapeHtml(fabricLine(f))}</li>`).join('')}</ul>`,
    p(`<strong>What happens next</strong><br>We’ll ring or WhatsApp you on ${escapeHtml(o.phone)} to arrange the ${SAMPLES.fee} for the set, then post your samples. There’s nothing to pay online.`),
    p(`When you order your sofa, we take the ${SAMPLES.fee} off the price.`),
    p(`Questions? ${contactHtml(o.shop)}.`, `font-size:15px;color:${C.slate}`),
  ].join('')
  const text = [
    `Thank you, ${firstName(o.name)}.`,
    '',
    `We've got your request for these fabric samples:`,
    ...o.fabrics.map((f) => `- ${fabricLine(f)}`),
    '',
    `We'll ring or WhatsApp you on ${o.phone} to arrange the ${SAMPLES.fee} for the set, then post your samples. There's nothing to pay online.`,
    `When you order your sofa, we take the ${SAMPLES.fee} off the price.`,
    '',
    `Questions? ${contactText(o.shop)}`,
  ].join('\n')
  return { subject, html: layout(subject, body, `We'll be in touch to arrange your ${o.fabrics.length} samples.`), text }
}

export function sampleShopEmail(o: {
  name: string
  email: string
  phone: string
  address: string
  postcode: string
  fabrics: SampleFabric[]
  isTest: boolean
  whatsAppToCustomer: string | null
  adminUrl: string
}): RenderedEmail {
  const subject = `${test(o.isTest)}Sample request: ${o.fabrics.length} from ${o.name}`
  const block = [`${o.name}`, o.phone, o.email, `${o.address}, ${o.postcode}`, '', ...o.fabrics.map((f) => fabricLine(f))].join('\n')
  const body = [
    h(`${test(o.isTest)}Sample request from ${o.name}`),
    p(`Ring or WhatsApp them to take the ${SAMPLES.fee}, then post the samples and mark them posted in the admin.`),
    o.whatsAppToCustomer ? button(o.whatsAppToCustomer, 'Message them on WhatsApp', WHATSAPP_GREEN) : '',
    pre(block),
    p(link(o.adminUrl, 'Open the samples queue'), 'font-size:15px'),
  ].join('')
  const text = [`${test(o.isTest)}Sample request from ${o.name}`, '', block, '', o.whatsAppToCustomer ? `WhatsApp: ${o.whatsAppToCustomer}` : '', `Admin: ${o.adminUrl}`].join('\n')
  return { subject, html: layout(subject, body, `${o.name}, ${o.postcode}`), text }
}

// Contact form ---------------------------------------------------------------------


export function contactShopEmail(o: {
  name: string
  email: string
  phone: string | null
  topic: ContactTopic
  orderReference: string | null
  message: string
  isTest: boolean
  whatsAppToCustomer: string | null
  adminUrl: string
}): RenderedEmail {
  const subject = `${test(o.isTest)}Message from ${o.name}: ${CONTACT_TOPICS[o.topic]}${o.orderReference ? ` (${o.orderReference})` : ''}`
  const details = [`${o.name} <${o.email}>`, o.phone, o.orderReference ? `Order ${o.orderReference}` : null].filter(Boolean).join('\n')
  const body = [
    h(`${test(o.isTest)}${CONTACT_TOPICS[o.topic]}`),
    pre(details),
    `<div style="margin:0 0 18px;padding:12px 14px;border-left:3px solid ${C.velvet};white-space:pre-wrap">${escapeHtml(o.message)}</div>`,
    p(`Reply to this email to answer ${escapeHtml(firstName(o.name))} directly.`, `color:${C.slate};font-size:15px`),
    o.whatsAppToCustomer ? button(o.whatsAppToCustomer, 'Reply on WhatsApp', WHATSAPP_GREEN) : '',
    p(link(o.adminUrl, 'Open messages in the admin'), 'font-size:15px'),
  ].join('')
  const text = [subject, '', details, '', o.message, '', `Admin: ${o.adminUrl}`].join('\n')
  return { subject, html: layout(subject, body, o.message.slice(0, 120)), text }
}

export function contactCustomerEmail(o: { name: string; message: string; shop: ShopLine }): RenderedEmail {
  const subject = 'We’ve got your message'
  const body = [
    h(`Thanks, ${firstName(o.name)}`),
    p(`We’ve got your message and will reply as soon as we can.`),
    p(`If it’s urgent, ${contactHtml(o.shop)}.`),
    p(`<strong>Your message</strong>`),
    `<div style="margin:0 0 18px;padding:12px 14px;background:${C.stone};border-radius:8px;white-space:pre-wrap;font-size:15px">${escapeHtml(o.message)}</div>`,
  ].join('')
  const text = [`Thanks, ${firstName(o.name)}.`, '', 'We have got your message and will reply as soon as we can.', '', contactText(o.shop), '', 'Your message:', o.message].join('\n')
  return { subject, html: layout(subject, body, 'We’ll reply as soon as we can.'), text }
}

// Newsletter --------------------------------------------------------------------------

export function newsletterConfirmEmail(o: { confirmUrl: string }): RenderedEmail {
  const subject = 'Please confirm your Heartwell emails'
  const body = [
    h('One tap to confirm'),
    p('Please confirm you’d like emails from Heartwell about new sofas, fabrics and offers. You can stop them any time with one tap.'),
    button(o.confirmUrl, 'Yes, send me emails'),
    p('If you didn’t ask for this, ignore this email and you won’t hear from us again.', `color:${C.slate};font-size:15px`),
  ].join('')
  const text = ['Please confirm you would like emails from Heartwell about new sofas, fabrics and offers:', o.confirmUrl, '', 'If you did not ask for this, ignore this email.'].join('\n')
  return { subject, html: layout(subject, body, 'Tap to confirm your Heartwell emails.'), text }
}

// Reviews ------------------------------------------------------------------------------

export function reviewRequestEmail(o: { name: string; reference: string; reviewUrl: string; products: { title: string }[]; shop: ShopLine }): RenderedEmail {
  const what = o.products.length === 1 ? `your ${o.products[0]!.title}` : 'your new furniture'
  const subject = `How are you getting on with ${what}?`
  const body = [
    h(`How’s it going, ${firstName(o.name)}?`),
    p(`It’s been a few days since ${escapeHtml(what)} arrived. Would you tell other people what you think? It takes a minute, and every review is from a real Heartwell customer.`),
    button(o.reviewUrl, o.products.length === 1 ? 'Write a review' : 'Review your order'),
    p(`Something not right? Please tell us first and we’ll put it right: ${contactHtml(o.shop)}. Your order is ${escapeHtml(o.reference)}.`, `font-size:15px;color:${C.slate}`),
  ].join('')
  const text = [
    `How's it going, ${firstName(o.name)}?`,
    '',
    `It's been a few days since ${what} arrived. Would you tell other people what you think? It takes a minute:`,
    o.reviewUrl,
    '',
    `Something not right? Please tell us first and we'll put it right. ${contactText(o.shop)} Your order is ${o.reference}.`,
  ].join('\n')
  return { subject, html: layout(subject, body, 'A minute to tell others what you think.'), text }
}

// Basket reminder ------------------------------------------------------------------------

export function basketReminderEmail(o: { name: string | null; lines: { title: string; option: string; href: string }[]; shop: ShopLine }): RenderedEmail {
  const subject = 'Your Heartwell basket'
  const greeting = o.name ? `Hi ${firstName(o.name)}` : 'Hello'
  const body = [
    h(`${greeting}, you left these in your basket`),
    `<ul style="margin:0 0 14px;padding-left:20px">${o.lines.map((l) => `<li style="margin-bottom:6px">${link(l.href, l.title)}${l.option ? `<br><span style="color:${C.slate};font-size:14px">${escapeHtml(l.option)}</span>` : ''}</li>`).join('')}</ul>`,
    p('Delivery is free to UK Mainland and you pay nothing until it’s in your room.'),
    p(`Any questions about sizes, fabrics or delivery? ${contactHtml(o.shop)}.`, `font-size:15px;color:${C.slate}`),
    p('You asked us to remind you once. We won’t email about this basket again.', `font-size:13px;color:${C.slate}`),
  ].join('')
  const text = [
    `${greeting}, you left these in your basket:`,
    ...o.lines.map((l) => `- ${l.title}${l.option ? `, ${l.option}` : ''}: ${l.href}`),
    '',
    'Delivery is free to UK Mainland and you pay nothing until it is in your room.',
    contactText(o.shop),
  ].join('\n')
  return { subject, html: layout(subject, body, 'Free delivery, and nothing to pay until it arrives.'), text }
}
