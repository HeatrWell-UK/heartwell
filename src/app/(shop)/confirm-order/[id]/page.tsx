import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { OrderLines } from '@/components/checkout/OrderLines'
import { CONTACT, phoneHref } from '@/config/contact'
import { orderForCustomer } from '@/lib/checkout/read'
import { createPublicClient } from '@/lib/supabase/public'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { sendOrderConfirmedEmail } from '@/lib/checkout/notify'

export const metadata: Metadata = { title: 'Confirm your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The customer's confirm link. Opening it only shows the order; the order is
 * confirmed by pressing the button (a POST), so link previews in WhatsApp or
 * email can never confirm it by accident.
 */
async function confirm(formData: FormData) {
  'use server'
  const id = String(formData.get('id') ?? '')
  if (!rateLimit(`confirm:${await clientIp()}`, 20, 10 * 60_000)) redirect(`/confirm-order/${id}?busy=1`)
  const { data, error } = await createPublicClient().rpc('confirm_order', { p_order_id: id })
  if (error) redirect(`/confirm-order/${id}?failed=1`)
  if ((data as { just_confirmed?: boolean } | null)?.just_confirmed) {
    after(async () => {
      try {
        await sendOrderConfirmedEmail(id)
      } catch (e) {
        console.error('confirmed email failed', id, e)
      }
    })
  }
  redirect(`/confirm-order/${id}`)
}

export default async function ConfirmOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string; busy?: string }> }) {
  const [order, query] = await Promise.all([params.then((p) => orderForCustomer(p.id)), searchParams])
  if (!order) notFound()
  const tel = phoneHref()

  if (order.status === 'cancelled') {
    return (
      <Shell title={`Order ${order.reference} was cancelled`}>
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
        <Summary order={order} />
      </Shell>
    )
  }

  return (
    <Shell title={`Confirm your order ${order.reference}`}>
      <p className="text-[17px] leading-relaxed">Please check the details below, then press the button. We’ll ring you to book your delivery day.</p>
      {query.failed && (
        <p role="alert" className="rounded-[var(--radius-field)] border-2 border-error p-3 font-semibold text-error">
          Sorry, that didn’t work. Please press the button again, or ring us.
        </p>
      )}
      {query.busy && (
        <p role="alert" className="rounded-[var(--radius-field)] border-2 border-error p-3 font-semibold text-error">
          Please wait a minute and try again.
        </p>
      )}
      <form action={confirm}>
        <input type="hidden" name="id" value={order.id} />
        <button type="submit" className="min-h-14 w-full rounded-full bg-velvet-sheen px-6 text-[17px] font-semibold text-white">
          Confirm my order
        </button>
      </form>
      <Summary order={order} />
      <p className="text-[15px] text-slate">
        Something wrong? Don’t confirm: {tel ? <a href={tel}>ring us on {CONTACT.phoneDisplay}</a> : 'contact us'} or email{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we’ll put it right.
      </p>
    </Shell>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-5 px-4 pb-16 pt-6 lg:pt-10">
      <h1 className="text-[30px] leading-tight">{title}</h1>
      {children}
    </div>
  )
}

function Summary({ order }: { order: NonNullable<Awaited<ReturnType<typeof orderForCustomer>>> }) {
  return (
    <section aria-label="Your order" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line p-5">
      <OrderLines order={order} />
      <p className="text-[15px]">
        <span className="font-semibold">{order.customerName}</span>
        <br />
        {order.shippingAddress}, {order.postcode}
      </p>
      {order.hasMadeToOrder && <p className="text-sm text-slate">Made-to-order pieces are built for you, so they can’t be returned for a change of mind. Faults are always covered.</p>}
    </section>
  )
}
