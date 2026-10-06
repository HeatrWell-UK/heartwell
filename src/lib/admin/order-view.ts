// An admin order row in the shape the emails, the copy block and the
// delivery note share, so all of them describe an order the same way.

import { floorName } from '@/lib/delivery/pricing'
import { fabricLabel } from '@/lib/product/helpers'
import type { OrderEmailData } from '@/lib/email/order-emails'

export interface OrderRowForView {
  id: string
  reference: string | null
  is_test: boolean
  customer_name: string
  customer_email: string | null
  customer_phone: string
  shipping_address: string
  postcode: string
  preferred_delivery_date: string | null
  special_instructions: string | null
  has_made_to_order: boolean
  items_subtotal: number
  discount_amount: number
  promotion_code: string | null
  delivery_floor: number
  delivery_has_lift: boolean
  fee_upstairs: number
  fee_assembly: number
  removal_seats: number | null
  fee_removal: number
  delivery_total: number
  total_amount: number
  order_items: {
    title: string
    custom_title: string | null
    sku: string
    colour_name: string | null
    material_code: string | null
    material_name: string | null
    material_collection: string | null
    quantity: number
    unit_price: number
  }[]
}

export function toEmailData(o: OrderRowForView): OrderEmailData {
  const extras: OrderEmailData['extras'] = []
  if (o.fee_upstairs > 0) extras.push({ label: 'Carrying upstairs', detail: o.delivery_has_lift ? `${floorName(o.delivery_floor)}, with a lift` : floorName(o.delivery_floor), amount: o.fee_upstairs })
  if (o.fee_assembly > 0) extras.push({ label: 'Assembly in your room', amount: o.fee_assembly })
  if (o.removal_seats) extras.push({ label: 'Taking your old sofa away', detail: `${o.removal_seats} ${o.removal_seats === 1 ? 'seat' : 'seats'}`, amount: o.fee_removal })
  // A delivery charge agreed by staff that isn't one of the standard extras.
  const listed = extras.reduce((n, e) => n + e.amount, 0)
  if (o.delivery_total - listed > 0.005) extras.push({ label: 'Delivery (agreed)', amount: Math.round((o.delivery_total - listed) * 100) / 100 })
  return {
    id: o.id,
    reference: o.reference ?? '',
    isTest: o.is_test,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone,
    shippingAddress: o.shipping_address,
    postcode: o.postcode,
    preferredDate: o.preferred_delivery_date,
    notes: o.special_instructions,
    hasMadeToOrder: o.has_made_to_order,
    items: o.order_items.map((i) => ({
      title: i.custom_title ?? i.title,
      option: i.material_name ? fabricLabel(i.material_name, i.material_collection ?? '', i.material_code ?? '') : i.colour_name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unit_price,
    })),
    itemsSubtotal: o.items_subtotal,
    discountAmount: o.discount_amount,
    promotionCode: o.promotion_code,
    extras,
    deliveryTotal: o.delivery_total,
    totalAmount: o.total_amount,
  }
}
