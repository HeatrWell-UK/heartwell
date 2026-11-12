'use client'

import { useId, useRef, useState } from 'react'
import { useBottomCover } from '@/lib/ui/bottom-cover'
import Link from 'next/link'
import { Sheet } from '@/components/ui/Sheet'
import { buttonClasses } from '@/components/ui/Button'
import { saveConsent } from '@/lib/tracking/browser'
import { ACCEPT_ALL, ESSENTIAL_ONLY, type Consent, type ConsentChoice } from '@/lib/tracking/consent'

export function ConsentBanner({ onChoose }: { onChoose: () => void }) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  useBottomCover('consent', ref, true)
  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-title`}
      // Hidden before the first paint when a choice is already stored (see consentFlagScript).
      data-consent-banner=""
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-overlay)] print:hidden lg:pb-4 lg:pt-4"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-8">
        <h2 id={`${id}-title`} className="sr-only">
          Cookies
        </h2>
        <p className="text-[14px] leading-snug text-slate lg:text-[15px]">
          Allow optional cookies to measure visits and ads?{' '}
          <button type="button" onClick={onChoose} className="font-semibold text-velvet underline underline-offset-2">
            Choose what to allow
          </button>{' '}
          or read{' '}
          <Link href="/cookies" className="font-semibold underline underline-offset-2">
            more about cookies
          </Link>
          .
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[320px]">
          <button type="button" onClick={() => saveConsent(ESSENTIAL_ONLY)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Essential only
          </button>
          <button type="button" onClick={() => saveConsent(ACCEPT_ALL)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Accept all
          </button>
        </div>
      </div>
    </section>
  )
}

function Choice({ label, body, checked, onChange, disabled }: { label: string; body: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-field)] border border-line p-3">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} aria-describedby={`${id}-body`} className="mt-1 size-5 shrink-0 accent-velvet" />
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="font-semibold">{label}</span>
        <span id={`${id}-body`} className="text-sm text-slate">
          {body}
        </span>
      </label>
    </div>
  )
}

/** Every choice, one at a time; reopened from "Cookie settings" in the footer. */
export function ConsentSettings({ open, onClose, current }: { open: boolean; onClose: () => void; current: Consent }) {
  // The sheet only renders its contents while open, so these start from the saved choice each time.
  const [marketing, setMarketing] = useState(current.marketing)
  const [analytics, setAnalytics] = useState(current.analytics)
  const save = (c: ConsentChoice) => {
    saveConsent(c)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Cookie settings">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate">Essential</h3>
        <Choice label="Needed for the shop" body="Your basket, saved sofas and checkout. Always on." checked disabled />
        <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate">Only if you allow them</h3>
        <Choice label="Google Analytics" body="Cookies that help us see which pages work, in Google Analytics." checked={analytics} onChange={setAnalytics} />
        <Choice
          label="Facebook and Instagram ads"
          body="Lets us link your visit and order to an ad and share conversion information with Meta to measure and improve our ads."
          checked={marketing}
          onChange={setMarketing}
        />
        <div className="flex flex-col gap-2 pt-2">
          <button type="button" onClick={() => save({ marketing, analytics })} className={buttonClasses({ variant: 'secondary' })}>
            Save my choices
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save(ESSENTIAL_ONLY)} className={buttonClasses({ variant: 'secondary' })}>
              Essential only
            </button>
            <button type="button" onClick={() => save(ACCEPT_ALL)} className={buttonClasses({ variant: 'secondary' })}>
              Accept all
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
