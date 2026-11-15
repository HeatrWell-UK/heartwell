import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { ConfirmOrderForm, type ConfirmationQuery } from '@/components/checkout/ConfirmOrderForm'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { buttonClasses } from '@/components/ui/Button'
import { orderJourney } from '@/lib/checkout/journey'
import { CONTACT, phoneHref } from '@/config/contact'
import { orderForCustomer } from '@/lib/checkout/read'
import { formatDeliveryDate } from '@/lib/delivery/window'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The order's own page, reached from the link in the shop's WhatsApp message
 * and the order email (owner, 15 November 2026): every detail, where the
 * order is up to, and, while it waits, the Confirm button. The screen straight
 * after checkout (/order/<id>) has no button: it sends people to WhatsApp to
 * ask for this link, so they read their details before confirming.
 */
export default async function ConfirmOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ConfirmationQuery> }) {
  const [order, query] = await Promise.all([params.then((p) => orderForCustomer(p.id)), searchParams])
  if (!order) notFound()
  const tel = phoneHref()
  const journey = orderJourney(order.status)
  const pending = order.status === 'pending_cod'

  if (order.status === 'cancelled') {
    return (
      <Shell title={`Order ${order.reference} was cancelled`}>
        <WhatsAppTopic message={`Hi Heartwell, I have a question about my cancelled order ${order.reference}.`} context="sticky-order" enquiry={false} />
        <p className="text-[17px]">
          If that’s not what you expected, please {tel ? <a href={tel}>ring us on {CONTACT.phoneDisplay}</a> : 'contact us'} or email{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
        <Summary order={order} />
      </Shell>
    )
  }

  return (
    <Shell title={pending ? `Check and confirm order ${order.reference}` : `Order ${order.reference}`}>
      <WhatsAppTopic message={`Hi Heartwell, I have a question about my order ${order.reference}.`} context="sticky-order" enquiry={false} />
      {pending ? (
        <p className="text-[17px] leading-relaxed">
          Please read every detail below. If it’s all right, press the button and we’ll ring you to book your delivery day. You pay the driver the full
          amount, in cash or by bank transfer, once it’s in your room.
        </p>
      ) : (
        <p className="flex items-start gap-3 text-[17px] leading-relaxed">
          <CheckCircleIcon aria-hidden="true" size={28} weight="fill" className="shrink-0 text-velvet" />
          <span>
            {order.status === 'confirmed' && 'Thank you. Your order is confirmed. We’ll ring you to book your delivery day.'}
            {order.status === 'processing' && 'Your order is being prepared. We’ll be in touch about your delivery day.'}
            {order.status === 'shipped' && 'Your order is on its way. The driver will ring before arriving.'}
            {order.status === 'delivered' && 'Delivered. Thank you for choosing Heartwell.'}
            {' '}You pay the driver the full amount, in cash or by bank transfer, once it’s in your room.
          </span>
        </p>
      )}

      <Summary order={order} />

      {pending && <ConfirmOrderForm id={order.id} query={query} />}

      {journey && (
        <section aria-labelledby="journey" className="flex flex-col gap-4">
          <h2 id="journey" className="text-[24px] leading-tight lg:text-[28px]">
            Where your order is
          </h2>
          <OrderJourney steps={journey} />
        </section>
      )}

      <p className="text-[15px] text-slate">
        {pending ? 'Something wrong? Don’t confirm: tell us and we’ll put it right first.' : 'Questions about your order?'}{' '}
        {tel ? <a href={tel}>Ring us on {CONTACT.phoneDisplay}</a> : 'Contact us'} or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
      </p>
      <WhatsAppButton
        message={pending ? `Hi Heartwell, something in my order ${order.reference} needs changing before I confirm it.` : `Hi Heartwell, I have a question about my order ${order.reference}.`}
        context="confirm-page"
        enquiry={false}
        className={buttonClasses({ variant: 'secondary', block: true })}
      >
        <WhatsAppGlyph />
        {pending ? 'Something needs changing' : `Message us about ${order.reference}`}
      </WhatsAppButton>
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

/** Every detail the customer gave, so they can check it before pressing Confirm. */
function Summary({ order }: { order: NonNullable<Awaited<ReturnType<typeof orderForCustomer>>> }) {
  return (
    <section aria-label="Your order" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5 lg:p-6">
      <OrderLines order={order} />
      <dl className="flex flex-col gap-2 text-[15px] leading-relaxed">
        <div>
          <dt className="font-semibold">Name</dt>
          <dd>{order.customerName}</dd>
        </div>
        <div>
          <dt className="font-semibold">Delivery address</dt>
          <dd>
            {order.shippingAddress}, {order.postcode}
          </dd>
        </div>
        {order.customerEmail && (
          <div>
            <dt className="font-semibold">Email</dt>
            <dd>{order.customerEmail}</dd>
          </div>
        )}
        {order.preferredDate && (
          <div>
            <dt className="font-semibold">Preferred delivery day</dt>
            <dd>{formatDeliveryDate(order.preferredDate)}. We&rsquo;ll ring to agree it.</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
