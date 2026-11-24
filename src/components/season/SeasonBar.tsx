'use client'

// The announcement bar while the season is on (Run 3): sticky at the top, a
// few true lines that take turns every six seconds (the season's offer, this
// visitor's real time left, that the code is applied for them, and the
// shop's delivery promise). It can be paused or closed (closed for this tab);
// with reduced motion it doesn't rotate by itself and the arrows step through.
// One line at every width down to 320 px, in the shorter form on phones.

import { useEffect, useState } from 'react'
import { CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon, XIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEvent } from '@/components/offer/EventOffer'
import { windowLeftText, type EventSettings } from '@/lib/offers/event'
import { usePref, useReducedMotion, writePref } from './browserPrefs'

const BAR_KEY = 'hw-bar'
const ROTATE_MS = 6000

interface Line {
  long: string
  short: string
  href?: string
}

export function SeasonBar({ settings, fallback, fallbackShort }: { settings: EventSettings; fallback: string; fallbackShort: string }) {
  const state = useEvent(settings)
  const reduced = useReducedMotion()
  const closed = usePref('session', BAR_KEY) === 'closed'
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const lines: Line[] = state
    ? [
        { long: state.copy.band, short: state.copy.bandShort, href: state.copy.href },
        ...(state.window.kind === 'live'
          ? [{ long: `Your 14-day offer ends in ${windowLeftText(state.window.ends)}.`, short: `Your offer: ${windowLeftText(state.window.ends)} left` }]
          : []),
        { long: `No code needed: ${state.copy.code} is applied for you. One offer per piece.`, short: `${state.copy.code} applied for you` },
        { long: fallback, short: fallbackShort },
      ]
    : [{ long: fallback, short: fallbackShort }]

  const rotating = lines.length > 1 && !paused && !reduced
  useEffect(() => {
    if (!rotating) return
    const t = setInterval(() => setIndex((i) => i + 1), ROTATE_MS)
    return () => clearInterval(t)
  }, [rotating])

  if (state && closed) return null
  const line = lines[index % lines.length]!
  const step = (d: number) => setIndex((i) => (i + d + lines.length) % lines.length)
  const control = 'flex size-8 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white'
  const text = (
    <>
      <span className="sm:hidden">{line.short}</span>
      <span className="hidden sm:inline">{line.long}</span>
    </>
  )

  return (
    <div role="region" aria-label="Offers and delivery" className="border-gold-rule sticky top-0 z-40 bg-wine text-[13px] font-medium text-white">
      <div className="mx-auto flex max-w-[1200px] items-center gap-0.5 px-1 py-1 sm:px-4">
        {lines.length > 1 && (
          <button type="button" onClick={() => step(-1)} className={`${control} max-[359px]:hidden`} aria-label="Previous message">
            <CaretLeftIcon aria-hidden="true" size={14} />
          </button>
        )}
        <p aria-live={rotating ? 'off' : 'polite'} className="min-w-0 flex-1 truncate px-1 text-center leading-6">
          {line.href ? (
            <Link href={line.href} className="text-white no-underline hover:text-white hover:underline">
              {text}
            </Link>
          ) : (
            text
          )}
        </p>
        {lines.length > 1 && (
          <>
            <button type="button" onClick={() => step(1)} className={`${control} max-[359px]:hidden`} aria-label="Next message">
              <CaretRightIcon aria-hidden="true" size={14} />
            </button>
            {!reduced && (
              <button type="button" onClick={() => setPaused((p) => !p)} className={control} aria-label={paused ? 'Play messages' : 'Pause messages'} aria-pressed={paused}>
                {paused ? <PlayIcon aria-hidden="true" size={14} weight="fill" /> : <PauseIcon aria-hidden="true" size={14} weight="fill" />}
              </button>
            )}
          </>
        )}
        {state && (
          <button type="button" onClick={() => writePref('session', BAR_KEY, 'closed')} className={control} aria-label="Close this bar">
            <XIcon aria-hidden="true" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
