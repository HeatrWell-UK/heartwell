'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { formatPrice } from '@/lib/format'
import type { PickerFabric, PickerVariant } from '@/lib/admin/load-orders'
import { createManualOrder, saveOrderEdit, type FormResult } from '@/app/admin/(panel)/orders/actions'

export interface LineValue {
  key: string
  itemId: string | null
  variantId: string
  materialId: string | null
  quantity: number
  /** Blank: the catalogue price. */
  unitPrice: string
}

export interface CustomerValue {
  name: string
  phone: string
  email: string
  address: string
  postcode: string
  preferredDate: string
  notes: string
  deliveryCharge: string
}

const input = 'min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[16px] text-zinc-900 focus:border-zinc-900 focus:outline-none'
const label = 'text-sm font-semibold text-zinc-800'

let counter = 0
const newKey = () => `l${Date.now()}${counter++}`

function LinesEditor({ lines, onChange, variants, fabrics }: { lines: LineValue[]; onChange: (l: LineValue[]) => void; variants: PickerVariant[]; fabrics: PickerFabric[] }) {
  const id = useId()
  const set = (key: string, patch: Partial<LineValue>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-base font-bold">Products</legend>
      {lines.map((l, n) => {
        const v = variants.find((x) => x.id === l.variantId)
        return (
          <div key={l.key} className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <label htmlFor={`${id}-${l.key}-v`} className={label}>
              Product {n + 1}
            </label>
            <select id={`${id}-${l.key}-v`} value={l.variantId} onChange={(e) => set(l.key, { variantId: e.target.value, materialId: null })} className={input}>
              <option value="">Choose a product</option>
              {variants.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label} ({formatPrice(x.price)})
                </option>
              ))}
            </select>
            {v?.madeToOrder && (
              <>
                <label htmlFor={`${id}-${l.key}-m`} className={label}>
                  Fabric
                </label>
                <select id={`${id}-${l.key}-m`} value={l.materialId ?? ''} onChange={(e) => set(l.key, { materialId: e.target.value || null })} className={input}>
                  <option value="">As photographed</option>
                  {fabrics.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-${l.key}-q`} className={label}>
                  Quantity
                </label>
                <input id={`${id}-${l.key}-q`} type="number" min={1} max={99} inputMode="numeric" value={l.quantity} onChange={(e) => set(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={input} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-${l.key}-p`} className={label}>
                  Agreed price each
                </label>
                <input
                  id={`${id}-${l.key}-p`}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder={v ? String(v.price) : 'Catalogue'}
                  value={l.unitPrice}
                  onChange={(e) => set(l.key, { unitPrice: e.target.value })}
                  className={input}
                />
              </div>
            </div>
            {lines.length > 1 && (
              <button type="button" onClick={() => onChange(lines.filter((x) => x.key !== l.key))} className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-red-700">
                <TrashIcon aria-hidden="true" size={16} /> Remove
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => onChange([...lines, { key: newKey(), itemId: null, variantId: '', materialId: null, quantity: 1, unitPrice: '' }])}
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-700"
      >
        <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a product
      </button>
    </fieldset>
  )
}

function CustomerFields({ value, onChange }: { value: CustomerValue; onChange: (v: CustomerValue) => void }) {
  const id = useId()
  const f = (key: keyof CustomerValue, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className={label}>
        {text}
      </label>
      <input id={`${id}-${key}`} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className={input} {...props} />
    </div>
  )
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-base font-bold">Customer</legend>
      {f('name', 'Name', { autoComplete: 'off' })}
      {f('phone', 'Phone', { type: 'tel', inputMode: 'tel' })}
      {f('email', 'Email (optional)', { type: 'email', inputMode: 'email' })}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-address`} className={label}>
          Address
        </label>
        <textarea id={`${id}-address`} value={value.address} rows={2} onChange={(e) => onChange({ ...value, address: e.target.value })} className={`${input} py-2`} />
      </div>
      {f('postcode', 'Postcode', { autoCapitalize: 'characters' })}
      {f('preferredDate', 'Delivery day (optional)', { type: 'date' })}
      {f('deliveryCharge', 'Delivery charge, £ (extras agreed with the customer)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className={label}>
          Notes for delivery (optional)
        </label>
        <textarea id={`${id}-notes`} value={value.notes} rows={2} onChange={(e) => onChange({ ...value, notes: e.target.value })} className={`${input} py-2`} />
      </div>
    </fieldset>
  )
}

function payload(c: CustomerValue, lines: LineValue[]) {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email.trim(),
    address: c.address,
    postcode: c.postcode,
    preferredDate: c.preferredDate,
    notes: c.notes,
    deliveryCharge: Number(c.deliveryCharge) || 0,
    lines: lines
      .filter((l) => l.variantId)
      .map((l) => ({ itemId: l.itemId, variantId: l.variantId, materialId: l.materialId, quantity: l.quantity, unitPrice: l.unitPrice.trim() === '' ? null : Number(l.unitPrice) })),
  }
}

function estimate(lines: LineValue[], variants: PickerVariant[], deliveryCharge: string) {
  const items = lines.reduce((n, l) => {
    const v = variants.find((x) => x.id === l.variantId)
    const each = l.unitPrice.trim() !== '' ? Number(l.unitPrice) || 0 : (v?.price ?? 0)
    return n + each * l.quantity
  }, 0)
  return items + (Number(deliveryCharge) || 0)
}

function Result({ result }: { result: FormResult | null }) {
  if (!result || result.ok) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 ring-1 ring-red-200">
      {result.message}
    </p>
  )
}

/** Editing an order: details, lines and the delivery charge. The database recalculates the totals. */
export function EditOrderForm({ orderId, initial, initialLines, variants, fabrics, onDone }: { orderId: string; initial: CustomerValue; initialLines: LineValue[]; variants: PickerVariant[]; fabrics: PickerFabric[]; onDone: () => void }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(initial)
  const [lines, setLines] = useState(initialLines)
  const [result, setResult] = useState<FormResult | null>(null)
  const [saving, setSaving] = useState(false)
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        const r = await saveOrderEdit(orderId, payload(customer, lines)).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
        setSaving(false)
        setResult(r)
        if (r.ok) {
          router.refresh()
          onDone()
        }
      }}
    >
      <CustomerFields value={customer} onChange={setCustomer} />
      <LinesEditor lines={lines} onChange={setLines} variants={variants} fabrics={fabrics} />
      <p className="text-sm text-zinc-600">About {formatPrice(estimate(lines, variants, customer.deliveryCharge))} before any offer; the database works out the final total.</p>
      <Result result={result} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200">
          Cancel
        </button>
      </div>
    </form>
  )
}

/** Taking an order that came in on WhatsApp or by phone. */
export function ManualOrderForm({ variants, fabrics }: { variants: PickerVariant[]; fabrics: PickerFabric[] }) {
  const router = useRouter()
  const id = useId()
  const [source, setSource] = useState<'whatsapp' | 'phone'>('whatsapp')
  const [reference, setReference] = useState('')
  const [isTest, setIsTest] = useState(false)
  const [customer, setCustomer] = useState<CustomerValue>({ name: '', phone: '', email: '', address: '', postcode: '', preferredDate: '', notes: '', deliveryCharge: '0' })
  const [lines, setLines] = useState<LineValue[]>([{ key: newKey(), itemId: null, variantId: '', materialId: null, quantity: 1, unitPrice: '' }])
  const [result, setResult] = useState<FormResult | null>(null)
  const [saving, setSaving] = useState(false)

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        const r = await createManualOrder({ ...payload(customer, lines), source, whatsAppReference: reference, isTest }).catch(() => ({
          ok: false as const,
          message: 'Couldn’t reach the server. Try again.',
        }))
        setSaving(false)
        setResult(r)
        if (r.ok) router.push(`/admin/orders/${r.id}?done=created`)
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-base font-bold">Where it came from</legend>
        <div className="flex gap-2">
          {(['whatsapp', 'phone'] as const).map((s) => (
            <label key={s} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ring-1 ${source === s ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200'}`}>
              <input type="radio" name="source" value={s} checked={source === s} onChange={() => setSource(s)} className="sr-only" />
              {s === 'whatsapp' ? 'WhatsApp' : 'Phone'}
            </label>
          ))}
        </div>
        {source === 'whatsapp' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-ref`} className={label}>
              HW-WA reference (from the customer’s first message, if there is one)
            </label>
            <input id={`${id}-ref`} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="HW-WA-…" className={input} autoCapitalize="characters" />
          </div>
        )}
      </fieldset>
      <CustomerFields value={customer} onChange={setCustomer} />
      <LinesEditor lines={lines} onChange={setLines} variants={variants} fabrics={fabrics} />
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="size-5 accent-zinc-900" />
        This is a test order (it never counts anywhere)
      </label>
      <p className="text-sm text-zinc-600">Total about {formatPrice(estimate(lines, variants, customer.deliveryCharge))}; the database works out the final figure.</p>
      <Result result={result} />
      <button type="submit" disabled={saving} className="min-h-12 rounded-lg bg-zinc-900 px-4 font-semibold text-white">
        {saving ? 'Saving…' : 'Save order'}
      </button>
    </form>
  )
}

/** "Edit order": opens the form in place. */
export function EditOrderPanel(props: Omit<Parameters<typeof EditOrderForm>[0], 'onDone'>) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:border-zinc-300">
        Edit order
      </button>
    )
  return (
    <div className="basis-full rounded-xl bg-white p-4 ring-1 ring-zinc-300">
      <EditOrderForm {...props} onDone={() => setOpen(false)} />
    </div>
  )
}
