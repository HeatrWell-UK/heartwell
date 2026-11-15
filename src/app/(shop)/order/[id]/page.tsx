import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { AskForConfirmation } from '@/components/checkout/AskForConfirmation'
import { CONTACT, phoneHref } from '@/config/contact'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'
import { orderForCustomer } from '@/lib/checkout/read'
import { askForConfirmationMessage } from '@/lib/checkout/confirmation'
import { orderJourney } from '@/lib/checkout/journey'
import { formatDeliveryDate } from '@/lib/delivery/window'

export const metadata: Metadata = { title: 'Order placed', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Straight after checkout: the reference, the one thing to do next (ask for
 * confirmation on WhatsApp, where we send the details back and the customer
 * confirms in reply), what's to pay, and where the order goes from here.
 */
export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await params.then(({ id }) => orderForCustomer(id))
  if (!order) notFound()
  const pending = order.status === 'pending_cod'
  const cancelled = order.status === 'cancelled'
  const journey = orderJourney(order.status)
  const tel = phoneHref()

  return (
    <div className="mx-auto flex max-w-[42rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pb-24 lg:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-[34px] leading-[1.08] lg:text-[48px]">
          {pending ? 'Order placed. One more step.' : cancelled ? 'Your order was cancelled' : 'Your order is confirmed'}
        </h1>
        <p className="text-[17px] leading-relaxed text-body-dark lg:text-lg">
          <strong className="font-semibold text-ink">{order.reference}</strong>
          {pending
            ? ' · Your order is saved but not yet confirmed. Ask us for confirmation on WhatsApp: we send back the details we have, you check them and reply to confirm, and we ring to book your delivery day.'
            : order.status === 'confirmed'
              ? ' · We’ll ring to arrange your delivery.'
              : null}
        </p>
      </header>

      {pending && <AskForConfirmation reference={order.reference} />}

      {!pending && !cancelled && (
        <p className="flex items-start gap-3 text-[17px] leading-relaxed">
          <CheckCircleIcon aria-hidden="true" size={28} weight="fill" className="shrink-0 text-velvet" />
          <span>Thank you. You pay the driver the full amount, in cash or by bank transfer, once it’s in your room.</span>
        </p>
      )}

      <section aria-labelledby="summary" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5 lg:p-6">
        <h2 id="summary" className="text-[24px] leading-tight lg:text-[28px]">
          Your order
        </h2>
        <OrderLines order={order} />
        <p className="text-[15px] leading-relaxed">
          <span className="font-semibold">{order.customerName}</span>
          <br />
          {order.shippingAddress}, {order.postcode}
        </p>
        {order.preferredDate && <p className="text-[15px]">Preferred day: {formatDeliveryDate(order.preferredDate)}. We&rsquo;ll ring to agree it.</p>}
        {pending && (
          <p className="text-[15px] text-slate">
            Something not right? Tell us on WhatsApp{tel ? <>, or ring <a href={tel}>{CONTACT.phoneDisplay}</a></> : ''}, and we&rsquo;ll put it right before anything
            is confirmed.
          </p>
        )}
      </section>

      {journey && (
        <section aria-labelledby="journey" className="flex flex-col gap-4">
          <h2 id="journey" className="text-[24px] leading-tight lg:text-[28px]">
            Where your order goes from here
          </h2>
          <OrderJourney steps={journey} />
        </section>
      )}

      <WhatsAppTopic
        message={pending ? askForConfirmationMessage(order.reference) : `Hi Heartwell, I have a question about my order ${order.reference}.`}
        context="sticky-order"
        enquiry={false}
      />

      <p className="text-[15px] text-slate">
        Questions? Call {CONTACT.phoneDisplay ?? 'us'} or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Your reference is{' '}
        {order.reference}.
      </p>
    </div>
  )
}
