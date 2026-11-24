'use client'

// The hero's price row while the season is on (Run 3): what the offer is and
// this visitor's real time left, in its own row under the words and above the
// alcoves, so it never sits over the sofa photo.

import Link from 'next/link'
import { useEvent } from '@/components/offer/EventOffer'
import { windowLeftText, type EventSettings } from '@/lib/offers/event'

export function SeasonHeroPrice({ settings }: { settings: EventSettings }) {
  const state = useEvent(settings)
  if (!state) return null
  return (
    <Link
      href={state.copy.href}
      className="relative z-10 mt-1 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full bg-wine-deep/80 px-4 py-2 text-[14px] leading-snug text-white no-underline shadow-[inset_0_0_0_1px_rgba(233,204,123,.7)] hover:text-white hover:brightness-110 sm:text-[16px]"
    >
      <strong className="font-semibold text-gold-light">{state.copy.title}:</strong>
      <span>{state.words}</span>
      <span className="text-on-wine-muted tabular-nums">
        {state.window.kind === 'live' ? `· ${windowLeftText(state.window.ends)} left` : state.window.kind === 'ended' ? '· your 14 days have ended' : '· for 14 days from your first visit'}
      </span>
    </Link>
  )
}
