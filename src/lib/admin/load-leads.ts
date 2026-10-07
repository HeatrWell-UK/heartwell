import 'server-only'
import { createClient } from '@/lib/supabase/server'

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

export async function loadSamples(all: boolean) {
  const db = await createClient()
  let q = db
    .from('sample_requests')
    .select('id, created_at, customer_name, customer_email, customer_phone, postcode, shipping_address, status, posted_at, is_test, sample_request_items(material_code, material_name, material_collection)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!all) q = q.eq('status', 'pending')
  const { data, error } = await q
  throwIf('Samples', error)
  return data ?? []
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
  return data ?? []
}

export async function loadBaskets(all: boolean) {
  const db = await createClient()
  let q = db
    .from('basket_reminder_leads')
    .select('id, created_at, email, phone, email_opt_in, whatsapp_opt_in, basket, status, reminder_sent_at, done_at, expires_at, is_test')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!all) q = q.eq('status', 'active')
  const { data, error } = await q
  throwIf('Basket reminders', error)
  return data ?? []
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
