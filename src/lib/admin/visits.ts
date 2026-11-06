// The visit finder's words: what find_visits returns, said the way staff read
// it ("Viewed Rio 3+2 Seater", "From Meta ad R3"). Pure, so it's tested.

import { formatPrice } from '@/lib/format'

export interface VisitStepRow {
  at: string
  kind: string
  path?: string | null
  title?: string | null
  value?: number | string | null
  ref?: string | null
  source?: string | null
}

export interface OtherVisit {
  reference: string
  started_at: string
  source: string | null
  medium: string | null
  content: string | null
}

export interface FoundVisit {
  reference: string
  started_at: string
  last_at: string
  device: string | null
  landing_page: string | null
  referrer: string | null
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  from_ad: boolean
  /** Meta's click or browser IDs were saved (the visitor accepted marketing cookies). */
  meta_ids: boolean
  is_test: boolean
  matched: string[]
  other_visits: OtherVisit[]
  steps: VisitStepRow[]
}

export type TimeZoneKey = 'uk' | 'pk'

const zoneOf: Record<TimeZoneKey, string> = { uk: 'Europe/London', pk: 'Asia/Karachi' }

/** "14:02" in UK or Pakistan time. */
export function clock(iso: string, zone: TimeZoneKey): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zoneOf[zone], hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

/** "6 Nov 14:02" in UK or Pakistan time. */
export function dayAndClock(iso: string, zone: TimeZoneKey): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zoneOf[zone], day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace(',', '')
}

/** Today's date and the time now ("2026-11-07", "14:05") as the UK or Pakistan team sees it. */
export function nowIn(zone: TimeZoneKey, now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zoneOf[zone], year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}` }
}

/** The moment a date and time mean in UK or Pakistan time (null if either is malformed). */
export function instantOf(date: string, time: string, zone: TimeZoneKey): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^(\d{2}):(\d{2})$/.exec(time)
  if (!d || !t) return null
  const [year, month, day, hour, minute] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])]
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  // Correct by the zone's offset, twice so the hour the clocks change comes out right.
  let guess = wall
  for (let i = 0; i < 2; i++) {
    const shown = nowIn(zone, new Date(guess))
    const [y, m, day] = shown.date.split('-').map(Number)
    const [h, min] = shown.time.split(':').map(Number)
    guess += wall - Date.UTC(y!, m! - 1, day!, h!, min!)
  }
  return new Date(guess)
}

/** How long a visit lasted, in words. */
export function duration(startIso: string, endIso: string): string {
  const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000))
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const PAGES: Record<string, string> = {
  '/': 'the home page',
  '/sofas': 'all sofas',
  '/ranges': 'all ranges',
  '/basket': 'the basket',
  '/checkout': 'the checkout page',
  '/fabrics': 'the fabrics page',
  '/fabric-samples': 'the fabric samples page',
  '/search': 'search',
  '/saved': 'saved sofas',
  '/contact': 'the contact page',
  '/visit-us': 'the visit us page',
  '/faq': 'the questions page',
  '/delivery-and-returns': 'delivery and returns',
  '/about': 'the about page',
  '/guides': 'the guides',
  '/will-it-fit': 'will it fit?',
  '/care-guide': 'the care guide',
}

const words = (slug: string) => slug.replace(/-/g, ' ')

/** A page, as staff would say it: a product's name, "Rio range", "the basket". */
export function pageLabel(path: string | null | undefined, title?: string | null): string {
  if (!path) return 'a page'
  const clean = path.replace(/\/+$/, '') || '/'
  if (PAGES[clean]) return PAGES[clean]
  const [, section, slug] = clean.split('/')
  if (section === 'products' && slug) return title || words(slug)
  if (section === 'ranges' && slug) return `${title || words(slug)} range`
  if (section === 'sofas' && slug) return title || words(slug)
  if (section === 'guides' && slug) return `the guide “${words(slug)}”`
  return clean
}

const money = (v: number | string | null | undefined) => {
  const n = Number(v)
  return v !== null && v !== undefined && v !== '' && Number.isFinite(n) && n > 0 ? formatPrice(n) : null
}

const ORDER_STATUS: Record<string, string> = {
  pending_cod: 'waiting for the customer to confirm',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'on its way',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

/** One step of a visit, in words. */
export function stepLabel(step: VisitStepRow): string {
  switch (step.kind) {
    case 'page_view':
      return `Viewed ${pageLabel(step.path, step.title)}`
    case 'add_to_basket': {
      const price = money(step.value)
      return `Added ${step.title || 'a piece'} to the basket${price ? ` (${price})` : ''}`
    }
    case 'checkout_start': {
      const price = money(step.value)
      return `Started checkout${price ? ` (${price})` : ''}`
    }
    case 'phone_click':
      return 'Tapped “Call us”'
    case 'whatsapp':
      return `Tapped WhatsApp${step.title ? ` about ${step.title}` : ''}`
    case 'basket_reminder':
      return `Asked for a basket reminder by ${step.title || 'email'}`
    case 'samples': {
      const n = Number(step.value) || 0
      return n ? `Asked for ${n} fabric sample${n === 1 ? '' : 's'}` : 'Asked for fabric samples'
    }
    case 'contact_message':
      return 'Sent a message from the contact page'
    case 'order':
      return step.source === 'website'
        ? `Placed website order ${step.ref ?? ''} (${ORDER_STATUS[step.title ?? ''] ?? step.title ?? ''})`.replace(/\s+\(\)$/, '')
        : `Already linked to ${step.source === 'phone' ? 'phone' : 'WhatsApp'} order ${step.ref ?? ''}`.trim()
    default:
      return step.kind.replace(/_/g, ' ')
  }
}

/** Steps that tie a visit to a phone call or a chat. */
export const isContactStep = (step: VisitStepRow) => step.kind === 'phone_click' || step.kind === 'whatsapp'

/** Where a visit came from, in words. */
export function sourceLabel(v: Pick<FoundVisit, 'from_ad' | 'source' | 'medium' | 'campaign' | 'content' | 'referrer'>): string {
  if (v.from_ad) {
    const ad = v.content ? `Meta ad ${v.content}` : 'a Meta ad'
    return `From ${ad}${v.campaign ? ` (campaign ${v.campaign})` : ''}`
  }
  if (v.medium === 'social' || v.medium === 'organic_social') return `From a ${v.source === 'instagram' ? 'Instagram' : 'Facebook'} post${v.campaign ? ` (${v.campaign})` : ''}`
  if (v.source || v.campaign) return `From ${[v.source, v.medium, v.campaign].filter(Boolean).join(' · ')}`
  if (v.referrer) return `From ${v.referrer.replace(/^www\./, '')}`
  return 'Came straight to the site'
}

const MATCHED: Record<string, string> = {
  basket_reminder: 'a basket reminder',
  samples: 'a fabric sample request',
  order: 'a website order',
  contact_message: 'a contact message',
}

/** "Same phone or email as a basket reminder and a website order". */
export function matchedLabel(matched: string[]): string | null {
  const things = matched.map((m) => MATCHED[m]).filter(Boolean)
  if (!things.length) return null
  const list = things.length > 1 ? `${things.slice(0, -1).join(', ')} and ${things.at(-1)}` : things[0]
  return `Same phone or email as ${list}`
}
