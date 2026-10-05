import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircleIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { OrderLines } from '@/components/checkout/OrderLines'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { orderForCustomer } from '@/lib/checkout/read'
import { formatDeliveryDate } from '@/lib/delivery/window'

export const metadata: Metadata = { title: 'Order placed', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Straight after checkout: the reference, what to pay, and the one thing to do next. */
export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await orderForCustomer((await params).id)
  if (!order) notFound()
  const first = order.customerName.split(/\s+/)[0]
  const confirmed = order.status !== 'pending_cod'
  const wa = whatsAppHref(`Hi Heartwell, I've just placed order ${order.reference}.`)

  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-6 px-4 pb-16 pt-6 lg:pt-10">
      <header className="flex flex-col gap-3">
        <CheckCircleIcon aria-hidden="true" size={44} weight="fill" className="text-velvet" />
        <h1 className="text-[32px] leading-tight">Thank you, {first}</h1>
        <p className="text-[17px] leading-relaxed">
          Your order <strong className="font-semibold">{order.reference}</strong> is placed. Nothing to pay today: you pay the driver once it’s in
          your room.
        </p>
      </header>

      {!confirmed ? (
        <section aria-labelledby="next" className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-gold-cream-tint p-5">
          <h2 id="next" className="text-[22px]">
            One more step: confirm your order
          </h2>
          <p className="flex items-start gap-3 text-[16px] leading-relaxed">
            <EnvelopeSimpleIcon aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-velvet" />
            <span>
              {order.customerEmail ? (
                <>
                  We’ve emailed <strong className="font-semibold">{order.customerEmail}</strong> a link. Tap <strong className="font-semibold">Confirm my order</strong> in that email.
                </>
              ) : (
                <>We’ll WhatsApp you a link to confirm. Tap it when it arrives.</>
              )}{' '}
              Then we ring to book your delivery day.
            </span>
          </p>
          <p className="text-sm text-slate">Can’t see the email? Check your junk folder, or message us and we’ll send the link by WhatsApp.</p>
        </section>
      ) : (
        <p className="rounded-[var(--radius-card)] bg-gold-cream-tint p-5 text-[16px]">
          Your order is confirmed. We’ll ring you to book the delivery day.
        </p>
      )}

      {wa && (
        <a href={wa} className={buttonClasses({ variant: 'secondary', block: true })}>
          <WhatsAppGlyph />
          Message us about {order.reference}
        </a>
      )}

      <section aria-labelledby="summary" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line p-5">
        <h2 id="summary" className="text-[22px]">
          Your order
        </h2>
        <OrderLines order={order} />
        <p className="text-[15px]">
          <span className="font-semibold">Delivering to</span>
          <br />
          {order.shippingAddress}, {order.postcode}
        </p>
        {order.preferredDate && <p className="text-[15px]">Preferred day: {formatDeliveryDate(order.preferredDate)}. We’ll ring to agree it.</p>}
      </section>

      <p className="text-[15px] text-slate">
        Questions? Call {CONTACT.phoneDisplay ?? 'us'} or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Your reference is {order.reference}.
      </p>
    </div>
  )
}
