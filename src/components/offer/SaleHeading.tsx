'use client'

import { eventLastDay, eventStarted, offerWords, windowLeftText, type EventSettings } from '@/lib/offers/event'
import { useEvent } from './EventOffer'

const H1 = 'text-gold-lit text-[36px] leading-[1.06] lg:text-[54px]'
const LEAD = 'max-w-[44rem] text-[18px] leading-relaxed text-white'

/**
 * The heading on /sale, /christmas and /new-year: the part of the season, the
 * offer in the same words as everywhere, how many pieces, and this visitor's
 * own window (live with its real time left, ended, or not known yet). Plain
 * words before and after the season (never a fake deadline).
 */
export function SaleHeading({ event, count, title }: { event: EventSettings; count: number; title?: string }) {
  const state = useEvent(event)
  if (state) {
    return (
      <>
        <h1 className={H1}>{title ?? state.copy.title}</h1>
        <p className={LEAD}>
          {state.words}: {count} sofas and chairs, made to order in the UK or ready-made. 14 days from your first visit, until {state.lastDay} at the latest. No code
          needed.
        </p>
        <p role="status" className="max-w-[44rem] rounded-[12px] bg-white/10 px-3.5 py-2 text-[15px] leading-snug text-on-wine">
          {state.window.kind === 'live'
            ? `Your offer is live: ${windowLeftText(state.window.ends)} left. It comes off in your basket.`
            : state.window.kind === 'ended'
              ? 'Your 14 days have ended, so prices are our normal prices. Questions? Message us on WhatsApp.'
              : 'Your 14 days start on this visit.'}
        </p>
      </>
    )
  }
  // Not switched on (or settings unavailable): no claim either way.
  if (!event.enabled || !(event.mtoAmount > 0)) {
    return (
      <>
        <h1 className={H1}>{title ?? 'Sofas and chairs'}</h1>
        <p className={LEAD}>Made in the UK in your choice of fabric or ready-made, and paid for in full on delivery.</p>
      </>
    )
  }
  const started = eventStarted(event)
  return (
    <>
      <h1 className={H1}>{title ?? 'Christmas and New Year sofa event'}</h1>
      <p className={LEAD}>
        {started
          ? 'The Christmas and New Year sofa event has ended. Every sofa is still paid for on delivery.'
          : `Until ${eventLastDay(event)}: ${offerWords(event.mtoAmount)} for 14 days from your first visit, no code needed.`}
      </p>
    </>
  )
}
