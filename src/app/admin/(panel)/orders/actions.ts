'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { z } from 'zod'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { isStatus } from '@/lib/admin/orders'
import { sendStatusEmail } from '@/lib/checkout/notify'
import { isUkPhone, formatUkPhone } from '@/lib/checkout/phone'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const back = (id: string, params: Record<string, string>) => `/admin/orders/${id}?${new URLSearchParams(params).toString()}`

/** The database's refusals, as a short code the order page explains. */
const codeOf = (message: string) => message.match(/^([A-Z_]+)/)?.[1] ?? 'FAILED'

export async function changeStatus(form: FormData) {
  const id = field(form, 'id')
  const status = field(form, 'status')
  const reason = field(form, 'reason').slice(0, 300) || null
  if (!UUID.test(id) || !isStatus(status)) redirect('/admin/orders')
  const denied = await adminGuard()
  if (denied) redirect('/login')
  if (status === 'cancelled' && !reason) redirect(back(id, { error: 'REASON_NEEDED' }))

  const { error } = await (await createClient()).rpc('set_order_status', { p_order_id: id, p_status: status, p_reason: reason ?? undefined })
  if (error) redirect(back(id, { error: codeOf(error.message) }))
  after(async () => {
    try {
      await sendStatusEmail(id, status, reason)
    } catch (e) {
      console.error('status email failed', id, e)
    }
  })
  revalidatePath('/admin/orders')
  redirect(back(id, { moved: status }))
}

export async function setTestFlag(form: FormData) {
  const id = field(form, 'id')
  const isTest = field(form, 'isTest') === 'true'
  if (!UUID.test(id)) redirect('/admin/orders')
  if (await adminGuard()) redirect('/login')
  const { error } = await (await createClient()).rpc('set_order_test', { p_order_id: id, p_is_test: isTest, p_reason: isTest ? field(form, 'reason').slice(0, 200) || 'marked by staff' : undefined })
  if (error) redirect(back(id, { error: codeOf(error.message) }))
  revalidatePath('/admin/orders')
  redirect(back(id, { done: isTest ? 'test_on' : 'test_off' }))
}

export async function setAttribution(form: FormData) {
  const id = field(form, 'id')
  if (!UUID.test(id)) redirect('/admin/orders')
  if (await adminGuard()) redirect('/login')
  const { error } = await (await createClient()).rpc('set_order_attribution', { p_order_id: id, p_source: field(form, 'source'), p_note: field(form, 'note') })
  if (error) redirect(back(id, { error: codeOf(error.message) }))
  redirect(back(id, { done: 'source' }))
}

export async function addNote(form: FormData) {
  const id = field(form, 'id')
  if (!UUID.test(id)) redirect('/admin/orders')
  if (await adminGuard()) redirect('/login')
  const { error } = await (await createClient()).rpc('add_order_note', { p_order_id: id, p_note: field(form, 'note') })
  if (error) redirect(back(id, { error: codeOf(error.message) }))
  redirect(back(id, { done: 'note' }))
}

export async function deleteTestOrder(form: FormData) {
  const id = field(form, 'id')
  if (!UUID.test(id)) redirect('/admin/orders')
  if (await adminGuard()) redirect('/login')
  if (field(form, 'confirm') !== 'DELETE') redirect(back(id, { error: 'TYPE_DELETE' }))
  const { data, error } = await (await createClient()).rpc('delete_test_order', { p_order_id: id })
  if (error) redirect(back(id, { error: codeOf(error.message) }))
  revalidatePath('/admin/orders')
  redirect(`/admin/orders?filter=test&deleted=${encodeURIComponent(String((data as { reference?: string } | null)?.reference ?? ''))}`)
}

// Editing an order and taking one by WhatsApp or phone -----------------------

const Line = z.object({
  itemId: z.string().max(64).nullable(),
  variantId: z.uuid(),
  materialId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(99),
  /** Staff may agree a price; blank means the catalogue price. */
  unitPrice: z.number().min(0).max(100000).nullable(),
})

const Customer = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(''), z.email().max(254)]),
  address: z.string().trim().min(5).max(400),
  postcode: z.string().trim().min(5).max(10),
  preferredDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  notes: z.string().trim().max(1000),
  deliveryCharge: z.number().min(0).max(10000),
  lines: z.array(Line).min(1).max(30),
})

const linePayload = (lines: z.infer<typeof Line>[]) =>
  lines.map((l) => ({
    ...(l.itemId ? { item_id: l.itemId } : {}),
    variant_id: l.variantId,
    material_id: l.materialId,
    quantity: l.quantity,
    ...(l.unitPrice !== null ? { unit_price: l.unitPrice.toFixed(2) } : {}),
  }))

export type FormResult = { ok: true; id: string } | { ok: false; message: string }

const MESSAGES: Record<string, string> = {
  MISSING_NAME: 'Enter the customer’s name.',
  BAD_PHONE: 'Enter a UK phone number.',
  MISSING_ADDRESS: 'Enter the address.',
  INVALID_POSTCODE: 'Check the postcode.',
  BAD_DELIVERY_DATE: 'Check the delivery date.',
  DELIVERY_DATE_OUT_OF_RANGE: 'The delivery date must be between today and a year from now.',
  UNAVAILABLE_ITEMS: 'One of the products can’t be found.',
  UNAVAILABLE_MATERIAL: 'One of the fabrics can’t be found.',
  ORDER_CANCELLED: 'Cancelled orders can’t be edited.',
  NOT_AUTHORISED: 'Please sign in again.',
}

export async function saveOrderEdit(id: string, input: unknown): Promise<FormResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown order.' }
  if (await adminGuard()) return { ok: false, message: MESSAGES.NOT_AUTHORISED! }
  const parsed = Customer.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please check the highlighted details: name, a UK phone number, address and postcode are needed.' }
  const c = parsed.data
  if (!isUkPhone(c.phone)) return { ok: false, message: MESSAGES.BAD_PHONE! }
  const { error } = await (await createClient()).rpc('update_order_details', {
    p_order_id: id,
    p_input: {
      customer_name: c.name,
      customer_phone: formatUkPhone(c.phone),
      customer_email: c.email || null,
      shipping_address: c.address,
      postcode: c.postcode,
      special_instructions: c.notes || null,
      preferred_delivery_date: c.preferredDate || null,
      delivery_total: c.deliveryCharge,
      items: linePayload(c.lines),
    },
  })
  if (error) return { ok: false, message: MESSAGES[codeOf(error.message)] ?? `Couldn’t save: ${error.message}` }
  revalidatePath(`/admin/orders/${id}`)
  revalidatePath('/admin/orders')
  return { ok: true, id }
}

const Manual = Customer.extend({
  source: z.enum(['whatsapp', 'phone']),
  whatsAppReference: z.string().trim().max(40),
  isTest: z.boolean(),
})

export async function createManualOrder(input: unknown): Promise<FormResult> {
  if (await adminGuard()) return { ok: false, message: MESSAGES.NOT_AUTHORISED! }
  const parsed = Manual.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Please check the details: name, a UK phone number, address, postcode and at least one product are needed.' }
  const c = parsed.data
  if (!isUkPhone(c.phone)) return { ok: false, message: MESSAGES.BAD_PHONE! }
  const { data, error } = await (await createClient()).rpc('place_manual_order', {
    p_input: {
      source: c.source,
      customer_name: c.name,
      customer_phone: formatUkPhone(c.phone),
      customer_email: c.email || null,
      shipping_address: c.address,
      postcode: c.postcode,
      preferred_delivery_date: c.preferredDate || null,
      special_instructions: c.notes || null,
      delivery_charge: c.deliveryCharge,
      whatsapp_reference: c.whatsAppReference || null,
      is_test: c.isTest,
      test_reason: c.isTest ? 'marked by staff' : null,
      items: linePayload(c.lines),
    },
  })
  if (error) return { ok: false, message: MESSAGES[codeOf(error.message)] ?? `Couldn’t save: ${error.message}` }
  revalidatePath('/admin/orders')
  return { ok: true, id: String((data as { id: string }).id) }
}
