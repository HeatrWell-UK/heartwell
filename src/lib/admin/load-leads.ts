import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { noteReference } from '@/lib/whatsapp/handoff'

// Leads for the admin, read with the signed-in admin's session (row level
// security lets admins read them): sample requests, contact messages,
// WhatsApp enquiries, basket reminders and newsletter sign-ups.

export const LEAD_TABS = [
  { key: 'samples', label: 'Samples' },
  { key: 'messages', label: 'Messages' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'baskets', label: 'Baskets' },
  { key: 'newsletter', label: 'Newsletter' },
] as const
export type LeadTab = (typeof LEAD_TABS)[number]['key']
export const isLeadTab = (v: string | undefined): v is LeadTab => LEAD_TABS.some((t) => t.key === v)

const throwIf = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what}: ${error.message}`)
}

/** What's waiting in each tab: pending samples, new messages, enquiries this week, live reminders, confirmed subscribers. */
export async function leadCounts(): Promise<Record<LeadTab, number>> {
  const db = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const head = { count: 'exact' as const, head: true }
  const [samples, messages, whatsapp, baskets, newsletter] = await Promise.all([
    db.from('sample_requests').select('id', head).eq('status', 'pending'),
    db.from('contact_messages').select('id', head).eq('status', 'new'),
    db.from('whatsapp_enquiries').select('id', head).gte('created_at', weekAgo),
    db.from('basket_reminder_leads').select('id', head).eq('status', 'active'),
    db.from('newsletter_subscribers').select('id', head).eq('status', 'confirmed'),
  ])
  for (const [what, r] of Object.entries({ samples, messages, whatsapp, baskets, newsletter })) throwIf(what, r.error)
  return {
    samples: samples.count ?? 0,
    messages: messages.count ?? 0,
    whatsapp: whatsapp.count ?? 0,
    baskets: baskets.count ?? 0,
    newsletter: newsletter.count ?? 0,
  }
}

/** The website visit behind a lead: its HW-V reference, and the ad that brought it, if any. */
export interface LeadVisit {
  reference: string
  fromAd: boolean
  ad: string | null
}

/** Visits by arrival or session ID, so a basket reminder or sample request can start an order linked to its ad. */
async function visitsBy(db: Awaited<ReturnType<typeof createClient>>, column: 'arrival_id' | 'session_id', ids: (string | null)[]): Promise<Map<string, LeadVisit>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (wanted.length === 0) return new Map()
  const { data, error } = await db.from('attribution_sessions').select('arrival_id, session_id, reference, last_touch_medium, first_touch_medium, last_touch_content, fbclid').in(column, wanted)
  throwIf('Visits', error)
  return new Map(
    (data ?? []).map((s) => [
      column === 'arrival_id' ? s.arrival_id : s.session_id,
      { reference: s.reference, fromAd: s.last_touch_medium === 'paid_social' || s.first_touch_medium === 'paid_social' || Boolean(s.fbclid), ad: s.last_touch_content },
    ]),
  )
}

export async function loadSamples(all: boolean) {
  const db = await createClient()
  let q = db
    .from('sample_requests')
    .select('id, created_at, customer_name, customer_email, customer_phone, postcode, shipping_address, status, posted_at, is_test, session_id, sample_request_items(material_code, material_name, material_collection)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!all) q = q.eq('status', 'pending')
  const { data, error } = await q
  throwIf('Samples', error)
  const rows = data ?? []
  const visits = await visitsBy(db, 'session_id', rows.map((r) => r.session_id))
  return rows.map((r) => ({ ...r, visit: (r.session_id && visits.get(r.session_id)) || null }))
}

export async function loadMessages(all: boolean) {
  const db = await createClient()
  let q = db
    .from('contact_messages')
    .select('id, created_at, name, email, phone, topic, order_reference, message, status, replied_at, is_test')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!all) q = q.eq('status', 'new')
  const { data, error } = await q
  throwIf('Messages', error)
  return data ?? []
}

export async function loadEnquiries(search: string) {
  const db = await createClient()
  let q = db
    .from('whatsapp_enquiries')
    .select('id, reference, created_at, page_url, page_context, product_name, is_test, converted_order_id, utm_source, utm_campaign, order:orders!whatsapp_enquiries_converted_order_id_fkey(reference)')
    .order('created_at', { ascending: false })
    .limit(100)
  const ref = search.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (ref.length >= 4) q = q.ilike('reference', `%${ref}%`)
  const { data, error } = await q
  throwIf('WhatsApp enquiries', error)
  const rows = data ?? []
  const outcomes = await handoffOutcomes(db, rows.at(-1)?.created_at ?? null)
  return rows.map((r) => ({ ...r, outcome: outcomes.get(r.reference) ?? null }))
}

/**
 * Whether WhatsApp opened after each tap (noted since 10 November 2026, src/lib/whatsapp/help.ts): "opened" if it
 * opened at any try, "stuck" if it never did. Null before then, or when the visitor switched our statistics off.
 */
async function handoffOutcomes(db: Awaited<ReturnType<typeof createClient>>, since: string | null) {
  const outcomes = new Map<string, 'opened' | 'stuck'>()
  if (!since) return outcomes
  const { data, error } = await db
    .from('attribution_actions')
    .select('action_type, metadata')
    .in('action_type', ['whatsapp_opened', 'whatsapp_stuck'])
    .gte('created_at', since)
    .limit(2000)
  if (error) {
    console.error('WhatsApp hand-offs not loaded', error.message)
    return outcomes
  }
  for (const a of data ?? []) {
    const name = a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata) ? a.metadata.name : null
    const reference = noteReference(typeof name === 'string' ? name : null)
    if (!reference) continue
    if (a.action_type === 'whatsapp_opened') outcomes.set(reference, 'opened')
    else if (!outcomes.has(reference)) outcomes.set(reference, 'stuck')
  }
  return outcomes
}

export async function loadBaskets(all: boolean) {
  const db = await createClient()
  let q = db
    .from('basket_reminder_leads')
    .select('id, created_at, email, phone, email_opt_in, whatsapp_opt_in, basket, status, reminder_sent_at, done_at, expires_at, is_test, arrival_id')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!all) q = q.eq('status', 'active')
  const { data, error } = await q
  throwIf('Basket reminders', error)
  const rows = data ?? []
  const visits = await visitsBy(db, 'arrival_id', rows.map((r) => r.arrival_id))
  return rows.map((r) => ({ ...r, visit: visits.get(r.arrival_id) ?? null }))
}

export async function loadSubscribers() {
  const db = await createClient()
  const { data, error } = await db.from('newsletter_subscribers').select('id, email, status, subscribed_at, confirmed_at, unsubscribed_at').order('subscribed_at', { ascending: false }).limit(1000)
  throwIf('Newsletter', error)
  return data ?? []
}

/** A basket reminder's lines, as checkout saved them. */
export interface BasketLine {
  title: string
  option: string
  quantity: number
  slug: string
}

export function basketLines(raw: unknown): BasketLine[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((l) => {
    if (!l || typeof l !== 'object') return []
    const { title, option, quantity, slug } = l as Record<string, unknown>
    if (typeof title !== 'string' || typeof slug !== 'string') return []
    return [{ title, option: typeof option === 'string' ? option : '', quantity: typeof quantity === 'number' ? quantity : 1, slug }]
  })
}
