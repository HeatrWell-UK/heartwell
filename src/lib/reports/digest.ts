// The Monday digest: last week at a glance, for the shop. Built from
// private.digest_data (real orders only, Monday to Sunday UK time). Pure, so
// the figures and wording are tested.

import { envLabel } from '@/config/env'
import { formatPrice, ukDate } from '@/lib/format'
import { button, C, escapeHtml, h, layout, p, type RenderedEmail } from '@/lib/email/layout'

export interface DigestData {
  from: string
  to: string
  orders: {
    placed: number
    confirmed: number
    confirmed_value: number
    delivered: number
    delivered_value: number
    cancelled: number
    prev_confirmed: number
    prev_confirmed_value: number
    awaiting_confirmation: number
  }
  channels: { channel: string; campaign: string | null; ad: string | null; orders: number; value: number }[]
  funnel: { visits: number; ad_visits: number; whatsapp: number; samples: number; messages: number; reminders: number; newsletter: number }
  landing: { page: string; visits: number; orders: number }[]
}

const n = (v: unknown) => Number(v ?? 0)

/** "Monday 5 October to Sunday 11 October 2026" (the week ends the day before `to`). */
export function weekLabel(d: Pick<DigestData, 'from' | 'to'>): string {
  const from = new Date(d.from)
  const last = new Date(new Date(d.to).getTime() - 12 * 3_600_000)
  return `${ukDate(from)} to ${ukDate(last, { year: true })}`
}

/** "up from 2", "down from £1,200", "the same as the week before". */
export function comparison(now: number, before: number, money = false): string {
  const show = (v: number) => (money ? formatPrice(v) : String(v))
  if (now === before) return 'the same as the week before'
  return `${now > before ? 'up' : 'down'} from ${show(before)} the week before`
}

const row = (cells: string[], head = false) =>
  `<tr>${cells.map((c, i) => `<${head ? 'th' : 'td'} style="padding:6px 8px 6px 0;border-bottom:1px solid ${C.line};text-align:${i === 0 ? 'left' : 'right'};font-size:14px;${head ? `color:${C.slate};font-weight:normal` : ''}">${c}</${head ? 'th' : 'td'}>`).join('')}</tr>`
const table = (head: string[], rows: string[][]) =>
  rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse">${row(head, true)}${rows.map((r) => row(r)).join('')}</table>` : ''

export function digestEmail(raw: DigestData, opts: { adminUrl: string; appEnv: string }): RenderedEmail {
  const o = raw.orders
  const confirmed = n(o.confirmed)
  const value = n(o.confirmed_value)
  const week = weekLabel(raw)
  const where = opts.appEnv === 'production' ? '' : `[${envLabel(opts.appEnv)}] `
  const subject = `${where}Last week at Heartwell: ${confirmed} ${confirmed === 1 ? 'order' : 'orders'} confirmed, ${formatPrice(value)}`
  const f = raw.funnel

  const sources = raw.channels.map((c) => [
    escapeHtml([c.channel, c.campaign, c.ad].filter(Boolean).join(' · ')),
    String(n(c.orders)),
    formatPrice(n(c.value)),
  ])
  const landing = raw.landing.map((l) => [escapeHtml(l.page), String(n(l.visits)), String(n(l.orders))])

  const body = [
    h('Last week at Heartwell'),
    p(escapeHtml(week), `color:${C.slate}`),
    p(
      `<strong>${confirmed} ${confirmed === 1 ? 'order' : 'orders'} confirmed, ${formatPrice(value)}</strong><br>` +
        `${escapeHtml(comparison(confirmed, n(o.prev_confirmed)))}; value ${escapeHtml(comparison(value, n(o.prev_confirmed_value), true))}.`,
    ),
    table(
      ['Orders', ''],
      [
        ['Placed', String(n(o.placed))],
        ['Confirmed by the customer', String(confirmed)],
        ['Delivered', `${n(o.delivered)} (${formatPrice(n(o.delivered_value))})`],
        ['Cancelled', String(n(o.cancelled))],
        ['Waiting for the customer to confirm now', String(n(o.awaiting_confirmation))],
      ],
    ),
    sources.length ? h2('Where confirmed orders came from') + table(['Source · campaign · ad', 'Orders', 'Value'], sources) : '',
    h2('Visits and enquiries'),
    table(
      ['', ''],
      [
        ['Visits', String(n(f.visits))],
        ['…from Meta ads', String(n(f.ad_visits))],
        ['WhatsApp enquiries', String(n(f.whatsapp))],
        ['Sample requests', String(n(f.samples))],
        ['Contact messages', String(n(f.messages))],
        ['Basket reminders asked for', String(n(f.reminders))],
        ['New newsletter subscribers', String(n(f.newsletter))],
      ],
    ),
    landing.length ? h2('Top landing pages') + table(['Page', 'Visits', 'Orders'], landing) : '',
    button(opts.adminUrl, 'Open the admin'),
    p('Real orders only: test orders, staff devices and QA visits are left out.', `color:${C.slate};font-size:14px`),
  ].join('')

  const text = [
    `Last week at Heartwell (${week})`,
    '',
    `${confirmed} confirmed, ${formatPrice(value)}: ${comparison(confirmed, n(o.prev_confirmed))}.`,
    `Placed ${n(o.placed)}, delivered ${n(o.delivered)}, cancelled ${n(o.cancelled)}, waiting to confirm ${n(o.awaiting_confirmation)}.`,
    '',
    ...(raw.channels.length ? ['Where confirmed orders came from:', ...raw.channels.map((c) => `- ${[c.channel, c.campaign, c.ad].filter(Boolean).join(' / ')}: ${n(c.orders)}, ${formatPrice(n(c.value))}`), ''] : []),
    `Visits ${n(f.visits)} (from Meta ads ${n(f.ad_visits)}), WhatsApp ${n(f.whatsapp)}, samples ${n(f.samples)}, messages ${n(f.messages)}, reminders ${n(f.reminders)}, newsletter ${n(f.newsletter)}.`,
    '',
    ...(raw.landing.length ? ['Top landing pages:', ...raw.landing.map((l) => `- ${l.page}: ${n(l.visits)} visits, ${n(l.orders)} orders`), ''] : []),
    `Admin: ${opts.adminUrl}`,
  ].join('\n')

  return { subject, html: layout(subject, body, `${confirmed} confirmed, ${formatPrice(value)}`), text }
}

function h2(text: string): string {
  return `<h2 style="margin:22px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3;color:${C.ink}">${escapeHtml(text)}</h2>`
}
