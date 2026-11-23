'use client'

import { eventLastDay, eventStarted, type EventSettings } from '@/lib/offers/event'
import { useEvent } from './EventOffer'

/** The /sale heading for the part of the season, or plain words before and after the event (never a fake deadline). */
export function SaleHeading({ event, count }: { event: EventSettings; count: number }) {
  const state = useEvent(event)
  const amount = `£${Math.round(event.mtoAmount)}`
  if (state) {
    return (
      <>
        <h1 className="text-gold-lit text-[36px] leading-[1.06] lg:text-[54px]">{state.copy.title}</h1>
        <p className="max-w-[44rem] text-[18px] leading-relaxed text-white">
          {amount} off each made-to-order sofa until {state.lastDay}. {count} sofas, made in the UK in your choice of fabric. No code needed.
        </p>
      </>
    )
  }
  const started = eventStarted(event)
  return (
    <>
      <h1 className="text-gold-lit text-[36px] leading-[1.06] lg:text-[54px]">Christmas and New Year sofa event</h1>
      <p className="max-w-[44rem] text-[18px] leading-relaxed text-white">
        {!event.enabled || started
          ? 'The event has ended. Every sofa is still made to order and paid for on delivery.'
          : `From 1 December to ${eventLastDay(event)}: ${amount} off each made-to-order sofa, no code needed.`}
      </p>
    </>
  )
}
