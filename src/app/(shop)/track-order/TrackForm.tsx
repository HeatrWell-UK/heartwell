'use client'

import { useActionState, useId } from 'react'
import { TextInput } from '@/components/ui/Field'
import { formatPrice, ukDate } from '@/lib/format'
import { formatDeliveryDate } from '@/lib/delivery/window'
import { OrderJourney } from '@/components/checkout/OrderJourney'
import { orderJourney } from '@/lib/checkout/journey'
import { track, type TrackState } from './actions'


export function TrackForm() {
  const id = useId()
  const [state, action, pending] = useActionState<TrackState, FormData>(track, { status: 'idle' })

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-ref`} className="font-semibold">
            Order reference
          </label>
          <span id={`${id}-ref-help`} className="text-sm text-slate">
            It starts HW-, and it’s in your order email.
          </span>
          <TextInput id={`${id}-ref`} name="reference" required autoCapitalize="characters" spellCheck={false} placeholder="HW-100101" aria-describedby={`${id}-ref-help`} className="uppercase" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-pc`} className="font-semibold">
            Delivery postcode
          </label>
          <TextInput id={`${id}-pc`} name="postcode" required autoComplete="postal-code" autoCapitalize="characters" spellCheck={false} className="uppercase" />
        </div>
        <button type="submit" disabled={pending} className="min-h-14 rounded-full bg-velvet-sheen px-6 text-[17px] font-semibold text-white">
          {pending ? 'Looking…' : 'Track my order'}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === 'not_found' && (
          <p className="rounded-[var(--radius-field)] bg-gold-cream-tint p-4 text-[15px]">We can’t find an order with that reference and postcode. Please check both and try again.</p>
        )}
        {state.status === 'busy' && <p className="rounded-[var(--radius-field)] bg-gold-cream-tint p-4 text-[15px]">Please wait a few minutes and try again.</p>}
        {state.status === 'error' && <p className="rounded-[var(--radius-field)] bg-gold-cream-tint p-4 text-[15px]">Sorry, we couldn’t look that up just now. Please try again shortly.</p>}
        {state.status === 'found' && <Tracked order={state.order} />}
      </div>
    </div>
  )
}

function Tracked({ order }: { order: Extract<TrackState, { status: 'found' }>['order'] }) {
  const cancelled = order.status === 'cancelled'
  const journey = orderJourney(order.status, order)
  return (
    <section aria-labelledby="tracked" className="hw-panel flex flex-col gap-5 px-5 py-6 lg:px-8 lg:py-8">
      <h2 id="tracked" className="text-[26px] leading-tight lg:text-[30px]">
        {order.reference}
      </h2>
      {cancelled ? (
        <p className="font-semibold">This order was cancelled{order.cancelledAt ? ` on ${ukDate(new Date(order.cancelledAt), { weekday: false, year: true })}` : ''}.</p>
      ) : (
        journey && <OrderJourney steps={journey} />
      )}
      {order.preferredDate && !cancelled && <p className="text-[15px]">Preferred day: {formatDeliveryDate(order.preferredDate)}</p>}
      <p className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span className="text-[17px] font-semibold">To pay on delivery</span>
        <span className="font-display text-[26px] leading-none">{formatPrice(order.totalAmount)}</span>
      </p>
    </section>
  )
}
