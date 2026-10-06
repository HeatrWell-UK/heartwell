import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { fabricLabel } from '@/lib/product/helpers'
import { unitPrice } from '@/lib/catalogue/pricing'
import { NEEDS_ATTENTION, searchFilter, type FilterKey } from './orders'

// Orders for the admin, read with the signed-in admin's session: row level
// security lets admins read orders; every change goes through a database
// function that checks is_admin() again.

export const PER_PAGE = 20

const LIST_FIELDS = `id, reference, status, source, is_test, created_at, customer_name, customer_phone, postcode,
  total_amount, has_made_to_order, preferred_delivery_date, whatsapp_reference,
  order_items(quantity)`

export async function listOrders({ filter, q, page }: { filter: FilterKey; q: string; page: number }) {
  const supabase = await createClient()
  let query = supabase.from('orders').select(LIST_FIELDS, { count: 'exact' })
  if (filter === 'attention') query = query.in('status', NEEDS_ATTENTION).eq('is_test', false)
  else if (filter === 'test') query = query.eq('is_test', true)
  else if (filter !== 'all') query = query.eq('status', filter)
  const search = searchFilter(q)
  if (search) query = query.or(search)
  const from = (page - 1) * PER_PAGE
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + PER_PAGE - 1)
  if (error) throw new Error(`Orders: ${error.message}`)
  return { orders: data, total: count ?? 0 }
}

/** The workload: counts per status (real orders only) and what's still to collect. */
export async function orderOverview() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('orders').select('status, is_test, total_amount, preferred_delivery_date').limit(10000)
  if (error) throw new Error(`Orders: ${error.message}`)
  const real = data.filter((o) => !o.is_test)
  const counts: Record<string, number> = {}
  for (const o of real) counts[o.status] = (counts[o.status] ?? 0) + 1
  const open = real.filter((o) => ['pending_cod', 'confirmed', 'processing', 'shipped'].includes(o.status))
  return {
    counts,
    all: real.length,
    test: data.length - real.length,
    attention: NEEDS_ATTENTION.reduce((n, s) => n + (counts[s] ?? 0), 0),
    openValue: open.reduce((n, o) => n + Number(o.total_amount), 0),
    withPreferredDate: open.filter((o) => o.preferred_delivery_date).length,
  }
}

export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      `*, order_items(id, position, variant_id, material_id, quantity, unit_price, title, custom_title, sku, colour_name, material_code, material_name, material_collection, customisation),
       order_events(id, at, kind, from_status, to_status, note, actor)`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Order ${id}: ${error.message}`)
  if (!data) return null
  return {
    ...data,
    order_items: [...data.order_items].sort((a, b) => a.position - b.position),
    order_events: [...data.order_events].sort((a, b) => a.at.localeCompare(b.at)),
  }
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getOrder>>>

export const lineOption = (i: Pick<AdminOrder['order_items'][number], 'material_name' | 'material_collection' | 'material_code' | 'colour_name'>) =>
  i.material_name ? fabricLabel(i.material_name, i.material_collection ?? '', i.material_code ?? '') : i.colour_name

export interface PickerVariant {
  id: string
  label: string
  price: number
  madeToOrder: boolean
}
export interface PickerFabric {
  id: string
  label: string
}

/** Everything live, for taking an order by WhatsApp or phone and for editing lines. */
export async function orderPickers(): Promise<{ variants: PickerVariant[]; fabrics: PickerFabric[] }> {
  const supabase = await createClient()
  const [variants, fabrics] = await Promise.all([
    supabase.from('product_variants').select('id, sku, colour_name, price_adjustment, is_active, product:products!inner(title, base_price, made_to_order, is_active)').eq('is_active', true),
    supabase.from('materials').select('id, code, name, is_active, collection:material_collections(name, surcharge)').eq('is_active', true).order('sort'),
  ])
  if (variants.error) throw new Error(`Variants: ${variants.error.message}`)
  if (fabrics.error) throw new Error(`Fabrics: ${fabrics.error.message}`)
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
  return {
    variants: variants.data
      .flatMap((v) => {
        const p = one(v.product)
        if (!p?.is_active) return []
        return [{ id: v.id, label: `${p.title} · ${v.colour_name ?? 'as shown'} · ${v.sku}`, price: unitPrice(p.base_price, v.price_adjustment), madeToOrder: p.made_to_order }]
      })
      .sort((a, b) => a.label.localeCompare(b.label)),
    fabrics: fabrics.data.map((m) => {
      const c = one(m.collection)
      return { id: m.id, label: fabricLabel(m.name, c?.name ?? 'Fabric', m.code) }
    }),
  }
}
