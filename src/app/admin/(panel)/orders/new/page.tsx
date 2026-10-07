import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@phosphor-icons/react/ssr'
import { ManualOrderForm } from '@/components/admin/OrderForms'
import { orderPickers } from '@/lib/admin/load-orders'
import { WA_REFERENCE } from '@/lib/whatsapp/handoff'

export const metadata: Metadata = { title: 'New order' }
export const dynamic = 'force-dynamic'

/**
 * An order that came in on WhatsApp or by phone. Prices default to the
 * catalogue, can be agreed per line, and the database works out the totals.
 * With the customer's HW-WA reference, the order is linked to the chat (and
 * the ad that started it, once tracking is on).
 */
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ wa?: string }> }) {
  const [{ variants, fabrics }, { wa }] = await Promise.all([orderPickers(), searchParams])
  // From Leads → WhatsApp → "Take this order".
  const reference = wa && WA_REFERENCE.test(wa.toUpperCase()) ? wa.toUpperCase() : ''
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      <Link href="/admin/orders" className="flex items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
        <ArrowLeftIcon aria-hidden="true" size={16} /> Orders
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">WhatsApp or phone order</h1>
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 lg:p-6">
        <ManualOrderForm variants={variants} fabrics={fabrics} initialReference={reference} />
      </div>
    </div>
  )
}
