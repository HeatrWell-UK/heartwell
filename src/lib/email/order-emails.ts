// The order emails, as pure functions from an order to { subject, html, text }.
// Plain, table-based HTML with inline styles, so they read well in Gmail,
// Outlook and phone mail apps, and a full plain-text version of each.

import { formatPrice } from '@/lib/format'
import { formatDeliveryDate } from '@/lib/delivery/window'
import { ukPhoneDigits } from '@/lib/checkout/phone'
import { button, C, escapeHtml, firstName, h, layout, p, type RenderedEmail } from './layout'

export { escapeHtml, type RenderedEmail } from './layout'

export interface OrderEmailItem {
  title: string
  option: string | null
  sku: string | null
  quantity: number
  unitPrice: number
}

export interface OrderEmailData {
  id: string
  reference: string
  isTest: boolean
  customerName: string
  customerEmail: string | null
  customerPhone: string
  shippingAddress: string
  postcode: string
  preferredDate: string | null
  notes: string | null
  hasMadeToOrder: boolean
  items: OrderEmailItem[]
  itemsSubtotal: number
  discountAmount: number
  promotionCode: string | null
  extras: { label: string; detail?: string; amount: number }[]
  deliveryTotal: number
  totalAmount: number
}

export interface ShopContact {
  email: string
  phoneDisplay: string | null
  whatsAppHref: string | null
}


function money(n: number) {
  return formatPrice(n)
}

function itemsTable(o: OrderEmailData, withSku: boolean): string {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};vertical-align:top">${i.quantity > 1 ? `${i.quantity} × ` : ''}<strong>${escapeHtml(i.title)}</strong>${
        i.option ? `<br><span style="color:${C.slate};font-size:14px">${escapeHtml(i.option)}</span>` : ''
      }${withSku && i.sku ? `<br><span style="color:${C.slate};font-size:13px">SKU ${escapeHtml(i.sku)}</span>` : ''}</td><td align="right" style="padding:8px 0 8px 12px;border-bottom:1px solid ${C.line};vertical-align:top;white-space:nowrap">${money(i.unitPrice * i.quantity)}</td></tr>`,
    )
    .join('')
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? 'font-weight:bold;font-size:17px' : ''}">${label}</td><td align="right" style="padding:4px 0 4px 12px;white-space:nowrap;${bold ? 'font-weight:bold;font-size:17px' : ''}">${value}</td></tr>`
  const extras = o.extras.map((e) => line(`${escapeHtml(e.label)}${e.detail ? ` <span style="color:${C.slate}">(${escapeHtml(e.detail)})</span>` : ''}`, money(e.amount))).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;font-size:15px">${rows}
${line('Items', money(o.itemsSubtotal))}
${o.discountAmount > 0 ? line(`Offer${o.promotionCode ? ` (${escapeHtml(o.promotionCode)})` : ''}`, `−${money(o.discountAmount)}`) : ''}
${line('Delivery to UK Mainland', 'Free')}
${extras}
${line('To pay today', '£0')}
${line('To pay on delivery', money(o.totalAmount), true)}</table>`
}

function itemsText(o: OrderEmailData, withSku: boolean): string {
  const lines = o.items.map((i) => `- ${i.quantity > 1 ? `${i.quantity} x ` : ''}${i.title}${i.option ? `, ${i.option}` : ''}${withSku && i.sku ? ` [${i.sku}]` : ''}: ${money(i.unitPrice * i.quantity)}`)
  const extras = o.extras.map((e) => `${e.label}${e.detail ? ` (${e.detail})` : ''}: ${money(e.amount)}`)
  return [
    ...lines,
    `Items: ${money(o.itemsSubtotal)}`,
    ...(o.discountAmount > 0 ? [`Offer${o.promotionCode ? ` (${o.promotionCode})` : ''}: -${money(o.discountAmount)}`] : []),
    'Delivery to UK Mainland: Free',
    ...extras,
    'To pay today: £0',
    `To pay on delivery: ${money(o.totalAmount)}`,
  ].join('\n')
}

/** To the customer, straight after ordering: please confirm. */
export function customerOrderEmail(o: OrderEmailData, opts: { confirmUrl: string; windowLabel: string | null; shop: ShopContact; now?: Date }): RenderedEmail {
  const subject = `Please confirm your Heartwell order ${o.reference}`
  const date = o.preferredDate ? formatDeliveryDate(o.preferredDate, opts.now) : null
  const contactHtml = [
    opts.shop.phoneDisplay ? `call ${escapeHtml(opts.shop.phoneDisplay)}` : null,
    opts.shop.whatsAppHref ? `<a href="${escapeHtml(opts.shop.whatsAppHref)}" style="color:${C.velvet}">message us on WhatsApp</a>` : null,
    `email <a href="mailto:${escapeHtml(opts.shop.email)}" style="color:${C.velvet}">${escapeHtml(opts.shop.email)}</a>`,
  ]
    .filter(Boolean)
    .join(', ')
  const body = [
    h(`Thank you, ${firstName(o.customerName)}`),
    p(`Your order <strong>${escapeHtml(o.reference)}</strong> is saved. <strong>Please tap the button to confirm it</strong>, so we can book your delivery.`),
    button(opts.confirmUrl, 'Confirm my order'),
    p(`Nothing is taken today. You pay the driver in cash or by bank transfer once it’s in your room.`, `color:${C.slate};font-size:15px`),
    itemsTable(o, false),
    p(`<strong>Delivering to</strong><br>${escapeHtml(o.shippingAddress)}<br>${escapeHtml(o.postcode)}`),
    date ? p(`<strong>Your preferred day:</strong> ${escapeHtml(date)}. We’ll ring to agree it.`) : opts.windowLabel ? p(`Most orders arrive ${escapeHtml(opts.windowLabel)}. We’ll ring to book the day with you.`) : '',
    o.hasMadeToOrder ? p(`Your order includes a made-to-order piece, built for you, so it can’t be returned for a change of mind. Faults are always covered.`, `font-size:15px;color:${C.slate}`) : '',
    p(`<strong>What happens next</strong><br>1. Tap “Confirm my order” above.<br>2. We ring or WhatsApp you to book your delivery day.<br>3. Your furniture arrives and you pay the driver.`),
    p(`Questions? ${contactHtml}. Your reference is ${escapeHtml(o.reference)}.`, `font-size:15px;color:${C.slate}`),
  ].join('')
  const text = [
    `Thank you, ${firstName(o.customerName)}.`,
    '',
    `Your order ${o.reference} is saved. Please confirm it so we can book your delivery:`,
    opts.confirmUrl,
    '',
    'Nothing is taken today. You pay the driver in cash or by bank transfer once it is in your room.',
    '',
    itemsText(o, false),
    '',
    `Delivering to: ${o.shippingAddress}, ${o.postcode}`,
    date ? `Your preferred day: ${date}. We will ring to agree it.` : opts.windowLabel ? `Most orders arrive ${opts.windowLabel}. We will ring to book the day with you.` : '',
    '',
    `Questions? Email ${opts.shop.email}${opts.shop.phoneDisplay ? ` or call ${opts.shop.phoneDisplay}` : ''}. Your reference is ${o.reference}.`,
  ]
    .filter((l) => l !== null)
    .join('\n')
  return { subject, html: layout(subject, body, `Tap to confirm order ${o.reference}. Nothing to pay today.`), text }
}

/** The WhatsApp message the shop sends to ask the customer to confirm. */
export function askToConfirmHref(o: Pick<OrderEmailData, 'customerName' | 'customerPhone' | 'reference'>, confirmUrl: string): string | null {
  const digits = ukPhoneDigits(o.customerPhone)
  if (!digits) return null
  const message = `Hi ${firstName(o.customerName)}, thank you for your Heartwell order ${o.reference}. Please tap here to confirm it, and we'll book your delivery: ${confirmUrl}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** A block the shop can copy into OrderFlow or a message. */
export function copyBlock(o: OrderEmailData): string {
  const date = o.preferredDate ? formatDeliveryDate(o.preferredDate) : 'none'
  return [
    `Order: ${o.reference}${o.isTest ? ' (TEST)' : ''}`,
    `Name: ${o.customerName}`,
    `Phone: ${o.customerPhone}`,
    `Email: ${o.customerEmail ?? 'not given'}`,
    `Address: ${o.shippingAddress}, ${o.postcode}`,
    'Items:',
    ...o.items.map((i) => `  ${i.quantity} x ${i.title}${i.option ? `, ${i.option}` : ''}${i.sku ? ` [${i.sku}]` : ''} @ ${money(i.unitPrice)}`),
    ...(o.extras.length ? ['Extras:', ...o.extras.map((e) => `  ${e.label}${e.detail ? ` (${e.detail})` : ''}: ${money(e.amount)}`)] : []),
    ...(o.discountAmount > 0 ? [`Offer: -${money(o.discountAmount)}${o.promotionCode ? ` (${o.promotionCode})` : ''}`] : []),
    `Preferred day: ${date}`,
    `Notes: ${o.notes ?? 'none'}`,
    `To collect on delivery: ${money(o.totalAmount)}`,
  ].join('\n')
}

/** To the shop, straight after an order is placed. */
export function shopOrderEmail(o: OrderEmailData, opts: { confirmUrl: string; adminUrl: string }): RenderedEmail {
  const test = o.isTest ? '[TEST] ' : ''
  const subject = `${test}New order ${o.reference}: ${money(o.totalAmount)}, waiting for the customer to confirm`
  const ask = askToConfirmHref(o, opts.confirmUrl)
  const block = copyBlock(o)
  const body = [
    h(`${test}New order ${o.reference}`),
    p(`<strong>${escapeHtml(o.customerName)}</strong><br>${escapeHtml(o.customerPhone)}${o.customerEmail ? `<br>${escapeHtml(o.customerEmail)}` : ''}<br>${escapeHtml(o.shippingAddress)}, ${escapeHtml(o.postcode)}`),
    p(`The customer has been emailed a confirm link${o.customerEmail ? '' : ' (no email given, so please message them)'}. The order counts once they confirm.`, `color:${C.slate};font-size:15px`),
    ask ? button(ask, 'Ask them to confirm on WhatsApp', '#1F8F4A') : '',
    itemsTable(o, true),
    o.preferredDate ? p(`<strong>Preferred day:</strong> ${escapeHtml(formatDeliveryDate(o.preferredDate))}`) : '',
    o.notes ? p(`<strong>Notes:</strong> ${escapeHtml(o.notes)}`) : '',
    p(`<strong>Copy for OrderFlow</strong>`),
    `<pre style="margin:0 0 18px;padding:12px;background:${C.stone};border-radius:8px;font-size:13px;line-height:1.5;white-space:pre-wrap">${escapeHtml(block)}</pre>`,
    p(`<a href="${escapeHtml(opts.adminUrl)}" style="color:${C.velvet}">Open the admin</a>`, 'font-size:15px'),
  ].join('')
  const text = [`${test}New order ${o.reference}`, '', ask ? `Ask them to confirm on WhatsApp: ${ask}` : '', '', block, '', `Admin: ${opts.adminUrl}`].join('\n')
  return { subject, html: layout(subject, body, `${o.customerName}, ${money(o.totalAmount)}`), text }
}

/** To the shop, when the customer taps Confirm. */
export function shopConfirmedEmail(o: OrderEmailData, opts: { adminUrl: string }): RenderedEmail {
  const test = o.isTest ? '[TEST] ' : ''
  const subject = `${test}${o.reference} confirmed by the customer: ${money(o.totalAmount)}`
  const body = [
    h(`${test}${o.reference} is confirmed`),
    p(`<strong>${escapeHtml(o.customerName)}</strong> confirmed their order. Ring them on <strong>${escapeHtml(o.customerPhone)}</strong> to book the delivery day.`),
    itemsTable(o, true),
    p(`<a href="${escapeHtml(opts.adminUrl)}" style="color:${C.velvet}">Open the admin</a>`, 'font-size:15px'),
  ].join('')
  const text = [`${test}${o.reference} confirmed by ${o.customerName}.`, `Ring ${o.customerPhone} to book the delivery day.`, '', itemsText(o, true), '', `Admin: ${opts.adminUrl}`].join('\n')
  return { subject, html: layout(subject, body, `${o.customerName} confirmed ${o.reference}`), text }
}

export type EmailedStatus = 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export const EMAILED_STATUSES: readonly string[] = ['confirmed', 'shipped', 'delivered', 'cancelled']

/** To the customer when staff move the order on. Processing is internal, so it isn't emailed. */
export function customerStatusEmail(
  o: OrderEmailData,
  status: EmailedStatus,
  opts: { trackUrl: string; shop: ShopContact; cancellationReason?: string | null },
): RenderedEmail {
  const contact = `${opts.shop.phoneDisplay ? `Ring ${opts.shop.phoneDisplay} or email` : 'Email'} ${opts.shop.email}`
  const content: Record<EmailedStatus, { subject: string; heading: string; lines: string[]; showItems: boolean; track: boolean }> = {
    confirmed: {
      subject: `Your Heartwell order ${o.reference} is confirmed`,
      heading: `Your order is confirmed`,
      lines: [`Thank you, ${firstName(o.customerName)}. We’ll ring you to book your delivery day.`, `Nothing to pay until it’s in your room: ${money(o.totalAmount)} to the driver, in cash or by bank transfer.`],
      showItems: true,
      track: true,
    },
    shipped: {
      subject: `Your Heartwell order ${o.reference} is on its way`,
      heading: `Your order is on its way`,
      lines: [`The driver will ring before arriving.`, `Please have ${money(o.totalAmount)} ready for the driver, in cash or by bank transfer, once it’s in your room.`],
      showItems: true,
      track: true,
    },
    delivered: {
      subject: `Your Heartwell order ${o.reference} has been delivered`,
      heading: `Thank you for choosing Heartwell`,
      lines: [
        `We hope you love it. If anything isn’t right, reply to this email and we’ll sort it out.`,
        `Your frame and springs have a 1-year guarantee. Keep this email as your record of the order.`,
      ],
      showItems: true,
      track: false,
    },
    cancelled: {
      subject: `Your Heartwell order ${o.reference} has been cancelled`,
      heading: `Your order has been cancelled`,
      lines: [
        `Order ${o.reference} has been cancelled${opts.cancellationReason ? `: ${opts.cancellationReason}` : ''}. Nothing has been or will be taken.`,
        `If that’s not what you expected, please get in touch. ${contact}.`,
      ],
      showItems: false,
      track: false,
    },
  }
  const c = content[status]
  const body = [
    h(c.heading),
    ...c.lines.map((l) => p(escapeHtml(l))),
    c.showItems ? itemsTable(o, false) : '',
    c.track ? button(opts.trackUrl, 'Track my order') : '',
    p(`Your reference is ${escapeHtml(o.reference)}. ${escapeHtml(contact)}.`, `font-size:15px;color:${C.slate}`),
  ].join('')
  const text = [c.heading, '', ...c.lines, '', c.showItems ? itemsText(o, false) : '', c.track ? `Track your order: ${opts.trackUrl}` : '', '', `Your reference is ${o.reference}. ${contact}.`].join('\n')
  return { subject: c.subject, html: layout(c.subject, body, c.lines[0] ?? c.heading), text }
}
