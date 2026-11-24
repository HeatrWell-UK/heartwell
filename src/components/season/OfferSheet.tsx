'use client'

// The season's offer, said once (Run 3): a short sheet a few seconds after
// the first page this visitor's 14-day window is live, once per season
// generation on this browser. It shows the code (applied for them anyway, but
// copyable for WhatsApp or the phone), the real countdown to the window's end
// from the shop's own cookie, and the terms. A native <dialog>: Esc and the
// close button shut it, focus stays inside and goes back where it was.
// Never on the basket, checkout or order pages.

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CheckIcon, CopyIcon, XIcon } from '@phosphor-icons/react'
import { useEvent } from '@/components/offer/EventOffer'
import { formatPrice } from '@/lib/format'
import type { EventSettings } from '@/lib/offers/event'
import { usePref, writePref } from './browserPrefs'

const SEEN_KEY = 'hw-offer-sheet'
const DELAY_MS = 3500
const QUIET = ['/basket', '/checkout', '/confirm-order', '/order', '/track-order', '/login', '/review']

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function OfferSheet({ settings, minOrder }: { settings: EventSettings; minOrder: number }) {
  const state = useEvent(settings)
  const pathname = usePathname()
  const seen = usePref('local', SEEN_KEY)
  const dialog = useRef<HTMLDialogElement>(null)
  const [now, setNow] = useState(0)
  const [copied, setCopied] = useState(false)

  const live = state?.window.kind === 'live'
  // '' is the server's answer (not known yet); null means never seen on this browser.
  const due = live && seen !== '' && seen !== settings.generation
  const quiet = QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    if (!due || quiet) return
    const t = setTimeout(() => {
      const d = dialog.current
      if (!d || d.open) return
      writePref('local', SEEN_KEY, settings.generation)
      setNow(Date.now())
      d.showModal()
    }, DELAY_MS)
    return () => clearTimeout(t)
  }, [due, quiet, settings.generation])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const t = setInterval(() => {
      if (d.open) setNow(Date.now())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  if (!state) return null
  const ends = state.window.kind === 'live' ? state.window.ends : null
  const left = ends && now ? countdown(ends.getTime() - now) : null
  const close = () => dialog.current?.close()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.copy.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard blocked: the code is on screen to read out.
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="offer-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-[18px] bg-white p-0 text-ink shadow-[0_24px_60px_-20px_rgb(40_8_14/0.6)] backdrop:bg-[rgb(34_23_26/0.55)]"
    >
      <div className="relative flex flex-col gap-3 px-5 pb-5 pt-6">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full text-slate hover:bg-stone">
          <XIcon aria-hidden="true" size={20} />
        </button>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gold-dark">{state.copy.title}</p>
        <h2 id="offer-sheet-title" className="pr-8 text-[26px] leading-tight">
          {state.words}
        </h2>
        <p className="text-[15px] leading-snug text-slate">Your own 14-day offer, taken off in your basket. It started on your first visit and doesn’t restart.</p>

        {left && (
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-slate">Your offer ends in</p>
            <p className="flex gap-2 tabular-nums" aria-hidden="true">
              {(
                [
                  [left.d, 'days'],
                  [left.h, 'hrs'],
                  [left.m, 'min'],
                  [left.s, 'sec'],
                ] as const
              ).map(([n, w]) => (
                <span key={w} className="flex min-w-14 flex-col items-center rounded-[10px] bg-gold-cream-tint px-2 py-1.5">
                  <span className="text-[22px] font-semibold leading-none text-velvet">{String(n).padStart(2, '0')}</span>
                  <span className="text-[11px] text-slate">{w}</span>
                </span>
              ))}
            </p>
            <p className="sr-only">
              {left.d} days, {left.h} hours and {left.m} minutes left
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-gold px-3 py-2">
          <span className="text-[14px] text-slate">
            Code <strong className="font-semibold tracking-wider text-ink">{state.copy.code}</strong> (already applied)
          </span>
          <button type="button" onClick={copy} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-velvet hover:bg-stone">
            {copied ? <CheckIcon aria-hidden="true" size={16} /> : <CopyIcon aria-hidden="true" size={16} />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-snug text-slate">
          <li>{formatPrice(state.amount)} off each sofa and chair, made to order or ready-made. Footstools aren’t included.</li>
          <li>One offer per piece: codes don’t add more. Minimum order {formatPrice(minOrder)}; delivery charges as usual.</li>
          <li>Ends 14 days after your first visit, or at the end of {state.lastDay}, whichever is sooner.</li>
        </ul>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Link href={state.copy.href} onClick={close} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-velvet px-5 text-[16px] font-semibold text-white no-underline hover:bg-velvet-dark hover:text-white">
            See the sofas
          </Link>
          <button type="button" onClick={close} className="min-h-12 flex-1 rounded-full border border-line px-5 text-[16px] font-semibold text-ink hover:bg-stone">
            Keep browsing
          </button>
        </div>
      </div>
    </dialog>
  )
}
