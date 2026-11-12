import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { orderJourney } from '@/lib/checkout/journey'
import { CONTACT, phoneHref } from '@/config/contact'
import { orderForCustomer } from '@/lib/checkout/read'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'

import { ConfirmOrderForm, type ConfirmationQuery } from '@/components/checkout/ConfirmOrderForm'

export const metadata: Metadata = { title: 'Confirm your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ConfirmOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ConfirmationQuery> }) {
  const [order, query] = await Promise.all([params.then((p) => orderForCustomer(p.id)), searchParams])
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
            Thank you. Order <strong className="font-semibold">{order.reference}</strong> is confirmed. We’ll ring you to book your delivery day.
            Nothing to pay until it’s in your room.
          </span>
        </p>
        {journey && <OrderJourney steps={journey} />}
        <Summary order={order} />
      </Shell>
    )
  }

  return (
    <Shell title={`Confirm your order ${order.reference}`}>
      <p className="text-[17px] leading-relaxed">Please check the details below, then press the button. We’ll ring you to book your delivery day.</p>
      <Summary order={order} />
      <ConfirmOrderForm id={order.id} query={query} />
      <p className="text-[15px] text-slate">
        Something wrong? Don’t confirm: {tel ? <a href={tel}>ring us on {CONTACT.phoneDisplay}</a> : 'contact us'} or email{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we’ll put it right.
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
      <WhatsAppTopic message={`Hi Heartwell, I have a question about my order ${order.reference}.`} context="sticky-order" enquiry={false} />
      <OrderLines order={order} />
      <p className="text-[15px]">
        <span className="font-semibold">{order.customerName}</span>
        <br />
        {order.shippingAddress}, {order.postcode}
      </p>
    </section>
  )
}
