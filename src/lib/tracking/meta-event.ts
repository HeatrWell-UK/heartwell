// Meta Conversions API events, built from what we know. Pure, so the exact
// payloads are tested. Customer details are normalised the way Meta asks and
// SHA-256 hashed here; nothing personal leaves unhashed. Never included: order
// IDs or references, confirmation or tracking links, raw postcodes.

import { createHash } from 'node:crypto'
import { ukPhoneDigits } from '@/lib/checkout/phone'

export const META_API_VERSION = 'v25.0'

export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

const hashed = (value: string | null | undefined) => (value ? sha256(value) : undefined)

export const normalise = {
  email: (v: string) => v.trim().toLowerCase(),
  /** Letters only, lower case (Meta's rule for names). */
  name: (v: string) => v.trim().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''),
  /** Lower case, no spaces: "ls62ab". */
  postcode: (v: string) => v.replace(/\s+/g, '').toLowerCase(),
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  return { first: parts[0] ?? '', last: parts.length > 1 ? parts[parts.length - 1]! : '' }
}

/** _fbc from an ad click, when the Pixel hasn't made one (Meta's documented format). */
export const fbcFromClick = (fbclid: string, at: Date) => `fb.1.${at.getTime()}.${fbclid}`

export interface MetaUser {
  email?: string | null
  phone?: string | null
  name?: string | null
  postcode?: string | null
  /** Our first-party visitor ID (hashed): the match key Pixel and server share. */
  externalId?: string | null
  /** Only with the visitor's consent to marketing cookies. */
  ip?: string | null
  userAgent?: string | null
  fbp?: string | null
  fbc?: string | null
}

export function metaUserData(u: MetaUser): Record<string, string> {
  const name = u.name ? splitName(u.name) : null
  const phone = u.phone ? ukPhoneDigits(u.phone) : null
  const data: Record<string, string | undefined> = {
    em: hashed(u.email ? normalise.email(u.email) : null),
    ph: hashed(phone),
    fn: hashed(name?.first ? normalise.name(name.first) : null),
    ln: hashed(name?.last ? normalise.name(name.last) : null),
    zp: hashed(u.postcode ? normalise.postcode(u.postcode) : null),
    country: sha256('gb'),
    external_id: hashed(u.externalId?.toLowerCase()),
    // Meta wants these as they are.
    client_ip_address: u.ip || undefined,
    client_user_agent: u.userAgent || undefined,
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
  }
  return Object.fromEntries(Object.entries(data).filter((e): e is [string, string] => Boolean(e[1])))
}

export interface MetaContent {
  id: string
  quantity: number
  item_price: number
}

export interface MetaCustom {
  value?: number
  contentIds?: string[]
  contents?: MetaContent[]
  contentName?: string
  numItems?: number
}

export function metaCustomData(c: MetaCustom): Record<string, unknown> {
  const out: Record<string, unknown> = { currency: 'GBP' }
  if (c.value !== undefined) out.value = Math.round(c.value * 100) / 100
  const ids = c.contentIds ?? c.contents?.map((x) => x.id)
  if (ids?.length) {
    out.content_type = 'product'
    out.content_ids = ids
  }
  if (c.contents?.length) out.contents = c.contents
  if (c.contentName) out.content_name = c.contentName
  const items = c.numItems ?? c.contents?.reduce((n, x) => n + x.quantity, 0)
  if (items) out.num_items = items
  return out
}

/** Meta's action sources: a website order, or one taken on WhatsApp or the phone. */
export type ActionSource = 'website' | 'chat' | 'phone_call'
export const actionSourceFor = (orderSource: string): ActionSource => (orderSource === 'whatsapp' ? 'chat' : orderSource === 'phone' ? 'phone_call' : 'website')

export function metaEvent(e: { name: string; eventId: string; time: Date; actionSource: ActionSource; sourceUrl?: string | null; user: MetaUser; custom: MetaCustom }) {
  return {
    event_name: e.name,
    event_time: Math.floor(e.time.getTime() / 1000),
    event_id: e.eventId,
    action_source: e.actionSource,
    ...(e.actionSource === 'website' && e.sourceUrl ? { event_source_url: e.sourceUrl } : {}),
    user_data: metaUserData(e.user),
    custom_data: metaCustomData(e.custom),
  }
}

/** Meta refuses events older than 7 days. */
export const tooOldForMeta = (time: Date, now = new Date()) => now.getTime() - time.getTime() > 7 * 24 * 60 * 60 * 1000 - 60_000
