'use client'

// The Christmas and New Year sofa event on the page (Run 2, owner 24 November
// 2026). The part of the season (Christmas, Boxing week, New Year) is worked
// out from the visitor's clock in UK time, so cached pages switch at
// midnight by themselves and the event ends on 1 February with no deploy.
// Gold tint and the gold heart, like the other offers; a real end date, no
// countdown (the event's end is the same for everyone).

import { useSyncExternalStore } from 'react'
import { HeartIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { eventCopy, eventLastDay, eventPhase, type EventCopy, type EventPhase, type EventSettings } from '@/lib/offers/event'

// One shared minute tick, so every component re-checks the phase together.
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 60_000)
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export interface EventState {
  phase: EventPhase
  copy: EventCopy
  amount: number
  lastDay: string
}

/** The event as it stands now for this visitor, or null when it isn't on. */
export function useEvent(settings: EventSettings | undefined): EventState | null {
  const phase = useSyncExternalStore(
    subscribe,
    () => (settings ? eventPhase(settings) : null),
    () => (settings ? eventPhase(settings) : null),
  )
  if (!settings || !phase) return null
  const lastDay = eventLastDay(settings)
  return { phase, copy: eventCopy(phase, settings.mtoAmount, lastDay), amount: settings.mtoAmount, lastDay }
}

/** Product pages: the event's saving on this piece, in one row by the price. */
export function EventPanel({ state, amount, noun, className }: { state: EventState; amount: number; noun: string; className?: string }) {
  return (
    <section
      aria-label={state.copy.title}
      className={cn('flex items-center gap-2.5 rounded-[14px] bg-gold-tint py-2 pl-3 pr-3 shadow-[inset_0_0_0_1px_rgba(181,138,47,.45)]', className)}
    >
      <HeartIcon aria-hidden="true" size={18} weight="fill" className="hidden shrink-0 text-gold-dark min-[400px]:block" />
      <p className="flex min-w-0 flex-col leading-snug">
        <strong className="text-[15px] font-semibold text-ink">
          {formatPrice(amount)} off this {noun}
        </strong>
        <span className="text-[13px] text-slate">{state.copy.note}</span>
      </p>
    </section>
  )
}

/** Basket and checkout: what the event takes off, in one line. */
export function EventNote({ state, units, className }: { state: EventState; units: number; className?: string }) {
  return (
    <div role="note" className={cn('flex gap-3 rounded-[var(--radius-field)] bg-gold-tint px-3.5 py-3 text-[15px] leading-snug', className)}>
      <HeartIcon aria-hidden="true" size={22} weight="fill" className="mt-0.5 shrink-0 text-gold-dark" />
      <span className="flex flex-col gap-0.5">
        <strong className="font-semibold text-ink">
          {state.copy.title}: {formatPrice(state.amount)} off each made-to-order sofa
        </strong>
        <span className="text-slate">
          {units > 0
            ? `${units} ${units === 1 ? 'sofa qualifies' : 'sofas qualify'}, taken off your total. One offer per piece, no code needed, until ${state.lastDay}.`
            : `Made-to-order sofas in your basket get it automatically, until ${state.lastDay}.`}
        </span>
      </span>
    </div>
  )
}

/** The announcement bar's words while the event is on (client, so it switches at midnight). */
export function EventBand({ settings, fallback, fallbackShort }: { settings: EventSettings; fallback: string; fallbackShort: string }) {
  const state = useEvent(settings)
  return (
    <>
      <span className="sm:hidden">{state ? state.copy.bandShort : fallbackShort}</span>
      <span className="hidden sm:inline">{state ? state.copy.band : fallback}</span>
    </>
  )
}
