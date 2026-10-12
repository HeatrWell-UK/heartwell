'use client'

// The ad-visitor offer, said in one line where it matters (gold tint, gold
// heart): under the price, in the basket and at checkout. It shows only while
// this visitor's offer is live, with the real amount for what they're looking
// at and the real end date. No countdown, and nothing for a piece the offer
// doesn't cover.

import { useSyncExternalStore } from 'react'
import { HeartIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { formatPrice, ukDate } from '@/lib/format'
import { offerStore } from '@/lib/offers/browser'

/** The live offer's end date, or null. */
export function useOfferEnds(): Date | null {
  const until = useSyncExternalStore(offerStore.subscribe, offerStore.getSnapshot, offerStore.getServerSnapshot)
  return until ? new Date(until) : null
}

export function OfferStrip({
  amount,
  noun,
  code,
  atCheckout = false,
  className,
}: {
  amount: number
  /** "sofa" for "£30 off this sofa"; without it, "£30 off your order". */
  noun?: string
  /** The offer code, for using the offer on another device. */
  code?: string | null
  atCheckout?: boolean
  className?: string
}) {
  const ends = useOfferEnds()
  if (!ends || amount <= 0) return null
  return (
    <div role="note" className={cn('flex gap-3 rounded-[var(--radius-field)] bg-gold-tint px-3.5 py-3', className)}>
      <HeartIcon aria-hidden="true" size={22} weight="fill" className="mt-0.5 shrink-0 text-gold-dark" />
      <p className="flex flex-col gap-0.5 text-[15px] leading-snug">
        <strong className="font-semibold text-ink">
          {formatPrice(amount)} off {noun ? `this ${noun}` : 'your order'}
        </strong>
        <span className="text-slate">
          Your offer from our ad {atCheckout ? 'is taken off your total' : 'comes off at checkout'}. It runs until {ukDate(ends)}.
          {code && (
            <>
              {' '}
              On another phone or computer, use code <span className="select-all font-semibold tracking-wide text-ink">{code}</span>.
            </>
          )}
        </span>
      </p>
    </div>
  )
}
