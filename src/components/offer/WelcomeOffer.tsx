'use client'

// The welcome offer, shown where it matters: a panel by the price on product
// pages, a note in the basket and at checkout. The countdown is real (the
// database ends the offer at that minute and never restarts it), so it counts
// hours and minutes, calmly: no ticking seconds, no flashing, and it isn't
// read out on every change. Gold-tint panel and gold heart, like the ad
// offer's strip; the time sits in wine tiles with gold numbers.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { HeartIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { claimWelcome, welcomeStore } from '@/lib/offers/browser'
import { timeLeft, timeLeftText } from '@/lib/offers/welcome'

export type WelcomeState =
  /** Not known yet (the server's render, or the first visit while the shop starts it). */
  | { kind: 'pending' }
  | { kind: 'live'; ends: Date; left: { hours: number; minutes: number } }
  | { kind: 'none' }

/** The time now, refreshed on each new minute while `active` (and when the page comes back into view). */
function useMinuteClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let timer = 0
    const tick = () => {
      setNow(Date.now())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)
    }
    const onShow = () => document.visibilityState === 'visible' && setNow(Date.now())
    // Straight away first: the end time may have arrived a moment after the clock started.
    timer = window.setTimeout(tick, 0)
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [active])
  return now
}

/** This visitor's welcome offer. Starts it on a first visit; 'none' when the shop has it switched off. */
export function useWelcome(enabled: boolean): WelcomeState {
  const raw = useSyncExternalStore(welcomeStore.subscribe, welcomeStore.getSnapshot, welcomeStore.getServerSnapshot)
  useEffect(() => {
    if (enabled) void claimWelcome()
  }, [enabled])
  const ends = raw && raw !== 'none' ? new Date(raw) : null
  const now = useMinuteClock(ends !== null)
  if (!enabled || raw === 'none') return { kind: 'none' }
  if (!ends) return { kind: 'pending' }
  const left = timeLeft(ends, now)
  return left ? { kind: 'live', ends, left } : { kind: 'none' }
}

const END_TIME = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })

/** "Friday 24 October, 3:41 pm". */
export const endTimeText = (ends: Date) => END_TIME.format(ends).replace(' at ', ', ')

const pad = (n: number) => String(n).padStart(2, '0')

/** Hours and minutes in wine tiles with gold numbers; dashes until the time is known. */
function Countdown({ state, size = 'lg' }: { state: WelcomeState; size?: 'lg' | 'sm' }) {
  const live = state.kind === 'live' ? state.left : null
  const tiles = [
    { value: live ? String(live.hours) : '––', unit: live?.hours === 1 ? 'hr' : 'hrs' },
    { value: live ? pad(live.minutes) : '––', unit: live?.minutes === 1 ? 'min' : 'mins' },
  ]
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {tiles.map((t, i) => (
        <span key={t.unit + i} className="flex items-center gap-1.5">
          {i > 0 && <span className="font-display text-wine">:</span>}
          <span
            className={cn(
              'flex flex-col items-center justify-center rounded-[10px] bg-wine leading-none',
              size === 'lg' ? 'min-w-[54px] px-2 py-1.5' : 'min-w-[44px] px-1.5 py-1',
            )}
          >
            <span className={cn('text-gold-lit font-display tabular-nums', size === 'lg' ? 'text-[24px]' : 'text-[18px]')}>{t.value}</span>
            <span className={cn('pt-0.5 font-medium text-on-wine-muted', size === 'lg' ? 'text-[11px]' : 'text-[10px]')}>{t.unit}</span>
          </span>
        </span>
      ))}
    </span>
  )
}

/** What a screen reader hears instead of the tiles: once, not on every minute. */
function TimeForReaders({ state, hours }: { state: WelcomeState; hours: number }) {
  if (state.kind !== 'live') return <span className="sr-only">It lasts {hours} hours from your first visit.</span>
  return (
    <span className="sr-only">
      Ends in {timeLeftText(state.left)}, on {endTimeText(state.ends)}.
    </span>
  )
}

/**
 * Product pages: the offer on this piece, with the countdown. Rendered on the
 * server too (time unknown, dashes), so it never pushes the page down when the
 * time arrives; it goes only for a visitor whose offer has ended.
 */
export function WelcomePanel({ state, amount, hours, noun, className }: { state: WelcomeState; amount: number; hours: number; noun: string; className?: string }) {
  if (state.kind === 'none') return null
  return (
    <section
      aria-label="Welcome offer"
      className={cn('flex flex-col gap-3 rounded-[16px] bg-gold-tint px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(181,138,47,.45)] sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <p className="flex gap-3 text-[15px] leading-snug">
        <HeartIcon aria-hidden="true" size={22} weight="fill" className="mt-0.5 shrink-0 text-gold-dark" />
        <span className="flex flex-col gap-0.5">
          <strong className="font-semibold text-ink">
            Welcome offer: {formatPrice(amount)} off this {noun}
          </strong>
          <span className="text-slate">
            Taken off at checkout, no code needed.
            {state.kind === 'live' && <span className="block text-[13px]">Ends {endTimeText(state.ends)}.</span>}
          </span>
          <TimeForReaders state={state} hours={hours} />
        </span>
      </p>
      <span className="flex items-center gap-2 self-start pl-[34px] sm:self-center sm:pl-0">
        <span className="text-[13px] font-semibold text-wine sm:hidden">Ends in</span>
        <Countdown state={state} />
      </span>
    </section>
  )
}

/** Basket and checkout: the offer in one line, with the time left. */
export function WelcomeNote({
  state,
  amount,
  hours,
  applied = false,
  className,
}: {
  state: WelcomeState
  amount: number
  hours: number
  applied?: boolean
  className?: string
}) {
  if (state.kind === 'none') return null
  return (
    <div role="note" className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-field)] bg-gold-tint px-3.5 py-3', className)}>
      <p className="flex gap-3 text-[15px] leading-snug">
        <HeartIcon aria-hidden="true" size={22} weight="fill" className="mt-0.5 shrink-0 text-gold-dark" />
        <span className="flex flex-col gap-0.5">
          <strong className="font-semibold text-ink">Welcome offer: {formatPrice(amount)} off every piece</strong>
          <span className="text-slate">{applied ? 'Taken off your total, no code needed.' : 'Taken off at checkout, no code needed.'}</span>
          <TimeForReaders state={state} hours={hours} />
        </span>
      </p>
      <span className="pl-[34px]">
        <Countdown state={state} size="sm" />
      </span>
    </div>
  )
}
