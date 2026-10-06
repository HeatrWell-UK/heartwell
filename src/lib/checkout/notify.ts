import 'server-only'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { EMAIL } from '@/config/email'
import { SITE_URL } from '@/config/site'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { customerOrderEmail, customerStatusEmail, EMAILED_STATUSES, shopConfirmedEmail, shopOrderEmail, type EmailedStatus, type OrderEmailData } from '@/lib/email/order-emails'
import { fabricLabel } from '@/lib/product/helpers'
import { floorName } from '@/lib/delivery/pricing'
import { getDeliveryInfo } from '@/lib/product/load'

export const confirmUrl = (id: string) => `${SITE_URL}/confirm-order/${id}`
const adminUrl = () => `${SITE_URL}/admin`

/** An order as the emails need it, read with the server's key. */
export async function loadOrderForEmail(id: string): Promise<OrderEmailData | null> {
  const { data: o, error } = await createAdminClient()
    .from('orders')
    .select(
      `id, reference, is_test, customer_name, customer_email, customer_phone, shipping_address, postcode,
       preferred_delivery_date, special_instructions, has_made_to_order, items_subtotal, discount_amount, promotion_code,
       delivery_floor, delivery_has_lift, fee_upstairs, fee_assembly, removal_seats, fee_removal, delivery_total, total_amount,
       order_items(position, title, custom_title, sku, colour_name, material_code, material_name, material_collection, quantity, unit_price)`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Order ${id}: ${error.message}`)
  if (!o) return null

  const extras: OrderEmailData['extras'] = []
  if (o.fee_upstairs > 0) {
    extras.push({ label: 'Carrying upstairs', detail: o.delivery_has_lift ? `${floorName(o.delivery_floor)}, with a lift` : floorName(o.delivery_floor), amount: o.fee_upstairs })
  }
  if (o.fee_assembly > 0) extras.push({ label: 'Assembly in your room', amount: o.fee_assembly })
  if (o.removal_seats) extras.push({ label: 'Taking your old sofa away', detail: `${o.removal_seats} ${o.removal_seats === 1 ? 'seat' : 'seats'}`, amount: o.fee_removal })

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
    items: [...o.order_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
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

const shopContact = () => ({ email: CONTACT.email, phoneDisplay: CONTACT.phoneDisplay, whatsAppHref: whatsAppHref() })

/** After an order is placed: the customer's confirm email and the shop's notification. */
export async function sendOrderPlacedEmails(id: string): Promise<void> {
  const order = await loadOrderForEmail(id)
  if (!order) return
  const windowLabel = await getDeliveryInfo()
    .then((d) => d.windowLabel)
    .catch(() => null)
  const jobs: Promise<unknown>[] = [
    (async () => {
      const shop = shopOrderEmail(order, { confirmUrl: confirmUrl(id), adminUrl: adminUrl() })
      await sendEmail({ kind: 'order_shop', to: EMAIL.shopTo, cc: EMAIL.shopCopy, ...shop, orderId: id, toCustomer: false })
    })(),
  ]
  if (order.customerEmail) {
    const email = customerOrderEmail(order, { confirmUrl: confirmUrl(id), windowLabel, shop: shopContact() })
    jobs.push(sendEmail({ kind: 'order_customer', to: order.customerEmail, ...email, orderId: id, toCustomer: true }))
  }
  await Promise.all(jobs)
}

/** After the customer taps Confirm: tell the shop. */
export async function sendOrderConfirmedEmail(id: string): Promise<void> {
  const order = await loadOrderForEmail(id)
  if (!order) return
  const email = shopConfirmedEmail(order, { adminUrl: adminUrl() })
  await sendEmail({ kind: 'order_confirmed_shop', to: EMAIL.shopTo, cc: EMAIL.shopCopy, ...email, orderId: id, toCustomer: false })
}

/** After staff move an order on: tell the customer (when they gave an email and the status is one we email about). */
export async function sendStatusEmail(id: string, status: string, cancellationReason?: string | null): Promise<void> {
  if (!EMAILED_STATUSES.includes(status)) return
  const order = await loadOrderForEmail(id)
  if (!order?.customerEmail) return
  const email = customerStatusEmail(order, status as EmailedStatus, { trackUrl: `${SITE_URL}/track-order`, shop: shopContact(), cancellationReason })
  await sendEmail({ kind: `order_${status}_customer`, to: order.customerEmail, ...email, orderId: id, toCustomer: true })
}
