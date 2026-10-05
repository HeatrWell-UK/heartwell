import 'server-only'
import { createPublicClient } from '@/lib/supabase/public'
import { fabricLabel } from '@/lib/product/helpers'

// Orders as the customer's own pages read them: through the database's
// order_for_confirmation and track_order, which the public key may call
// (an order's ID is unguessable; tracking needs the reference and postcode).

export interface CustomerOrder {
  id: string
  reference: string
  status: string
  isTest: boolean
  customerName: string
  customerEmail: string | null
  shippingAddress: string
  postcode: string
  preferredDate: string | null
  hasMadeToOrder: boolean
  items: { title: string; option: string | null; quantity: number; unitPrice: number }[]
  itemsSubtotal: number
  discountAmount: number
  extras: { label: string; amount: number }[]
  totalAmount: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Raw = Record<string, unknown>
const n = (v: unknown) => Number(v ?? 0)

function itemsFrom(raw: unknown): CustomerOrder['items'] {
  return (Array.isArray(raw) ? (raw as Raw[]) : []).map((i) => ({
    title: String(i.title ?? ''),
    option: i.material_name ? fabricLabel(String(i.material_name), String(i.material_collection ?? ''), '').replace(/ \(\)$/, '') : ((i.colour_name as string | null) ?? null),
    quantity: n(i.quantity),
    unitPrice: n(i.unit_price),
  }))
}

export async function orderForCustomer(id: string): Promise<CustomerOrder | null> {
  if (!UUID.test(id)) return null
  const { data, error } = await createPublicClient().rpc('order_for_confirmation', { p_order_id: id })
  if (error) throw new Error(`Order: ${error.message}`)
  if (!data) return null
  const o = data as Raw
  const extras: CustomerOrder['extras'] = []
  if (n(o.fee_upstairs) > 0) extras.push({ label: 'Carrying upstairs', amount: n(o.fee_upstairs) })
  if (n(o.fee_assembly) > 0) extras.push({ label: 'Assembly', amount: n(o.fee_assembly) })
  if (o.wants_removal) extras.push({ label: `Taking your old sofa away (${n(o.removal_seats)} seats)`, amount: n(o.fee_removal) })
  return {
    id: String(o.id),
    reference: String(o.reference),
    status: String(o.status),
    isTest: o.is_test === true,
    customerName: String(o.customer_name ?? ''),
    customerEmail: (o.customer_email as string | null) ?? null,
    shippingAddress: String(o.shipping_address ?? ''),
    postcode: String(o.postcode ?? ''),
    preferredDate: (o.preferred_delivery_date as string | null) ?? null,
    hasMadeToOrder: o.has_made_to_order === true,
    items: itemsFrom(o.items),
    itemsSubtotal: n(o.items_subtotal),
    discountAmount: n(o.discount_amount),
    extras,
    totalAmount: n(o.total_amount),
  }
}

export interface TrackedOrder {
  reference: string
  status: string
  createdAt: string
  confirmedAt: string | null
  processingAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  preferredDate: string | null
  totalAmount: number
  items: CustomerOrder['items']
}

export async function trackOrder(reference: string, postcode: string): Promise<TrackedOrder | null> {
  const { data, error } = await createPublicClient().rpc('track_order', { p_reference: reference, p_postcode: postcode })
  if (error) throw new Error(`Track: ${error.message}`)
  if (!data) return null
  const o = data as Raw
  const s = (k: string) => (o[k] as string | null) ?? null
  return {
    reference: String(o.reference),
    status: String(o.status),
    createdAt: String(o.created_at),
    confirmedAt: s('confirmed_at'),
    processingAt: s('processing_at'),
    shippedAt: s('shipped_at'),
    deliveredAt: s('delivered_at'),
    cancelledAt: s('cancelled_at'),
    preferredDate: s('preferred_delivery_date'),
    totalAmount: n(o.total_amount),
    items: itemsFrom(o.items),
  }
}
