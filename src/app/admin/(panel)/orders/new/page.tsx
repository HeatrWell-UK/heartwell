import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@phosphor-icons/react/ssr'
import { ManualOrderForm } from '@/components/admin/OrderForms'
import { orderPickers } from '@/lib/admin/load-orders'
import { WA_REFERENCE } from '@/lib/whatsapp/handoff'
import { VISIT_REFERENCE } from '@/lib/attribution/visit'

export const metadata: Metadata = { title: 'New order' }
export const dynamic = 'force-dynamic'

/**
 * An order that came in on WhatsApp or by phone. Prices default to the
 * catalogue, can be agreed per line, and the database works out the totals.
 * With the customer's HW-WA reference, or the HW-V reference of the website
 * visit staff found (by time, or the phone or email they gave before), the
 * order is linked to that visit and the ad that brought them, and its Purchase
 * tells Meta so.
 */
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ wa?: string; visit?: string }> }) {
  const [{ variants, fabrics }, { wa, visit }] = await Promise.all([orderPickers(), searchParams])
  // From Leads → "Take this order": WhatsApp taps (HW-WA), basket reminders and samples (HW-V).
  const reference = wa && WA_REFERENCE.test(wa.toUpperCase()) ? wa.toUpperCase() : visit && VISIT_REFERENCE.test(visit.toUpperCase()) ? visit.toUpperCase() : ''
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
