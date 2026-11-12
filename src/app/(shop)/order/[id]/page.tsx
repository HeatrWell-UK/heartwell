import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { CONTACT } from '@/config/contact'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'
import { orderForCustomer } from '@/lib/checkout/read'
import { orderJourney } from '@/lib/checkout/journey'
import { formatDeliveryDate } from '@/lib/delivery/window'

import { ConfirmOrderForm, type ConfirmationQuery } from '@/components/checkout/ConfirmOrderForm'

export const metadata: Metadata = { title: 'Order placed', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Straight after checkout: the reference, what to pay, the one thing to do next and where the order goes from here. */
export default async function OrderPlacedPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ConfirmationQuery> }) {
  const [order, query] = await Promise.all([params.then(({ id }) => orderForCustomer(id)), searchParams])
  if (!order) notFound()
  const pending = order.status === 'pending_cod'
  const cancelled = order.status === 'cancelled'
  const journey = orderJourney(order.status)

  return (
    <div className="mx-auto flex max-w-[42rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pb-24 lg:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-[34px] leading-[1.08] lg:text-[48px]">
          {pending ? 'Confirm your order' : cancelled ? 'Your order was cancelled' : 'Your order is confirmed'}
        </h1>
        <p className="text-[17px] leading-relaxed text-body-dark lg:text-lg">
          <strong className="font-semibold text-ink">{order.reference}</strong>
          {pending ? ' · Check the details below. Once you confirm, we’ll call to arrange your delivery.' :
            order.status === 'confirmed' ? ' · We’ll call to arrange your delivery.' : null}
        </p>
      </header>

      <section aria-labelledby="summary" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5 lg:p-6">
        <h2 id="summary" className="text-[24px] leading-tight lg:text-[28px]">
          Your order
        </h2>
        <OrderLines order={order} />
        <p className="text-[15px] leading-relaxed">
          <span className="font-semibold">Delivering to</span>
          <br />
          {order.shippingAddress}, {order.postcode}
        </p>
        {order.preferredDate && <p className="text-[15px]">Preferred day: {formatDeliveryDate(order.preferredDate)}. We&rsquo;ll ring to agree it.</p>}
        {pending && <ConfirmOrderForm id={order.id} query={query} fromReceipt />}
        {pending && order.customerEmail && <p className="text-sm text-slate">You can also confirm later using the link in your order email.</p>}
      </section>

      {journey && (
        <section aria-labelledby="journey" className="flex flex-col gap-4">
          <h2 id="journey" className="text-[24px] leading-tight lg:text-[28px]">
            Where your order goes from here
          </h2>
          <OrderJourney steps={journey} />
        </section>
      )}

      <WhatsAppTopic message={`Hi Heartwell, I have a question about my order ${order.reference}.`} context="sticky-order" enquiry={false} />
      <WhatsAppButton
        message={`Hi Heartwell, I've just placed order ${order.reference}.`}
        context="order-placed"
        enquiry={false}
        className={buttonClasses({ variant: 'secondary', block: true })}
      >
        <WhatsAppGlyph />
        Message us about {order.reference}
      </WhatsAppButton>


      <p className="text-[15px] text-slate">
        Questions? Call {CONTACT.phoneDisplay ?? 'us'} or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Your reference is{' '}
        {order.reference}.
      </p>
    </div>
  )
}
