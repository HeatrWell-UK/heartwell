import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/admin/ClientButtons'
import { getOrder, lineOption } from '@/lib/admin/load-orders'
import { dualTime } from '@/lib/admin/orders'
import { formatPrice } from '@/lib/format'
import { formatDeliveryDate } from '@/lib/delivery/window'
import { floorName } from '@/lib/delivery/pricing'
import { CONTACT } from '@/config/contact'

export const metadata: Metadata = { title: 'Delivery note' }
export const dynamic = 'force-dynamic'

/** One page for the driver: who, where, what, what to do and what to collect. */
export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id)
  if (!order) notFound()
  const placed = dualTime(order.created_at)

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-semibold text-zinc-600">
          ← Back to {order.reference}
        </Link>
        <PrintButton />
      </div>

      <article className="flex flex-col gap-5 rounded-xl bg-white p-6 text-[15px] text-black shadow-sm ring-1 ring-zinc-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="font-display text-3xl font-bold">Heartwell</p>
            <p className="text-sm">Delivery note</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">{order.reference}</p>
            {placed && <p className="text-sm">Ordered {placed.uk}</p>}
            {order.is_test && <p className="text-sm font-bold">TEST ORDER</p>}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Deliver to</h2>
            <p className="mt-1 text-lg font-semibold">{order.customer_name}</p>
            <p>{order.customer_phone}</p>
            <p className="mt-1">{order.shipping_address}</p>
            <p className="font-bold">{order.postcode}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Delivery</h2>
            <p className="mt-1">{order.preferred_delivery_date ? `Agreed day: ${formatDeliveryDate(order.preferred_delivery_date)}` : 'Day: as agreed by phone'}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              <li>
                {order.delivery_floor > 0
                  ? `Carry to the ${floorName(order.delivery_floor).toLowerCase()}${order.delivery_has_lift ? ' (there is a lift)' : ' (no lift)'}`
                  : 'Ground floor'}
              </li>
              {order.wants_assembly && <li>Assemble in the room</li>}
              {order.removal_seats ? <li>Take away the old sofa: {order.removal_seats} seats</li> : null}
            </ul>
          </div>
        </section>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black text-xs uppercase tracking-wider">
              <th className="py-1.5 pr-2 font-bold">Qty</th>
              <th className="py-1.5 pr-2 font-bold">Item</th>
              <th className="py-1.5 font-bold">SKU</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((i) => (
              <tr key={i.id} className="border-b border-zinc-300 align-top">
                <td className="py-2 pr-2 font-bold">{i.quantity}</td>
                <td className="py-2 pr-2">
                  <span className="font-semibold">{i.custom_title ?? i.title}</span>
                  <br />
                  {lineOption(i)}
                </td>
                <td className="py-2 font-mono text-sm">{i.sku}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {order.special_instructions && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider">Notes</h2>
            <p className="mt-1">{order.special_instructions}</p>
          </section>
        )}

        <section className="rounded-lg border-2 border-black p-4">
          <p className="text-xs font-bold uppercase tracking-wider">To collect on delivery</p>
          <p className="font-display text-3xl font-bold">{formatPrice(order.total_amount)}</p>
          <p className="text-sm">Cash or bank transfer, once the furniture is in the room.</p>
        </section>

        {order.has_made_to_order && <p className="text-sm">Includes a made-to-order piece: built for this customer.</p>}

        <section className="grid gap-6 pt-4 sm:grid-cols-3 print:grid-cols-3">
          {['Received in good condition by', 'Signature', 'Date'].map((l) => (
            <div key={l}>
              <div className="h-10 border-b border-black" />
              <p className="mt-1 text-xs">{l}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-zinc-300 pt-2 text-xs">
          Heartwell · {CONTACT.phoneDisplay ? `${CONTACT.phoneDisplay} · ` : ''}
          {CONTACT.email}
        </footer>
      </article>
    </div>
  )
}
