import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { orderJourney } from '@/lib/checkout/journey'
import { CONTACT, phoneHref } from '@/config/contact'
import { orderForCustomer } from '@/lib/checkout/read'
import { askForConfirmationMessage } from '@/lib/checkout/confirmation'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'
import { AskForConfirmation } from '@/components/checkout/AskForConfirmation'

export const metadata: Metadata = { title: 'Confirm your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The link in the order email (and in emails sent before 15 November 2026,
 * when this page had a Confirm button). Now it shows the order and sends the
 * customer to WhatsApp to confirm in conversation, like the order page.
 */
export default async function ConfirmOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await params.then((p) => orderForCustomer(p.id))
  if (!order) notFound()
  const tel = phoneHref()
  const journey = orderJourney(order.status)

  if (order.status === 'cancelled') {
    return (
      <Shell title={`Order ${order.reference} was cancelled`}>
        <WhatsAppTopic message={`Hi Heartwell, I have a question about my cancelled order ${order.reference}.`} context="sticky-order" enquiry={false} />
        <p className="text-[17px]">
          If that’s not what you expected, please {tel ? <a href={tel}>ring us on {CONTACT.phoneDisplay}</a> : 'contact us'} or email{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </Shell>
    )
  }

  if (order.status !== 'pending_cod') {
    return (
      <Shell title="Your order is confirmed">
        <p className="flex items-start gap-3 text-[17px] leading-relaxed">
          <CheckCircleIcon aria-hidden="true" size={28} weight="fill" className="shrink-0 text-velvet" />
          <span>
            Thank you. Order <strong className="font-semibold">{order.reference}</strong> is confirmed. We’ll ring you to book your delivery day. You pay the
            driver the full amount, in cash or by bank transfer, once it’s in your room.
          </span>
        </p>
        {journey && <OrderJourney steps={journey} />}
        <Summary order={order} />
      </Shell>
    )
  }

  return (
    <Shell title={`Confirm your order ${order.reference}`}>
      <WhatsAppTopic message={askForConfirmationMessage(order.reference)} context="sticky-order" enquiry={false} />
      <p className="text-[17px] leading-relaxed">
        Your order is saved but not yet confirmed. Ask us for confirmation on WhatsApp: we send back the details we have, you check them and reply to
        confirm, and we ring to book your delivery day.
      </p>
      <AskForConfirmation reference={order.reference} />
      <Summary order={order} />
      <p className="text-[15px] text-slate">
        Something wrong? Tell us on WhatsApp, {tel ? <a href={tel}>ring us on {CONTACT.phoneDisplay}</a> : 'contact us'} or email{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>, and we’ll put it right before anything is confirmed.
      </p>
    </Shell>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[42rem] flex-col gap-6 px-4 pb-16 pt-6 lg:pb-24 lg:pt-12">
      <h1 className="text-[34px] leading-[1.08] lg:text-[44px]">{title}</h1>
      {children}
    </div>
  )
}

function Summary({ order }: { order: NonNullable<Awaited<ReturnType<typeof orderForCustomer>>> }) {
  return (
    <section aria-label="Your order" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5 lg:p-6">
      <OrderLines order={order} />
      <p className="text-[15px]">
        <span className="font-semibold">{order.customerName}</span>
        <br />
        {order.shippingAddress}, {order.postcode}
      </p>
    </section>
  )
}
