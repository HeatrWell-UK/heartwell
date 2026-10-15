import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { OrderLines } from '@/components/checkout/OrderLines'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { CONTACT } from '@/config/contact'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { orderForCustomer } from '@/lib/checkout/read'
import { orderJourney } from '@/lib/checkout/journey'
import { formatDeliveryDate } from '@/lib/delivery/window'

export const metadata: Metadata = { title: 'Order placed', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Straight after checkout: the reference, what to pay, the one thing to do next and where the order goes from here. */
export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await orderForCustomer((await params).id)
  if (!order) notFound()
  const first = order.customerName.split(/\s+/)[0]
  const confirmed = order.status !== 'pending_cod'
  const journey = orderJourney(order.status)

  return (
    <div className="mx-auto flex max-w-[42rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pb-24 lg:pt-12">
      <header className="flex flex-col gap-4">
        <span aria-hidden="true" className="bg-gold-sheen flex size-14 items-center justify-center rounded-full text-wine">
          <CheckIcon size={28} weight="bold" />
        </span>
        <h1 className="text-[40px] leading-[1.05] lg:text-[56px]">Thank you, {first}</h1>
        <p className="text-[17px] leading-relaxed text-body-dark lg:text-lg">
          Your order <strong className="font-semibold text-ink">{order.reference}</strong> is placed. Nothing to pay today: you pay the driver once
          it&rsquo;s in your room.
        </p>
      </header>

      {!confirmed ? (
        <section aria-labelledby="next" className="hw-panel flex flex-col gap-3 px-5 py-6 lg:px-8 lg:py-8">
          <h2 id="next" className="text-[26px] leading-tight lg:text-[30px]">
            One more step: confirm your order
          </h2>
          <p className="flex items-start gap-3 text-[16px] leading-relaxed">
            <EnvelopeSimpleIcon aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-velvet" />
            <span>
              {order.customerEmail ? (
                <>
                  We&rsquo;ve emailed <strong className="font-semibold">{order.customerEmail}</strong> a link. Tap{' '}
                  <strong className="font-semibold">Confirm my order</strong> in that email.
                </>
              ) : (
                <>We&rsquo;ll WhatsApp you a link to confirm. Tap it when it arrives.</>
              )}{' '}
              Then we ring to book your delivery day.
            </span>
          </p>
          <p className="text-sm text-slate">Can&rsquo;t see the email? Check your junk folder, or message us and we&rsquo;ll send the link by WhatsApp.</p>
        </section>
      ) : (
        <p className="hw-panel px-5 py-5 text-[16px] lg:px-8">Your order is confirmed. We&rsquo;ll ring you to book the delivery day.</p>
      )}

      {journey && (
        <section aria-labelledby="journey" className="flex flex-col gap-4">
          <h2 id="journey" className="text-[24px] leading-tight lg:text-[28px]">
            Where your order goes from here
          </h2>
          <OrderJourney steps={journey} />
        </section>
      )}

      <WhatsAppButton
        message={`Hi Heartwell, I've just placed order ${order.reference}.`}
        context="order-placed"
        enquiry={false}
        className={buttonClasses({ variant: 'secondary', block: true })}
      >
        <WhatsAppGlyph />
        Message us about {order.reference}
      </WhatsAppButton>

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
      </section>

      <p className="text-[15px] text-slate">
        Questions? Call {CONTACT.phoneDisplay ?? 'us'} or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Your reference is{' '}
        {order.reference}.
      </p>
    </div>
  )
}
